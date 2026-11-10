import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { InvoiceItem } from "@/hooks/use-invoices";
import { INVOICE_LOGO_PNG } from "@/lib/invoice-logo";
import { resolveInvoiceTemplate, type InvoiceTemplateId } from "@/lib/invoice-templates";

interface InvoicePDFData {
  invoice_number: string;
  due_date?: string | null;
  status: string;
  amount: number;
  tax_rate: number;
  tax_amount: number;
  total_amount: number;
  discount_amount?: number | null;
  notes?: string | null;
  items: InvoiceItem[];
  payment_methods?: string[] | null;
  /** Modèle graphique choisi à la création (Signature par défaut). */
  design_template?: string | null;
  client: {
    company_name: string;
    address?: string | null;
    postal_code?: string | null;
    city?: string | null;
    email?: string | null;
    phone?: string | null;
    siret?: string | null;
    vat_number?: string | null;
    ndi?: string | null;
    payment_method?: string | null;
  };
}

// Identifiants légaux de l'émetteur
export const ISSUER = {
  name: "JJ Pothin",
  address: "73 RUE DU GÉNÉRAL AILLERET TAMPON",
  phone: "0262 66 68 76",
  email: "contact@adamkom.com",
  siret: "413 851 338 00041",
  vat: "FR04 413 851 338",
};

type RGB = readonly [number, number, number];
const NAVY: RGB = [13, 13, 13];    // Noir Adamkom #0D0D0D
const GOLD: RGB = [255, 0, 110];   // Rose Adamkom #FF006E
const WHITE: RGB = [255, 255, 255];
const GRAY: RGB = [120, 120, 120];
const DARK: RGB = [40, 40, 40];
const SOFT_PINK: RGB = [255, 240, 246];
const PALE_PINK: RGB = [250, 245, 248];
const LINE: RGB = [228, 228, 228];

const FOOTER_TEXT = "ADAMKOM by JJP — Solutions digitales pour entreprises | contact@adamkom.com | 0262 66 68 76";

const PAYMENT_LABELS: Record<string, string> = {
  virement: "Virement bancaire",
  cb: "Carte bancaire",
  cheque: "Chèque",
  especes: "Espèces",
};

const eur = (n: number) => `${Number(n || 0).toFixed(2)} €`;

function paymentLabel(data: InvoicePDFData) {
  const methods = (data.payment_methods && data.payment_methods.length > 0)
    ? data.payment_methods
    : (data.client.payment_method ? [data.client.payment_method] : []);
  return methods.length > 0 ? methods.map((m) => PAYMENT_LABELS[m] || m).join(", ") : "—";
}

function clientLines(data: InvoicePDFData) {
  const c = data.client;
  return [
    c.address,
    [c.postal_code, c.city].filter(Boolean).join(" "),
    c.phone,
    c.email,
    c.ndi ? `N° client : ${c.ndi}` : null,
    c.siret ? `SIRET : ${c.siret}` : null,
    c.vat_number ? `N° TVA : ${c.vat_number}` : null,
  ].filter((l): l is string => !!l && l.trim().length > 0);
}

const issuerLines = () => [
  ISSUER.address,
  `GSM : ${ISSUER.phone}`,
  `SIRET : ${ISSUER.siret}`,
  `N° TVA : ${ISSUER.vat}`,
  ISSUER.email,
];

const dueLabel = (data: InvoicePDFData) =>
  data.due_date ? new Date(data.due_date).toLocaleDateString("fr-FR") : null;

const tableBody = (data: InvoicePDFData) => data.items.map((item, i) => [
  String(i + 1).padStart(2, "0"),
  item.description,
  item.quantity.toString(),
  eur(item.unit_price),
  eur(item.total),
]);

const TABLE_HEAD = [["N°", "DESCRIPTION", "QTÉ", "PRIX", "TOTAL"]];

function addLogo(doc: jsPDF, x: number, y: number, size: number) {
  try { doc.addImage(INVOICE_LOGO_PNG, "PNG", x, y, size, size); } catch { /* logo optionnel */ }
}

