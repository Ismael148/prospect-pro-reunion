import { describe, expect, it } from "vitest";
import { computeQuoteTotals, QUOTE_TEMPLATES, quoteRemaining, quoteAnnualRenewals, cleanQuoteNotes } from "@/lib/quote-templates";
import { buildQuoteEmail } from "@/lib/quote-email";

describe("Quote payment rules", () => {
  it("sets the Chip Tuning Plus annual subscription at 149 euros", () => {
    expect(quoteAnnualRenewals("tuning_plus").subscription).toBe(149);
  });
  it("sets website domain and hosting renewal at approximately 90 euros annually", () => {
    expect(quoteAnnualRenewals("tuning_plus").website).toBe(90);
    expect(quoteAnnualRenewals("tuning").website).toBe(0);
    expect(quoteAnnualRenewals("custom", [{ description: "Création site internet", included: true, quantity: 1, unit_price: 990, total: 990 }]).website).toBe(90);
  });
  it("keeps Chip Tuning at 790 euros TTC", () => {
    const template = QUOTE_TEMPLATES.find((t) => t.key === "tuning");
    expect(computeQuoteTotals(template?.items || [], 0, 0).total_amount).toBe(790);
  });
  it("keeps Chip Tuning Plus at 1780 euros TTC", () => {
    const template = QUOTE_TEMPLATES.find((t) => t.key === "tuning_plus");
    expect(computeQuoteTotals(template?.items || [], 0, 0).total_amount).toBe(1780);
  });
  it("does not assume a mandatory 50 percent deposit", () => {
    expect(quoteRemaining({ total_amount: 790 })).toBe(790);
  });
  it("still deducts a freely entered deposit", () => {
    expect(quoteRemaining({ total_amount: 790, deposit_amount: 100 })).toBe(690);
  });
  it("removes four-installment mentions while preserving other conditions", () => {
    expect(cleanQuoteNotes("Devis valable 30 jours. Paiement en 4 fois sans frais possible. Paiement à la commande."))
      .toBe("Devis valable 30 jours. Paiement à la commande.");
    expect(cleanQuoteNotes("Payable en quatre fois sans frais. Délai : 15 jours."))
      .toBe("Délai : 15 jours.");
  });
  it("omits four-installment mentions from every template and quote email", () => {
    const forbidden = /(?:4|quatre)\s*(?:fois|x)\s+sans\s+frais/i;
    expect(QUOTE_TEMPLATES.map((template) => template.notes).join("\n")).not.toMatch(forbidden);
    const email = buildQuoteEmail([{ quote_number: "DEV-2026-0001", template_key: "tuning", company_name: "Client" }]);
    expect(email.html).not.toMatch(forbidden);
  });
});
import { quoteRenewalNote } from "@/lib/quote-templates";
describe("quote PDF renewal note", () => {
  it("Chip Tuning Plus mentions 149 € subscription and ~90 € domain renewal", () => {
    const note = quoteRenewalNote("tuning_plus") || "";
    expect(note).toContain("149 €");
    expect(note).toContain("90 €");
    expect(note).toMatch(/nom de domaine/);
  });
  it("Chip Tuning without site has no domain renewal", () => {
    expect(quoteRenewalNote("tuning") || "").not.toContain("90 €");
  });
});
