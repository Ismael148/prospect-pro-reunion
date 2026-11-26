import { describe, expect, it } from "vitest";
import { buildQuoteEmail, getQuoteEmailDraft } from "@/lib/quote-email";

const quotes = [{
  quote_number: "DEV-2026-0001",
  template_key: "tuning",
  company_name: "Entreprise",
  contact_name: "Raissa",
  items: [],
}];

describe("editable quote email", () => {
  it("prefills the whole message with the selected quote and renewal details", () => {
    const draft = getQuoteEmailDraft(quotes);
    expect(draft.subject).toContain("DEV-2026-0001");
    expect(draft.message).toContain("Bonjour Raissa,");
    expect(draft.message).toContain("Pack Chip Tuning — DEV-2026-0001");
    expect(draft.message).toContain("149 € / an");
    expect(draft.message).toContain("Bien cordialement,");
  });

  it("uses the edited subject and entire message in preview and send payload", () => {
    const result = buildQuoteEmail(quotes, {
      subject: "Objet personnalisé",
      message: "Bonjour Raissa,\n\nVoici votre document personnalisé.\n\n<script>alert(1)</script>",
    });
    expect(result.subject).toBe("Objet personnalisé");
    expect(result.html).toContain("Voici votre document personnalisé.");
    expect(result.html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(result.html).not.toContain("Pour accepter ce devis");
    expect(result.html).not.toContain("<script>");
  });

  it("preserves the default formatted email when the draft is unchanged", () => {
    expect(buildQuoteEmail(quotes, getQuoteEmailDraft(quotes))).toEqual(buildQuoteEmail(quotes));
  });
});