/** Lignes de totaux (sous-total, remise, TVA) ; renvoie l'ordonnée suivante. */
function drawSubtotals(doc: jsPDF, data: InvoicePDFData, labelX: number, valueX: number, y: number, color: RGB = GRAY) {
  const discount = Number(data.discount_amount || 0);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  const row = (label: string, value: string, c: RGB = color) => {
    doc.setTextColor(...c);
    doc.text(label, labelX, y);
    doc.text(value, valueX, y, { align: "right" });
    y += 6;
  };
  if (discount > 0) {
    row("Sous-total HT", eur(data.amount + discount));
    row("Remise", `-${eur(discount)}`, GOLD);
    row("Total HT net", eur(data.amount));
  } else {
    row("Sous-total HT", eur(data.amount));
  }
  if (data.tax_rate > 0) row(`TVA (${data.tax_rate}%)`, eur(data.tax_amount));
  return y;
}

function noteLinesFor(doc: jsPDF, notes: string, width: number) {
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  return doc.splitTextToSize(notes.replace(/[—–]/g, "-"), width) as string[];
}

// ─────────────────────────── Signature (historique) ───────────────────────────
function renderSignature(doc: jsPDF, data: InvoicePDFData) {
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();

  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pw, 45, "F");
  doc.setFillColor(...GOLD);
  doc.triangle(pw - 40, 0, pw, 0, pw, 40, "F");
  doc.rect(0, 0, 5, 45, "F");

  doc.setTextColor(...WHITE);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(`FACTURE N° ${data.invoice_number}`, pw - 15, 18, { align: "right" });
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  const due = dueLabel(data);
  if (due) doc.text(`ÉCHÉANCE : ${due}`, pw - 15, 26, { align: "right" });

  addLogo(doc, 15, 52, 24);

  let y = 65;
  const infoX = 44;
  doc.setTextColor(...NAVY);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text(ISSUER.name, infoX, y);
  y += 8;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...GRAY);
  issuerLines().forEach((l) => { doc.text(l, infoX, y); y += 5; });

  const clientX = pw / 2 + 10;
  let cy = 65;
  doc.setTextColor(...NAVY);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("ÉMIS À :", clientX, cy);
  cy += 8;
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text(data.client.company_name, clientX, cy);
  cy += 6;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...GRAY);
  clientLines(data).forEach((l) => { doc.text(l, clientX, cy); cy += 5; });

  y = Math.max(y, cy) + 12;

  autoTable(doc, {
    startY: y,
    head: TABLE_HEAD,
    body: tableBody(data),
    theme: "plain",
    headStyles: { fillColor: [...NAVY], textColor: [...WHITE], fontSize: 10, fontStyle: "bold", cellPadding: 5 },
    bodyStyles: { fontSize: 10, cellPadding: 5, textColor: [50, 50, 50] },
    alternateRowStyles: { fillColor: [...PALE_PINK] },
    columnStyles: {
      0: { cellWidth: 14, halign: "center" },
      1: { cellWidth: "auto" },
      2: { cellWidth: 20, halign: "center" },
      3: { cellWidth: 32, halign: "right" },
      4: { cellWidth: 32, halign: "right" },
    },
    margin: { left: 15, right: 15, bottom: 32 },
  });

  y = (doc as any).lastAutoTable.finalY + 5;
  doc.setDrawColor(...NAVY);
  doc.setLineWidth(0.5);
  doc.line(15, y, pw - 15, y);
  y += 12;

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...NAVY);
  doc.text("RÈGLEMENT :", 15, y);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...GRAY);
  doc.text(paymentLabel(data), 15, y + 6);

  const totalsBoxX = pw - 100;
  const ty = drawSubtotals(doc, data, totalsBoxX, pw - 15, y - 12);
  const ttcY = ty + 2;
  doc.setFillColor(...NAVY);
  doc.roundedRect(totalsBoxX - 5, ttcY - 5, pw - totalsBoxX + 5 - 10, 14, 2, 2, "F");
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...WHITE);
  doc.text("TOTAL TTC :", totalsBoxX, ttcY + 4);
  doc.setTextColor(...GOLD);
  doc.text(eur(data.total_amount), pw - 15, ttcY + 4, { align: "right" });

  if (data.notes) {
    const notesY = Math.max(y + 18, ttcY + 24);
    const boxW = pw - 30;
    const lines = noteLinesFor(doc, data.notes, boxW - 12);
    const boxH = 14 + lines.length * 5;
    doc.setFillColor(...PALE_PINK);
    doc.setDrawColor(...GOLD);
    doc.setLineWidth(0.4);
    doc.roundedRect(15, notesY, boxW, boxH, 2, 2, "FD");
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...NAVY);
    doc.text("NOTES", 21, notesY + 7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(90, 90, 90);
    doc.text(lines, 21, notesY + 14, { lineHeightFactor: 1.35 });
  }

  doc.setFillColor(...NAVY);
  doc.rect(0, ph - 25, pw, 25, "F");
  doc.setFillColor(...GOLD);
  doc.triangle(0, ph - 25, 40, ph - 25, 0, ph, "F");
  doc.rect(pw - 5, ph - 25, 5, 25, "F");
  doc.setTextColor(...WHITE);
  doc.setFontSize(8);
  doc.text(FOOTER_TEXT, pw / 2, ph - 10, { align: "center" });
}

