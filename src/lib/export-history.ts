import jsPDF from "jspdf";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { HISTORY_CATEGORIES, type HistoryEntry } from "@/hooks/use-global-history";

const BRAND: [number, number, number] = [255, 0, 110];
const DARK: [number, number, number] = [26, 26, 46];
const MUTED: [number, number, number] = [110, 110, 120];

function fileStamp() {
  return format(new Date(), "yyyy-MM-dd_HH-mm");
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportHistoryCsv(entries: HistoryEntry[], label: string) {
  const headers = ["Date", "Heure", "Catégorie", "Titre", "Détail", "Auteur", "Lien"];
  const rows = entries.map((e) => {
    const d = parseISO(e.at);
    return [
      format(d, "dd/MM/yyyy"),
      format(d, "HH:mm"),
      HISTORY_CATEGORIES[e.category]?.label || e.category,
      e.title || "",
      (e.detail || "").replace(/\s+/g, " "),
      e.actor || "",
      e.link || "",
    ];
  });
  const esc = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
  const csv = [headers, ...rows].map((r) => r.map(esc).join(";")).join("\r\n");
  download(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" }), `historique_${label}_${fileStamp()}.csv`);
}

export function exportHistoryPdf(entries: HistoryEntry[], label: string, periodLabel: string) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;
  let y = 0;

  const header = () => {
    doc.setFillColor(...DARK);
    doc.rect(0, 0, pageW, 26, "F");
    doc.setFillColor(...BRAND);
    doc.rect(0, 26, pageW, 1.5, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.text("Historique de la plateforme", margin, 13);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`${periodLabel} · ${entries.length} événement(s)`, margin, 20);
    doc.text(`Adamkom by JJP · ${format(new Date(), "dd/MM/yyyy HH:mm")}`, pageW - margin, 20, { align: "right" });
    y = 36;
  };

  const ensure = (needed: number) => {
    if (y + needed > pageH - 14) {
      doc.addPage();
      header();
    }
  };

  header();

  let currentDay = "";
  entries.forEach((e) => {
    const d = parseISO(e.at);
    const dayKey = format(d, "yyyy-MM-dd");
    if (dayKey !== currentDay) {
      currentDay = dayKey;
      ensure(14);
      doc.setFillColor(245, 245, 250);
      doc.rect(margin, y - 4, pageW - margin * 2, 8, "F");
      doc.setTextColor(...DARK);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text(format(d, "EEEE d MMMM yyyy", { locale: fr }), margin + 2, y + 1.5);
      y += 12;
    }

    const cat = HISTORY_CATEGORIES[e.category]?.label || e.category;
    const titleLines = doc.splitTextToSize(`${format(d, "HH:mm")}  [${cat}]  ${e.title}`, pageW - margin * 2);
    const detailText = [e.detail, e.actor ? `par ${e.actor}` : null].filter(Boolean).join(" — ");
    const detailLines = detailText ? doc.splitTextToSize(detailText, pageW - margin * 2 - 6) : [];
    ensure(titleLines.length * 4.6 + detailLines.length * 4 + 4);

    doc.setTextColor(...DARK);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(titleLines, margin, y);
    y += titleLines.length * 4.6;

    if (detailLines.length) {
      doc.setTextColor(...MUTED);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text(detailLines, margin + 6, y);
      y += detailLines.length * 4;
    }
    y += 2.5;
  });

  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setTextColor(...MUTED);
    doc.setFontSize(8);
    doc.text(`Page ${i}/${pages}`, pageW - margin, pageH - 8, { align: "right" });
  }

  doc.save(`historique_${label}_${fileStamp()}.pdf`);
}
