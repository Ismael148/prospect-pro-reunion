import { describe, it, expect } from "vitest";
import { getTicketTracking, getSupportSummary, formatDuration } from "@/lib/support-tracking";

const now = new Date("2026-11-18T10:00:00Z");
const ticket = (over: Partial<Parameters<typeof getTicketTracking>[0]>) => ({
  status: "ouvert",
  created_at: "2026-11-18T08:00:00Z",
  first_response_at: null,
  resolved_at: null,
  ...over,
});

describe("suivi des tickets support", () => {
  it("mesure le délai entre l'ouverture et la première réponse", () => {
    const t = getTicketTracking(ticket({ status: "en_cours", first_response_at: "2026-11-18T10:30:00Z" }), now);
    expect(t.responseMs).toBe(2.5 * 3_600_000);
    expect(t.responseState).toBe("repondu");
    expect(t.respondedWithinTarget).toBe(true);
  });

  it("un ticket ouvert sans réponse depuis plus de 24 h est en retard", () => {
    const t = getTicketTracking(ticket({ created_at: "2026-11-17T09:00:00Z" }), now);
    expect(t.responseState).toBe("en_retard");
    expect(t.waitingMs).toBe(25 * 3_600_000);
  });

  it("un ticket ouvert sans réponse depuis moins de 24 h est en attente", () => {
    expect(getTicketTracking(ticket({}), now).responseState).toBe("en_attente");
  });

  it("une réponse après 24 h n'est pas dans le délai", () => {
    const t = getTicketTracking(ticket({ first_response_at: "2026-11-19T09:00:00Z" }), now);
    expect(t.respondedWithinTarget).toBe(false);
  });

  it("calcule le délai de résolution seulement pour un ticket clos", () => {
    expect(getTicketTracking(ticket({ status: "resolu", resolved_at: "2026-11-20T08:00:00Z" }), now).resolutionMs).toBe(48 * 3_600_000);
    expect(getTicketTracking(ticket({ status: "ouvert", resolved_at: "2026-11-20T08:00:00Z" }), now).resolutionMs).toBeNull();
  });

  it("résume taux de réponse, retards et moyennes", () => {
    const s = getSupportSummary([
      ticket({ first_response_at: "2026-11-18T09:00:00Z" }),
      ticket({ first_response_at: "2026-11-18T11:00:00Z" }),
      ticket({ created_at: "2026-11-16T08:00:00Z" }),
      ticket({}),
    ], now);
    expect(s.total).toBe(4);
    expect(s.responded).toBe(2);
    expect(s.responseRate).toBe(50);
    expect(s.avgResponseMs).toBe(2 * 3_600_000);
    expect(s.awaiting).toBe(2);
    expect(s.late).toBe(1);
  });

  it("formate les durées en français", () => {
    expect(formatDuration(30_000)).toBe("moins d'1 min");
    expect(formatDuration(45 * 60_000)).toBe("45 min");
    expect(formatDuration(3 * 3_600_000 + 5 * 60_000)).toBe("3 h 05");
    expect(formatDuration(52 * 3_600_000)).toBe("2 j 4 h");
  });
});