// ─────────────────────────── Épuré (minimaliste) ───────────────────────────
function renderEpure(doc: jsPDF, data: InvoicePDFData) {
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const L = 18, R = pw - 18;

  addLogo(doc, L, 16, 22);
  doc.setTextColor(...NAVY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("ADAMKOM", L + 27, 25);
  doc.setTextColor(...GOLD);
  doc.setFontSize(9);
  doc.text("by JJP", L + 27, 31);

  doc.setTextColor(...NAVY);
  doc.setFontSize(32);
  doc.text("FACTURE", R, 28, { align: "right" });
  doc.setFontSize(10);
  doc.setTextColor(...GOLD);
  doc.text(`N° ${data.invoice_number}`, R, 36, { align: "right" });

  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.3);
  doc.line(L, 46, R, 46);
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(1.2);
  doc.line(L, 46, L + 30, 46);

  const label = (text: string, x: number, y: number) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...GOLD);
    doc.text(text, x, y, { charSpace: 0.8 });
  };

  let y = 58;
  label("DE", L, y);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...NAVY);
  doc.text(ISSUER.name, L, y + 7);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...GRAY);
  let iy = y + 13;
  issuerLines().forEach((l) => { doc.text(l, L, iy); iy += 4.6; });

  const cx = pw / 2 + 4;
  label("FACTURÉ À", cx, y);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...NAVY);
  const nameLines = doc.splitTextToSize(data.client.company_name, R - cx - 40) as string[];
  doc.text(nameLines, cx, y + 7);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...GRAY);
  let cy = y + 8 + nameLines.length * 5;
  clientLines(data).forEach((l) => { doc.text(l, cx, cy); cy += 4.6; });

  const due = dueLabel(data);
  if (due) {
    label("ÉCHÉANCE", R, y);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...NAVY);
    doc.text(due, R, y + 7, { align: "right" });
  }
  // Le libellé « ÉCHÉANCE » est aligné à droite : on le redessine proprement.
  if (due) {
    doc.setFillColor(...WHITE);
    doc.rect(R - 40, y - 4, 40, 5, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...GOLD);
    doc.text("ÉCHÉANCE", R, y, { align: "right" });
  }

  y = Math.max(iy, cy) + 10;

  autoTable(doc, {
    startY: y,
    head: TABLE_HEAD,
    body: tableBody(data),
    theme: "plain",
    headStyles: {
      textColor: [...NAVY], fontSize: 8, fontStyle: "bold", cellPadding: { top: 3, bottom: 3, left: 3, right: 3 },
      lineColor: [...NAVY], lineWidth: { bottom: 0.6 },
    },
    bodyStyles: {
      fontSize: 9.5, textColor: [...DARK], cellPadding: { top: 4.5, bottom: 4.5, left: 3, right: 3 },
      lineColor: [...LINE], lineWidth: { bottom: 0.25 },
    },
    columnStyles: {
      0: { cellWidth: 12, halign: "left", textColor: [...GOLD], fontStyle: "bold" },
      1: { cellWidth: "auto" },
      2: { cellWidth: 16, halign: "center" },
      3: { cellWidth: 30, halign: "right" },
      4: { cellWidth: 30, halign: "right", fontStyle: "bold" },
    },
    margin: { left: L, right: 18, bottom: 28 },
  });

  y = (doc as any).lastAutoTable.finalY + 10;
  if (y > ph - 80) { doc.addPage(); y = 25; }

  // Règlement (gauche)
  label("RÈGLEMENT", L, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...DARK);
  doc.text(doc.splitTextToSize(paymentLabel(data), 70) as string[], L, y + 6);

  // Totaux (droite)
  const tx = pw - 95;
  let ty = drawSubtotals(doc, data, tx, R, y);
  doc.setDrawColor(...NAVY);
  doc.setLineWidth(0.4);
  doc.line(tx, ty - 2, R, ty - 2);
  ty += 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...NAVY);
  doc.text("TOTAL TTC", tx, ty);
  doc.setFontSize(18);
  doc.setTextColor(...GOLD);
  doc.text(eur(data.total_amount), R, ty + 1, { align: "right" });

  if (data.notes) {
    let ny = Math.max(y + 22, ty + 16);
    const lines = noteLinesFor(doc, data.notes, R - L - 10);
    const h = 9 + lines.length * 4.8;
    if (ny + h > ph - 28) { doc.addPage(); ny = 25; }
    doc.setFillColor(...GOLD);
    doc.rect(L, ny, 1.2, h, "F");
    label("NOTES", L + 6, ny + 4.5);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(90, 90, 90);
    doc.text(lines, L + 6, ny + 10, { lineHeightFactor: 1.35 });
  }

  // Pied de page fin
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.3);
    doc.line(L, ph - 18, R, ph - 18);
    doc.setFillColor(...GOLD);
    doc.circle(pw / 2, ph - 18, 1.1, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...GRAY);
    doc.text(FOOTER_TEXT, pw / 2, ph - 11, { align: "center" });
  }
}

