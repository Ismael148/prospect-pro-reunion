// Edge function: task-overdue-reminders
// - Scheduled every weekday morning: one digest email per team member who has overdue tasks.
// - action "run" (admin): send the digests now (optionally to one member).
// - action "sync" (support managers): refresh opens of recent reminder emails from Brevo.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { authenticateCronRequest } from "../_shared/cron-auth.ts";
import { buildOverdueDigest, firstName, type OverdueTask } from "./email.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const reunionDay = (d = new Date()) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Indian/Reunion", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
const reunionWeekday = (d = new Date()) =>
  new Intl.DateTimeFormat("en-US", { timeZone: "Indian/Reunion", weekday: "short" }).format(d);

type Admin = ReturnType<typeof createClient>;

async function loadOverdueTasks(sb: Admin, today: string, onlyAssignee?: string) {
  const out = new Map<string, OverdueTask[]>();
  for (let from = 0; ; from += 1000) {
    let q = sb.from("project_tasks")
      .select("id, title, due_date, assigned_to, projects!inner(name, status, clients(company_name))")
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
      list.push({ id: t.id, title: t.title, due_date: t.due_date, project_name: t.projects?.name ?? null, client_name: t.projects?.clients?.company_name ?? null });
      out.set(t.assigned_to, list);
    }
    if (!data || data.length < 1000) break;
  }
  return out;
}

async function sendDigests(sb: Admin, trigger: "auto" | "manual", triggeredBy: string | null, onlyAssignee?: string) {
  const today = reunionDay();
  const byAssignee = await loadOverdueTasks(sb, today, onlyAssignee);
  const results = { sent: 0, failed: 0, no_email: 0, skipped_already_sent: 0, members: byAssignee.size };

  let alreadySent = new Set<string>();
  if (trigger === "auto") {
    const { data } = await sb.from("task_reminder_log").select("assignee_id").eq("reminder_day", today).eq("trigger", "auto").eq("status", "sent");
    alreadySent = new Set((data || []).map((r: any) => r.assignee_id));
  }

  const ids = [...byAssignee.keys()];
  const { data: profiles } = ids.length
    ? await sb.from("profiles").select("user_id, full_name").in("user_id", ids)
    : { data: [] as any[] };
  const apiKey = Deno.env.get("BREVO_API_KEY");

  for (const [assigneeId, tasks] of byAssignee) {
    if (alreadySent.has(assigneeId)) { results.skipped_already_sent++; continue; }
    const fullName = (profiles || []).find((p: any) => p.user_id === assigneeId)?.full_name ?? null;
    const name = firstName(fullName);
    const oldest = tasks.reduce((m, t) => (t.due_date < m ? t.due_date : m), tasks[0].due_date);
    const base = {
      assignee_id: assigneeId, recipient_name: fullName, task_count: tasks.length,
      task_ids: tasks.map((t) => t.id), oldest_due_date: oldest, trigger, triggered_by: triggeredBy, reminder_day: today,
    };

    const { data: userRes } = await sb.auth.admin.getUserById(assigneeId);
    const email = userRes?.user?.email;
    if (!email) {
      await sb.from("task_reminder_log").insert({ ...base, status: "no_email", error_message: "Aucune adresse email pour ce membre" });
      results.no_email++;
      continue;
    }

    const { subject, html } = buildOverdueDigest(name, tasks, today);
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
      await sb.from("task_reminder_log").insert({ ...base, recipient_email: email, status: "sent", message_id: messageId });
      await sb.from("email_send_log").insert({
        recipient_email: email, recipient_name: fullName, subject, status: "sent",
        template_name: "task_overdue_reminder", message_id: messageId,
        metadata: { assignee_id: assigneeId, task_count: tasks.length, trigger },
      });
      results.sent++;
    } catch (e) {
      console.error("Reminder failed", assigneeId, e);
      await sb.from("task_reminder_log").insert({ ...base, recipient_email: email, status: "failed", error_message: String((e as Error).message).slice(0, 500) });
      results.failed++;
    }
  }
  return results;
}

async function syncOpens(sb: Admin) {
  const apiKey = Deno.env.get("BREVO_API_KEY");
  if (!apiKey) throw new Error("BREVO_API_KEY missing");
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const { data: rows, error } = await sb.from("task_reminder_log").select("id, message_id")
    .eq("status", "sent").not("message_id", "is", null).gte("created_at", since)
    .order("created_at", { ascending: false }).limit(200);
  if (error) throw error;
  let synced = 0;
  const list = (rows || []) as any[];
  for (let i = 0; i < list.length; i += 5) {
    await Promise.all(list.slice(i, i + 5).map(async (r) => {
      const url = new URL("https://api.brevo.com/v3/smtp/statistics/events");
      url.searchParams.set("messageId", r.message_id);
      url.searchParams.set("limit", "100");
      url.searchParams.set("days", "30");
      const res = await fetch(url, { headers: { "api-key": apiKey, accept: "application/json" } });
      if (!res.ok) { console.error(`Brevo events [${res.status}]: ${await res.text()}`); return; }
      const events: any[] = (await res.json())?.events || [];
      const opens = events.filter((e) => ["opened", "uniqueOpened", "clicks"].includes(e.event) && e.date)
        .sort((a, b) => +new Date(a.date) - +new Date(b.date));
      const patch: Record<string, unknown> = { last_synced_at: new Date().toISOString() };
      if (opens.length) {
        patch.opened_at = new Date(opens[0].date).toISOString();
        patch.open_count = events.filter((e) => e.event === "opened" || e.event === "uniqueOpened").length || 1;
      }
      await sb.from("task_reminder_log").update(patch).eq("id", r.id);
      synced++;
    }));
  }
  return { synced, total: list.length };
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
      return json({ success: true, ...(await sendDigests(sb, "auto", null)) });
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
      return json({ success: true, ...(await sendDigests(sb, "manual", user.id, assignee)) });
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
