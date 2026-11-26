import { loadAdamkomRibAttachment } from "./invoice-attachments";

interface QuoteAttachmentInput {
  quote_number: string;
  pdfBase64: string;
}

/** Attach every selected quote and one optional copy of the agency RIB. */
export async function buildQuoteAttachments(quotes: QuoteAttachmentInput[], includeRib = false) {
  const attachments = quotes.map((quote) => ({
    name: `Devis_${quote.quote_number}.pdf`,
    content: quote.pdfBase64,
  }));
  if (includeRib) attachments.push(await loadAdamkomRibAttachment());
  return attachments;
}