// ─────────────────────────── Prestige (colonne latérale) ───────────────────────────
function renderPrestige(doc: jsPDF, data: InvoicePDFData) {
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const SW = 62; // largeur de la colonne
  const L = SW + 10, R = pw - 12;

  const drawSidebar = () => {
    doc.setFillColor(...NAVY);
    doc.rect(0, 0, SW, ph, "F");
    doc.setFillColor(...GOLD);
    doc.rect(SW, 0, 1.6, ph, "F");
  };
  drawSidebar();

  // Logo sur pastille blanche
  doc.setFillColor(...WHITE);
  doc.roundedRect(13, 16, 36, 36, 4, 4, "F");
  addLogo(doc, 15, 18, 32);
  doc.setTextColor(...WHITE);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("ADAMKOM", SW / 2, 63, { align: "center" });
  doc.setTextColor(...GOLD);
  doc.setFontSize(9);
  doc.text("by JJP", SW / 2, 69, { align: "center" });

  const sideLabel = (text: string, y: number) => {
    doc.setFillColor(...GOLD);
    doc.rect(10, y - 2.6, 3, 0.9, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...GOLD);
    doc.text(text, 15, y - 1.5, { charSpace: 0.6 });
  };
  const sideText = (lines: string[], y: number) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.8);
    doc.setTextColor(225, 225, 225);
    let yy = y;
    lines.forEach((l) => {
      const wrapped = doc.splitTextToSize(l, SW - 20) as string[];
      doc.text(wrapped, 10, yy);
      yy += wrapped.length * 4.2;
    });
    return yy;
  };

  let sy = 88;
  sideLabel("ÉMETTEUR", sy);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...WHITE);
  doc.text(ISSUER.name, 10, sy + 6);
  sy = sideText(issuerLines(), sy + 12) + 10;

  sideLabel("RÈGLEMENT", sy);
  sy = sideText([paymentLabel(data)], sy + 6) + 10;

  const due = dueLabel(data);
  if (due) {
    sideLabel("ÉCHÉANCE", sy);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...WHITE);
    doc.text(due, 10, sy + 7);
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(170, 170, 170);
  doc.text(["contact@adamkom.com", "0262 66 68 76"], 10, ph - 18);

  // Zone principale
  doc.setTextColor(...NAVY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(30);
  doc.text("FACTURE", L, 32);
  doc.setFillColor(...GOLD);
  doc.rect(L, 37, 18, 1.4, "F");
  doc.setFontSize(10);
  doc.setTextColor(...GRAY);
  doc.setFont("helvetica", "normal");
  doc.text(`N° ${data.invoice_number}`, L + 22, 38.4);

  // Carte client
  const lines = clientLines(data);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  const nameLines = doc.splitTextToSize(data.client.company_name, R - L - 12) as string[];
  const cardH = 16 + nameLines.length * 5 + lines.length * 4.6;
  doc.setFillColor(...SOFT_PINK);
  doc.roundedRect(L, 48, R - L, cardH, 3, 3, "F");
  doc.setFontSize(7.5);
  doc.setTextColor(...GOLD);
  doc.text("FACTURÉ À", L + 6, 55, { charSpace: 0.6 });
  doc.setFontSize(11);
  doc.setTextColor(...NAVY);
  doc.text(nameLines, L + 6, 62);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...GRAY);
  let cy = 63 + nameLines.length * 5;
  lines.forEach((l) => { doc.text(l, L + 6, cy); cy += 4.6; });

  let y = 48 + cardH + 10;

  autoTable(doc, {
    startY: y,
    head: TABLE_HEAD,
    body: tableBody(data),
    theme: "plain",
    headStyles: { fillColor: [...NAVY], textColor: [...WHITE], fontSize: 8, fontStyle: "bold", cellPadding: 3.5 },
    bodyStyles: { fontSize: 9, textColor: [...DARK], cellPadding: 3.8, lineColor: [...LINE], lineWidth: { bottom: 0.25 } },
    columnStyles: {
      0: { cellWidth: 10, halign: "center", textColor: [...GOLD], fontStyle: "bold" },
      1: { cellWidth: "auto" },
      2: { cellWidth: 13, halign: "center" },
      3: { cellWidth: 25, halign: "right" },
      4: { cellWidth: 26, halign: "right", fontStyle: "bold" },
    },
    margin: { left: L, right: 12, top: 20, bottom: 24 },
    didDrawPage: (hook) => { if (hook.pageNumber > 1) drawSidebar(); },
  });

  y = (doc as any).lastAutoTable.finalY + 10;
  if (y > ph - 70) { doc.addPage(); drawSidebar(); y = 25; }

  const tx = R - 80;
  let ty = drawSubtotals(doc, data, tx, R - 4, y);
  ty += 1;
  doc.setFillColor(...GOLD);
  doc.roundedRect(tx - 4, ty - 5, R - tx + 4, 15, 2.5, 2.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...WHITE);
  doc.text("TOTAL TTC", tx + 1, ty + 4.2);
  doc.setFontSize(14);
  doc.text(eur(data.total_amount), R - 4, ty + 4.6, { align: "right" });

  if (data.notes) {
    let ny = ty + 22;
    const nl = noteLinesFor(doc, data.notes, R - L - 12);
    const h = 13 + nl.length * 4.8;
    if (ny + h > ph - 22) { doc.addPage(); drawSidebar(); ny = 25; }
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.3);
    doc.roundedRect(L, ny, R - L, h, 2.5, 2.5, "S");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...GOLD);
    doc.text("NOTES", L + 6, ny + 7, { charSpace: 0.6 });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(90, 90, 90);
    doc.text(nl, L + 6, ny + 13, { lineHeightFactor: 1.35 });
  }

  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...GRAY);
    doc.text("ADAMKOM by JJP — Solutions digitales pour entreprises", (L + R) / 2, ph - 10, { align: "center" });
  }
}

