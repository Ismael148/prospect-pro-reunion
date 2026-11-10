// Suivi minutieux des étapes GMB : chaque étape du guide est « faite » ou « pas encore faite ».
// Les étapes récurrentes (phase « recurrent ») sont vérifiées mois par mois.
import { GMB_PLAYBOOK, type GmbPlaybookPhase, type GmbPlaybookStep } from "@/lib/gmb-playbook";

export interface GmbStepEntry {
  done: boolean;
  at?: string | null;
  by?: string | null;
  by_name?: string | null;
  note?: string | null;
}

export type GmbStepProgress = Record<string, GmbStepEntry>;

/** Mois courant à La Réunion (UTC+4), format YYYY-MM. */
export function reunionMonth(date: Date = new Date()): string {
  const shifted = new Date(date.getTime() + 4 * 60 * 60 * 1000);
  return shifted.toISOString().slice(0, 7);
}

export function isRecurringPhase(phase: GmbPlaybookPhase): boolean {
  return phase.key === "recurrent";
}

/** Clé de stockage de l'étape : l'identifiant, suffixé du mois pour les étapes récurrentes. */
export function stepKey(phase: GmbPlaybookPhase, step: GmbPlaybookStep, month = reunionMonth()): string {
  return isRecurringPhase(phase) ? `${step.id}@${month}` : step.id;
}

export function getStepEntry(
  phase: GmbPlaybookPhase,
  step: GmbPlaybookStep,
  gmb: Record<string, any> | null | undefined,
  month = reunionMonth(),
): GmbStepEntry | null {
  const progress = (gmb?.step_progress || {}) as GmbStepProgress;
  const entry = progress[stepKey(phase, step, month)];
  if (entry) return entry;
  // Anciennes cases cochées avant le suivi détaillé.
  if (!isRecurringPhase(phase) && step.checklistKey && gmb?.[step.checklistKey]) return { done: true };
  return null;
}

export function isStepDone(
  phase: GmbPlaybookPhase,
  step: GmbPlaybookStep,
  gmb: Record<string, any> | null | undefined,
  month = reunionMonth(),
): boolean {
  return Boolean(getStepEntry(phase, step, gmb, month)?.done);
}

export function computeStepsProgress(
  phases: GmbPlaybookPhase[],
  gmb: Record<string, any> | null | undefined,
  month = reunionMonth(),
): { done: number; total: number; pct: number } {
  let done = 0;
  let total = 0;
  for (const phase of phases) {
    for (const step of phase.steps) {
      total += 1;
      if (isStepDone(phase, step, gmb, month)) done += 1;
    }
  }
  return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
}

/** Avancement de la mise en place (phases 1 à 3, hors entretien mensuel). */
export function setupProgress(gmb: Record<string, any> | null | undefined) {
  return computeStepsProgress(GMB_PLAYBOOK.filter((p) => !isRecurringPhase(p)), gmb);
}

/** Avancement de l'entretien du mois en cours. */
export function monthlyProgress(gmb: Record<string, any> | null | undefined, month = reunionMonth()) {
  return computeStepsProgress(GMB_PLAYBOOK.filter(isRecurringPhase), gmb, month);
}

/** Liste des étapes restant à faire, dans l'ordre du guide. */
export function pendingSteps(gmb: Record<string, any> | null | undefined, month = reunionMonth()) {
  const out: Array<{ phase: GmbPlaybookPhase; step: GmbPlaybookStep }> = [];
  for (const phase of GMB_PLAYBOOK) {
    for (const step of phase.steps) if (!isStepDone(phase, step, gmb, month)) out.push({ phase, step });
  }
  return out;
}

/** Nouvelle valeur de step_progress après avoir coché / décoché une étape. */
export function applyStepChange(
  current: GmbStepProgress | null | undefined,
  key: string,
  done: boolean,
  who: { id?: string | null; name?: string | null },
  note?: string | null,
  now: Date = new Date(),
): GmbStepProgress {
  const prev = (current || {})[key];
  return {
    ...(current || {}),
    [key]: {
      done,
      at: done ? now.toISOString() : null,
      by: who.id ?? null,
      by_name: who.name ?? null,
      note: note !== undefined ? note : prev?.note ?? null,
    },
  };
}
