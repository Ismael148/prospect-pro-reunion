import jsPDF from "jspdf";

const BRAND: [number, number, number] = [255, 0, 110];
const DARK: [number, number, number] = [26, 26, 46];
const MUTED: [number, number, number] = [110, 110, 120];
const LIGHT: [number, number, number] = [245, 245, 250];

export interface GmbReportActivity {
  action_type: string;
  actionLabel: string;
  description: string;
  performed_at: string; // ISO
  link?: string | null;
}

export interface GmbReportChecklistItem {
  label: string;
  done: boolean;
}

export interface GmbReportGoal {
  posts_target: number;
  posts_done: number;
  photos_target: number;
  photos_done: number;
  reviews_reply_target_pct: number;
  reviews_replied: number;
  reviews_received: number;
}

export interface GmbReportData {
  clientName: string;
  city?: string | null;
  sector?: string | null;
  gmbUrl?: string | null;
  monthLabel: string; // e.g. "Novembre 2026"
  generatedAt: string; // formatted
  activities: GmbReportActivity[];
  checklist: GmbReportChecklistItem[];
  goal?: GmbReportGoal | null;
  totalReviews?: number | null;
  averageRating?: number | null;
}

function ensureSpace(doc: jsPDF, y: number, needed: number): number {
  if (y + needed > 285) {
    doc.addPage();
    return 20;
  }
  return y;
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return iso;
  }
}

