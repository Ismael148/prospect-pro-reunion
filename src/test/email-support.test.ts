import { describe, it, expect } from "vitest";
import { applyEmailSupport, wrapInBrandedTemplate } from "@/lib/email-template";

describe("optional personal support section", () => {
  const link = "https://ai.adamkom.com/s/client-personal-token";
  const html = wrapInBrandedTemplate("<p>Facture jointe</p>", link);
  it("includes the personal support link exactly once when selected", () => {
    const result = applyEmailSupport(html, link, true);
    expect(result.split(`href="${link}"`)).toHaveLength(2);
  });
  it("removes the support section but preserves the message and footer when deselected", () => {
    const result = applyEmailSupport(html, link, false);
    expect(result).not.toContain(`href="${link}"`);
    expect(result).toContain("<p>Facture jointe</p>");
    expect(result).toContain("<!-- FOOTER -->");
  });
  it("does not create a generic link when no personal support link exists", () => {
    expect(applyEmailSupport("<p>Message</p>", undefined, true)).toBe("<p>Message</p>");
  });
});