// Edge function: task-overdue-reminders
// - Scheduled every weekday morning: one individual email per overdue task (with its project),
//   at most MAX_PER_MEMBER per team member, rotating so every late task gets its turn.
// - Emails go to the member's real reminder address (team_notification_emails), never the login id.
// - action "run" (admin): send now (optionally to one member).
// - action "sync" (support managers): refresh opens of recent reminder emails from Brevo.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { authenticateCronRequest } from "../_shared/cron-auth.ts";
import { buildTaskReminder, firstName, pickTasksToRemind, type OverdueTask } from "./email.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const reunionDay = (d = new Date()) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Indian/Reunion", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
const reunionWeekday = (d = new Date()) =>
  new Intl.DateTimeFormat("en-US", { timeZone: "Indian/Reunion", weekday: "short" }).format(d);

// deno-lint-ignore no-explicit-any
type Admin = any;

async function loadOverdueTasks(sb: Admin, today: string, onlyAssignee?: string) {
  const out = new Map<string, OverdueTask[]>();
  for (let from = 0; ; from += 1000) {
    let q = sb.from("project_tasks")
      .select("id, title, due_date, assigned_to, project_id, projects!inner(name, status, clients(company_name))")
      .neq("status", "termine")
      .lt("due_date", today)
      .not("assigned_to", "is", null)
      .not("projects.status", "in", '("termine","annule")')
      .order("id")
      .range(from, from + 999);
    if (onlyAssignee) q = q.eq("assigned_to", onlyAssignee);
    const { data, error } = await q;
    if (error) throw error;
    for (const t of (data || []) as any[]) {
      const list = out.get(t.assigned_to) || [];
      list.push({
        id: t.id, title: t.title, due_date: t.due_date, project_id: t.project_id ?? null,
        project_name: t.projects?.name ?? null, client_name: t.projects?.clients?.company_name ?? null,
      });
      out.set(t.assigned_to, list);
    }
    if (!data || data.length < 1000) break;
  }
  return out;
}

/** Last sent reminder per task (last 90 days) and the tasks already reminded today. */
async function loadReminderHistory(sb: Admin, today: string) {
  const last = new Map<string, string>();
  const todaySet = new Set<string>();
  const since = new Date(Date.now() - 90 * 86_400_000).toISOString();
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from("task_reminder_log").select("task_id, created_at, reminder_day")
      .eq("status", "sent").not("task_id", "is", null).gte("created_at", since)
      .order("created_at", { ascending: false }).range(from, from + 999);
    if (error) throw error;
    for (const r of (data || []) as any[]) {
      if (!last.has(r.task_id)) last.set(r.task_id, r.created_at);
      if (r.reminder_day === today) todaySet.add(r.task_id);
    }
    if (!data || data.length < 1000) break;
  }
  return { last, todaySet };
}

async function sendReminders(sb: Admin, trigger: "auto" | "manual", triggeredBy: string | null, onlyAssignee?: string) {
  const today = reunionDay();
  const byAssignee = await loadOverdueTasks(sb, today, onlyAssignee);
  const { last, todaySet } = await loadReminderHistory(sb, today);
  const results = { sent: 0, failed: 0, no_email: 0, skipped_already_sent: 0, members: byAssignee.size };

  const ids = [...byAssignee.keys()];
  const [{ data: profiles }, { data: addresses }] = ids.length
    ? await Promise.all([
      sb.from("profiles").select("user_id, full_name").in("user_id", ids),
      sb.from("team_notification_emails").select("user_id, email").in("user_id", ids),
    ])
    : [{ data: [] as any[] }, { data: [] as any[] }];
  const apiKey = Deno.env.get("BREVO_API_KEY");

  await Promise.all([...byAssignee].map(async ([assigneeId, tasks]) => {
    const fullName = (profiles || []).find((p: any) => p.user_id === assigneeId)?.full_name ?? null;
    const name = firstName(fullName);
    const email = (addresses || []).find((a: any) => a.user_id === assigneeId)?.email ?? null;
    // Automatic runs never re-send a task already reminded that day; manual runs pick the next ones in the rotation.
    const picked = pickTasksToRemind(tasks, last, today, undefined, todaySet);
    results.skipped_already_sent += tasks.length > 0 && picked.length === 0 ? 1 : 0;
    if (!picked.length) return;

    const base = { assignee_id: assigneeId, recipient_name: fullName, trigger, triggered_by: triggeredBy, reminder_day: today };
    if (!email) {
      await sb.from("task_reminder_log").insert({
        ...base, task_count: tasks.length, task_ids: picked.map((t) => t.id),
        oldest_due_date: picked[0]?.due_date ?? null, status: "no_email",
        error_message: "Adresse de réception des relances à renseigner dans Suivi équipe",
      });
      results.no_email++;
      return;
    }

    for (const task of picked) {
      const row = {
        ...base, recipient_email: email, task_count: 1, task_ids: [task.id], oldest_due_date: task.due_date,
        task_id: task.id, task_title: task.title, task_due_date: task.due_date,
        project_id: task.project_id, project_name: task.project_name, client_name: task.client_name,
      };
      const { subject, html } = buildTaskReminder(name, task, today, tasks.length);
      try {
        if (!apiKey) throw new Error("BREVO_API_KEY missing");
        const res = await fetch("https://api.brevo.com/v3/smtp/email", {
          method: "POST",
          headers: { "api-key": apiKey, "content-type": "application/json", accept: "application/json" },
          body: JSON.stringify({
            sender: { name: "Adamkom", email: "contact@adamkom.com" },
            to: [{ email, name: fullName || undefined }],
            subject,
            htmlContent: html,
            tags: ["task_overdue_reminder"],
          }),
        });
        const text = await res.text();
        if (!res.ok) throw new Error(`Brevo ${res.status}: ${text}`);
        const messageId = (() => { try { return JSON.parse(text).messageId ?? null; } catch { return null; } })();
        await sb.from("task_reminder_log").insert({ ...row, status: "sent", message_id: messageId });
        await sb.from("email_send_log").insert({
          recipient_email: email, recipient_name: fullName, subject, status: "sent",
          template_name: "task_overdue_reminder", message_id: messageId,
          metadata: { assignee_id: assigneeId, task_id: task.id, project_id: task.project_id, trigger },
        });
        results.sent++;
      } catch (e) {
        console.error("Reminder failed", assigneeId, task.id, e);
        await sb.from("task_reminder_log").insert({ ...row, status: "failed", error_message: String((e as Error).message).slice(0, 500) });
        results.failed++;
      }
    }
  }));
  return results;
}

