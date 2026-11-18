import { describe, expect, it } from "vitest";
import { latestReminderDay, nextMorningRun, reminderOpenStats, summarizeReminderDay, type ReminderRow } from "@/lib/reminder-tracking";

const row = (p: Partial<ReminderRow>): ReminderRow => ({
  id: Math.random().toString(), assignee_id: "anjara", recipient_name: "Anjara", recipient_email: "a@x.fr",
  created_at: "2026-11-19T04:00:10Z", reminder_day: "2026-11-19", status: "sent", trigger: "auto", opened_at: null, ...p,
});

describe("morning reminder tracking", () => {
  it("counts sent and opened individual emails per member for a morning", () => {
    const s = summarizeReminderDay([
      row({}), row({ opened_at: "2026-11-19T05:00:00Z" }), row({ created_at: "2026-11-19T04:00:01Z" }),
      row({ reminder_day: "2026-11-18" }),
    ], "2026-11-19", "auto");
    expect(s.members).toHaveLength(1);
    expect(s.members[0]).toMatchObject({ sent: 3, opened: 1, status: "envoye", firstSentAt: "2026-11-19T04:00:01Z" });
    expect(s.openRate).toBe(33);
  });

  it("flags a member without a real reminder address", () => {
    const s = summarizeReminderDay([row({ status: "no_email" })], "2026-11-19");
    expect(s.members[0].status).toBe("sans_adresse");
    expect(s.sent).toBe(0);
  });

  it("reports a partial send when some emails failed", () => {
    const s = summarizeReminderDay([row({}), row({ status: "failed" })], "2026-11-19");
    expect(s.members[0].status).toBe("partiel");
  });

  it("finds the latest automatic morning, ignoring manual sends", () => {
    expect(latestReminderDay([row({ reminder_day: "2026-11-18" }), row({ reminder_day: "2026-11-20", trigger: "manual" })], "auto")).toBe("2026-11-18");
  });

  it("open rate over 30 days ignores older and unsent emails", () => {
    const now = new Date("2026-11-20T00:00:00Z");
    const s = reminderOpenStats([row({ opened_at: "x" }), row({ status: "failed" }), row({ created_at: "2026-09-01T04:00:00Z" })], now);
    expect(s).toEqual({ sent: 1, opened: 1, openRate: 100 });
  });

  it("next run is the next weekday at 8:00 Réunion time", () => {
    // Wednesday 18 Nov 2026, 11:20 Réunion -> Thursday 19 Nov 08:00 Réunion
    expect(nextMorningRun(new Date("2026-11-18T07:20:00Z")).toISOString()).toBe("2026-11-19T04:00:00.000Z");
    // Friday after 8:00 -> Monday
    expect(nextMorningRun(new Date("2026-11-20T05:00:00Z")).toISOString()).toBe("2026-11-23T04:00:00.000Z");
  });
});
