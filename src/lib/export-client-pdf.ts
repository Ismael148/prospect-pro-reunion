import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { PIPELINE_LABELS, PACK_LABELS } from "@/lib/constants";

interface ExportData {
  client: any;
  contacts: any[];
  activities: any[];
  salesTeam?: { agents: any[]; commercials: any[] };
}

const PAYMENT_LABELS: Record<string, string> = {
  especes: "Espèces",
  virement: "Virement bancaire",
  cheque: "Chèque",
  cb: "Carte bancaire",
  prelevement: "Prélèvement",
};

export function exportClientPDF({ client, contacts, activities, salesTeam }: ExportData) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 20;

  // Header
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text(client.company_name, pageWidth / 2, y, { align: "center" });
  y += 8;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  const statusLabel = PIPELINE_LABELS[client.pipeline_status as keyof typeof PIPELINE_LABELS] || client.pipeline_status;
  doc.text(`Statut : ${statusLabel}  |  Exporté le ${new Date().toLocaleDateString("fr-FR")}`, pageWidth / 2, y, { align: "center" });
  doc.setTextColor(0);
  y += 12;

  // Line separator
  doc.setDrawColor(200);
  doc.line(14, y, pageWidth - 14, y);
  y += 8;

  // Client Info Section
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("Informations client", 14, y);
  y += 6;

  const signedByName = salesTeam?.commercials.find((c) => c.user_id === client.signed_by)?.full_name || "-";
  const assignedToName =
    salesTeam?.agents.find((a) => a.user_id === client.assigned_to)?.full_name ||
    salesTeam?.commercials.find((c) => c.user_id === client.assigned_to)?.full_name || "-";

  const infoRows: string[][] = [
    ["NDI", client.ndi || "-"],
    ["SIRET", client.siret || "-"],
    ["Secteur", client.sector || "-"],
    ["Téléphone", client.phone || "-"],
    ["Email", client.email || "-"],
    ["Site web", client.website || "-"],
    ["Adresse", [client.address, client.postal_code, client.city].filter(Boolean).join(", ") || "-"],
    ["Pack", client.pack_type ? PACK_LABELS[client.pack_type as keyof typeof PACK_LABELS] || client.pack_type : "-"],
    ["Montant", client.pack_amount ? `${Number(client.pack_amount).toFixed(2)} €` : "-"],
    ["Règlement", client.payment_method ? PAYMENT_LABELS[client.payment_method] || client.payment_method : "-"],
    ["Date signature", client.signature_date ? new Date(client.signature_date).toLocaleDateString("fr-FR") : "-"],
    ["Commercial signataire", signedByName],
    ["Agent assigné", assignedToName],
  ];

  autoTable(doc, {
    startY: y,
    head: [["Champ", "Valeur"]],
    body: infoRows,
    theme: "striped",
    headStyles: { fillColor: [41, 128, 185], fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 50 } },
    margin: { left: 14, right: 14 },
  });

  y = (doc as any).lastAutoTable.finalY + 10;

  // Notes
  if (client.notes) {
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text("Notes", 14, y);
    y += 6;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    const noteLines = doc.splitTextToSize(client.notes, pageWidth - 28);
    doc.text(noteLines, 14, y);
    y += noteLines.length * 4.5 + 8;
  }

  // Contacts Section
  if (contacts.length > 0) {
    if (y > 250) { doc.addPage(); y = 20; }
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text(`Contacts (${contacts.length})`, 14, y);
    y += 6;

    const contactRows = contacts.map((c) => [
      `${c.first_name} ${c.last_name}${c.is_primary ? " ★" : ""}`,
      c.position || "-",
      c.phone || "-",
      c.email || "-",
    ]);

    autoTable(doc, {
      startY: y,
      head: [["Nom", "Poste", "Téléphone", "Email"]],
      body: contactRows,
      theme: "striped",
      headStyles: { fillColor: [41, 128, 185], fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      margin: { left: 14, right: 14 },
    });

    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // Activities Section
  if (activities.length > 0) {
    if (y > 230) { doc.addPage(); y = 20; }
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text(`Historique d'activité (${activities.length})`, 14, y);
    y += 6;

    const activityRows = activities.map((a) => [
      new Date(a.created_at).toLocaleDateString("fr-FR", {
        day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
      }),
      a.activity_type === "note" ? "Note" : "Changement statut",
      a.description || "-",
    ]);

    autoTable(doc, {
      startY: y,
      head: [["Date", "Type", "Description"]],
      body: activityRows,
      theme: "striped",
      headStyles: { fillColor: [41, 128, 185], fontSize: 9 },
      bodyStyles: { fontSize: 8 },
      columnStyles: { 0: { cellWidth: 38 }, 1: { cellWidth: 30 } },
      margin: { left: 14, right: 14 },
    });
  }

  // Footer on each page
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Page ${i}/${pageCount} — ${client.company_name}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: "center" }
    );
  }

  doc.save(`Fiche_${client.company_name.replace(/[^a-zA-Z0-9]/g, "_")}_${new Date().toISOString().slice(0, 10)}.pdf`);
}
