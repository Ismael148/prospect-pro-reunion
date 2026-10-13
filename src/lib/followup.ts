import { PUBLISHED_URL } from "@/lib/constants";
import { BRAND_COLOR, makeCta } from "@/lib/email-template";

export const FOLLOWUP_INTERVAL_DAYS = 15;
export const FOLLOWUP_TRIGGER = "tuning_followup";

export type CampaignStatus = "exclu_ticket" | "exclu_dispo" | "rdv" | "a_relancer" | "attente";

export const CAMPAIGN_LABELS: Record<CampaignStatus, string> = {
  exclu_ticket: "Exclu (Ticket)",
  exclu_dispo: "Exclu (Dispo)",
  rdv: "Rendez-vous calé",
  a_relancer: "À relancer",
  attente: "Actif (En attente)",
};

const DAY = 86_400_000;

/** Exclusion rules: open ticket > pending availability > upcoming confirmed RDV > 15-day spacing. */
export function campaignStatus(input: {
  hasOpenTicket: boolean;
  hasPendingRequest: boolean;
  nextRdv: Date | null;
  lastReminder: Date | null;
  now?: Date;
}): { status: CampaignStatus; nextSend: Date | null } {
  const now = input.now ?? new Date();
  if (input.hasOpenTicket) return { status: "exclu_ticket", nextSend: null };
  if (input.hasPendingRequest) return { status: "exclu_dispo", nextSend: null };
  if (input.nextRdv && input.nextRdv.getTime() > now.getTime()) return { status: "rdv", nextSend: null };
  if (!input.lastReminder) return { status: "a_relancer", nextSend: now };
  const next = new Date(input.lastReminder.getTime() + FOLLOWUP_INTERVAL_DAYS * DAY);
  return next.getTime() <= now.getTime() ? { status: "a_relancer", nextSend: next } : { status: "attente", nextSend: next };
}

export const followupLink = (token?: string | null) => (token ? `${PUBLISHED_URL}/suivi/${token}` : null);
export const supportLink = (token?: string | null) => (token ? `${PUBLISHED_URL}/s/${token}` : null);

const sign = `<p style="margin:0">Cordialement,<br><strong style="color:${BRAND_COLOR}">L'équipe Support – Adamkom by JJP</strong></p>`;
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
const note = (n?: string) => (n?.trim() ? `<p style="margin:0 0 20px">${esc(n.trim()).replace(/\n/g, "<br>")}</p>` : "");

export function buildReminderEmail(name: string, token?: string | null) {
  const f = followupLink(token);
  const s = supportLink(token);
  return {
    subject: "[Adamkom by JJP] Suivi de votre solution – Vos besoins & mises à jour",
    body: `<p style="margin:0 0 20px">Bonjour <strong>${esc(name)}</strong>,</p>
<p style="margin:0 0 20px">Nous espérons que vous allez bien et que votre activité se porte bien.</p>
<p style="margin:0 0 20px"><strong>Chez Adamkom by JJP</strong>, nous tenons à être pleinement à vos côtés. Si vous avez besoin d'effectuer des modifications, de déployer des mises à jour ou de poser des questions techniques, vous disposez de deux options directes :</p>
<ul style="margin:0 0 20px;padding-left:20px">
<li style="margin-bottom:8px"><strong>Ouvrir un ticket support</strong> : transmettez votre demande directement depuis votre espace client.</li>
<li><strong>Planifier un point Visio (Google Meet)</strong> : transmettez-nous vos créneaux de disponibilité (du lundi au vendredi, de 9h à 17h) via votre formulaire de suivi.</li>
</ul>
${f ? makeCta("📅 Transmettre mes disponibilités", f) : ""}
${s ? `<p style="margin:0 0 20px;text-align:center"><a href="${s}" style="color:${BRAND_COLOR}">Ouvrir un ticket support</a></p>` : ""}
<p style="margin:0 0 20px">Dès réception de vos créneaux, notre équipe vous confirmera l'heure exacte et vous transmettra votre lien Google Meet dédié.</p>
${sign}`,
  };
}

export function buildConfirmEmail(name: string, dateLabel: string, meet: string, extra?: string) {
  return {
    subject: "Confirmation de votre rendez-vous Visio avec Adamkom by JJP",
    body: `<p style="margin:0 0 20px">Bonjour <strong>${esc(name)}</strong>,</p>
<p style="margin:0 0 20px">Nous vous confirmons notre rendez-vous visio le <strong>${esc(dateLabel)}</strong>.</p>
<p style="margin:0 0 20px">Voici votre lien d'accès direct Google Meet :</p>
${makeCta("🎥 Rejoindre la visio", meet)}
<p style="margin:0 0 20px;font-size:13px;color:#71717a;word-break:break-all">${esc(meet)}</p>
${note(extra)}
<p style="margin:0">À très bientôt,<br><strong style="color:${BRAND_COLOR}">L'équipe Adamkom by JJP</strong></p>`,
  };
}

export function buildRescheduleEmail(name: string, token?: string | null, extra?: string) {
  const f = followupLink(token);
  return {
    subject: "Nouveaux créneaux pour votre rendez-vous Visio – Adamkom by JJP",
    body: `<p style="margin:0 0 20px">Bonjour <strong>${esc(name)}</strong>,</p>
<p style="margin:0 0 20px">Malheureusement, les créneaux proposés ne sont pas disponibles de notre côté. Pourriez-vous nous transmettre de nouvelles plages horaires, <strong>du lundi au vendredi, entre 9h et 17h</strong> ?</p>
${note(extra)}
${f ? makeCta("📅 Proposer de nouveaux créneaux", f) : ""}
${sign}`,
  };
}

export function buildCancelEmail(name: string, reason?: string) {
  return {
    subject: "Annulation de votre demande de rendez-vous – Adamkom by JJP",
    body: `<p style="margin:0 0 20px">Bonjour <strong>${esc(name)}</strong>,</p>
<p style="margin:0 0 20px">Nous vous informons que votre demande de rendez-vous visio a été annulée.</p>
${note(reason)}
<p style="margin:0 0 20px">Vous pouvez à tout moment nous recontacter ou ouvrir un ticket support si besoin.</p>
${sign}`,
  };
}
