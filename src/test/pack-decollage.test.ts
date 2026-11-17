import { describe, expect, it } from "vitest";
import { DECOLLAGE_MODULES, PACK_PRICES, getPackModules } from "@/lib/constants";
import { DECOLLAGE_DEFAULTS, buildDecollageEmail } from "@/lib/decollage-email";
import { findDuplicateIds } from "@/lib/client-duplicates";

describe("Pack Décollage", () => {
  it("costs 2 250 € TTC", () => {
    expect(PACK_PRICES.pack_decollage).toBe(2250);
  });

  it("generates tasks for the 8 services of the offer, plus kickoff and trial review", () => {
    const names = getPackModules("pack_decollage").map((m) => m.id);
    expect(names).toEqual(["cadrage", "page_conversion", "appels_sortants", "support_client", "contenus_reseaux",
      "fiche_google", "visibilite_ia", "annuaire", "carte_business", "bilan_essai"]);
  });

  it("fits every task inside the 15-day trial", () => {
    expect(Math.max(...DECOLLAGE_MODULES.map((m) => m.deadlineDays))).toBe(15);
  });

  it("greets the manager by name, or with a plain Bonjour when missing", () => {
    expect(buildDecollageEmail({ ...DECOLLAGE_DEFAULTS, name: "Marie Payet" }).html).toContain("Bonjour Marie Payet,");
    expect(buildDecollageEmail({ ...DECOLLAGE_DEFAULTS, name: "" }).html).toContain("Bonjour,");
  });

  it("hides the WhatsApp number unless it is ticked", () => {
    expect(buildDecollageEmail({ ...DECOLLAGE_DEFAULTS }).html).not.toContain("93 80 22 01");
    expect(buildDecollageEmail({ ...DECOLLAGE_DEFAULTS, includeWhatsapp: true }).html).toContain("93 80 22 01");
  });

  it("adds the support block only when asked and a link exists", () => {
    const link = "https://ai.adamkom.com/s/abc";
    expect(buildDecollageEmail({ ...DECOLLAGE_DEFAULTS }, { supportLink: link, includeSupport: true }).html).toContain(link);
    expect(buildDecollageEmail({ ...DECOLLAGE_DEFAULTS }, { supportLink: link, includeSupport: false }).html).not.toContain(link);
  });

  it("uses the edited texts and escapes them", () => {
    const html = buildDecollageEmail({ ...DECOLLAGE_DEFAULTS, intro: "Offre <spéciale> & essai", price: "1 990 €" }).html;
    expect(html).toContain("Offre &lt;spéciale&gt; &amp; essai");
    expect(html).toContain("1&nbsp;990&nbsp;€");
  });

  it("is kept out of the Clients 2.0 list like Tuning clients", () => {
    const ids = findDuplicateIds([
      { id: "d", company_name: "Magella Voyages", pack_type: "pack_decollage" },
      { id: "n", company_name: "Magella Voyages", pack_type: "star_bizness_numerik" },
    ]);
    expect(ids.has("n")).toBe(true);
  });
});
