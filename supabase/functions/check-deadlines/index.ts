import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const today = new Date().toISOString().split("T")[0];

    // 1. Find overdue project tasks (due_date passed, not completed, on active projects only)
    const { data: overdueTasks, error: tasksError } = await supabase
      .from("project_tasks")
      .select("id, title, due_date, assigned_to, project_id, status, projects!inner(status)")
      .lt("due_date", today)
      .not("status", "eq", "termine")
      .not("assigned_to", "is", null)
      .not("projects.status", "in", '("termine","annule")');

    if (tasksError) throw tasksError;

    // 2. Find projects approaching or past the 15-day deadline
    const { data: projects, error: projError } = await supabase
      .from("projects")
      .select("id, name, created_at, due_date, assigned_to, status, client_id")
      .not("status", "in", '("termine","annule")');

    if (projError) throw projError;

    const notifications: {
      user_id: string;
      title: string;
      message: string;
      type: string;
      link: string;
    }[] = [];

    // Deduplicate: track what we've already notified about today
    // Check existing notifications from today to avoid spam
    const { data: todayNotifs } = await supabase
      .from("notifications")
      .select("link, user_id")
      .eq("type", "deadline")
      .gte("created_at", `${today}T00:00:00Z`);

    const alreadyNotified = new Set(
      (todayNotifs || []).map((n) => `${n.user_id}:${n.link}`)
    );

    // Process overdue tasks
    for (const task of overdueTasks || []) {
      const daysOverdue = Math.floor(
        (new Date(today).getTime() - new Date(task.due_date).getTime()) /
          (1000 * 60 * 60 * 24)
      );
      const link = `/projets/${task.project_id}`;
      const key = `${task.assigned_to}:${link}`;

      if (!alreadyNotified.has(key)) {
        notifications.push({
          user_id: task.assigned_to,
          title: "⚠️ Tâche en retard",
          message: `La tâche "${task.title}" est en retard de ${daysOverdue} jour(s).`,
          type: "deadline",
          link,
        });
        alreadyNotified.add(key);
      }
    }

    // Process projects past 15-day deadline or past due_date
    for (const project of projects || []) {
      if (!project.assigned_to) continue;

      const createdAt = new Date(project.created_at);
      const maxDeadline = new Date(createdAt);
      maxDeadline.setDate(maxDeadline.getDate() + 15);

      const effectiveDeadline = project.due_date
        ? new Date(
            Math.min(
              new Date(project.due_date).getTime(),
              maxDeadline.getTime()
            )
          )
        : maxDeadline;

      const now = new Date(today);
      const daysUntil = Math.floor(
        (effectiveDeadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      const link = `/projets/${project.id}`;
      const key = `${project.assigned_to}:${link}`;

      if (alreadyNotified.has(key)) continue;

      if (daysUntil < 0) {
        // Overdue project
        notifications.push({
          user_id: project.assigned_to,
          title: "🚨 Projet en retard",
          message: `Le projet "${project.name}" dépasse le délai de livraison de ${Math.abs(daysUntil)} jour(s).`,
          type: "deadline",
          link,
        });
        alreadyNotified.add(key);
      } else if (daysUntil <= 2) {
        // Approaching deadline (2 days warning)
        notifications.push({
          user_id: project.assigned_to,
          title: "⏰ Deadline approche",
          message: `Le projet "${project.name}" doit être livré dans ${daysUntil} jour(s).`,
          type: "deadline",
          link,
        });
        alreadyNotified.add(key);
      }
    }

    // 3. Check for prospect callback reminders (tomorrow)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];

    const { data: callbackProspects } = await supabase
      .from("prospects")
      .select("id, business_name, callback_date, callback_notes, assigned_to")
      .eq("callback_date", tomorrowStr)
      .not("assigned_to", "is", null)
      .not("status", "in", '("converti","non_interesse")');

    for (const prospect of callbackProspects || []) {
      const link = "/prospection";
      const key = `${prospect.assigned_to}:callback:${prospect.id}`;
      if (!alreadyNotified.has(key)) {
        notifications.push({
          user_id: prospect.assigned_to!,
          title: "📞 Rappel prospect demain",
          message: `Rappel prévu demain pour "${prospect.business_name}"${prospect.callback_notes ? ` — ${prospect.callback_notes}` : ""}.`,
          type: "deadline",
          link,
        });
        alreadyNotified.add(key);
      }
    }
    if (notifications.length > 0) {
      const { data: admins } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");

      for (const admin of admins || []) {
        for (const project of projects || []) {
          const createdAt = new Date(project.created_at);
          const maxDeadline = new Date(createdAt);
          maxDeadline.setDate(maxDeadline.getDate() + 15);
          const now = new Date(today);
          const daysOver = Math.floor(
            (now.getTime() - maxDeadline.getTime()) / (1000 * 60 * 60 * 24)
          );

          if (daysOver > 0 && admin.user_id !== project.assigned_to) {
            const link = `/projets/${project.id}`;
            const key = `${admin.user_id}:${link}`;
            if (!alreadyNotified.has(key)) {
              notifications.push({
                user_id: admin.user_id,
                title: "🚨 Projet en retard",
                message: `Le projet "${project.name}" dépasse le délai de ${daysOver} jour(s).`,
                type: "deadline",
                link,
              });
              alreadyNotified.add(key);
            }
          }
        }
      }
    }

    // 4. Logo reminders — every 2 days while not validated by client
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    const { data: logoClients } = await supabase
      .from("clients")
      .select("id, company_name, logo_created, logo_published_gmb, logo_validated_by_client, logo_reminder_last_sent, assigned_to")
      .eq("logo_validated_by_client", false)
      .eq("pipeline_status", "contrat_signe");

    const dueLogoClients = (logoClients || []).filter((c: any) => {
      const last = c.logo_reminder_last_sent ? new Date(c.logo_reminder_last_sent) : null;
      return !last || last <= twoDaysAgo;
    });

    if (dueLogoClients.length > 0) {
      const { data: roleRows } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("role", ["admin", "agent_master"]);

      const adminIds = (roleRows || []).filter((r: any) => r.role === "admin").map((r: any) => r.user_id);
      const masterIds = (roleRows || []).filter((r: any) => r.role === "agent_master").map((r: any) => r.user_id);

      for (const c of dueLogoClients) {
        const step = c.logo_published_gmb
          ? "à faire valider par le client"
          : c.logo_created
            ? "à publier sur la fiche Google"
            : "à créer";
        const stepKey = c.logo_published_gmb ? "validation" : c.logo_created ? "publication" : "creation";
        const title = "🎨 Logo en attente";
        const msg = `Logo de "${c.company_name}" toujours ${step}. Relance automatique (J+2).`;
        const link = `/clients/${c.id}`;

        const recipients = new Set<string>();
        if (c.assigned_to) recipients.add(c.assigned_to);
        adminIds.forEach((id: string) => recipients.add(id));
        masterIds.forEach((id: string) => recipients.add(id));

        for (const uid of recipients) {
          notifications.push({ user_id: uid, title, message: msg, type: "logo_reminder", link });
        }

        // Log reminder
        await supabase.from("logo_reminder_log").insert({
          client_id: c.id,
          trigger_type: "auto",
          step: stepKey,
          message: msg,
          recipients: Array.from(recipients),
          recipients_count: recipients.size,
        });

        await supabase
          .from("clients")
          .update({ logo_reminder_last_sent: new Date().toISOString() })
          .eq("id", c.id);
      }
    }

    // Insert notifications
    if (notifications.length > 0) {
      const { error: insertError } = await supabase
        .from("notifications")
        .insert(notifications);
      if (insertError) throw insertError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        notifications_sent: notifications.length,
        overdue_tasks: overdueTasks?.length || 0,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
