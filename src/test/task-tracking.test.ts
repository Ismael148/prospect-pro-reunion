import { describe, it, expect } from "vitest";
import { agendaBucket, getClientTaskStats, isTaskOverdue, reunionToday, type TrackedTask } from "@/lib/task-tracking";

const t = (p: Partial<TrackedTask>): TrackedTask => ({ id: "x", status: "a_faire", due_date: "2026-11-10", project_status: "en_cours", ...p });
const TODAY = "2026-11-18";

describe("task tracking", () => {
  it("uses the Réunion day (UTC+4): 21:00 UTC is already the next day", () => {
    expect(reunionToday(new Date("2026-11-17T21:00:00Z"))).toBe("2026-11-18");
  });

  it("an open task past its due date is late", () => {
    expect(isTaskOverdue(t({}), TODAY)).toBe(true);
  });

  it("a task due today is not late", () => {
    expect(isTaskOverdue(t({ due_date: TODAY }), TODAY)).toBe(false);
  });

  it("a finished task is never late", () => {
    expect(isTaskOverdue(t({ status: "termine" }), TODAY)).toBe(false);
  });

  it("tasks of finished or cancelled projects are not late", () => {
    expect(isTaskOverdue(t({ project_status: "termine" }), TODAY)).toBe(false);
    expect(isTaskOverdue(t({ project_status: "annule" }), TODAY)).toBe(false);
  });

  it("sorts agenda dates into late / today / tomorrow / 7 days / later", () => {
    expect(agendaBucket("2026-11-17", TODAY)).toBe("retard");
    expect(agendaBucket("2026-11-18", TODAY)).toBe("aujourdhui");
    expect(agendaBucket("2026-11-19", TODAY)).toBe("demain");
    expect(agendaBucket("2026-11-25", TODAY)).toBe("semaine");
    expect(agendaBucket("2026-11-26", TODAY)).toBe("plus_tard");
    expect(agendaBucket(null, TODAY)).toBe("sans_date");
  });

  it("client completion rate counts done tasks over all tasks, ignoring cancelled projects", () => {
    const s = getClientTaskStats([
      t({ id: "1", status: "termine" }),
      t({ id: "2", status: "termine" }),
      t({ id: "3" }),
      t({ id: "4", due_date: "2026-11-20" }),
      t({ id: "5", project_status: "annule" }),
    ], TODAY);
    expect(s).toMatchObject({ total: 4, done: 2, open: 2, overdue: 1, completionRate: 50, nextDue: "2026-11-20" });
  });
});