/** Pulls open/click events of reminder emails (last 30 days) from Brevo in a few aggregated calls. */
async function syncOpens(sb: Admin) {
  const apiKey = Deno.env.get("BREVO_API_KEY");
  if (!apiKey) throw new Error("BREVO_API_KEY missing");
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const rows: any[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from("task_reminder_log").select("id, message_id, opened_at, open_count")
      .eq("status", "sent").not("message_id", "is", null).gte("created_at", since)
      .order("created_at", { ascending: false }).range(from, from + 999);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  if (!rows.length) return { synced: 0, total: 0 };
  const wanted = new Set(rows.map((r) => r.message_id));

  const opens = new Map<string, { first: string; count: number }>();
  const fetchEvents = async (event: string, withTags: boolean) => {
    for (let offset = 0; offset < 25_000; offset += 2500) {
      const url = new URL("https://api.brevo.com/v3/smtp/statistics/events");
      url.searchParams.set("event", event);
      url.searchParams.set("days", "30");
      url.searchParams.set("limit", "2500");
      url.searchParams.set("offset", String(offset));
      if (withTags) url.searchParams.set("tags", JSON.stringify(["task_overdue_reminder"]));
      const res = await fetch(url, { headers: { "api-key": apiKey, accept: "application/json" } });
      if (!res.ok) {
        const body = await res.text();
        if (withTags && res.status === 400) return false;
        throw new Error(`Brevo events [${res.status}]: ${body}`);
      }
      const events: any[] = (await res.json())?.events || [];
      for (const e of events) {
        if (!e.messageId || !wanted.has(e.messageId) || !e.date) continue;
        const iso = new Date(e.date).toISOString();
        const cur = opens.get(e.messageId);
        if (!cur) opens.set(e.messageId, { first: iso, count: event === "opened" ? 1 : 0 });
        else {
          if (iso < cur.first) cur.first = iso;
          if (event === "opened") cur.count++;
        }
      }
      if (events.length < 2500) break;
    }
    return true;
  };
  for (const ev of ["opened", "clicks"]) {
    if (!(await fetchEvents(ev, true))) await fetchEvents(ev, false);
  }

  const nowIso = new Date().toISOString();
  let synced = 0;
  const changed = rows.filter((r) => {
    const o = opens.get(r.message_id);
    return o && (r.opened_at !== o.first || r.open_count !== Math.max(1, o.count));
  });
  for (let i = 0; i < changed.length; i += 10) {
    await Promise.all(changed.slice(i, i + 10).map(async (r) => {
      const o = opens.get(r.message_id)!;
      await sb.from("task_reminder_log").update({ opened_at: o.first, open_count: Math.max(1, o.count), last_synced_at: nowIso }).eq("id", r.id);
      synced++;
    }));
  }
  return { synced, total: rows.length, opened: opens.size };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Méthode non autorisée" }, 405);

  const sb = createClient(SUPABASE_URL, SERVICE_ROLE);
  try {
    const body = await req.json().catch(() => ({}));

    // Scheduled run
    if (authenticateCronRequest(req) === null) {
      const weekday = reunionWeekday();
      if (weekday === "Sat" || weekday === "Sun") return json({ success: true, skipped: "weekend" });
      return json({ success: true, ...(await sendReminders(sb, "auto", null)) });
    }

    // Signed-in team member
    const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
    const { data: auth } = token ? await sb.auth.getUser(token) : { data: { user: null } };
    const user = auth?.user;
    if (!user) return json({ error: "Non authentifié" }, 401);
    const { data: roles } = await sb.from("user_roles").select("role").eq("user_id", user.id);
    const has = (r: string) => (roles || []).some((x: any) => x.role === r);

    const action = typeof body?.action === "string" ? body.action : "";
    if (action === "run") {
      if (!has("admin")) return json({ error: "Réservé aux administrateurs" }, 403);
      const assignee = typeof body.assignee_id === "string" && UUID_RE.test(body.assignee_id) ? body.assignee_id : undefined;
      if (body.assignee_id && !assignee) return json({ error: "Identifiant de membre invalide" }, 400);
      return json({ success: true, ...(await sendReminders(sb, "manual", user.id, assignee)) });
    }
    if (action === "sync") {
      if (!has("admin") && !has("agent_master") && !has("agent_support")) return json({ error: "Accès refusé" }, 403);
      return json({ success: true, ...(await syncOpens(sb)) });
    }
    return json({ error: "Action inconnue" }, 400);
  } catch (e) {
    console.error("task-overdue-reminders error", e);
    return json({ error: (e as Error).message }, 500);
  }
});
