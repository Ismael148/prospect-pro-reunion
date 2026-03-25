import jsPDF from "jspdf";

const BRAND_COLOR: [number, number, number] = [255, 0, 110]; // #ff006e
const DARK: [number, number, number] = [26, 26, 46]; // #1a1a2e

interface GmbReportData {
  clientName: string;
  gmbUrl?: string;
  tasksDone: { title: string; completedAt?: string; linkUrl?: string }[];
  tasksTotal: number;
  generatedAt: string;
  projectName: string;
}

export function generateGmbReport(data: GmbReportData) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = 210;
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;
  let y = 20;

  // ── Header ──
  doc.setFillColor(...BRAND_COLOR);
  doc.rect(0, 0, pageWidth, 45, "F");
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("ADAMKOM", margin, 20);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("La performance digitale pour votre entreprise", margin, 27);
  
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Rapport Google My Business", margin, 39);
  y = 55;

  // ── Client info ──
  doc.setTextColor(...DARK);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(data.clientName, margin, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text(`Projet : ${data.projectName}`, margin, y);
  y += 5;
  doc.text(`Généré le : ${data.generatedAt}`, margin, y);
  y += 5;
  if (data.gmbUrl) {
    doc.text(`Fiche Google : ${data.gmbUrl}`, margin, y);
    y += 5;
  }
  y += 5;

  // ── Progress section ──
  const progress = data.tasksTotal > 0 ? Math.round((data.tasksDone.length / data.tasksTotal) * 100) : 0;
  
  doc.setFillColor(245, 245, 250);
  doc.roundedRect(margin, y, contentWidth, 25, 3, 3, "F");
  
  doc.setTextColor(...DARK);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(`Progression : ${progress}%`, margin + 5, y + 10);
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text(`${data.tasksDone.length} tâches terminées sur ${data.tasksTotal}`, margin + 5, y + 18);
  
  // Progress bar
  const barX = margin + contentWidth - 65;
  const barY = y + 8;
  const barW = 55;
  const barH = 6;
  doc.setFillColor(230, 230, 235);
  doc.roundedRect(barX, barY, barW, barH, 2, 2, "F");
  doc.setFillColor(...BRAND_COLOR);
  doc.roundedRect(barX, barY, barW * (progress / 100), barH, 2, 2, "F");
  
  y += 35;

  // ── Tasks completed ──
  doc.setTextColor(...DARK);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("Tâches réalisées", margin, y);
  y += 8;

  doc.setFontSize(9);
  data.tasksDone.forEach((task, i) => {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }

    const bgColor: [number, number, number] = i % 2 === 0 ? [250, 250, 252] : [255, 255, 255];
    doc.setFillColor(...bgColor);
    doc.rect(margin, y - 3, contentWidth, 10, "F");

    doc.setTextColor(0, 180, 80);
    doc.setFont("helvetica", "bold");
    doc.text("✓", margin + 2, y + 3);

    doc.setTextColor(...DARK);
    doc.setFont("helvetica", "normal");
    const titleText = doc.splitTextToSize(task.title, contentWidth - 15);
    doc.text(titleText[0], margin + 8, y + 3);

    if (task.linkUrl) {
      doc.setTextColor(...BRAND_COLOR);
      doc.setFontSize(7);
      doc.text(task.linkUrl, margin + 8, y + 7);
      doc.setFontSize(9);
      y += 4;
    }

    y += 10;
  });

  y += 5;

  // ── Footer ──
  if (y > 260) {
    doc.addPage();
    y = 20;
  }

  doc.setFillColor(245, 245, 250);
  doc.roundedRect(margin, y, contentWidth, 20, 3, 3, "F");
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("Ce rapport a été généré automatiquement par Adamkom.", margin + 5, y + 7);
  doc.text("Pour toute modification, ouvrez un ticket support sur votre espace client.", margin + 5, y + 12);
  doc.text("📞 0262 66 68 76 — © Adamkom by JJP — La Réunion 🇷🇪", margin + 5, y + 17);

  // Save
  const filename = `Rapport_GMB_${data.clientName.replace(/[^a-zA-Z0-9]/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`;
  doc.save(filename);
}
