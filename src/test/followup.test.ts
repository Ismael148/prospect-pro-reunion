import { describe, it, expect } from "vitest";
import { buildCancelEmail, buildConfirmEmail, buildReminderEmail, buildRescheduleEmail, campaignStatus } from "@/lib/followup";

const now = new Date("2026-10-13T10:00:00Z");
const base = { hasOpenTicket: false, hasPendingRequest: false, nextRdv: null, lastReminder: null, now };

describe("campagne de relance 15 jours", () => {
  it("exclut un client avec ticket ouvert", () => {
    expect(campaignStatus({ ...base, hasOpenTicket: true }).status).toBe("exclu_ticket");
  });
  it("exclut un client avec dispo en attente", () => {
    expect(campaignStatus({ ...base, hasPendingRequest: true }).status).toBe("exclu_dispo");
  });
  it("relance prévue 15 jours après la dernière", () => {
    const r = campaignStatus({ ...base, lastReminder: new Date("2026-10-01T10:00:00Z") });
    expect(r.status).toBe("attente");
    expect(r.nextSend?.toISOString().slice(0, 10)).toBe("2026-10-16");
  });
  it("à relancer après 15 jours", () => {
    expect(campaignStatus({ ...base, lastReminder: new Date("2026-09-28T10:00:00Z") }).status).toBe("a_relancer");
  });
});

describe("salutation des mails de suivi", () => {
  it("mentionne le nom du client quand il est connu", () => {
    const { body } = buildReminderEmail("Jean Dupont", "tok");
    expect(body).toContain("Bonjour <strong>Jean Dupont</strong>,");
  });
  it("ne mentionne personne quand le client n'a pas de nom", () => {
    for (const name of [undefined, null, ""]) {
      const { body } = buildReminderEmail(name, "tok");
      expect(body).toContain("Bonjour,");
      expect(body).not.toContain("Bonjour <strong>");
    }
  });
  it("s'applique aussi aux mails de confirmation, recale et annulation", () => {
    expect(buildConfirmEmail("Jean Dupont", "lundi 10h", "https://meet.google.com/abc").body).toContain("Bonjour <strong>Jean Dupont</strong>,");
    expect(buildConfirmEmail(undefined, "lundi 10h", "https://meet.google.com/abc").body).toContain("Bonjour,");
    expect(buildRescheduleEmail("Jean Dupont", "tok").body).toContain("Bonjour <strong>Jean Dupont</strong>,");
    expect(buildRescheduleEmail(null, "tok").body).toContain("Bonjour,");
    expect(buildCancelEmail("Jean Dupont", "motif").body).toContain("Bonjour <strong>Jean Dupont</strong>,");
    expect(buildCancelEmail("").body).toContain("Bonjour,");
  });
});
