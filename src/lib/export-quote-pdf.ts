import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { INVOICE_LOGO_PNG } from "@/lib/invoice-logo";
import { ISSUER } from "@/lib/export-invoice-pdf";
import type { QuoteItem } from "@/lib/quote-templates";

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
  client: { company_name: string; contact_name?: string | null; address?: string | null; postal_code?: string | null; city?: string | null; email?: string | null; phone?: string | null; siret?: string | null };
}

const BLACK = [13, 13, 13] as const;
const PINK = [255, 0, 110] as const;
const WHITE = [255, 255, 255] as const;
const GRAY = [120, 120, 120] as const;
const eur = (n: number) => `${n.toFixed(2).replace(".", ",")} €`;

export function exportQuotePDF(data: QuotePDFData, options?: { returnBase64?: boolean }): string | undefined {
  const doc = new jsPDF();
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const date = data.created_at ? new Date(data.created_at) : new Date();
  const until = new Date(date.getTime() + data.validity_days * 86400000);

  doc.setFillColor(...BLACK); doc.rect(0, 0, pw, 45, "F");
  doc.setFillColor(...PINK); doc.triangle(pw - 40, 0, pw, 0, pw, 40, "F"); doc.rect(0, 0, 5, 45, "F");
  doc.setTextColor(...WHITE); doc.setFont("helvetica", "bold"); doc.setFontSize(20);
  doc.text("DEVIS", 15, 25);
  doc.setFontSize(11); doc.text(`N° ${data.quote_number}`, pw - 15, 18, { align: "right" });
  doc.setFont("helvetica", "normal"); doc.setFontSize(9);
  doc.text(`Date : ${date.toLocaleDateString("fr-FR")}`, pw - 15, 26, { align: "right" });
  doc.text(`Valable jusqu'au : ${until.toLocaleDateString("fr-FR")}`, pw - 15, 32, { align: "right" });

  try { doc.addImage(INVOICE_LOGO_PNG, "PNG", 15, 52, 24, 24); } catch { /* */ }
  let y = 60; const ix = 44;
  doc.setTextColor(...BLACK); doc.setFont("helvetica", "bold"); doc.setFontSize(16);
  doc.text("ADAMKOM by JJP", ix, y); y += 7;
  doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(...GRAY);
  [ISSUER.name, ISSUER.address, `Tél : ${ISSUER.phone}`, `SIRET : ${ISSUER.siret}`, ISSUER.email].forEach((t) => { doc.text(t, ix, y); y += 5; });

  const cx = pw / 2 + 10; let cy = 60;
  doc.setTextColor(...PINK); doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.text("DEVIS ÉTABLI POUR :", cx, cy); cy += 7;
  doc.setTextColor(0, 0, 0); doc.text(data.client.company_name, cx, cy); cy += 6;
  doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(...GRAY);
  const c = data.client;
  [c.contact_name, c.address, [c.postal_code, c.city].filter(Boolean).join(" "), c.phone, c.email, c.siret ? `SIRET : ${c.siret}` : ""]
    .filter(Boolean).forEach((t) => { doc.text(String(t), cx, cy); cy += 5; });

  y = Math.max(y, cy) + 10;
  const rows = data.items.filter((i) => i.included !== false);
  autoTable(doc, {
    startY: y,
    head: [["N°", "PRESTATION", "QTÉ", "PRIX U. HT", "TOTAL HT"]],
    body: rows.map((it, i) => [String(i + 1).padStart(2, "0"), it.description, String(it.quantity), it.unit_price === 0 ? "Inclus" : eur(it.unit_price), it.unit_price === 0 ? "Inclus" : eur(it.quantity * it.unit_price)]),
    theme: "plain",
    headStyles: { fillColor: [...BLACK], textColor: [...WHITE], fontStyle: "bold", fontSize: 10, cellPadding: 5 },
    bodyStyles: { fontSize: 9.5, cellPadding: 4.5, textColor: [50, 50, 50] },
    alternateRowStyles: { fillColor: [250, 245, 248] },
    columnStyles: { 0: { cellWidth: 14, halign: "center" }, 2: { cellWidth: 18, halign: "center" }, 3: { cellWidth: 30, halign: "right" }, 4: { cellWidth: 30, halign: "right" } },
    margin: { left: 15, right: 15 },
  });
  y = (doc as any).lastAutoTable.finalY + 10; if ((globalThis as any).__DBG) console.log("y", y);
  if (y > ph - (data.renewal_note ? 92 : 80)) { doc.addPage(); y = 20; }

  const tx = pw - 95; let ty = y;
  doc.setFontSize(9); doc.setTextColor(...GRAY);
  const row = (l: string, v: string, pink = false) => { if (pink) doc.setTextColor(...PINK); else doc.setTextColor(...GRAY); doc.text(l, tx, ty); doc.text(v, pw - 15, ty, { align: "right" }); ty += 6; };
  if (data.discount_amount > 0) { row("Sous-total HT :", eur(data.amount + data.discount_amount)); row("Remise :", `-${eur(data.discount_amount)}`, true); }
  row("Total HT :", eur(data.amount));
  if (data.tax_rate > 0) row(`TVA (${data.tax_rate}%) :`, eur(data.tax_amount));
  doc.setFillColor(...BLACK); doc.roundedRect(tx - 5, ty - 3, pw - tx - 10, 14, 2, 2, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(...WHITE);
  doc.text(data.tax_rate > 0 ? "TOTAL TTC :" : "TOTAL :", tx, ty + 6);
  doc.setTextColor(...PINK); doc.text(eur(data.total_amount), pw - 15, ty + 6, { align: "right" });

  // Bon pour accord
  doc.setDrawColor(...PINK); doc.setLineWidth(0.4);
  doc.roundedRect(15, y - 3, 80, 34, 2, 2, "S");
  doc.setFontSize(9); doc.setTextColor(...BLACK); doc.text("BON POUR ACCORD", 20, y + 4);
  doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(...GRAY);
  doc.text("Date, signature et cachet du client", 20, y + 10);
  doc.text("précédés de « Bon pour accord »", 20, y + 15);
  y = Math.max(ty + 20, y + 40);

  if (data.notes) {
    doc.setFontSize(9);
    const lines = doc.splitTextToSize(data.notes.replace(/[—–]/g, "-"), pw - 42);
    const h = 14 + lines.length * 5;
    if (y + h > ph - (data.renewal_note ? 52 : 30)) { doc.addPage(); y = 20; }
    doc.setFillColor(250, 245, 248); doc.roundedRect(15, y, pw - 30, h, 2, 2, "FD");
    doc.setFont("helvetica", "bold"); doc.setTextColor(...BLACK); doc.text("CONDITIONS", 21, y + 7);
    doc.setFont("helvetica", "normal"); doc.setTextColor(90, 90, 90); doc.text(lines, 21, y + 14, { lineHeightFactor: 1.35 });
  }

  if (data.renewal_note) {
    doc.setPage(doc.getNumberOfPages());
    const bx = 15, bw = pw - 30, bh = 19, by = ph - 25 - bh - 6;
    doc.setFillColor(...PINK); doc.roundedRect(bx, by, bw, bh, 2, 2, "F");
    doc.setTextColor(...WHITE); doc.setFont("helvetica", "bold"); doc.setFontSize(9);
    doc.text("RENOUVELLEMENT", bx + 6, by + 6.5);
    doc.setFont("helvetica", "normal"); doc.setFontSize(8.5);
    doc.text(doc.splitTextToSize(data.renewal_note.replace(/[—–]/g, "-"), bw - 12), bx + 6, by + 12);
  }

  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFillColor(...BLACK); doc.rect(0, ph - 25, pw, 25, "F");
    doc.setFillColor(...PINK); doc.triangle(0, ph - 25, 40, ph - 25, 0, ph, "F"); doc.rect(pw - 5, ph - 25, 5, 25, "F");
    doc.setTextColor(...WHITE); doc.setFontSize(8); doc.setFont("helvetica", "normal");
    doc.text("ADAMKOM by JJP — La performance digitale | contact@adamkom.com | 0262 66 68 76", pw / 2, ph - 10, { align: "center" });
  }

  if (options?.returnBase64) return doc.output("datauristring").split(",")[1];
  doc.save(`Devis_${data.quote_number}_${data.client.company_name.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`);
  return undefined;
}
