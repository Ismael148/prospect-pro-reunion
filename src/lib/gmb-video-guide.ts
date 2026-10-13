import { makeCta, wrapInBrandedTemplate, type EmailBrandingConfig } from "@/lib/email-template";
import { PUBLISHED_URL } from "@/lib/constants";

export const GOOGLE_VIDEO_HELP = "https://support.google.com/business/answer/14271705?hl=fr";
export const GOOGLE_VIDEO_RULES = { minimumSeconds: 30, reviewBusinessDays: 5 };
export const GOOGLE_VERIFICATION_VIDEOS = {
  storefront: "gXOKDkUotns",
  service: "WJWNHwLWWkI",
};
export const hasGmbVideoGuide = (pack?: string | null) => pack === "star_bizness_tuning";
export const gmbVideoGuideUrl = (company: string) => `${PUBLISHED_URL}/tuto/gmb-video?${new URLSearchParams({ entreprise: company })}`;

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character] || character));
}

export function buildGmbVideoEmail(company: string, manager?: string | null, branding?: EmailBrandingConfig) {
  const subject = `Validation vidéo de votre fiche Google — ${company}`;
  const body = `<p>Bonjour <strong>${escapeHtml(manager?.trim() || company)}</strong>,</p>
<p>Pour faire valider la fiche Google de <strong>${escapeHtml(company)}</strong>, nous vous avons préparé un guide simple, étape par étape, accompagné de vidéos officielles Google.</p>
<p>Vous y trouverez les éléments à filmer : votre emplacement, votre activité et la preuve que vous gérez l’entreprise, ainsi que les précautions à prendre avant l’enregistrement.</p>
${makeCta("Voir le tutoriel de validation vidéo", gmbVideoGuideUrl(company), branding?.brand_color)}
<p>La vidéo doit être enregistrée directement depuis votre fiche Google sur votre téléphone, en une seule prise d’au moins 30 secondes. Ne nous envoyez pas cette vidéo par email.</p>
<p>Google choisit les méthodes de validation disponibles : utilisez ce guide si l’option vidéo apparaît sur votre fiche. Une fois la vidéo envoyée à Google, répondez à cet email pour nous prévenir.</p>
<p>Cordialement,<br><strong>L’équipe Adamkom by JJP</strong></p>`;
  return { subject, html: wrapInBrandedTemplate(body, undefined, branding) };
}