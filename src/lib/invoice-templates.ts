// Modèles graphiques disponibles pour les factures PDF (le logo Adamkom est toujours présent).
export type InvoiceTemplateId = "signature" | "epure" | "prestige" | "aurore";

export const DEFAULT_INVOICE_TEMPLATE: InvoiceTemplateId = "signature";

export const INVOICE_TEMPLATES: { id: InvoiceTemplateId; name: string; description: string }[] = [
  { id: "signature", name: "Signature", description: "Bandeau noir et accents rose, le style historique Adamkom." },
  { id: "epure", name: "Épuré", description: "Fond blanc, lignes fines et grand titre : minimaliste et élégant." },
  { id: "prestige", name: "Prestige", description: "Colonne noire latérale avec logo, rendu haut de gamme." },
  { id: "aurore", name: "Aurore", description: "Grand en-tête rose, cartes arrondies : moderne et dynamique." },
];

export function resolveInvoiceTemplate(value?: string | null): InvoiceTemplateId {
  return INVOICE_TEMPLATES.some((t) => t.id === value) ? (value as InvoiceTemplateId) : DEFAULT_INVOICE_TEMPLATE;
}
