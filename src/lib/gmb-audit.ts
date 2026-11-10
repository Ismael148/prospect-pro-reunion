// Grille d'analyse d'une fiche Google, remplie par l'équipe à partir du lien de la fiche.

export type AuditStatus = "ok" | "improve" | "missing" | "na";

export interface AuditCriterion {
  id: string;
  label: string;
  hint: string;
  /** Poids dans la note finale. */
  weight: number;
}

export interface AuditSection {
  key: string;
  title: string;
  criteria: AuditCriterion[];
}

export interface AuditEntry {
  status: AuditStatus;
  note?: string | null;
}

export type AuditCriteria = Record<string, AuditEntry>;

export const AUDIT_STATUS_LABELS: Record<AuditStatus, string> = {
  ok: "Conforme",
  improve: "À améliorer",
  missing: "Manquant",
  na: "Non concerné",
};

export const GMB_AUDIT_SECTIONS: AuditSection[] = [
  {
    key: "identite",
    title: "Identité et coordonnées",
    criteria: [
      { id: "verified", label: "Fiche validée par Google", hint: "La fiche est revendiquée et validée, visible dans Google Maps.", weight: 3 },
      { id: "name", label: "Nom exact de l'entreprise", hint: "Identique à la devanture, sans mots-clés ni ville ajoutés.", weight: 2 },
      { id: "address", label: "Adresse ou zone desservie", hint: "Adresse exacte, ou communes desservies pour un service à domicile.", weight: 2 },
      { id: "phone", label: "Téléphone", hint: "Numéro principal joignable, identique au site et aux réseaux.", weight: 2 },
      { id: "website", label: "Site internet", hint: "Lien vers le site du client, fonctionnel.", weight: 2 },
      { id: "category", label: "Catégorie principale", hint: "La plus précise possible pour l'activité principale.", weight: 3 },
      { id: "secondary", label: "Catégories secondaires", hint: "2 ou 3 catégories pertinentes ajoutées.", weight: 1 },
    ],
  },
  {
    key: "contenu",
    title: "Contenu de la fiche",
    criteria: [
      { id: "description", label: "Description", hint: "Texte complet (jusqu'à 750 caractères), activité et ville, sans lien ni promotion.", weight: 2 },
      { id: "hours", label: "Horaires d'ouverture", hint: "Horaires réguliers renseignés et à jour.", weight: 2 },
      { id: "special_hours", label: "Horaires exceptionnels", hint: "Jours fériés et fermetures renseignés.", weight: 1 },
      { id: "attributes", label: "Attributs", hint: "Accessibilité, paiements, services sur place, etc.", weight: 1 },
      { id: "services", label: "Produits / services", hint: "Au moins 6 produits ou services avec description.", weight: 2 },
      { id: "booking", label: "Lien de réservation / contact", hint: "Lien de RDV, devis ou réservation si l'activité s'y prête.", weight: 1 },
    ],
  },
  {
    key: "visuels",
    title: "Photos et visuels",
    criteria: [
      { id: "logo", label: "Logo", hint: "Logo net et carré.", weight: 2 },
      { id: "cover", label: "Photo de couverture", hint: "Photo réelle et attractive, pas un simple visuel publicitaire.", weight: 2 },
      { id: "photos", label: "10 photos ou plus", hint: "Extérieur, intérieur, produits, équipe.", weight: 2 },
      { id: "recent_photos", label: "Photos récentes", hint: "Au moins une photo ajoutée ces 30 derniers jours.", weight: 1 },
    ],
  },
  {
    key: "avis",
    title: "Avis clients",
    criteria: [
      { id: "rating", label: "Note moyenne", hint: "4,3 / 5 ou plus.", weight: 3 },
      { id: "review_count", label: "Nombre d'avis", hint: "Au moins 20 avis.", weight: 2 },
      { id: "review_replies", label: "Réponses aux avis", hint: "Tous les avis ont reçu une réponse personnalisée.", weight: 3 },
      { id: "recent_reviews", label: "Avis récents", hint: "Au moins un nouvel avis ces 30 derniers jours.", weight: 1 },
    ],
  },
  {
    key: "activite",
    title: "Activité de la fiche",
    criteria: [
      { id: "posts", label: "Publications régulières", hint: "Au moins une publication ces 7 derniers jours.", weight: 2 },
      { id: "nap", label: "Cohérence avec le site et les réseaux", hint: "Nom, adresse et téléphone identiques partout.", weight: 2 },
    ],
  },
];

export const ALL_AUDIT_CRITERIA: AuditCriterion[] = GMB_AUDIT_SECTIONS.flatMap((s) => s.criteria);

const STATUS_FACTOR: Record<Exclude<AuditStatus, "na">, number> = { ok: 1, improve: 0.5, missing: 0 };

/** Note sur 100 : conforme = 100 %, à améliorer = 50 %, manquant = 0 ; « non concerné » et non évalué sont exclus. */
export function computeAuditScore(criteria: AuditCriteria | null | undefined): number {
  let max = 0;
  let got = 0;
  for (const c of ALL_AUDIT_CRITERIA) {
    const status = criteria?.[c.id]?.status;
    if (!status || status === "na") continue;
    max += c.weight;
    got += c.weight * STATUS_FACTOR[status];
  }
  return max ? Math.round((got / max) * 100) : 0;
}

/** Nombre de critères évalués / total. */
export function auditCompletion(criteria: AuditCriteria | null | undefined) {
  const total = ALL_AUDIT_CRITERIA.length;
  const rated = ALL_AUDIT_CRITERIA.filter((c) => criteria?.[c.id]?.status).length;
  return { rated, total, complete: rated === total };
}

export function auditScoreLabel(score: number): string {
  if (score >= 85) return "Excellente";
  if (score >= 65) return "Bonne";
  if (score >= 40) return "À renforcer";
  return "Insuffisante";
}

/** Un lien de fiche Google acceptable : Google Maps, lien court maps.app.goo.gl, g.page ou business.google.com. */
export function isGoogleListingUrl(raw: string): boolean {
  try {
    const url = new URL(raw.trim());
    if (url.protocol !== "https:") return false;
    const host = url.hostname.toLowerCase();
    return (
      host === "maps.app.goo.gl" ||
      host === "g.page" ||
      host === "g.co" ||
      host === "goo.gl" ||
      host === "business.google.com" ||
      /(^|\.)google\.[a-z.]+$/.test(host)
    );
  } catch {
    return false;
  }
}
