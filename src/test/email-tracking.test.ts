import { describe, expect, it } from "vitest";
import { summarizeTracking } from "@/lib/email-tracking";

const mail = (o: Partial<{ status: string; delivered_at: string | null; open_count: number; click_count: number }>) =>
  ({ status: "sent", delivered_at: null, open_count: 0, click_count: 0, ...o });

describe("email tracking summary", () => {
  it("counts an email opened 3 times as one opened email", () => {
    const s = summarizeTracking([mail({ status: "opened", delivered_at: "x", open_count: 3 })]);
    expect(s.opened).toBe(1);
    expect(s.openRate).toBe(100);
  });

  it("computes open and click rates on delivered emails", () => {
    const s = summarizeTracking([
      mail({ status: "clicked", delivered_at: "x", open_count: 1, click_count: 2 }),
      mail({ status: "opened", delivered_at: "x", open_count: 1 }),
      mail({ status: "delivered", delivered_at: "x" }),
      mail({ status: "delivered", delivered_at: "x" }),
      mail({ status: "hardBounces" }),
    ]);
    expect(s).toMatchObject({ sent: 5, delivered: 4, opened: 2, clicked: 1, failed: 1, openRate: 50, clickRate: 25 });
  });

  it("has no rate when nothing was delivered yet", () => {
    expect(summarizeTracking([mail({})]).openRate).toBeNull();
  });
});
