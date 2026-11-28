import type { ProjectModule } from "./constants";

/** Module id used for tasks that were added by hand, without a [module] tag. */
export const EXTRA_TASKS_MODULE_ID = "unknown";

/** A task belongs to a pack module only when its description carries a [module] tag. */
export const hasModuleTag = (description?: string | null): boolean => /\[.*?\]/.test(description || "");

/**
 * Packs the project's module list for display: tasks saved without a [module] tag
 * (added by hand, or from outside the app) get their own "Autres tâches" section
 * instead of disappearing from the project page.
 */
export function withExtraTaskModule(
  modules: ProjectModule[],
  tasks: { description?: string | null }[],
): ProjectModule[] {
  const untagged = tasks.filter((task) => !hasModuleTag(task.description));
  if (!untagged.length) return modules;

  const deadlineDays = modules.reduce((max, m) => Math.max(max, m.deadlineDays), 0);
  return [
    ...modules,
    { id: EXTRA_TASKS_MODULE_ID, name: "Autres tâches", icon: "📌", deadlineDays, tasks: [] },
  ];
}
