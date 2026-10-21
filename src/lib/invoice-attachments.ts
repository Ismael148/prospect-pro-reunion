export const ADAMKOM_RIB_PATH = "/documents/RIB_Adamkom_by_JJP.pdf";

/** Always attach the invoice; load the agency RIB only when explicitly selected. */
export async function buildInvoiceAttachments(invoiceNumber: string, pdfBase64: string, includeRib = false) {
  const attachments = [{ name: `Facture_${invoiceNumber}.pdf`, content: pdfBase64 }];
  if (!includeRib) return attachments;

  const response = await fetch(ADAMKOM_RIB_PATH);
  if (!response.ok) throw new Error("Impossible de charger le RIB Adamkom. Aucun email n’a été envoyé.");
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-") {
    throw new Error("Le RIB Adamkom n’est pas un PDF valide. Aucun email n’a été envoyé.");
  }
  const content = btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join(""));
  attachments.push({ name: "RIB_Adamkom_by_JJP.pdf", content });
  return attachments;
}