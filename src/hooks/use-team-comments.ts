import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { countUnreadTeamNotes, type TeamNote } from "@/lib/team-comments";

export type TeamCommentRow = TeamNote & {
  admin_seen_at: string | null;
  client: { id: string; company_name: string | null; ndi: string | null; pack_type: string | null; manager_name: string | null } | null;
};

export type TeamMember = { user_id: string; full_name: string | null; roles: string[] };

const LIMIT = 600;

/** Roles that can open the team comments inbox. */
export const TEAM_COMMENT_ROLES = ["admin", "webmaster"] as const;
/** For non-admin readers, notes older than this count as already read so their inbox starts clean. */
const MEMBER_UNREAD_WINDOW_DAYS = 30;

export function useCanReadTeamComments() {
  const { hasRole } = useAuth();
  return TEAM_COMMENT_ROLES.some((r) => hasRole(r));
}

/**
 * Team comments with a viewer-specific read state in `admin_seen`:
 * the admin uses the shared admin flag, other readers (webmasters) their own seen marks.
 */
export function useTeamComments() {
  const { user, hasRole } = useAuth();
  const isAdmin = hasRole("admin");
  const canRead = useCanReadTeamComments();
  const enabled = !!user && canRead;
  return useQuery({
    queryKey: ["team-comments"],
    enabled,
    staleTime: 30_000,
    queryFn: async (): Promise<TeamCommentRow[]> => {
      const cols = "id, client_id, user_id, description, created_at, admin_seen, admin_seen_at, parent_id, client:clients(id, company_name, ndi, pack_type, manager_name)";
      if (!isAdmin) {
        const [recent, marks] = await Promise.all([
          supabase.from("client_activities").select(cols).eq("activity_type", "note")
            .order("created_at", { ascending: false }).limit(LIMIT),
          supabase.from("seen_marks").select("item_id").eq("item_type", "team_comment").eq("user_id", user!.id).limit(5000),
        ]);
        if (recent.error) throw recent.error;
        if (marks.error) throw marks.error;
        const seen = new Set((marks.data || []).map((m) => m.item_id));
        const since = new Date(Date.now() - MEMBER_UNREAD_WINDOW_DAYS * 86_400_000).toISOString();
        return ((recent.data || []) as any[]).map((r) => ({ ...r, admin_seen: seen.has(r.id) || r.created_at < since }));
      }
      // Latest notes for the history, plus every unread note however old, so nothing to read is ever missed.
      const [recent, unread] = await Promise.all([
        supabase.from("client_activities").select(cols).eq("activity_type", "note")
          .order("created_at", { ascending: false }).limit(LIMIT),
        supabase.from("client_activities").select(cols).eq("activity_type", "note")
          .or("admin_seen.is.null,admin_seen.eq.false").neq("user_id", user!.id)
          .order("created_at", { ascending: false }).limit(1000),
      ]);
      if (recent.error) throw recent.error;
      if (unread.error) throw unread.error;
      const byId = new Map<string, TeamCommentRow>();
      [...(recent.data || []), ...(unread.data || [])].forEach((r: any) => byId.set(r.id, r));
      return Array.from(byId.values()).sort((a, b) => b.created_at.localeCompare(a.created_at));
    },
  });
}

export function useTeamMembers() {
  return useQuery({
    queryKey: ["team-with-roles"],
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<TeamMember[]> => {
      const [{ data: roles }, { data: profiles }] = await Promise.all([
        supabase.from("user_roles").select("user_id, role"),
        supabase.from("profiles").select("user_id, full_name"),
      ]);
      if (!roles || !profiles) return [];
      return profiles.map((p) => ({
        ...p,
        roles: roles.filter((r) => r.user_id === p.user_id).map((r) => r.role as string),
      }));
    },
  });
}

export function useUnreadTeamCommentsCount() {
  const { user } = useAuth();
  const { data } = useTeamComments();
  return data ? countUnreadTeamNotes(data, user?.id) : 0;
}

export function useMarkTeamCommentsSeen() {
  const qc = useQueryClient();
  const { user, hasRole } = useAuth();
  const isAdmin = hasRole("admin");
  return useMutation({
    mutationFn: async (ids: string[]) => {
      if (ids.length === 0) return;
      if (!isAdmin) {
        // Other readers keep their own read state; the admin's flag is untouched.
        for (let i = 0; i < ids.length; i += 100) {
          const { error } = await supabase.from("seen_marks").upsert(
            ids.slice(i, i + 100).map((id) => ({ item_type: "team_comment", item_id: id, user_id: user!.id })),
            { onConflict: "item_type,item_id,user_id", ignoreDuplicates: true },
          );
          if (error) throw error;
        }
        return;
      }
      const now = new Date().toISOString();
      for (let i = 0; i < ids.length; i += 100) {
        const { error } = await supabase
          .from("client_activities")
          .update({ admin_seen: true, admin_seen_at: now })
          .in("id", ids.slice(i, i + 100));
        if (error) throw error;
      }
    },
    onMutate: async (ids) => {
      await qc.cancelQueries({ queryKey: ["team-comments"] });
      const prev = qc.getQueryData<TeamCommentRow[]>(["team-comments"]);
      const set = new Set(ids);
      qc.setQueryData<TeamCommentRow[]>(["team-comments"], (rows) =>
        rows?.map((r) => (set.has(r.id) ? { ...r, admin_seen: true } : r)),
      );
      return { prev };
    },
    onError: (_e, _ids, ctx) => {
      if (ctx?.prev) qc.setQueryData(["team-comments"], ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["team-comments"] });
      qc.invalidateQueries({ queryKey: ["activities"] });
      qc.invalidateQueries({ queryKey: ["client-activities"] });
      qc.invalidateQueries({ queryKey: ["clients-status"] });
    },
  });
}

export const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  agent_master: "Agent Master",
  agent_support: "Agent Support",
  agent_telephonique: "Agent tél.",
  commercial_terrain: "Commercial",
  webmaster: "Webmaster",
  designer: "Designer",
};
