/**
 * Task tracking shared by the Agenda, the "Clients par statut" page and the
 * client task summary. Dates are compared as Réunion calendar days (UTC+4).
 */
export type TrackedTask = {
  id: string;
  status: string;
  due_date: string | null;
  project_status?: string | null;
};

export const DONE_TASK_STATUS = "termine";
/** Projects in these states no longer drive deadlines (no "en retard", hidden from the agenda). */
export const INACTIVE_PROJECT_STATUSES = ["termine", "annule"];

/** Today's date in La Réunion as YYYY-MM-DD. */
export function reunionToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Indian/Reunion", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export function addDays(day: string, n: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export const isTaskDone = (t: TrackedTask) => t.status === DONE_TASK_STATUS;
export const isProjectActive = (t: TrackedTask) => !INACTIVE_PROJECT_STATUSES.includes(t.project_status || "");

/** Open task of an active project whose due date is before today. */
export function isTaskOverdue(t: TrackedTask, today: string): boolean {
  return !isTaskDone(t) && isProjectActive(t) && !!t.due_date && t.due_date < today;
}

export type AgendaBucket = "retard" | "aujourdhui" | "demain" | "semaine" | "plus_tard" | "sans_date";

export const AGENDA_BUCKETS: { id: AgendaBucket; label: string }[] = [
  { id: "retard", label: "En retard" },
  { id: "aujourdhui", label: "Aujourd'hui" },
  { id: "demain", label: "Demain" },
  { id: "semaine", label: "Dans les 7 jours" },
  { id: "plus_tard", label: "Plus tard" },
  { id: "sans_date", label: "Sans date" },
];

export function agendaBucket(due: string | null, today: string): AgendaBucket {
  if (!due) return "sans_date";
  if (due < today) return "retard";
  if (due === today) return "aujourdhui";
  if (due === addDays(today, 1)) return "demain";
  if (due <= addDays(today, 7)) return "semaine";
  return "plus_tard";
}

/** Tasks that belong in the agenda: not done, in an active project. */
export const isAgendaTask = (t: TrackedTask) => !isTaskDone(t) && isProjectActive(t);

export type ClientTaskStats = {
  total: number;
  done: number;
  open: number;
  overdue: number;
  /** Percentage of done tasks (0-100), null when the client has no task. */
  completionRate: number | null;
  /** Earliest upcoming due date (today or later) among open tasks of active projects. */
  nextDue: string | null;
};

/** Cancelled projects are ignored entirely. */
export function getClientTaskStats(tasks: TrackedTask[], today: string): ClientTaskStats {
  const counted = tasks.filter((t) => t.project_status !== "annule");
  const done = counted.filter(isTaskDone).length;
  const upcoming = counted
    .filter((t) => isAgendaTask(t) && t.due_date && t.due_date >= today)
    .map((t) => t.due_date!)
    .sort();
  return {
    total: counted.length,
    done,
    open: counted.length - done,
    overdue: counted.filter((t) => isTaskOverdue(t, today)).length,
    completionRate: counted.length ? Math.round((done / counted.length) * 100) : null,
    nextDue: upcoming[0] ?? null,
  };
}
