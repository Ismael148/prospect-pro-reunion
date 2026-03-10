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
  client: {
    company_name: string;
    address?: string | null;
    postal_code?: string | null;
    city?: string | null;
    email?: string | null;
    phone?: string | null;
    siret?: string | null;
  };
}

const STATUS_LABELS: Record<string, string> = {
  brouillon: "Brouillon",
  envoyee: "Envoyée",
  payee: "Payée",
  annulee: "Annulée",
};

export function exportInvoicePDF(data: InvoicePDFData) {
  const doc = new jsPDF();
  const pw = doc.internal.pageSize.getWidth();
  let y = 20;

  // Company header
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(41, 128, 185);
  doc.text("ADAMKOM by JJP", 14, y);
  y += 7;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  doc.text("Solutions digitales pour entreprises", 14, y);
  y += 12;

  // Invoice title
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0);
  doc.text(`FACTURE ${data.invoice_number}`, pw - 14, 20, { align: "right" });

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  doc.text(`Date : ${new Date(data.issued_date).toLocaleDateString("fr-FR")}`, pw - 14, 28, { align: "right" });
  if (data.due_date) {
    doc.text(`Échéance : ${new Date(data.due_date).toLocaleDateString("fr-FR")}`, pw - 14, 34, { align: "right" });
  }
  doc.text(`Statut : ${STATUS_LABELS[data.status] || data.status}`, pw - 14, data.due_date ? 40 : 34, { align: "right" });

  // Separator
  doc.setDrawColor(200);
  doc.line(14, y, pw - 14, y);
  y += 10;

  // Client info
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0);
  doc.text("Facturé à :", 14, y);
  y += 6;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(data.client.company_name, 14, y);
  y += 5;
  if (data.client.address) { doc.text(data.client.address, 14, y); y += 5; }
  if (data.client.postal_code || data.client.city) {
    doc.text([data.client.postal_code, data.client.city].filter(Boolean).join(" "), 14, y);
    y += 5;
  }
  if (data.client.email) { doc.text(data.client.email, 14, y); y += 5; }
  if (data.client.phone) { doc.text(data.client.phone, 14, y); y += 5; }
  if (data.client.siret) { doc.text(`SIRET : ${data.client.siret}`, 14, y); y += 5; }
  y += 8;

  // Items table
  const tableBody = data.items.map((item) => [
    item.description,
    item.quantity.toString(),
    `${item.unit_price.toFixed(2)} €`,
    `${item.total.toFixed(2)} €`,
  ]);

  autoTable(doc, {
    startY: y,
    head: [["Description", "Qté", "Prix unitaire", "Total"]],
    body: tableBody,
    theme: "striped",
    headStyles: { fillColor: [41, 128, 185], fontSize: 10 },
    bodyStyles: { fontSize: 10 },
    columnStyles: {
      0: { cellWidth: "auto" },
      1: { cellWidth: 20, halign: "center" },
      2: { cellWidth: 35, halign: "right" },
      3: { cellWidth: 35, halign: "right" },
    },
    margin: { left: 14, right: 14 },
  });

  y = (doc as any).lastAutoTable.finalY + 10;

  // Totals
  const totalsX = pw - 80;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Sous-total HT :", totalsX, y);
  doc.text(`${data.amount.toFixed(2)} €`, pw - 14, y, { align: "right" });
  y += 6;

  if (data.tax_rate > 0) {
    doc.text(`TVA (${data.tax_rate}%) :`, totalsX, y);
    doc.text(`${data.tax_amount.toFixed(2)} €`, pw - 14, y, { align: "right" });
    y += 6;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Total TTC :", totalsX, y);
  doc.text(`${data.total_amount.toFixed(2)} €`, pw - 14, y, { align: "right" });
  y += 12;

  // Notes
  if (data.notes) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text("Notes :", 14, y);
    y += 5;
    const noteLines = doc.splitTextToSize(data.notes, pw - 28);
    doc.text(noteLines, 14, y);
  }

  // Footer
  const ph = doc.internal.pageSize.getHeight();
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text("ADAMKOM by JJP — Solutions digitales | Facture générée automatiquement", pw / 2, ph - 10, { align: "center" });

  doc.save(`Facture_${data.invoice_number}_${data.client.company_name.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`);
}
