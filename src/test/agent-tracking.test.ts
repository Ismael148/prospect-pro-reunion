import { describe, it, expect } from "vitest";
import { computeAgentStats } from "@/lib/agent-tracking";

const NOW = new Date("2026-11-18T08:00:00Z");
const TODAY = "2026-11-18";

describe("per-agent follow-up", () => {
  const data = {
    tasks: [
      { id: "1", status: "termine", due_date: "2026-11-01", project_status: "en_cours", assigned_to: "a" },
      { id: "2", status: "a_faire", due_date: "2026-11-10", project_status: "en_cours", assigned_to: "a" },
      { id: "3", status: "a_faire", due_date: "2026-11-25", project_status: "en_cours", assigned_to: "a" },
      { id: "4", status: "a_faire", due_date: "2026-11-10", project_status: "en_cours", assigned_to: "b" },
    ],
    tickets: [
      { status: "ouvert", created_at: "2026-11-15T08:00:00Z", first_response_at: null, resolved_at: null, assigned_to: "a" },
      { status: "en_cours", created_at: "2026-11-15T08:00:00Z", first_response_at: "2026-11-15T09:00:00Z", resolved_at: null, assigned_to: "a" },
      { status: "resolu", created_at: "2026-11-01T08:00:00Z", first_response_at: "2026-11-01T09:00:00Z", resolved_at: "2026-11-02T08:00:00Z", assigned_to: "a" },
    ],
    notes: [
      { user_id: "a", created_at: "2026-11-17T08:00:00Z" },
      { user_id: "a", created_at: "2026-09-01T08:00:00Z" },
    ],
    reminders: [
      { assignee_id: "a", created_at: "2026-11-17T04:00:00Z", status: "sent", opened_at: "2026-11-17T05:00:00Z" },
      { assignee_id: "a", created_at: "2026-11-18T04:00:00Z", status: "failed", opened_at: null },
    ],
  };
  const [a, b] = computeAgentStats(["a", "b"], data, TODAY, NOW);

  it("completion rate is done tasks over the agent's tasks", () => {
    expect(a).toMatchObject({ tasksTotal: 3, tasksDone: 1, completionRate: 33, tasksOverdue: 1 });
    expect(b).toMatchObject({ tasksTotal: 1, tasksDone: 0, completionRate: 0, tasksOverdue: 1 });
  });

  it("counts assigned, active, unanswered and resolved tickets", () => {
    expect(a).toMatchObject({ ticketsAssigned: 3, ticketsActive: 2, ticketsUnanswered: 1, ticketsResolved: 1 });
  });

  it("counts all comments and those of the last 30 days", () => {
    expect(a).toMatchObject({ commentsTotal: 2, comments30d: 1 });
  });

  it("last reminder is the latest one actually sent", () => {
    expect(a.lastReminderAt).toBe("2026-11-17T04:00:00Z");
    expect(a.lastReminderOpened).toBe(true);
    expect(b.lastReminderAt).toBeNull();
  });
});
