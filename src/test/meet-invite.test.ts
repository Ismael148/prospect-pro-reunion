import { describe, it, expect } from "vitest";
import { DEFAULT_MEET_LINK, buildMeetInviteEmail, meetMotifLabel, reunionLocalToDate } from "@/lib/meet-invite";

describe("invitation RDV visio", () => {
  it("joint toujours le lien Meet de l'agence par défaut", () => {
    expect(DEFAULT_MEET_LINK).toBe("https://meet.google.com/meet/cjd-ydcx-qpe");
    const m = buildMeetInviteEmail({ motif: "Site internet", start: reunionLocalToDate("2026-12-01T10:00"), durationMin: 30, meet: DEFAULT_MEET_LINK });
    expect(m.body).toContain(DEFAULT_MEET_LINK);
  });
  it("propose les motifs carte, site et page de conversion", () => {
    expect(meetMotifLabel("carte_bizness")).toBe("Carte Bizness NFC");
    expect(meetMotifLabel("site_internet")).toBe("Site internet");
    expect(meetMotifLabel("page_conversion")).toBe("Page de conversion");
  });
  it("accepte un motif personnalisé", () => {
    expect(meetMotifLabel("autre", "  Fiche Google ")).toBe("Fiche Google");
    expect(meetMotifLabel("autre", " ")).toBe("");
  });
  it("salue le gérant par son nom, sinon simple Bonjour", () => {
    const base = { motif: "Site internet", start: reunionLocalToDate("2026-12-01T10:00"), durationMin: 30, meet: DEFAULT_MEET_LINK };
    expect(buildMeetInviteEmail({ ...base, name: "Paul Hoarau" }).body).toContain("Bonjour <strong>Paul Hoarau</strong>,");
    expect(buildMeetInviteEmail({ ...base, name: null }).body).toContain("Bonjour,");
  });
  it("l'heure saisie est l'heure de La Réunion", () => {
    expect(reunionLocalToDate("2026-12-01T10:00").toISOString()).toBe("2026-12-01T06:00:00.000Z");
  });
});
