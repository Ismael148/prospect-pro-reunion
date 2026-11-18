// Builds the daily overdue-tasks digest email sent to one team member.
export type OverdueTask = {
  id: string;
  title: string;
  due_date: string; // YYYY-MM-DD
  client_name: string | null;
  project_name: string | null;
};

export const AGENDA_URL = "https://ai.adamkom.com/agenda";
export const MAX_ROWS = 25;

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

export function buildOverdueDigest(name: string | null, tasks: OverdueTask[], today: string) {
  const sorted = [...tasks].sort((a, b) => a.due_date.localeCompare(b.due_date));
  const n = sorted.length;
  const subject = `${name ? `${name}, vous` : "Vous"} avez ${n} tâche${n > 1 ? "s" : ""} en retard`;
  const rows = sorted.slice(0, MAX_ROWS).map((t) => {
    const late = daysLate(t.due_date, today);
    return `<tr>
      <td style="padding:10px 12px;border-bottom:1px solid #f1f1f4;font-size:14px;color:#18181b"><strong>${esc(t.title)}</strong><br><span style="font-size:12px;color:#71717a">${esc(t.client_name || t.project_name || "Client")}</span></td>
      <td style="padding:10px 12px;border-bottom:1px solid #f1f1f4;font-size:13px;color:#52525b;white-space:nowrap">${frDate(t.due_date)}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f1f1f4;font-size:13px;color:#e11d48;font-weight:700;white-space:nowrap">${late} j</td>
    </tr>`;
  }).join("");
  const more = n > MAX_ROWS
    ? `<p style="margin:12px 0 0;font-size:13px;color:#71717a">… et ${n - MAX_ROWS} autre${n - MAX_ROWS > 1 ? "s" : ""} tâche${n - MAX_ROWS > 1 ? "s" : ""} en retard dans votre Agenda.</p>`
    : "";
  const html = `<!doctype html>
<html><body style="font-family:Arial,Helvetica,sans-serif;background:#ffffff;margin:0;padding:24px;color:#18181b">
<div style="max-width:620px;margin:0 auto;background:#ffffff;border:1px solid #f1f1f4;border-radius:16px;overflow:hidden">
  <div style="background:#0a0a0a;padding:24px 28px;color:#ffffff">
    <p style="margin:0;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#ff006e;font-weight:700">Adamkom · Agenda</p>
    <h1 style="margin:8px 0 0;font-size:21px">Tâches en retard à traiter</h1>
  </div>
  <div style="padding:28px">
    <p style="margin:0 0 14px">${name ? `Bonjour ${esc(name)},` : "Bonjour,"}</p>
    <p style="margin:0 0 18px;line-height:1.55">Vous avez <strong>${n} tâche${n > 1 ? "s" : ""}</strong> dont la date limite est dépassée. Voici les plus anciennes :</p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;border:1px solid #f1f1f4;border-radius:12px">
      <tr style="background:#fafafa">
        <th align="left" style="padding:10px 12px;font-size:11px;text-transform:uppercase;color:#71717a">Tâche</th>
        <th align="left" style="padding:10px 12px;font-size:11px;text-transform:uppercase;color:#71717a">Échéance</th>
        <th align="left" style="padding:10px 12px;font-size:11px;text-transform:uppercase;color:#71717a">Retard</th>
      </tr>
      ${rows}
    </table>
    ${more}
    <div style="text-align:center;margin:28px 0 8px">
      <a href="${AGENDA_URL}" style="display:inline-block;background:#ff006e;color:#ffffff;text-decoration:none;padding:14px 30px;border-radius:12px;font-weight:700">Ouvrir mon Agenda</a>
    </div>
    <p style="margin:18px 0 0;font-size:13px;color:#71717a;line-height:1.5">Cochez « Terminée » dans l'Agenda dès qu'une tâche est faite : elle disparaîtra du prochain rappel.</p>
  </div>
  <div style="padding:14px;text-align:center;font-size:11px;color:#a1a1aa;background:#fafafa">Rappel automatique envoyé chaque matin de jour ouvré · Adamkom</div>
</div>
</body></html>`;
  return { subject, html };
}
