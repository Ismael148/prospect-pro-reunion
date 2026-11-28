import { describe, expect, it } from "vitest";
import { getPackModules } from "@/lib/constants";
import { EXTRA_TASKS_MODULE_ID, hasModuleTag, withExtraTaskModule } from "@/lib/project-task-modules";

describe("withExtraTaskModule · tâches hors module", () => {
  const nfcModules = getPackModules("star_bizness_nfc");

  it("adds an 'Autres tâches' section when a task has no [module] tag", () => {
    const result = withExtraTaskModule(nfcModules, [
      { description: "[nfc] Commander / programmer la carte NFC" },
      { description: "Publication et animation des réseaux sociaux du client." },
    ]);

    expect(result.length).toBe(nfcModules.length + 1);
    const extra = result[result.length - 1];
    expect(extra.id).toBe(EXTRA_TASKS_MODULE_ID);
    expect(extra.name).toBe("Autres tâches");
    // The extra section is due with the project: the pack's longest module deadline (7 days).
    expect(extra.deadlineDays).toBe(7);
  });

  it("keeps the pack module list untouched when every task is tagged", () => {
    const result = withExtraTaskModule(nfcModules, [
      { description: "[nfc] Tester le scan NFC et le lien QR Code" },
      { description: "[formation] Livrer la carte et obtenir validation" },
    ]);

    expect(result).toEqual(nfcModules);
    expect(result.some((m) => m.id === EXTRA_TASKS_MODULE_ID)).toBe(false);
  });

  it("adds nothing when the project has no task yet", () => {
    expect(withExtraTaskModule(nfcModules, [])).toEqual(nfcModules);
  });

  it("reads a module tag only from square brackets", () => {
    expect(hasModuleTag("[reseaux] Animer les réseaux sociaux")).toBe(true);
    expect(hasModuleTag("Gestion de ses réseaux sociaux")).toBe(false);
    expect(hasModuleTag(null)).toBe(false);
    expect(hasModuleTag(undefined)).toBe(false);
  });
});
