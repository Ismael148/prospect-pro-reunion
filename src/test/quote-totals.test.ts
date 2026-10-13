import { describe, expect, it } from "vitest";
import { computeQuoteTotals, QUOTE_TEMPLATES, quoteRemaining, quoteAnnualRenewals } from "@/lib/quote-templates";

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
});