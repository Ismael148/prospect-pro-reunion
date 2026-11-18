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
      const { data, error } = await supabase
        .from("client_activities")
        .select("id, client_id, user_id, description, created_at, admin_seen, admin_seen_at, parent_id, client:clients(id, company_name, ndi, pack_type, manager_name)")
        .eq("activity_type", "note")
        .order("created_at", { ascending: false })
        .limit(LIMIT);
      if (error) throw error;
      return (data || []) as unknown as TeamCommentRow[];
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
      qc.invalidateQueries({ queryKey: ["client-activities"] });
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
