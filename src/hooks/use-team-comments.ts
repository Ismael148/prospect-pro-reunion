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

export function useTeamComments() {
  const { user, hasRole } = useAuth();
  const enabled = !!user && hasRole("admin");
  return useQuery({
    queryKey: ["team-comments"],
    enabled,
    staleTime: 30_000,
    queryFn: async (): Promise<TeamCommentRow[]> => {
      const cols = "id, client_id, user_id, description, created_at, admin_seen, admin_seen_at, parent_id, client:clients(id, company_name, ndi, pack_type, manager_name)";
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
  return useMutation({
    mutationFn: async (ids: string[]) => {
      if (ids.length === 0) return;
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
