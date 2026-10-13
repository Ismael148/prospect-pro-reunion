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

export function quoteAnnualRenewals(key?: string | null, items: QuoteItem[] = []) {
  const website = key === "tuning_plus" || key === "numerik" || items.some((item) =>
    item.included !== false && /cr[ée]ation\s+(?:d['’]un\s+)?site\s+(?:internet|web)/i.test(item.description));
  return { subscription: hasRenewal(key) ? 149 : 0, website: website ? 90 : 0 };
}

export const WEBSITE_RENEWAL_NOTE = "Site internet : renouvellement du nom de domaine et de l'hébergement à partir de la 2e année, environ 90 € / an.";

/** Combined renewal text shown on quote PDFs (Chip Tuning subscription + website domain/hosting). */
export function quoteRenewalNote(key?: string | null, items: QuoteItem[] = []): string | null {
  const r = quoteAnnualRenewals(key, items);
  const parts = [r.subscription > 0 ? TUNING_RENEWAL_NOTE : "", r.website > 0 ? WEBSITE_RENEWAL_NOTE : ""].filter(Boolean);
  return parts.length ? parts.join("\n") : null;
}

const line = (description: string, unit_price: number, quantity = 1, included = true): QuoteItem => ({
  description, quantity, unit_price, total: quantity * unit_price, included,
});

export const QUOTE_TEMPLATES: QuoteTemplate[] = [
  {
    key: "tuning",
    label: "Pack Chip Tuning",
    subtitle: "8 prestations incluses — 790 €",
    renewal: true,
    notes: "Devis valable 30 jours. Paiement en 4 fois sans frais possible.",
    items: [
      line("Pack Chip Tuning Adamkom by JJP - 8 prestations incluses", 790),
      line("Optimisation complète de votre fiche Google - Donnez à votre fiche l'impact qu'elle mérite pour attirer les regards et donner envie de vous choisir", 0),
      line("Votre page de conversion sur mesure - Captez vos clients avec une page qui attire, rassure et transforme une simple visite en véritable opportunité", 0),
      line("Votre Carte Bizness intelligente NFC - L'outil par excellence pour parler de votre entreprise, partager vos services et rester connecté à vos clients", 0),
      line("Votre inscription sur Les Entreprises 974 - Faites rayonner votre entreprise au cœur d'un réseau de plus de 450 entreprises réunies pour renforcer la visibilité locale à La Réunion", 0),
      line("Une vidéo Short qui fait parler de vous - Quelques secondes pour montrer votre savoir-faire, capter l'attention et donner envie de découvrir votre entreprise", 0),
      line("Vos visuels Google - Faites vivre votre fiche et donnez régulièrement une nouvelle raison à vos clients de penser à vous", 0),
      line("Référencement de vos réseaux sociaux sur Google - 99 % des entreprises ne savent pas qu'on peut référencer leurs réseaux sociaux avec Google. Avec Adamkom, ces choses sont faites", 0),
      line("Faites exploser vos avis et vos étoiles Google - Un moyen rapide et efficace pour faire grandir vos avis et renforcer la réputation de votre fiche Google", 0),
      line("Carte Bizness NFC supplémentaire (option)", 49.9, 1, false),
    ],
  },
  {
    key: "tuning_plus",
    label: "Pack Chip Tuning Plus",
    subtitle: "Pack Tuning (8 prestations) + création site internet — 1 780 €",
    renewal: true,
    notes: "Devis valable 30 jours. Paiement en 4 fois sans frais possible.",
    items: [
      line("Pack Chip Tuning Adamkom by JJP - 8 prestations incluses", 790),
      line("Optimisation complète de votre fiche Google - Donnez à votre fiche l'impact qu'elle mérite pour attirer les regards et donner envie de vous choisir", 0),
      line("Votre page de conversion sur mesure - Captez vos clients avec une page qui attire, rassure et transforme une simple visite en véritable opportunité", 0),
      line("Votre Carte Bizness intelligente NFC - L'outil par excellence pour parler de votre entreprise, partager vos services et rester connecté à vos clients", 0),
      line("Votre inscription sur Les Entreprises 974 - Faites rayonner votre entreprise au cœur d'un réseau de plus de 450 entreprises réunies pour renforcer la visibilité locale à La Réunion", 0),
      line("Une vidéo Short qui fait parler de vous - Quelques secondes pour montrer votre savoir-faire, capter l'attention et donner envie de découvrir votre entreprise", 0),
      line("Vos visuels Google - Faites vivre votre fiche et donnez régulièrement une nouvelle raison à vos clients de penser à vous", 0),
      line("Référencement de vos réseaux sociaux sur Google - 99 % des entreprises ne savent pas qu'on peut référencer leurs réseaux sociaux avec Google. Avec Adamkom, ces choses sont faites", 0),
      line("Faites exploser vos avis et vos étoiles Google - Un moyen rapide et efficace pour faire grandir vos avis et renforcer la réputation de votre fiche Google", 0),
      line("Création site internet vitrine professionnel (design, contenus, responsive, SEO de base)", 990),
      line("Carte Bizness NFC supplémentaire (option)", 49.9, 1, false),
    ],
  },
  {
    key: "nfc",
    label: "Cartes Bizness NFC",
    subtitle: "Carte NFC personnalisée + page digitale — 279,90 €",
    notes: "Devis valable 30 jours. Paiement en 4 fois sans frais possible. Paiement à la commande. Délai de fabrication : 7 à 10 jours ouvrés.",
    items: [
      line("Carte Bizness NFC intelligente - L'outil par excellence pour parler de votre entreprise, partager vos services et rester connecté à vos clients", 279.9),
      line("Page digitale de contact connectée à la carte", 0),
      line("Carte NFC supplémentaire", 49.9, 1, false),
    ],
  },
  {
    key: "numerik",
    label: "Star Bizness Numerik",
    subtitle: "Site internet + présence digitale — 1 490 €",
    notes: "Devis valable 30 jours. Paiement en 4 fois sans frais possible. Délai de livraison : 15 jours.",
    items: [
      line("Pack Star Bizness Numerik - Création site internet", 1490),
      line("Fiche Google My Business", 0),
      line("Carte business NFC", 0),
      line("Visuels réseaux sociaux", 0),
    ],
  },
  { key: "custom", label: "Devis libre", subtitle: "Partir d'une page blanche", notes: "Devis valable 30 jours. Paiement en 4 fois sans frais possible.", items: [line("Prestation", 0)] },
];

/** Les prix saisis sont TTC. La TVA éventuelle est incluse (affichée « dont TVA »). */
export function computeQuoteTotals(items: QuoteItem[], discount: number, taxRate: number) {
  const gross = items.filter((i) => i.included !== false).reduce((s, i) => s + i.quantity * i.unit_price, 0);
  const total = Math.round(Math.max(0, gross - (discount || 0)) * 100) / 100;
  const ht = taxRate > 0 ? Math.round((total / (1 + taxRate / 100)) * 100) / 100 : total;
  return { gross, amount: ht, tax_amount: Math.round((total - ht) * 100) / 100, total_amount: total };
}

export function quoteRemaining(q: { total_amount: number; deposit_amount?: number | null; is_paid?: boolean | null }) {
  if (q.is_paid) return 0;
  return Math.max(0, Math.round((Number(q.total_amount) - Number(q.deposit_amount || 0)) * 100) / 100);
}

/** Normalise également les anciens devis lors de leur affichage et export. */
export function cleanQuoteDescription(description: string) {
  return description.replace(/^\s*\d+[.)]\s*/, "");
}

export function cleanQuoteNotes(notes?: string | null) {
  return (notes || "").replace(/[^.!?\n]*acompte\s*(?:de\s*)?50\s*%[^.!?\n]*[.!?]?/gi, "").replace(/ {2,}/g, " ").trim();
}