export function generateGmbReport(data: GmbReportData) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = 210;
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;
  let y = 0;

  // ─── Header band ───
  doc.setFillColor(...BRAND);
  doc.rect(0, 0, pageWidth, 50, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("ADAMKOM", margin, 20);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Livrable Google My Business", margin, 26);

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(`Rapport — ${data.monthLabel}`, margin, 40);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Généré le ${data.generatedAt}`, pageWidth - margin, 40, { align: "right" });

  y = 60;

  // ─── Client card ───
  doc.setTextColor(...DARK);
  doc.setFontSize(15);
  doc.setFont("helvetica", "bold");
  doc.text(data.clientName, margin, y);
  y += 6;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...MUTED);
  const meta = [data.sector, data.city].filter(Boolean).join(" · ");
  if (meta) {
    doc.text(meta, margin, y);
    y += 5;
  }
  if (data.gmbUrl) {
    doc.setTextColor(...BRAND);
    doc.textWithLink("Voir la fiche Google", margin, y, { url: data.gmbUrl });
    y += 6;
  }
  y += 4;

  // ─── KPI row ───
  const doneCount = data.checklist.filter((c) => c.done).length;
  const progress = data.checklist.length > 0
    ? Math.round((doneCount / data.checklist.length) * 100)
    : 0;

  const kpis: Array<{ label: string; value: string }> = [
    { label: "Complétude fiche", value: `${progress}%` },
    { label: "Actions du mois", value: `${data.activities.length}` },
    { label: "Avis totaux", value: data.totalReviews != null ? String(data.totalReviews) : "—" },
    { label: "Note moyenne", value: data.averageRating != null ? data.averageRating.toFixed(1) : "—" },
  ];

  const kpiW = (contentWidth - 9) / 4;
  kpis.forEach((k, i) => {
    const x = margin + i * (kpiW + 3);
    doc.setFillColor(...LIGHT);
    doc.roundedRect(x, y, kpiW, 22, 2, 2, "F");
    doc.setTextColor(...MUTED);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(k.label, x + 4, y + 7);
    doc.setTextColor(...DARK);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(k.value, x + 4, y + 17);
  });
  y += 28;

  // ─── Progression bar ───
  doc.setFillColor(...LIGHT);
  doc.roundedRect(margin, y, contentWidth, 8, 2, 2, "F");
  doc.setFillColor(...BRAND);
  doc.roundedRect(margin, y, contentWidth * (progress / 100), 8, 2, 2, "F");
  y += 14;

  // ─── Checklist ───
  y = ensureSpace(doc, y, 20);
  doc.setTextColor(...DARK);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("État de la fiche", margin, y);
  y += 6;

  doc.setFontSize(10);
  data.checklist.forEach((c) => {
    y = ensureSpace(doc, y, 6);
    if (c.done) {
      doc.setTextColor(0, 160, 80);
      doc.setFont("helvetica", "bold");
      doc.text("[OK]", margin, y);
    } else {
      doc.setTextColor(...MUTED);
      doc.setFont("helvetica", "normal");
      doc.text("[  ]", margin, y);
    }
    doc.setTextColor(...DARK);
    doc.setFont("helvetica", "normal");
    doc.text(c.label, margin + 12, y);
    y += 5.5;
  });
  y += 4;

  // ─── Monthly goal ───
  if (data.goal) {
    y = ensureSpace(doc, y, 40);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...DARK);
    doc.text("Objectifs du mois", margin, y);
    y += 6;

    const goalLines: Array<[string, string, number]> = [
      ["Posts publiés", `${data.goal.posts_done} / ${data.goal.posts_target}`, data.goal.posts_target > 0 ? Math.min(100, (data.goal.posts_done / data.goal.posts_target) * 100) : 0],
      ["Photos ajoutées", `${data.goal.photos_done} / ${data.goal.photos_target}`, data.goal.photos_target > 0 ? Math.min(100, (data.goal.photos_done / data.goal.photos_target) * 100) : 0],
      ["Avis répondus", `${data.goal.reviews_replied} / ${data.goal.reviews_received || data.goal.reviews_replied}`, (data.goal.reviews_received || 0) > 0 ? Math.min(100, (data.goal.reviews_replied / (data.goal.reviews_received || 1)) * 100) : 0],
    ];

    goalLines.forEach(([label, value, pct]) => {
      y = ensureSpace(doc, y, 10);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...DARK);
      doc.text(label, margin, y);
      doc.text(value, margin + contentWidth, y, { align: "right" });
      y += 2;
      doc.setFillColor(...LIGHT);
      doc.roundedRect(margin, y, contentWidth, 3, 1, 1, "F");
      doc.setFillColor(...BRAND);
      doc.roundedRect(margin, y, contentWidth * (pct / 100), 3, 1, 1, "F");
      y += 8;
    });
    y += 2;
  }

  // ─── Activities ───
  y = ensureSpace(doc, y, 20);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...DARK);
  doc.text(`Actions réalisées (${data.activities.length})`, margin, y);
  y += 6;

  if (data.activities.length === 0) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(...MUTED);
    doc.text("Aucune action enregistrée sur cette période.", margin, y);
    y += 8;
  } else {
    data.activities.forEach((a, i) => {
      const desc = doc.splitTextToSize(a.description, contentWidth - 40);
      const blockH = 8 + desc.length * 4 + (a.link ? 4 : 0);
      y = ensureSpace(doc, y, blockH + 2);

      doc.setFillColor(i % 2 === 0 ? 250 : 255, i % 2 === 0 ? 250 : 255, i % 2 === 0 ? 252 : 255);
      doc.rect(margin, y - 3, contentWidth, blockH, "F");

      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...BRAND);
      doc.text(a.actionLabel.toUpperCase(), margin + 2, y + 1);

      doc.setTextColor(...MUTED);
      doc.setFont("helvetica", "normal");
      doc.text(formatDate(a.performed_at), margin + contentWidth - 2, y + 1, { align: "right" });

      doc.setFontSize(9);
      doc.setTextColor(...DARK);
      doc.text(desc, margin + 2, y + 6);

      if (a.link) {
        doc.setFontSize(7);
        doc.setTextColor(...BRAND);
        doc.textWithLink(a.link, margin + 2, y + 6 + desc.length * 4 + 2, { url: a.link });
      }
      y += blockH + 2;
    });
  }

  // ─── Footer on every page ───
  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.setFont("helvetica", "normal");
    doc.text(
      "Adamkom · La performance digitale à La Réunion · 0262 66 68 76 · ai.adamkom.com",
      pageWidth / 2,
      292,
      { align: "center" }
    );
    doc.text(`${p} / ${pageCount}`, pageWidth - margin, 292, { align: "right" });
  }

  const filename = `Rapport_GMB_${data.clientName.replace(/[^a-zA-Z0-9]/g, "_")}_${data.monthLabel.replace(/\s/g, "_")}.pdf`;
  doc.save(filename);
}
