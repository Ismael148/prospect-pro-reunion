// Builds the individual overdue-task reminder email (one email = one late task, with its project).
export type OverdueTask = {
  id: string;
  title: string;
  due_date: string; // YYYY-MM-DD
  client_name: string | null;
  project_id: string | null;
  project_name: string | null;
};

export const APP_URL = "https://ai.adamkom.com";
export const AGENDA_URL = `${APP_URL}/agenda`;
/** Maximum individual reminder emails one member receives per morning. */
export const MAX_PER_MEMBER = 10;

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const DAY = 86_400_000;
export const daysLate = (due: string, today: string) =>
  Math.max(0, Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${due}T00:00:00Z`)) / DAY));

const frDate = (d: string) => {
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
};

/** First name from the profile, or null so the greeting stays a simple "Bonjour,". */
export const firstName = (fullName: string | null | undefined) => {
  const n = (fullName || "").trim().split(/\s+/)[0];
  return n || null;
};

/**
 * Picks which late tasks get an individual email this morning:
 * never-reminded tasks first, then the least recently reminded, then the oldest deadline.
 * Tasks already reminded today are skipped.
 */
export function pickTasksToRemind(
  tasks: OverdueTask[],
  lastReminded: Map<string, string>, // task id -> ISO date of the last sent reminder
  today: string,
  limit = MAX_PER_MEMBER,
  remindedToday: Set<string> = new Set(),
) {
  return tasks
    .filter((t) => !remindedToday.has(t.id))
    .sort((a, b) => {
      const la = lastReminded.get(a.id) ?? "";
      const lb = lastReminded.get(b.id) ?? "";
      if (la !== lb) return la < lb ? -1 : 1;
      return a.due_date.localeCompare(b.due_date) || a.id.localeCompare(b.id);
    })
    .slice(0, Math.max(0, limit));
}

export function buildTaskReminder(name: string | null, task: OverdueTask, today: string, totalLate: number) {
  const late = daysLate(task.due_date, today);
  const project = task.project_name || "Projet";
  const subject = `${name ? `${name}, tâche` : "Tâche"} en retard : ${task.title} (${project})`;
  const projectUrl = task.project_id ? `${APP_URL}/projets/${task.project_id}` : AGENDA_URL;
  const others = totalLate - 1;
  const row = (label: string, value: string, strong = false) => `<tr>
      <td style="padding:10px 14px;border-bottom:1px solid #f1f1f4;font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#71717a;width:120px">${label}</td>
      <td style="padding:10px 14px;border-bottom:1px solid #f1f1f4;font-size:14px;color:${strong ? "#e11d48" : "#18181b"};font-weight:${strong ? 700 : 500}">${value}</td>
    </tr>`;
  const html = `<!doctype html>
<html><body style="font-family:Arial,Helvetica,sans-serif;background:#ffffff;margin:0;padding:24px;color:#18181b">
<div style="max-width:620px;margin:0 auto;background:#ffffff;border:1px solid #f1f1f4;border-radius:16px;overflow:hidden">
  <div style="background:#0a0a0a;padding:24px 28px;color:#ffffff">
    <p style="margin:0;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#ff006e;font-weight:700">Adamkom · Tâche en retard</p>
    <h1 style="margin:8px 0 0;font-size:21px;line-height:1.3">${esc(task.title)}</h1>
  </div>
  <div style="padding:28px">
    <p style="margin:0 0 14px">${name ? `Bonjour ${esc(name)},` : "Bonjour,"}</p>
    <p style="margin:0 0 18px;line-height:1.55">La date limite de cette tâche est dépassée. Merci de la traiter dès que possible :</p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;border:1px solid #f1f1f4;border-radius:12px">
      ${row("Tâche", `<strong>${esc(task.title)}</strong>`)}
      ${row("Projet", esc(project))}
      ${row("Client", esc(task.client_name || "—"))}
      ${row("Échéance", frDate(task.due_date))}
      ${row("Retard", `${late} jour${late > 1 ? "s" : ""}`, true)}
    </table>
    <div style="text-align:center;margin:28px 0 8px">
      <a href="${projectUrl}" style="display:inline-block;background:#ff006e;color:#ffffff;text-decoration:none;padding:14px 30px;border-radius:12px;font-weight:700">Ouvrir le projet</a>
    </div>
    <p style="margin:18px 0 0;font-size:13px;color:#71717a;line-height:1.5">Cochez « Terminée » dans votre <a href="${AGENDA_URL}" style="color:#ff006e">Agenda</a> dès que la tâche est faite : elle ne sera plus relancée.${others > 0 ? ` Vous avez ${others} autre${others > 1 ? "s" : ""} tâche${others > 1 ? "s" : ""} en retard.` : ""}</p>
  </div>
  <div style="padding:14px;text-align:center;font-size:11px;color:#a1a1aa;background:#fafafa">Rappel automatique envoyé chaque matin de jour ouvré · Adamkom</div>
</div>
</body></html>`;
  return { subject, html };
}
