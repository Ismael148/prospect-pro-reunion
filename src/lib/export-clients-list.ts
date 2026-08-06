import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { PIPELINE_LABELS, PACK_LABELS } from "@/lib/constants";

const PAYMENT_LABELS: Record<string, string> = {
  especes: "Espèces",
  virement: "Virement bancaire",
  cheque: "Chèque",
  cb: "Carte bancaire",
  prelevement: "Prélèvement",
};

const COLUMNS: { key: string; label: string; get: (c: any) => string }[] = [
  { key: "ndi", label: "NDI", get: (c) => c.ndi || "" },
  { key: "company_name", label: "Société", get: (c) => c.company_name || "" },
  { key: "manager_name", label: "Gérant", get: (c) => c.manager_name || "" },
  { key: "phone", label: "Téléphone", get: (c) => c.phone || "" },
  { key: "email", label: "Email", get: (c) => c.email || "" },
  { key: "city", label: "Ville", get: (c) => c.city || "" },
  { key: "postal_code", label: "CP", get: (c) => c.postal_code || "" },
  { key: "sector", label: "Secteur", get: (c) => c.sector || "" },
  {
    key: "pack_type",
    label: "Pack",
    get: (c) => (c.pack_type ? PACK_LABELS[c.pack_type as keyof typeof PACK_LABELS] || c.pack_type : ""),
  },
  { key: "pack_amount", label: "Montant (€)", get: (c) => (c.pack_amount != null ? Number(c.pack_amount).toFixed(2) : "") },
  { key: "payment_method", label: "Règlement", get: (c) => (c.payment_method ? PAYMENT_LABELS[c.payment_method] || c.payment_method : "") },
  {
    key: "pipeline_status",
    label: "Statut",
    get: (c) => PIPELINE_LABELS[c.pipeline_status as keyof typeof PIPELINE_LABELS] || c.pipeline_status || "",
  },
  {
    key: "signature_date",
    label: "Signature",
    get: (c) => (c.signature_date ? new Date(c.signature_date).toLocaleDateString("fr-FR") : ""),
  },
  {
    key: "created_at",
    label: "Créé le",
    get: (c) => (c.created_at ? new Date(c.created_at).toLocaleDateString("fr-FR") : ""),
  },
];

function stamp() {
  return new Date().toISOString().slice(0, 10);
}

export function exportClientsCSV(clients: any[], label: string) {
  const esc = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
  const rows = [
    COLUMNS.map((c) => c.label),
    ...clients.map((client) => COLUMNS.map((c) => c.get(client))),
  ];
  const csv = rows.map((r) => r.map(esc).join(";")).join("\r\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `clients_${label}_${stamp()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportClientsPDF(clients: any[], label: string, title: string) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();

  doc.setFillColor(26, 26, 46);
  doc.rect(0, 0, pageW, 22, "F");
  doc.setFillColor(255, 0, 110);
  doc.rect(0, 22, pageW, 1.2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(title, 12, 12);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(
    `${clients.length} client(s) · Export du ${new Date().toLocaleDateString("fr-FR")}`,
    pageW - 12,
    12,
    { align: "right" }
  );

  autoTable(doc, {
    startY: 30,
    head: [COLUMNS.map((c) => c.label)],
    body: clients.map((client) => COLUMNS.map((c) => c.get(client))),
    theme: "striped",
    headStyles: { fillColor: [255, 0, 110], fontSize: 7.5, textColor: 255 },
    bodyStyles: { fontSize: 7 },
    margin: { left: 10, right: 10 },
  });

  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setTextColor(150);
    doc.setFontSize(8);
    doc.text(`Page ${i}/${pages} — Adamkom by JJP`, pageW / 2, doc.internal.pageSize.getHeight() - 7, {
      align: "center",
    });
  }

  doc.save(`clients_${label}_${stamp()}.pdf`);
}