// ─────────────────────────── Aurore (en-tête rose) ───────────────────────────
function renderAurore(doc: jsPDF, data: InvoicePDFData) {
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const L = 15, R = pw - 15;

  // En-tête rose avec formes géométriques
  doc.setFillColor(...GOLD);
  doc.rect(0, 0, pw, 62, "F");
  doc.setFillColor(255, 64, 150);
  doc.circle(pw - 30, 8, 34, "F");
  doc.setFillColor(...NAVY);
  doc.circle(pw + 4, 58, 26, "F");
  doc.setFillColor(...NAVY);
  doc.rect(0, 62, pw, 2.2, "F");

  doc.setFillColor(...WHITE);
  doc.roundedRect(L, 15, 34, 34, 5, 5, "F");
  addLogo(doc, L + 2, 17, 30);

  doc.setTextColor(...WHITE);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(32);
  doc.text("FACTURE", L + 42, 33);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(`N° ${data.invoice_number}`, L + 42, 42);

  const due = dueLabel(data);
  if (due) {
    const txt = `ÉCHÉANCE  ${due}`;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    const w = doc.getTextWidth(txt) + 10;
    doc.setFillColor(...NAVY);
    doc.roundedRect(L + 42, 46, w, 8, 4, 4, "F");
    doc.setTextColor(...WHITE);
    doc.text(txt, L + 47, 51.2);
  }

  // Deux cartes : émetteur / client
  const gap = 6;
  const cw = (R - L - gap) / 2;
  const cLines = clientLines(data);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  const nameLines = doc.splitTextToSize(data.client.company_name, cw - 12) as string[];
  const iLines = issuerLines();
  const cardH = Math.max(18 + iLines.length * 4.5, 17 + nameLines.length * 5 + cLines.length * 4.5);
  const top = 74;
  const card = (x: number, title: string, name: string[], body: string[]) => {
    doc.setFillColor(...SOFT_PINK);
    doc.roundedRect(x, top, cw, cardH, 4, 4, "F");
    doc.setFillColor(...GOLD);
    doc.roundedRect(x + 6, top + 5, 16, 5, 2.5, 2.5, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(...WHITE);
    doc.text(title, x + 14, top + 8.4, { align: "center" });
    doc.setFontSize(10.5);
    doc.setTextColor(...NAVY);
    doc.text(name, x + 6, top + 17);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.3);
    doc.setTextColor(...GRAY);
    let yy = top + 18 + name.length * 5;
    body.forEach((l) => { doc.text(l, x + 6, yy); yy += 4.5; });
  };
  card(L, "DE", [ISSUER.name], iLines);
  card(L + cw + gap, "POUR", nameLines, cLines);

  let y = top + cardH + 10;

  autoTable(doc, {
    startY: y,
    head: TABLE_HEAD,
    body: tableBody(data),
    theme: "plain",
    headStyles: { fillColor: [...GOLD], textColor: [...WHITE], fontSize: 8.5, fontStyle: "bold", cellPadding: 4 },
    bodyStyles: { fontSize: 9.5, textColor: [...DARK], cellPadding: 4.2 },
    alternateRowStyles: { fillColor: [...SOFT_PINK] },
    columnStyles: {
      0: { cellWidth: 13, halign: "center", fontStyle: "bold", textColor: [...GOLD] },
      1: { cellWidth: "auto" },
      2: { cellWidth: 16, halign: "center" },
      3: { cellWidth: 30, halign: "right" },
      4: { cellWidth: 30, halign: "right", fontStyle: "bold" },
    },
    margin: { left: L, right: 15, bottom: 30 },
  });

  y = (doc as any).lastAutoTable.finalY + 10;
  if (y > ph - 75) { doc.addPage(); y = 25; }

  // Règlement
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...GOLD);
  doc.text("RÈGLEMENT", L, y, { charSpace: 0.6 });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...DARK);
  doc.text(doc.splitTextToSize(paymentLabel(data), 80) as string[], L, y + 6);

  // Totaux
  const tx = pw - 95;
  let ty = drawSubtotals(doc, data, tx, R, y);
  ty += 1;
  doc.setFillColor(...NAVY);
  doc.roundedRect(tx - 5, ty - 5, R - tx + 5, 17, 4, 4, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(...WHITE);
  doc.text("TOTAL TTC", tx + 1, ty + 5);
  doc.setFontSize(16);
  doc.setTextColor(...GOLD);
  doc.text(eur(data.total_amount), R - 5, ty + 5.8, { align: "right" });

  if (data.notes) {
    let ny = Math.max(y + 22, ty + 22);
    const nl = noteLinesFor(doc, data.notes, R - L - 14);
    const h = 13 + nl.length * 4.8;
    if (ny + h > ph - 28) { doc.addPage(); ny = 25; }
    doc.setFillColor(...SOFT_PINK);
    doc.roundedRect(L, ny, R - L, h, 4, 4, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...GOLD);
    doc.text("NOTES", L + 7, ny + 7, { charSpace: 0.6 });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(90, 90, 90);
    doc.text(nl, L + 7, ny + 13, { lineHeightFactor: 1.35 });
  }

  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFillColor(...NAVY);
    doc.rect(0, ph - 20, pw, 20, "F");
    doc.setFillColor(...GOLD);
    doc.rect(0, ph - 20, pw, 1.4, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...WHITE);
    doc.text(FOOTER_TEXT, pw / 2, ph - 9, { align: "center" });
  }
}

const RENDERERS: Record<InvoiceTemplateId, (doc: jsPDF, data: InvoicePDFData) => void> = {
  signature: renderSignature,
  epure: renderEpure,
  prestige: renderPrestige,
  aurore: renderAurore,
};

export function exportInvoicePDF(data: InvoicePDFData, options?: { returnBase64?: boolean }): string | undefined {
  const doc = new jsPDF();
  RENDERERS[resolveInvoiceTemplate(data.design_template)](doc, data);

  if (options?.returnBase64) {
    return doc.output("datauristring").split(",")[1];
  }

  doc.save(`Facture_${data.invoice_number}_${data.client.company_name.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`);
  return undefined;
}
