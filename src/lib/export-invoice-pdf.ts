import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { InvoiceItem } from "@/hooks/use-invoices";

interface InvoicePDFData {
  invoice_number: string;
  issued_date: string;
  due_date?: string | null;
  status: string;
  amount: number;
  tax_rate: number;
  tax_amount: number;
  total_amount: number;
  notes?: string | null;
  items: InvoiceItem[];
  payment_methods?: string[] | null;
  client: {
    company_name: string;
    address?: string | null;
    postal_code?: string | null;
    city?: string | null;
    email?: string | null;
    phone?: string | null;
    siret?: string | null;
    payment_method?: string | null;
  };
}

const NAVY = [30, 58, 95] as const;    // #1E3A5F
const GOLD = [218, 165, 32] as const;  // #DAA520
const WHITE = [255, 255, 255] as const;
const GRAY = [120, 120, 120] as const;

const PAYMENT_LABELS: Record<string, string> = {
  virement: "Virement bancaire",
  cb: "Carte bancaire",
  cheque: "Chèque",
  especes: "Espèces",
};

export function exportInvoicePDF(data: InvoicePDFData, options?: { returnBase64?: boolean }): string | undefined {
  const doc = new jsPDF();
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();

  // === TOP HEADER BAR (navy) ===
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pw, 45, "F");

  // Gold accent triangle top-right
  doc.setFillColor(...GOLD);
  doc.triangle(pw - 40, 0, pw, 0, pw, 40, "F");

  // Gold accent stripe left
  doc.setFillColor(...GOLD);
  doc.rect(0, 0, 5, 45, "F");

  // Invoice number & date in header
  doc.setTextColor(...WHITE);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(`FACTURE N° ${data.invoice_number}`, pw - 15, 18, { align: "right" });
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`DATE D'ÉMISSION : ${new Date(data.issued_date).toLocaleDateString("fr-FR")}`, pw - 15, 26, { align: "right" });
  if (data.due_date) {
    doc.text(`ÉCHÉANCE : ${new Date(data.due_date).toLocaleDateString("fr-FR")}`, pw - 15, 33, { align: "right" });
  }

  let y = 65;

  // === COMPANY INFO (left) ===
  doc.setTextColor(...NAVY);
  doc.setFontSize(26);
  doc.setFont("helvetica", "bold");
  doc.text("JJ Pothin", 15, y);
  y += 10;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...GRAY);
  doc.text("73 RUE DU GÉNÉRAL AILLERET TAMPON", 15, y); y += 5;
  doc.text("GSM : 0693 802 201", 15, y); y += 5;
  doc.text("SIRET : 413 851 338 00041", 15, y); y += 5;
  doc.text("contact@adamkom.com", 15, y); y += 5;

  // === CLIENT INFO (right) ===
  const clientX = pw / 2 + 10;
  let cy = 65;
  doc.setTextColor(...NAVY);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("ÉMIS À :", clientX, cy);
  cy += 8;

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text(data.client.company_name, clientX, cy);
  cy += 6;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...GRAY);
  if (data.client.address) { doc.text(data.client.address, clientX, cy); cy += 5; }
  if (data.client.postal_code || data.client.city) {
    doc.text([data.client.postal_code, data.client.city].filter(Boolean).join(" "), clientX, cy);
    cy += 5;
  }
  if (data.client.phone) { doc.text(data.client.phone, clientX, cy); cy += 5; }
  if (data.client.email) { doc.text(data.client.email, clientX, cy); cy += 5; }
  if (data.client.siret) { doc.text(`SIRET : ${data.client.siret}`, clientX, cy); cy += 5; }

  y = Math.max(y, cy) + 12;

  // === ITEMS TABLE ===
  const tableBody = data.items.map((item) => [
    item.description,
    item.quantity.toString(),
    `${item.unit_price.toFixed(2)} €`,
    `${item.total.toFixed(2)} €`,
  ]);

  autoTable(doc, {
    startY: y,
    head: [["DESCRIPTION", "QTÉ", "PRIX", "TOTAL"]],
    body: tableBody,
    theme: "plain",
    headStyles: {
      fillColor: [...NAVY],
      textColor: [...WHITE],
      fontSize: 10,
      fontStyle: "bold",
      cellPadding: 5,
    },
    bodyStyles: {
      fontSize: 10,
      cellPadding: 5,
      textColor: [50, 50, 50],
    },
    alternateRowStyles: {
      fillColor: [245, 247, 250],
    },
    columnStyles: {
      0: { cellWidth: "auto" },
      1: { cellWidth: 25, halign: "center" },
      2: { cellWidth: 35, halign: "right" },
      3: { cellWidth: 35, halign: "right" },
    },
    margin: { left: 15, right: 15 },
  });

  y = (doc as any).lastAutoTable.finalY + 5;

  // Separator line
  doc.setDrawColor(...NAVY);
  doc.setLineWidth(0.5);
  doc.line(15, y, pw - 15, y);
  y += 12;

  // === PAYMENT METHOD (left) ===
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...NAVY);
  doc.text("RÈGLEMENT :", 15, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...GRAY);
  const paymentLabel = PAYMENT_LABELS[data.client.payment_method || ""] || data.client.payment_method || "—";
  doc.text(paymentLabel, 15, y);

  // === TOTALS (right) ===
  const totalsBoxX = pw - 100;
  const totalsBoxY = y - 12;

  // Subtotal
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...GRAY);
  doc.text("Sous-total HT :", totalsBoxX, totalsBoxY);
  doc.text(`${data.amount.toFixed(2)} €`, pw - 15, totalsBoxY, { align: "right" });

  if (data.tax_rate > 0) {
    doc.text(`TVA (${data.tax_rate}%) :`, totalsBoxX, totalsBoxY + 6);
    doc.text(`${data.tax_amount.toFixed(2)} €`, pw - 15, totalsBoxY + 6, { align: "right" });
  }

  // Total TTC box
  const ttcY = totalsBoxY + (data.tax_rate > 0 ? 14 : 8);
  doc.setFillColor(...NAVY);
  doc.roundedRect(totalsBoxX - 5, ttcY - 5, pw - totalsBoxX + 5 - 10, 14, 2, 2, "F");
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...WHITE);
  doc.text("TOTAL TTC :", totalsBoxX, ttcY + 4);
  doc.setTextColor(...GOLD);
  doc.text(`${data.total_amount.toFixed(2)} €`, pw - 15, ttcY + 4, { align: "right" });

  // === NOTES ===
  if (data.notes) {
    const notesY = Math.max(y + 15, ttcY + 20);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...GRAY);
    doc.text("Notes :", 15, notesY);
    const noteLines = doc.splitTextToSize(data.notes, pw - 30);
    doc.text(noteLines, 15, notesY + 5);
  }

  // === BOTTOM FOOTER (navy + gold) ===
  doc.setFillColor(...NAVY);
  doc.rect(0, ph - 25, pw, 25, "F");

  // Gold accent bottom-left triangle
  doc.setFillColor(...GOLD);
  doc.triangle(0, ph - 25, 40, ph - 25, 0, ph, "F");

  // Gold accent stripe right
  doc.setFillColor(...GOLD);
  doc.rect(pw - 5, ph - 25, 5, 25, "F");

  doc.setTextColor(...WHITE);
  doc.setFontSize(8);
  doc.text("ADAMKOM by JJP — Solutions digitales pour entreprises | contact@adamkom.com | 0693 802 201", pw / 2, ph - 10, { align: "center" });

  if (options?.returnBase64) {
    return doc.output("datauristring").split(",")[1];
  }

  doc.save(`Facture_${data.invoice_number}_${data.client.company_name.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`);
  return undefined;
}
