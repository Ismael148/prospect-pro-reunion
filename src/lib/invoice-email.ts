// ── Shared invoice email builder ───────────────────────────────────────
// Used for BOTH the preview shown before sending and the payload sent to
// the client, so what you see is what the client receives.

import { wrapInBrandedTemplate } from "./email-template";
import { PUBLISHED_URL, PACK_LABELS } from "./constants";

const escape = (value: string) =>
  value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] || c));

const eur = (n: number) => `${Number(n || 0).toFixed(2).replace(".", ",")} €`;

export interface InvoiceEmailInvoice {
  invoice_number: string;
  total_amount: number;
  due_date?: string | null;
  status: string;
  paid_date?: string | null;
}

export interface InvoiceEmailClient {
  company_name: string;
  manager_name?: string | null;
  support_token?: string | null;
  pack_type?: string | null;
  tuning_website_addon?: boolean | null;
}

export interface InvoiceEmailDraft {
  subject: string;
  message: string;
}

export function getInvoiceEmailDraft(inv: InvoiceEmailInvoice, client: InvoiceEmailClient): InvoiceEmailDraft {
  const name = client.manager_name?.trim();
  const packLabel = (PACK_LABELS as Record<string, string>)[client.pack_type as string];
  return {
    subject: `Facture n° ${inv.invoice_number} - Adamkom by JJP`,
    message: [
      name ? `Bonjour ${name},` : "Bonjour,",
      `Vous trouverez en pièce jointe votre facture n° ${inv.invoice_number}.`,
      packLabel ? `Contrat : ${packLabel}${client.tuning_website_addon ? " + Création site internet" : ""}` : "",
      `Montant TTC : ${eur(inv.total_amount)}`,
      inv.due_date ? `Date d'échéance : ${new Date(inv.due_date).toLocaleDateString("fr-FR")}` : "",
      inv.status === "payee"
        ? `Cette facture est soldée${inv.paid_date ? ` (paiement reçu le ${new Date(inv.paid_date).toLocaleDateString("fr-FR")})` : ""}. Aucun règlement complémentaire n'est attendu.`
        : `Merci d'indiquer la référence « Facture ${inv.invoice_number} » lors de votre règlement.`,
      "Nous restons à votre disposition pour toute question.",
      "Bien cordialement,\nL'équipe Adamkom by JJP",
    ].filter(Boolean).join("\n\n"),
  };
}

export function buildInvoiceEmail(inv: InvoiceEmailInvoice, client: InvoiceEmailClient, draft?: InvoiceEmailDraft) {
  const defaults = getInvoiceEmailDraft(inv, client);
  const isPaid = inv.status === "payee";
  const name = client.manager_name?.trim();
  const greeting = name ? `Bonjour ${escape(name)},` : "Bonjour,";
  const supportLink = client.support_token ? `${PUBLISHED_URL}/s/${client.support_token}` : undefined;
  const packLabel = (PACK_LABELS as Record<string, string>)[client.pack_type as string] || null;
  const packLine = packLabel
    ? `<p style="margin:0 0 16px;font-size:13px;color:#71717a">Contrat : ${escape(client.tuning_website_addon ? `${packLabel} + Création site internet` : packLabel)}</p>`
    : "";

  const paymentNote = isPaid
    ? `<div style="margin:20px 0;padding:14px 18px;background:#f0fdf4;border-left:3px solid #16a34a;font-size:14px;color:#166534">
        Cette facture est <strong>soldée</strong>${inv.paid_date ? ` (paiement reçu le ${new Date(inv.paid_date).toLocaleDateString("fr-FR")})` : ""}. Aucun règlement complémentaire n'est attendu.
      </div>`
    : `<div style="margin:20px 0;padding:14px 18px;background:#fff0f6;border-left:3px solid #ff006e;font-size:14px;color:#7a2949">
        Merci d'indiquer la référence <strong>« Facture ${escape(inv.invoice_number)} »</strong> lors de votre règlement.
      </div>`;

  const body = `
    <p style="margin:0 0 16px">${greeting}</p>
    <p style="margin:0 0 16px">Vous trouverez en pièce jointe votre facture <strong>n° ${escape(inv.invoice_number)}</strong>.</p>
    ${packLine}
    <table role="presentation" style="width:100%;border-collapse:collapse;margin:8px 0 4px;font-size:14px">
      <tr>
        <td style="padding:10px 14px;background:#fafafa;border:1px solid #f0f0f0;color:#71717a">Montant TTC</td>
        <td style="padding:10px 14px;background:#fafafa;border:1px solid #f0f0f0;text-align:right;font-weight:700;color:#ff006e">${eur(inv.total_amount)}</td>
      </tr>
      ${inv.due_date ? `<tr>
        <td style="padding:10px 14px;border:1px solid #f0f0f0;color:#71717a">Date d'échéance</td>
        <td style="padding:10px 14px;border:1px solid #f0f0f0;text-align:right;font-weight:600">${new Date(inv.due_date).toLocaleDateString("fr-FR")}</td>
      </tr>` : ""}
    </table>
    ${paymentNote}
    <p style="margin:0 0 16px">Nous restons à votre disposition pour toute question.</p>
    <p style="margin:0">Bien cordialement,<br/><strong>L'équipe Adamkom by JJP</strong></p>`;

  return {
    subject: draft?.subject.trim() ?? defaults.subject,
    html: wrapInBrandedTemplate(
      draft && draft.message !== defaults.message
        ? draft.message.split(/\n\s*\n/).map((paragraph) => `<p style="margin:0 0 16px;overflow-wrap:anywhere">${escape(paragraph).replace(/\n/g, "<br/>")}</p>`).join("")
        : body,
      supportLink,
    ),
  };
}
