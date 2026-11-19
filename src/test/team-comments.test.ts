import { describe, it, expect } from "vitest";
import { buildTeamThreads, countUnreadTeamNotes, isUnreadTeamNote, mentionsViewer, type TeamNote } from "@/lib/team-comments";

const ADMIN = "admin-1";
const note = (p: Partial<TeamNote>): TeamNote => ({
  id: "n", client_id: "c1", user_id: "agent-1", description: "x",
  created_at: "2026-11-17T10:00:00Z", admin_seen: false, parent_id: null, ...p,
});

describe("team comments inbox", () => {
  it("a team member's note not yet seen is to read", () => {
    expect(isUnreadTeamNote(note({}), ADMIN)).toBe(true);
  });

  it("the admin's own notes are never counted as to read", () => {
    expect(isUnreadTeamNote(note({ user_id: ADMIN }), ADMIN)).toBe(false);
  });

  it("a note marked as seen is no longer to read", () => {
    expect(isUnreadTeamNote(note({ admin_seen: true }), ADMIN)).toBe(false);
  });

  it("replies join their thread and the thread jumps to the top on new activity", () => {
    const threads = buildTeamThreads([
      note({ id: "a", created_at: "2026-11-10T10:00:00Z", admin_seen: true }),
      note({ id: "b", created_at: "2026-11-15T10:00:00Z", admin_seen: true }),
      note({ id: "a1", parent_id: "a", created_at: "2026-11-17T09:00:00Z" }),
    ], ADMIN);
    expect(threads.map((t) => t.root.id)).toEqual(["a", "b"]);
    expect(threads[0].replies.map((r) => r.id)).toEqual(["a1"]);
    expect(threads[0].unreadIds).toEqual(["a1"]);
  });

  it("counts only unread notes written by others", () => {
    expect(countUnreadTeamNotes([
      note({ id: "1" }), note({ id: "2", user_id: ADMIN }), note({ id: "3", admin_seen: true }),
    ], ADMIN)).toBe(1);
  });
});

describe("team mentions", () => {
  const anjara = { full_name: "Anjara", roles: ["webmaster"] };
  const maya = { full_name: "Maya", roles: ["agent_master"] };

  it("a member mentioned by name is concerned", () => {
    expect(mentionsViewer("@[Anjara] peux-tu regarder ?", anjara)).toBe(true);
  });

  it("another member's mention does not concern them", () => {
    expect(mentionsViewer("@[Maya] rappelle le client", anjara)).toBe(false);
  });

  it("@Tous les webmasters reaches webmasters but not agents", () => {
    expect(mentionsViewer("@[Tous les webmasters] à corriger", anjara)).toBe(true);
    expect(mentionsViewer("@[Tous les webmasters] à corriger", maya)).toBe(false);
  });

  it("@Tous les agents reaches agents but not webmasters", () => {
    expect(mentionsViewer("@[Tous les agents] à rappeler", maya)).toBe(true);
    expect(mentionsViewer("@[Tous les agents] à rappeler", anjara)).toBe(false);
  });

  it("@Toute l'équipe reaches every team member", () => {
    expect(mentionsViewer("@[Toute l'équipe] info", anjara)).toBe(true);
    expect(mentionsViewer("@[Toute l'équipe] info", maya)).toBe(true);
  });
});
