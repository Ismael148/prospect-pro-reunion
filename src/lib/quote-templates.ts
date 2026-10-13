export interface QuoteItem {
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
  included?: boolean;
}

export interface QuoteTemplate {
  key: string;
  label: string;
  subtitle: string;
  notes: string;
  items: QuoteItem[];
  renewal?: boolean;
}

export const TUNING_RENEWAL_NOTE = "Renouvellement à partir de la 2e année : 149 € / an - sans engagement (maintenance, mises à jour, hébergement et suivi technique).";
export const hasRenewal = (key?: string | null) => key === "tuning" || key === "tuning_plus";

const line = (description: string, unit_price: number, quantity = 1, included = true): QuoteItem => ({
  description, quantity, unit_price, total: quantity * unit_price, included,
});

export const QUOTE_TEMPLATES: QuoteTemplate[] = [
  {
    key: "tuning",
    label: "Pack Chip Tuning",
    subtitle: "Page de conversion, GMB, visuels — 790 €",
    renewal: true,
    notes: "Devis valable 30 jours. Acompte de 50 % à la signature, solde à la livraison.",
    items: [
      line("Pack Tuning Adamkom by JJP - Page de conversion professionnelle (design, rédaction, mise en ligne)", 790),
      line("Nom de domaine + hébergement 1re année", 0),
      line("Optimisation fiche Google My Business", 0),
      line("Visuels réseaux sociaux personnalisés", 0),
      line("Carte business NFC supplémentaire (option)", 49.9, 1, false),
    ],
  },
  {
    key: "tuning_plus",
    label: "Pack Chip Tuning Plus",
    subtitle: "Pack Tuning + création site internet — 1 780 €",
    renewal: true,
    notes: "Devis valable 30 jours. Acompte de 50 % à la signature, solde à la livraison.",
    items: [
      line("Pack Tuning Adamkom by JJP - Page de conversion professionnelle (design, rédaction, mise en ligne)", 790),
      line("Création site internet vitrine professionnel (design, contenus, responsive, SEO de base)", 990),
      line("Nom de domaine + hébergement 1re année", 0),
      line("Optimisation fiche Google My Business", 0),
      line("Visuels réseaux sociaux personnalisés", 0),
      line("Carte business NFC supplémentaire (option)", 49.9, 1, false),
    ],
  },
  {
    key: "nfc",
    label: "Cartes Bizness NFC",
    subtitle: "Carte NFC personnalisée + page digitale — 279,90 €",
    notes: "Devis valable 30 jours. Paiement à la commande. Délai de fabrication : 7 à 10 jours ouvrés.",
    items: [
      line("Pack Star Bizness NFC - Carte NFC personnalisée (design recto/verso)", 279.9),
      line("Page digitale de contact connectée à la carte", 0),
      line("QR Code + programmation NFC", 0),
      line("Formation à l'utilisation de la carte", 0),
      line("Carte NFC supplémentaire", 49.9, 1, false),
    ],
  },
  {
    key: "numerik",
    label: "Star Bizness Numerik",
    subtitle: "Site internet + présence digitale — 1 490 €",
    notes: "Devis valable 30 jours. Acompte de 50 % à la signature, solde à la livraison (délai 15 jours).",
    items: [
      line("Pack Star Bizness Numerik - Création site internet", 1490),
      line("Fiche Google My Business", 0),
      line("Carte business NFC", 0),
      line("Visuels réseaux sociaux", 0),
    ],
  },
  { key: "custom", label: "Devis libre", subtitle: "Partir d'une page blanche", notes: "Devis valable 30 jours.", items: [line("Prestation", 0)] },
];

export function computeQuoteTotals(items: QuoteItem[], discount: number, taxRate: number) {
  const gross = items.filter((i) => i.included !== false).reduce((s, i) => s + i.quantity * i.unit_price, 0);
  const amount = Math.max(0, gross - (discount || 0));
  const tax = Math.round(amount * (taxRate || 0)) / 100;
  return { gross, amount, tax_amount: tax, total_amount: Math.round((amount + tax) * 100) / 100 };
}
