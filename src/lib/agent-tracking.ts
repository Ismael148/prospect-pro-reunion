/**
 * Per-agent follow-up: tasks they own, tickets assigned to them and comments
 * they wrote. Built on the shared task and support helpers so every page
 * counts the same way.
 */
import { getClientTaskStats, type TrackedTask } from "./task-tracking";
import { getTicketTracking, type TrackableTicket } from "./support-tracking";

export type AgentTask = TrackedTask & { assigned_to: string | null };
export type AgentTicket = TrackableTicket & { assigned_to: string | null };
export type AgentNote = { user_id: string; created_at: string };
export type AgentReminder = { assignee_id: string; created_at: string; status: string; opened_at: string | null };

export type AgentStats = {
  user_id: string;
  tasksTotal: number;
  tasksDone: number;
  tasksOpen: number;
  tasksOverdue: number;
  completionRate: number | null;
  ticketsAssigned: number;
  ticketsActive: number;
  ticketsUnanswered: number;
  ticketsResolved: number;
  commentsTotal: number;
  comments30d: number;
  lastReminderAt: string | null;
  lastReminderOpened: boolean | null;
};

const isActiveTicket = (s: string) => s === "ouvert" || s === "en_cours";

export function computeAgentStats(
  memberIds: string[],
  data: { tasks: AgentTask[]; tickets: AgentTicket[]; notes: AgentNote[]; reminders: AgentReminder[] },
  today: string,
  now: Date = new Date(),
): AgentStats[] {
  const since30 = new Date(now.getTime() - 30 * 86_400_000).toISOString();
  return memberIds.map((uid) => {
    const t = getClientTaskStats(data.tasks.filter((x) => x.assigned_to === uid), today);
    const tickets = data.tickets.filter((x) => x.assigned_to === uid);
    const notes = data.notes.filter((n) => n.user_id === uid);
    const lastReminder = data.reminders
      .filter((r) => r.assignee_id === uid && r.status === "sent")
      .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
    return {
      user_id: uid,
      tasksTotal: t.total,
      tasksDone: t.done,
      tasksOpen: t.open,
      tasksOverdue: t.overdue,
      completionRate: t.completionRate,
      ticketsAssigned: tickets.length,
      ticketsActive: tickets.filter((x) => isActiveTicket(x.status)).length,
      ticketsUnanswered: tickets.filter((x) => {
        const s = getTicketTracking(x, now).responseState;
        return s === "en_attente" || s === "en_retard";
      }).length,
      ticketsResolved: tickets.filter((x) => x.status === "resolu" || x.status === "ferme").length,
      commentsTotal: notes.length,
      comments30d: notes.filter((n) => n.created_at >= since30).length,
      lastReminderAt: lastReminder?.created_at ?? null,
      lastReminderOpened: lastReminder ? !!lastReminder.opened_at : null,
    };
  });
}

/** Team-wide figures for the "Stats globales" page. */
export function computeGlobalTaskRate(tasks: TrackedTask[], today: string) {
  return getClientTaskStats(tasks, today);
}
