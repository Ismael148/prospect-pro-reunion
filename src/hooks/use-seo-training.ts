import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface SeoProgressRow {
  id: string;
  user_id: string;
  lesson_id: string;
  module_id: string;
  completed: boolean;
  quiz_score: number | null;
  quiz_total: number | null;
  notes: string | null;
  completed_at: string;
}

const db = () => (supabase as any).from("seo_training_progress");

export function useMySeoProgress() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["seo-training", "me", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await db().select("*").eq("user_id", user!.id);
      if (error) throw error;
      return (data ?? []) as SeoProgressRow[];
    },
  });
}

export function useUpsertSeoProgress() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      lesson_id: string;
      module_id: string;
      completed?: boolean;
      quiz_score?: number | null;
      quiz_total?: number | null;
      notes?: string | null;
    }) => {
      const { data, error } = await db()
        .upsert(
          {
            user_id: user!.id,
            completed: true,
            ...payload,
            completed_at: new Date().toISOString(),
          },
          { onConflict: "user_id,lesson_id" },
        )
        .select()
        .single();
      if (error) throw error;
      return data as SeoProgressRow;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["seo-training"] });
    },
  });
}

export function useResetSeoLesson() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (lessonId: string) => {
      const { error } = await db().delete().eq("user_id", user!.id).eq("lesson_id", lessonId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["seo-training"] }),
  });
}

export interface TeamProgress {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  roles: string[];
  rows: SeoProgressRow[];
}

export function useTeamSeoProgress(enabled: boolean) {
  return useQuery({
    queryKey: ["seo-training", "team"],
    enabled,
    queryFn: async () => {
      const [progressRes, profilesRes, rolesRes] = await Promise.all([
        db().select("*"),
        supabase.from("profiles").select("user_id, full_name, avatar_url"),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      if (progressRes.error) throw progressRes.error;

      const rows = (progressRes.data ?? []) as SeoProgressRow[];
      const roleMap = new Map<string, string[]>();
      (rolesRes.data ?? []).forEach((r: any) => {
        roleMap.set(r.user_id, [...(roleMap.get(r.user_id) ?? []), r.role]);
      });

      return (profilesRes.data ?? []).map((p: any): TeamProgress => ({
        user_id: p.user_id,
        full_name: p.full_name ?? "Utilisateur",
        avatar_url: p.avatar_url ?? null,
        roles: roleMap.get(p.user_id) ?? [],
        rows: rows.filter((r) => r.user_id === p.user_id),
      }));
    },
  });
}
