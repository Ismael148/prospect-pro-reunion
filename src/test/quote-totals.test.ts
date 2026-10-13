import { describe, expect, it } from "vitest";
import { computeQuoteTotals, QUOTE_TEMPLATES, quoteRemaining } from "@/lib/quote-templates";

describe("Quote payment rules", () => {
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