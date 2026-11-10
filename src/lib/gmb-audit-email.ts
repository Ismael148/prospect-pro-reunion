import { makeCta, wrapInBrandedTemplate, type EmailBrandingConfig } from "@/lib/email-template";
import { PUBLISHED_URL } from "@/lib/constants";
import { ALL_AUDIT_CRITERIA, auditScoreLabel, type AuditCriteria } from "@/lib/gmb-audit";

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

export const gmbReportUrl = (token?: string | null) => (token ? `${PUBLISHED_URL}/mon-gmb/${token}` : null);

export function countAuditStatuses(criteria: AuditCriteria | null | undefined) {
  const counts = { ok: 0, improve: 0, missing: 0 };
  for (const c of ALL_AUDIT_CRITERIA) {
    const s = criteria?.[c.id]?.status;
    if (s === "ok" || s === "improve" || s === "missing") counts[s] += 1;
  }
  return counts;
}

/** Mail d'envoi du rapport d'analyse : salue le gérant par son nom, sinon « Bonjour, ». */
export function buildGmbAuditEmail(input: {
  company: string;
  managerName?: string | null;
  score: number;
  criteria: AuditCriteria;
  summary?: string | null;
  reportUrl: string;
  branding?: EmailBrandingConfig;
}) {
  const { ok, improve, missing } = countAuditStatuses(input.criteria);
  const name = input.managerName?.trim();
  const subject = `Analyse de votre fiche Google — ${input.company}`;
  const summary = input.summary?.trim()
    ? `<p><strong>Nos recommandations :</strong><br>${esc(input.summary.trim()).replace(/\n/g, "<br>")}</p>`
    : "";
  const body = `<p>Bonjour${name ? ` <strong>${esc(name)}</strong>` : ""},</p>
<p>Nous avons analysé en détail votre fiche Google, point par point.</p>
<p style="font-size:18px"><strong>Note de votre fiche : ${input.score}/100</strong> — ${auditScoreLabel(input.score)}</p>
<p>✅ ${ok} point${ok > 1 ? "s" : ""} conforme${ok > 1 ? "s" : ""}<br>🟠 ${improve} point${improve > 1 ? "s" : ""} à améliorer<br>❌ ${missing} point${missing > 1 ? "s" : ""} manquant${missing > 1 ? "s" : ""}</p>
${summary}
<p>Le rapport complet vous montre chaque point vérifié ainsi que l'avancement de toutes les étapes de gestion de votre fiche.</p>
${makeCta("Voir le rapport de ma fiche Google", input.reportUrl, input.branding?.brand_color)}
<p>Cordialement,<br><strong>L'équipe Adamkom by JJP</strong></p>`;
  return { subject, html: wrapInBrandedTemplate(body, undefined, input.branding) };
}
