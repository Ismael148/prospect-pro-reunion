import { describe, expect, it } from "vitest";
import { GMB_PLAYBOOK } from "@/lib/gmb-playbook";
import { applyStepChange, isStepDone, monthlyProgress, reunionMonth, setupProgress, stepKey } from "@/lib/gmb-steps";
import { ALL_AUDIT_CRITERIA, auditCompletion, computeAuditScore, isGoogleListingUrl, type AuditCriteria } from "@/lib/gmb-audit";
import { clientPreferredTemplate, shouldSaveClientTemplate } from "@/lib/invoice-templates";

const setupPhases = GMB_PLAYBOOK.filter((p) => p.key !== "recurrent");
const recurring = GMB_PLAYBOOK.find((p) => p.key === "recurrent")!;

describe("suivi des étapes GMB", () => {
  it("une fiche sans aucune étape cochée est à 0 %", () => {
    expect(setupProgress({}).pct).toBe(0);
  });

  it("chaque étape de mise en place compte dans l'avancement", () => {
    let progress = {};
    for (const phase of setupPhases) for (const step of phase.steps) progress = applyStepChange(progress, stepKey(phase, step), true, { name: "Test" });
    const res = setupProgress({ step_progress: progress });
    expect(res.done).toBe(res.total);
    expect(res.pct).toBe(100);
  });

  it("une étape décochée redevient « pas encore faite »", () => {
    const phase = setupPhases[0];
    const step = phase.steps[0];
    let progress = applyStepChange({}, stepKey(phase, step), true, { name: "A" });
    progress = applyStepChange(progress, stepKey(phase, step), false, { name: "A" });
    expect(isStepDone(phase, step, { step_progress: progress })).toBe(false);
  });

  it("l'entretien mensuel repart à zéro le mois suivant", () => {
    const step = recurring.steps[0];
    const progress = applyStepChange({}, stepKey(recurring, step, "2026-03"), true, { name: "A" });
    expect(isStepDone(recurring, step, { step_progress: progress }, "2026-03")).toBe(true);
    expect(monthlyProgress({ step_progress: progress }, "2026-04").done).toBe(0);
  });

  it("le mois est calculé à l'heure de La Réunion (UTC+4)", () => {
    expect(reunionMonth(new Date("2026-03-31T21:00:00Z"))).toBe("2026-04");
  });
});

describe("analyse de fiche Google", () => {
  it("tout conforme donne 100/100, tout manquant 0/100", () => {
    const ok: AuditCriteria = Object.fromEntries(ALL_AUDIT_CRITERIA.map((c) => [c.id, { status: "ok" as const }]));
    const missing: AuditCriteria = Object.fromEntries(ALL_AUDIT_CRITERIA.map((c) => [c.id, { status: "missing" as const }]));
    expect(computeAuditScore(ok)).toBe(100);
    expect(computeAuditScore(missing)).toBe(0);
    expect(auditCompletion(ok).complete).toBe(true);
  });

  it("« à améliorer » vaut la moitié et « non concerné » est exclu", () => {
    const half: AuditCriteria = Object.fromEntries(ALL_AUDIT_CRITERIA.map((c) => [c.id, { status: "improve" as const }]));
    expect(computeAuditScore(half)).toBe(50);
    const withNa: AuditCriteria = { ...Object.fromEntries(ALL_AUDIT_CRITERIA.map((c) => [c.id, { status: "ok" as const }])), booking: { status: "na" } };
    expect(computeAuditScore(withNa)).toBe(100);
  });

  it("n'accepte que les liens de fiche Google", () => {
    expect(isGoogleListingUrl("https://maps.app.goo.gl/abc123")).toBe(true);
    expect(isGoogleListingUrl("https://www.google.com/maps/place/Adamkom")).toBe(true);
    expect(isGoogleListingUrl("https://example.com/maps")).toBe(false);
    expect(isGoogleListingUrl("http://maps.app.goo.gl/abc")).toBe(false);
  });
});

describe("modèle de facture préféré du client", () => {
  it("propose le modèle du client, sinon Signature", () => {
    expect(clientPreferredTemplate({ invoice_template: "prestige" })).toBe("prestige");
    expect(clientPreferredTemplate({ invoice_template: null })).toBe("signature");
  });

  it("n'enregistre la préférence que si elle change et que la case est cochée", () => {
    expect(shouldSaveClientTemplate({ invoice_template: "aurore" }, "aurore", true)).toBe(false);
    expect(shouldSaveClientTemplate({ invoice_template: null }, "epure", true)).toBe(true);
    expect(shouldSaveClientTemplate({ invoice_template: null }, "epure", false)).toBe(false);
  });
});
