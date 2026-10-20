import { describe, expect, it } from "vitest";
import { buildInvoiceEmail, getInvoiceEmailDraft } from "@/lib/invoice-email";

const invoice = { invoice_number: "FAC-2026-0097", total_amount: 1780, status: "brouillon" };
const client = { company_name: "Entreprise", manager_name: "Raissa" };

describe("editable invoice email", () => {
  it("uses the edited subject and message without injecting HTML", () => {
    const result = buildInvoiceEmail(invoice, client, { subject: "Facture corrigée", message: "Bonjour,\n\nVotre facture <script>alert(1)</script>" });
    expect(result.subject).toBe("Facture corrigée");
    expect(result.html).toContain("Votre facture &lt;script&gt;alert(1)&lt;/script&gt;");
    expect(result.html).not.toContain("<script>");
  });

  it("preserves the default formatted email when its draft is unchanged", () => {
    expect(buildInvoiceEmail(invoice, client, getInvoiceEmailDraft(invoice, client)))
      .toEqual(buildInvoiceEmail(invoice, client));
  });
});