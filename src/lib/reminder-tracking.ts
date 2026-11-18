/**
 * Morning overdue-task reminders: one log row per individual email (task_reminder_log).
 * Shared by the Support "Relances tâches" tab and the Stats globales page so both count the same way.
 */
export type ReminderRow = {
  id: string;
  assignee_id: string;
  recipient_name: string | null;
  recipient_email: string | null;
  created_at: string;
  reminder_day: string; // YYYY-MM-DD, Réunion day
  status: string; // sent | failed | no_email
  trigger: string; // auto | manual
  opened_at: string | null;
  error_message?: string | null;
  task_count?: number | null;
  task_id?: string | null;
  task_title?: string | null;
  task_due_date?: string | null;
  project_id?: string | null;
  project_name?: string | null;
  client_name?: string | null;
  oldest_due_date?: string | null;
};

export type MemberDayStatus = "envoye" | "partiel" | "echec" | "sans_adresse";

export type MemberDaySummary = {
  assignee_id: string;
  name: string | null;
  sent: number;
  failed: number;
  missingAddress: boolean;
  opened: number;
  firstSentAt: string | null;
  status: MemberDayStatus;
};

export const MEMBER_DAY_STATUS_LABELS: Record<MemberDayStatus, string> = {
  envoye: "Envoyé",
  partiel: "Envoi partiel",
  echec: "Échec",
  sans_adresse: "Adresse à renseigner",
};

/** Latest Réunion day that had reminders, optionally only automatic (morning) ones. */
export function latestReminderDay(rows: ReminderRow[], trigger?: "auto" | "manual"): string | null {
  let best: string | null = null;
  for (const r of rows) {
    if (trigger && r.trigger !== trigger) continue;
    if (!best || r.reminder_day > best) best = r.reminder_day;
  }
  return best;
}

/** Per-member status of the reminders of one day. */
export function summarizeReminderDay(rows: ReminderRow[], day: string, trigger?: "auto" | "manual") {
  const byMember = new Map<string, ReminderRow[]>();
  for (const r of rows) {
    if (r.reminder_day !== day || (trigger && r.trigger !== trigger)) continue;
    byMember.set(r.assignee_id, [...(byMember.get(r.assignee_id) || []), r]);
  }
  const members: MemberDaySummary[] = [...byMember].map(([assignee_id, list]) => {
    const sentRows = list.filter((r) => r.status === "sent");
    const failed = list.filter((r) => r.status === "failed").length;
    const missingAddress = list.some((r) => r.status === "no_email");
    const status: MemberDayStatus = sentRows.length
      ? failed ? "partiel" : "envoye"
      : missingAddress ? "sans_adresse" : "echec";
    const firstSentAt = sentRows.map((r) => r.created_at).sort()[0] ?? null;
    return {
      assignee_id,
      name: list.find((r) => r.recipient_name)?.recipient_name ?? null,
      sent: sentRows.length,
      failed,
      missingAddress,
      opened: sentRows.filter((r) => r.opened_at).length,
      firstSentAt,
      status,
    };
  }).sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  const sent = members.reduce((s, m) => s + m.sent, 0);
  const opened = members.reduce((s, m) => s + m.opened, 0);
  return {
    day,
    members,
    sent,
    failed: members.reduce((s, m) => s + m.failed, 0),
    opened,
    openRate: sent ? Math.round((opened / sent) * 100) : null,
  };
}

/** Sent and opened reminder emails over the last `days` days. */
export function reminderOpenStats(rows: ReminderRow[], now: Date = new Date(), days = 30) {
  const since = now.getTime() - days * 86_400_000;
  const sent = rows.filter((r) => r.status === "sent" && Date.parse(r.created_at) >= since);
  const opened = sent.filter((r) => r.opened_at).length;
  return { sent: sent.length, opened, openRate: sent.length ? Math.round((opened / sent.length) * 100) : null };
}

/** Next automatic run: weekdays at 8:00 in La Réunion (04:00 UTC). */
export function nextMorningRun(now: Date = new Date()): Date {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 4, 0, 0));
  if (d.getTime() <= now.getTime()) d.setUTCDate(d.getUTCDate() + 1);
  while (d.getUTCDay() === 0 || d.getUTCDay() === 6) d.setUTCDate(d.getUTCDate() + 1);
  return d;
}
