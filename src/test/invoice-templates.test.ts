import { describe, it, expect } from "vitest";
import { writeFileSync, mkdirSync } from "node:fs";
import { exportInvoicePDF } from "@/lib/export-invoice-pdf";
import { INVOICE_TEMPLATES, resolveInvoiceTemplate } from "@/lib/invoice-templates";

const sample = (design_template?: string | null) => ({
  invoice_number: "FAC-2026-0123",
  due_date: "2026-12-15",
  status: "brouillon",
  amount: 1780,
  tax_rate: 8.5,
  tax_amount: 151.3,
  total_amount: 1931.3,
  discount_amount: 0,
  notes: "Renouvellement : 149 € / an à partir de la 2e année, sans engagement.",
  items: [
    { description: "Pack Star Bizness Tuning", quantity: 1, unit_price: 790, total: 790 },
    { description: "Création de site internet", quantity: 1, unit_price: 990, total: 990 },
  ],
  payment_methods: ["virement", "cb"],
  design_template,
  client: {
    company_name: "Garage Exemple Réunion",
    address: "12 rue des Lilas",
    postal_code: "97430",
    city: "Le Tampon",
    email: "contact@exemple.re",
    phone: "0262 00 00 00",
    ndi: "CLI-0042",
  },
});

const decode = (b64: string) => Buffer.from(b64, "base64").toString("latin1");

describe("modèles de facture", () => {
  it("propose 4 modèles", () => {
    expect(INVOICE_TEMPLATES.map((t) => t.id)).toEqual(["signature", "epure", "prestige", "aurore"]);
  });

  it("revient au modèle Signature pour une valeur inconnue ou vide", () => {
    expect(resolveInvoiceTemplate(null)).toBe("signature");
    expect(resolveInvoiceTemplate("inconnu")).toBe("signature");
    expect(resolveInvoiceTemplate("aurore")).toBe("aurore");
  });

  it.each(INVOICE_TEMPLATES.map((t) => t.id))("le modèle %s contient toujours le logo Adamkom", (id) => {
    const b64 = exportInvoicePDF(sample(id), { returnBase64: true })!;
    const pdf = decode(b64);
    expect(pdf).toMatch(/\/Subtype \/Image/);
    if (process.env.INVOICE_PREVIEW_DIR) {
      mkdirSync(process.env.INVOICE_PREVIEW_DIR, { recursive: true });
      writeFileSync(`${process.env.INVOICE_PREVIEW_DIR}/${id}.pdf`, Buffer.from(b64, "base64"));
    }
  });

  it("chaque modèle produit un rendu différent", () => {
    const outputs = INVOICE_TEMPLATES.map((t) => exportInvoicePDF(sample(t.id), { returnBase64: true })!.length);
    expect(new Set(outputs).size).toBe(INVOICE_TEMPLATES.length);
  });
});
