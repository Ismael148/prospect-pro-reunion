import { QUOTE_TEMPLATES, quoteAnnualRenewals, type QuoteItem } from "./quote-templates";

interface EmailQuote {
  quote_number: string;
  template_key: string;
  company_name: string;
  contact_name?: string | null;
  items?: unknown;
}

export interface QuoteEmailDraft {
  subject: string;
  message: string;
}

const escape = (value: string) => value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] || c));

function quoteEmailContent(list: EmailQuote[]) {
  const first = list[0];
  if (!first) return null;
  const name = first.contact_name || first.company_name;
  const multi = list.length > 1;
  const documents = list.map((quote) => ({
    label: QUOTE_TEMPLATES.find((template) => template.key === quote.template_key)?.label || "Devis",
    number: quote.quote_number,
  }));
  const renewals = list.map((quote) => quoteAnnualRenewals(
    quote.template_key,
    Array.isArray(quote.items)
      ? quote.items.filter((item): item is QuoteItem => item !== null && typeof item === "object" && typeof item.description === "string")
      : [],
  ));
  const notes = [
    renewals.some((renewal) => renewal.subscription > 0) ? "Chip Tuning / Chip Tuning Plus : abonnement de renouvellement de 149 € / an dès la 2e année, sans engagement (maintenance, mises à jour et suivi technique)." : "",
    renewals.some((renewal) => renewal.website > 0) ? "En cas de création de site : renouvellement du nom de domaine et de l’hébergement, en supplément, à environ 90 € / an." : "",
  ].filter(Boolean);
  const subject = multi
    ? `Vos ${list.length} devis Adamkom by JJP - ${first.company_name}`
    : `Votre devis Adamkom by JJP n° ${first.quote_number} - ${first.company_name}`;
  const acceptance = `Pour accepter ${multi ? "le devis de votre choix" : "ce devis"}, retournez-le signé avec la mention « Bon pour accord ». Nous restons disponibles pour toute question.`;
  const message = [
    `Bonjour ${name},`,
    `Vous trouverez en pièces jointes ${multi ? "les devis suivants" : "votre devis"} :\n${documents.map((document) => `${document.label} — ${document.number}`).join("\n")}`,
    ...notes,
    acceptance,
    "Bien cordialement,\nL’équipe Adamkom by JJP\n0262 66 68 76 · contact@adamkom.com",
  ].join("\n\n");
  return { name, multi, documents, notes, subject, message, acceptance };
}

/** Texte entièrement modifiable dans la fenêtre d'envoi. */
export function getQuoteEmailDraft(list: EmailQuote[]): QuoteEmailDraft {
  const content = quoteEmailContent(list);
  return content ? { subject: content.subject, message: content.message } : { subject: "", message: "" };
}

/** Le même constructeur alimente l'aperçu et l'envoi, y compris après modification. */
export function buildQuoteEmail(list: EmailQuote[], draft?: QuoteEmailDraft) {
  const content = quoteEmailContent(list);
  if (!content) return { html: "", subject: "", name: "" };
  const message = draft?.message ?? content.message;
  const editedMessage = draft !== undefined && message !== content.message;
  const rows = content.documents.map((document) => `<li style="margin:10px 0"><strong>${escape(document.label)}</strong> — ${escape(document.number)}</li>`).join("");
  const defaultBody = `<p>Bonjour ${escape(content.name)},</p>
<p>Vous trouverez en pièces jointes ${content.multi ? "les devis suivants" : "votre devis"} :</p>
<ul style="padding-left:20px">${rows}</ul>
${content.notes.length ? `<div style="margin:20px 0;padding:12px 16px;background:#fff0f6;border-left:3px solid #ff006e;font-size:13px">${content.notes.map((note) => `<p style="margin:6px 0">${note}</p>`).join("")}</div>` : ""}
<p>${content.acceptance}</p>
<p>Bien cordialement,<br/><strong>L’équipe Adamkom by JJP</strong><br/>0262 66 68 76 · <a href="mailto:contact@adamkom.com" style="color:#ff006e">contact@adamkom.com</a></p>`;
  const editedBody = message.split(/\n\s*\n/).map((paragraph) =>
    `<p style="margin:0 0 16px;overflow-wrap:anywhere;white-space:pre-line">${escape(paragraph)}</p>`,
  ).join("");
  const html = `<div style="background:#f6f6f6;padding:24px 12px;font-family:Arial,Helvetica,sans-serif;color:#151515">
<div style="max-width:620px;margin:auto;background:#ffffff">
<div style="background:#0d0d0d;padding:26px;text-align:center;border-bottom:4px solid #ff006e"><img src="https://qaxlpmxekcvbrcnqopbp.supabase.co/storage/v1/object/public/email-assets/logo-adamkom-black.png" alt="Adamkom by JJP" style="height:46px;filter:invert(1)"/></div>
<div style="padding:28px;font-size:14px;line-height:1.6">${editedMessage ? editedBody : defaultBody}</div>
</div></div>`;
  return { html, subject: draft?.subject ?? content.subject, name: content.name };
}
