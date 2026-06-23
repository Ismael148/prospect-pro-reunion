import JSZip from "jszip";
import type { ClientFormData } from "@/hooks/use-client-forms";

const FIELD_LABELS: Record<string, string> = {
  full_name: "Nom complet",
  position: "Poste",
  phone: "Téléphone",
  email: "Email",
  company_name: "Nom de l'entreprise",
  website: "Site web",
  address: "Adresse",
  facebook: "Facebook",
  instagram: "Instagram",
  linkedin: "LinkedIn",
  tiktok: "TikTok",
  whatsapp: "WhatsApp",
  google_maps_url: "URL Google Maps",
  preferred_color: "Couleur préférée",
  notes: "Notes",
  company_description: "Description entreprise",
  services: "Services",
  slogan: "Slogan",
  opening_hours: "Horaires d'ouverture",
  target_audience: "Cible",
  competitors: "Concurrents",
  preferred_style: "Style préféré",
  additional_pages: "Pages additionnelles",
};

function safeName(s: string) {
  return s.replace(/[^a-zA-Z0-9-_]/g, "_").slice(0, 80);
}

function buildReadable(formType: string, companyName: string, fd: ClientFormData, submittedAt?: string | null) {
  const lines: string[] = [];
  lines.push(`=== Formulaire ${formType === "nfc" ? "Carte NFC" : "Site Internet"} ===`);
  lines.push(`Client : ${companyName}`);
  if (submittedAt) lines.push(`Soumis le : ${new Date(submittedAt).toLocaleString("fr-FR", { timeZone: "Indian/Reunion" })}`);
  lines.push("");

  for (const [key, value] of Object.entries(fd)) {
    if (!value) continue;
    if (key === "extra_cards" || key === "gallery_urls" || key === "logo_url" || key === "photo_url") continue;
    if (typeof value === "string" && !value.trim()) continue;
    const label = FIELD_LABELS[key] || key.replace(/_/g, " ");
    lines.push(`${label} :`);
    lines.push(`  ${Array.isArray(value) ? value.join(", ") : String(value)}`);
    lines.push("");
  }

  if (fd.extra_cards?.length) {
    lines.push("=== Cartes supplémentaires ===");
    fd.extra_cards.forEach((c, i) => {
      lines.push(`--- Carte ${i + 2} ---`);
      if (c.full_name) lines.push(`Nom : ${c.full_name}`);
      if (c.position) lines.push(`Poste : ${c.position}`);
      if (c.phone) lines.push(`Téléphone : ${c.phone}`);
      if (c.email) lines.push(`Email : ${c.email}`);
      if (c.address) lines.push(`Adresse : ${c.address}`);
      lines.push("");
    });
  }

  const urls: string[] = [];
  if ((fd as any).logo_url) urls.push(`Logo : ${(fd as any).logo_url}`);
  if ((fd as any).photo_url) urls.push(`Photo : ${(fd as any).photo_url}`);
  if (fd.gallery_urls?.length) {
    fd.gallery_urls.forEach((u, i) => urls.push(`Galerie ${i + 1} : ${u}`));
  }
  if (urls.length) {
    lines.push("=== Images (URLs) ===");
    lines.push(...urls);
  }

  return lines.join("\n");
}

async function fetchBlob(url: string): Promise<Blob | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.blob();
  } catch {
    return null;
  }
}

function extFromUrl(url: string, fallback = "jpg") {
  const m = url.split("?")[0].match(/\.([a-zA-Z0-9]{2,5})$/);
  return m ? m[1].toLowerCase() : fallback;
}

export async function exportClientFormZip(opts: {
  formType: string;
  companyName: string;
  formData: ClientFormData;
  submittedAt?: string | null;
}) {
  const { formType, companyName, formData, submittedAt } = opts;
  const zip = new JSZip();

  // Readable text
  zip.file("informations.txt", buildReadable(formType, companyName, formData, submittedAt));
  // Raw JSON for re-import / automation
  zip.file("formulaire.json", JSON.stringify(formData, null, 2));

  // Images folder
  const imgFolder = zip.folder("images");
  const tasks: Promise<void>[] = [];

  const add = (url: string, name: string) => {
    tasks.push(
      (async () => {
        const blob = await fetchBlob(url);
        if (blob && imgFolder) imgFolder.file(`${name}.${extFromUrl(url)}`, blob);
      })()
    );
  };

  if ((formData as any).logo_url) add((formData as any).logo_url, "logo");
  if ((formData as any).photo_url) add((formData as any).photo_url, "photo");
  formData.gallery_urls?.forEach((u, i) => add(u, `galerie_${String(i + 1).padStart(2, "0")}`));

  await Promise.all(tasks);

  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const date = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `${safeName(companyName)}_${formType}_${date}.zip`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
