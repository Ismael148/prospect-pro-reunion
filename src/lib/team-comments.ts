/**
 * Team comments inbox helpers: groups client notes into threads and decides
 * what the admin still has to read. Shared by the inbox page, the menu badge
 * and the new-comment alert so every view counts the same way.
 */
export type TeamNote = {
  id: string;
  client_id: string;
  user_id: string;
  description: string | null;
  created_at: string;
  admin_seen: boolean | null;
  parent_id: string | null;
};

export type TeamThread<T extends TeamNote = TeamNote> = {
  root: T;
  replies: T[];
  /** Latest activity in the thread (root or any reply). */
  lastAt: string;
  /** Ids of notes in this thread the viewer has not read yet. */
  unreadIds: string[];
};

/** A note is "to read" when someone else wrote it and it was not marked seen. */
export function isUnreadTeamNote(note: TeamNote, viewerId: string | null | undefined): boolean {
  if (!viewerId) return false;
  return note.user_id !== viewerId && !note.admin_seen;
}

/** Groups notes into threads (root + replies), newest activity first. */
export function buildTeamThreads<T extends TeamNote>(notes: T[], viewerId: string | null | undefined): TeamThread<T>[] {
  const byId = new Map(notes.map((n) => [n.id, n]));
  const threads = new Map<string, TeamThread<T>>();

  const rootOf = (n: T): T => {
    let cur = n;
    const guard = new Set<string>();
    while (cur.parent_id && byId.has(cur.parent_id) && !guard.has(cur.id)) {
      guard.add(cur.id);
      cur = byId.get(cur.parent_id)!;
    }
    return cur;
  };

  for (const n of notes) {
    const root = rootOf(n);
    let t = threads.get(root.id);
    if (!t) {
      t = { root, replies: [], lastAt: root.created_at, unreadIds: [] };
      threads.set(root.id, t);
    }
    if (n.id !== root.id) t.replies.push(n);
    if (n.created_at > t.lastAt) t.lastAt = n.created_at;
    if (isUnreadTeamNote(n, viewerId)) t.unreadIds.push(n.id);
  }

  const list = Array.from(threads.values());
  list.forEach((t) => t.replies.sort((a, b) => a.created_at.localeCompare(b.created_at)));
  return list.sort((a, b) => b.lastAt.localeCompare(a.lastAt));
}

export function countUnreadTeamNotes(notes: TeamNote[], viewerId: string | null | undefined): number {
  return notes.filter((n) => isUnreadTeamNote(n, viewerId)).length;
}
