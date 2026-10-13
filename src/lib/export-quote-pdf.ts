import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { INVOICE_LOGO_PNG } from "@/lib/invoice-logo";
import { ISSUER } from "@/lib/export-invoice-pdf";
import { cleanQuoteDescription, cleanQuoteNotes, type QuoteItem } from "@/lib/quote-templates";

export interface QuotePDFData {
  quote_number: string;
  created_at?: string;
  validity_days: number;
  items: QuoteItem[];
  discount_amount: number;
  tax_rate: number;
  amount: number;
  tax_amount: number;
  total_amount: number;
  notes?: string | null;
  renewal_note?: string | null;
  deposit_amount?: number | null;
  payment_due_date?: string | null;
  client: { company_name: string; contact_name?: string | null; address?: string | null; postal_code?: string | null; city?: string | null; email?: string | null; phone?: string | null; siret?: string | null };
}

const INK = [13, 13, 13] as const;
const PINK = [255, 0, 110] as const;
const WHITE = [255, 255, 255] as const;
const GRAY = [100, 100, 100] as const;
const PALE = [248, 248, 249] as const;
const RULE = [226, 226, 230] as const;
const eur = (n: number) => `${Number(n).toFixed(2).replace(".", ",")} €`;

export function exportQuotePDF(data: QuotePDFData, options?: { returnBase64?: boolean }): string | undefined {
  const doc = new jsPDF();
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pw - margin * 2;
  const bottom = ph - 22;
  const date = data.created_at ? new Date(data.created_at) : new Date();
  const until = new Date(date.getTime() + data.validity_days * 86400000);
  let y = 15;
  const ensureSpace = (height: number) => {
    if (y + height > bottom) { doc.addPage(); y = 18; }
  };
  const lastTableY = () => (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y;

  try { doc.addImage(INVOICE_LOGO_PNG, "PNG", margin, y, 22, 22); } catch { /* Brand name remains visible. */ }
  doc.setTextColor(...INK); doc.setFont("helvetica", "bold"); doc.setFontSize(13);
  doc.text("ADAMKOM by JJP", 42, 23);
  doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(...GRAY);
  doc.text("La performance digitale", 42, 29);
  doc.setFont("helvetica", "bold"); doc.setFontSize(22); doc.setTextColor(...INK);
  doc.text("DEVIS", pw - margin, 23, { align: "right" });
  doc.setFontSize(9); doc.text(data.quote_number, pw - margin, 30, { align: "right" });
  doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(...GRAY);
  doc.text(`Date : ${date.toLocaleDateString("fr-FR")}  |  Validité : ${until.toLocaleDateString("fr-FR")}`, pw - margin, 37, { align: "right" });
  doc.setDrawColor(...PINK); doc.setLineWidth(0.7); doc.line(margin, 40, pw - margin, 40);

  // Table layout wraps both address blocks, including long client names and emails.
  const c = data.client;
  autoTable(doc, {
    startY: 44,
    body: [[
      [ISSUER.name, ISSUER.address, `Tél : ${ISSUER.phone}`, `SIRET : ${ISSUER.siret}`, ISSUER.email].join("\n"),
      [c.company_name, c.contact_name, c.address, [c.postal_code, c.city].filter(Boolean).join(" "), c.phone, c.email, c.siret ? `SIRET : ${c.siret}` : ""].filter(Boolean).join("\n"),
    ]],
    head: [["ÉMETTEUR", "DEVIS ÉTABLI POUR"]],
    theme: "plain",
    styles: { font: "helvetica", fontSize: 8, textColor: [...GRAY], cellPadding: { top: 1, bottom: 1, left: 0, right: 8 }, overflow: "linebreak" },
    headStyles: { textColor: [...PINK], fontSize: 8, fontStyle: "bold" },
    columnStyles: { 0: { cellWidth: contentWidth / 2 }, 1: { cellWidth: contentWidth / 2 } },
    margin: { left: margin, right: margin, top: 18, bottom: 22 },
  });
  y = lastTableY() + 5;
  const rows = data.items.filter((i) => i.included !== false);
  const descriptionWidth = contentWidth - 64;
  const serviceText = rows.map((item) => {
    const text = cleanQuoteDescription(item.description).replace(/[—–]/g, "-");
    const separator = text.indexOf(" - ");
    const title = separator < 0 ? text : text.slice(0, separator);
    const description = separator < 0 ? "" : text.slice(separator + 3);
    doc.setFont("helvetica", "bold"); doc.setFontSize(10);
    const titleLines: string[] = doc.splitTextToSize(title, descriptionWidth - 10);
    doc.setFont("helvetica", "normal"); doc.setFontSize(9);
    const descriptionLines: string[] = description ? doc.splitTextToSize(description, descriptionWidth - 10) : [];
    const height = 9 + titleLines.length * 4.6 + (descriptionLines.length ? 2 + descriptionLines.length * 4.3 : 0);
    return { titleLines, descriptionLines, height, text };
  });
  autoTable(doc, {
    startY: y,
    head: [["PRESTATION", "QTÉ", "PRIX U. TTC", "TOTAL TTC"]],
    body: rows.map((it, index) => [serviceText[index].text, String(it.quantity), it.unit_price === 0 ? "Inclus" : eur(it.unit_price), it.unit_price === 0 ? "Inclus" : eur(it.quantity * it.unit_price)]),
    theme: "plain",
    styles: { font: "helvetica", fontSize: 9, textColor: [...GRAY], cellPadding: { top: 4, bottom: 4, left: 3, right: 3 }, valign: "middle", overflow: "linebreak", lineColor: [...RULE], lineWidth: { bottom: 0.15 } },
    headStyles: { fillColor: [...INK], textColor: [...WHITE], fontStyle: "bold", fontSize: 8, cellPadding: { top: 4, bottom: 4, left: 3, right: 3 }, valign: "middle" },
    columnStyles: { 0: { cellWidth: descriptionWidth }, 1: { cellWidth: 12, halign: "center" }, 2: { cellWidth: 26, halign: "center" }, 3: { cellWidth: 26, halign: "center" } },
    margin: { left: margin, right: margin, top: 18, bottom: 22 },
    rowPageBreak: "avoid",
    didParseCell: (cell) => {
      if (cell.section !== "body") return;
      const service = serviceText[cell.row.index];
      if (rows[cell.row.index].unit_price > 0) {
        cell.cell.styles.fillColor = [...PALE];
        cell.cell.styles.fontStyle = "bold";
        cell.cell.styles.textColor = [...INK];
      }
      // Extremely long custom text uses the library's standard safe pagination.
      if (cell.column.index === 0 && service.height < bottom - 35) {
        cell.cell.text = [];
        cell.cell.styles.minCellHeight = service.height;
      }
    },
    didDrawCell: (cell) => {
      if (cell.section !== "body" || cell.column.index !== 0) return;
      const service = serviceText[cell.row.index];
      if (service.height >= bottom - 35) return;
      const x = cell.cell.x + 5;
      let baseline = cell.cell.y + 7.5;
      doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(...INK);
      doc.text(service.titleLines, x, baseline, { lineHeightFactor: 1.3 });
      if (service.descriptionLines.length) {
        baseline += service.titleLines.length * 4.6 + 2;
        doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(...GRAY);
        doc.text(service.descriptionLines, x, baseline, { lineHeightFactor: 1.35 });
      }
    },
  });
  y = lastTableY() + 5;

  const deposit = Number(data.deposit_amount || 0);
  const detailRows: [string, string][] = [];
  if (data.discount_amount > 0) detailRows.push(["Sous-total TTC", eur(data.total_amount + data.discount_amount)], ["Remise", `-${eur(data.discount_amount)}`]);
  if (data.tax_rate > 0) detailRows.push([`dont TVA (${data.tax_rate} %)`, eur(data.tax_amount)]);
  if (deposit > 0) detailRows.push(["Acompte", eur(deposit)], ["Restant dû", eur(Math.max(0, data.total_amount - deposit))]);
  if (data.payment_due_date) detailRows.push(["Échéance", new Date(data.payment_due_date).toLocaleDateString("fr-FR")]);
  const summaryHeight = Math.max(30, 18 + detailRows.length * 6);
  ensureSpace(summaryHeight);
  const summaryX = pw - margin - 80;
  doc.setDrawColor(...RULE); doc.setLineWidth(0.3); doc.rect(margin, y, 85, 30);
  doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(...INK);
  doc.text("BON POUR ACCORD", margin + 5, y + 7);
  doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(...GRAY);
  doc.text("Date, signature et cachet du client", margin + 5, y + 13);
  doc.text("précédés de « Bon pour accord »", margin + 5, y + 18);

  doc.setFillColor(...INK); doc.rect(summaryX, y, 80, 18, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(...WHITE);
  doc.text("TOTAL TTC", summaryX + 5, y + 11);
  doc.setTextColor(...PINK);
  // Price is centered in its own half, with a guaranteed inset from the edge.
  const price = eur(data.total_amount);
  doc.setFontSize(Math.min(13, 13 * 34 / Math.max(34, doc.getTextWidth(price) * 13 / 9)));
  doc.text(price, summaryX + 59, y + 11, { align: "center" });
  doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(...GRAY);
  detailRows.forEach(([label, value], i) => {
    doc.text(label, summaryX + 3, y + 24 + i * 6);
    doc.text(value, pw - margin - 3, y + 24 + i * 6, { align: "right" });
  });
  y += summaryHeight + 4;

  // AutoTable measures note height and paginates unusually long custom conditions safely.
  const noteBlock = (title: string, text: string) => {
    if (!text) return;
    ensureSpace(18);
    autoTable(doc, {
      startY: y, head: [[title]], body: [[text.replace(/[—–]/g, "-")]], theme: "plain",
      styles: { font: "helvetica", fontSize: 8, textColor: [...GRAY], cellPadding: { top: 2, bottom: 3, left: 4, right: 4 }, overflow: "linebreak" },
      headStyles: { textColor: [...PINK], fontStyle: "bold", fontSize: 8, cellPadding: { top: 3, bottom: 1, left: 4, right: 4 } },
      bodyStyles: { fillColor: [...PALE] },
      margin: { left: margin, right: margin, top: 18, bottom: 22 },
      rowPageBreak: "avoid",
    });
    y = lastTableY() + 3;
  };
  noteBlock("CONDITIONS", cleanQuoteNotes(data.notes));
  noteBlock("RENOUVELLEMENT", data.renewal_note || "");

  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setDrawColor(...RULE); doc.setLineWidth(0.3); doc.line(margin, ph - 17, pw - margin, ph - 17);
    doc.setTextColor(...GRAY); doc.setFontSize(7); doc.setFont("helvetica", "normal");
    doc.text("ADAMKOM by JJP | contact@adamkom.com | 0262 66 68 76", pw / 2, ph - 11, { align: "center" });
    doc.text(`${p} / ${pages}`, pw - margin, ph - 6, { align: "right" });
  }
  if (options?.returnBase64) return doc.output("datauristring").split(",")[1];
  doc.save(`Devis_${data.quote_number}_${data.client.company_name.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`);
  return undefined;
}
