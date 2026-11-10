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
  it("le texte par défaut mentionne la demande faite au support", () => {
    const m = buildMeetInviteEmail({ motif: "Site internet", start: reunionLocalToDate("2026-12-01T10:00"), durationMin: 30, meet: DEFAULT_MEET_LINK });
    expect(m.body).toContain("Suite à votre demande auprès de notre support");
    expect(m.body).not.toContain("faire le point");
  });
  it("utilise le texte modifié, échappé, à la place du texte par défaut", () => {
    const m = buildMeetInviteEmail({ motif: "Site internet", start: reunionLocalToDate("2026-12-01T10:00"), durationMin: 30, meet: DEFAULT_MEET_LINK,
      intro: "Merci <b>pour</b> votre appel.", closing: "À jeudi !" });
    expect(m.body).toContain("Merci &lt;b&gt;pour&lt;/b&gt; votre appel.");
    expect(m.body).toContain("À jeudi !");
    expect(m.body).not.toContain("Suite à votre demande");
    expect(m.body).not.toContain("Si ce créneau ne vous convient pas");
    expect(m.body).toContain(DEFAULT_MEET_LINK);
  });
  it("l'heure saisie est l'heure de La Réunion", () => {
    expect(reunionLocalToDate("2026-12-01T10:00").toISOString()).toBe("2026-12-01T06:00:00.000Z");
  });
});
