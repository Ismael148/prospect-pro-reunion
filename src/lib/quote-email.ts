import { QUOTE_TEMPLATES, quoteAnnualRenewals, type QuoteItem } from "./quote-templates";

interface EmailQuote {
  quote_number: string;
  template_key: string;
  company_name: string;
  contact_name?: string | null;
  items?: unknown;
}

const escape = (value: string) => value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] || c));

export function buildQuoteEmail(list: EmailQuote[]) {
  const first = list[0];
  if (!first) return { html: "", subject: "", name: "" };
  const name = first.contact_name || first.company_name;
  const multi = list.length > 1;
  const rows = list.map((q) => `<li style="margin:10px 0"><strong>${escape(QUOTE_TEMPLATES.find((t) => t.key === q.template_key)?.label || "Devis")}</strong> — ${escape(q.quote_number)}</li>`).join("");
  const renewals = list.map((q) => quoteAnnualRenewals(q.template_key, Array.isArray(q.items) ? q.items.filter((item): item is QuoteItem => item !== null && typeof item === "object" && typeof item.description === "string") : []));
  const notes = [
    renewals.some((r) => r.subscription > 0) ? "Chip Tuning / Chip Tuning Plus : abonnement de renouvellement de 149 € / an dès la 2e année, sans engagement (maintenance, mises à jour et suivi technique)." : "",
    renewals.some((r) => r.website > 0) ? "En cas de création de site : renouvellement du nom de domaine et de l’hébergement, en supplément, à environ 90 € / an." : "",
  ].filter(Boolean);
  const html = `<div style="background:#f6f6f6;padding:24px 12px;font-family:Arial,Helvetica,sans-serif;color:#151515">
<div style="max-width:620px;margin:auto;background:#ffffff">
<div style="background:#0d0d0d;padding:26px;text-align:center;border-bottom:4px solid #ff006e"><img src="https://qaxlpmxekcvbrcnqopbp.supabase.co/storage/v1/object/public/email-assets/logo-adamkom-black.png" alt="Adamkom by JJP" style="height:46px;filter:invert(1)"/></div>
<div style="padding:28px;font-size:14px;line-height:1.6">
<p>Bonjour ${escape(name)},</p>
<p>Vous trouverez en pièces jointes ${multi ? "les devis suivants" : "votre devis"} :</p>
<ul style="padding-left:20px">${rows}</ul>
${notes.length ? `<div style="margin:20px 0;padding:12px 16px;background:#fff0f6;border-left:3px solid #ff006e;font-size:13px">${notes.map((note) => `<p style="margin:6px 0">${note}</p>`).join("")}</div>` : ""}
<p>Paiement en 4 fois sans frais possible.</p>
<p>Pour accepter ${multi ? "le devis de votre choix" : "ce devis"}, retournez-le signé avec la mention « Bon pour accord ». Nous restons disponibles pour toute question.</p>
<p>Bien cordialement,<br/><strong>L’équipe Adamkom by JJP</strong><br/>0262 66 68 76 · <a href="mailto:contact@adamkom.com" style="color:#ff006e">contact@adamkom.com</a></p>
</div></div></div>`;
  const subject = multi ? `Vos ${list.length} devis Adamkom by JJP - ${first.company_name}` : `Votre devis Adamkom by JJP n° ${first.quote_number} - ${first.company_name}`;
  return { html, subject, name };
}