import { BRAND_COLOR, makeCta } from "@/lib/email-template";

/** Agency's permanent Google Meet room, always attached to visio invitations. */
export const DEFAULT_MEET_LINK = "https://meet.google.com/meet/cjd-ydcx-qpe";
export const MEET_INVITE_TRIGGER = "rdv_meet";

export const MEET_MOTIFS = [
  { id: "carte_bizness", label: "Carte Bizness NFC" },
  { id: "site_internet", label: "Site internet" },
  { id: "page_conversion", label: "Page de conversion" },
  { id: "autre", label: "Autre motif (personnalisé)" },
] as const;
export type MeetMotifId = (typeof MEET_MOTIFS)[number]["id"];

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));

/** Final motif text: preset label, or the custom text for "autre" (empty when missing). */
export function meetMotifLabel(id: MeetMotifId, custom?: string) {
  if (id === "autre") return (custom || "").trim();
  return MEET_MOTIFS.find((m) => m.id === id)?.label || "";
}

/** "2026-11-12T14:30" typed in Réunion time → absolute Date. */
export const reunionLocalToDate = (local: string) => new Date(`${local}:00+04:00`);

export const formatReunionDate = (d: Date) =>
  d.toLocaleString("fr-FR", { timeZone: "Indian/Reunion", weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });

/** Default editable opening text: the visio follows a request made to the support team. */
export const defaultMeetIntro = (motif: string) =>
  `Suite à votre demande auprès de notre support concernant votre ${motif || "[motif]"}, nous avons le plaisir de vous envoyer les détails de notre rendez-vous en visio.`;
export const DEFAULT_MEET_CLOSING = "Si ce créneau ne vous convient pas, répondez simplement à ce mail et nous en fixerons un autre.";

/** Plain text typed by staff → escaped HTML paragraphs (blank line = new paragraph). */
const textToParagraphs = (text: string) =>
  text.trim().split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)
    .map((p) => `<p style="margin:0 0 20px">${esc(p).replace(/\n/g, "<br>")}</p>`).join("\n");

export function buildMeetInviteEmail(input: { name?: string | null; motif: string; start: Date; durationMin: number; meet: string; note?: string; intro?: string; closing?: string }) {
  const name = input.name?.trim();
  const when = formatReunionDate(input.start);
  const extra = input.note?.trim() ? textToParagraphs(input.note) : "";
  const intro = textToParagraphs(input.intro ?? defaultMeetIntro(input.motif));
  const closing = textToParagraphs(input.closing ?? DEFAULT_MEET_CLOSING);
  return {
    subject: `Rendez-vous Visio – ${input.motif} – Adamkom by JJP`,
    body: `<p style="margin:0 0 20px">Bonjour${name ? ` <strong>${esc(name)}</strong>` : ""},</p>
${intro}
<table role="presentation" style="margin:0 0 20px;border-collapse:collapse;width:100%">
<tr><td style="padding:6px 0;color:#71717a;width:110px">Motif</td><td style="padding:6px 0"><strong>${esc(input.motif)}</strong></td></tr>
<tr><td style="padding:6px 0;color:#71717a">Date</td><td style="padding:6px 0"><strong>${esc(when)}</strong> (heure de La Réunion)</td></tr>
<tr><td style="padding:6px 0;color:#71717a">Durée</td><td style="padding:6px 0">${input.durationMin} minutes environ</td></tr>
</table>
${extra}
<p style="margin:0 0 20px">Le jour du rendez-vous, il vous suffit de cliquer sur le bouton ci-dessous pour rejoindre la visio Google Meet :</p>
${makeCta("🎥 Rejoindre la visio", input.meet)}
<p style="margin:0 0 20px;font-size:13px;color:#71717a;word-break:break-all">${esc(input.meet)}</p>
${closing}
<p style="margin:0">À très bientôt,<br><strong style="color:${BRAND_COLOR}">L'équipe Adamkom by JJP</strong></p>`,
  };
}
