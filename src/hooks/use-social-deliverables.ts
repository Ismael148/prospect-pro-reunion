import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SocialDeliverable {
  id: string;
  project_id: string;
  client_id: string;
  month_year: string;
  type: "post_visuel" | "video_influenceur";
  status: "a_faire" | "en_cours" | "livre" | "valide";
  file_url: string | null;
  notes: string | null;
  delivered_by: string | null;
  delivered_at: string | null;
  validated_by: string | null;
  validated_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useSocialDeliverables(projectId: string) {
  return useQuery({
    queryKey: ["social_deliverables", projectId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("social_deliverables")
        .select("*")
        .eq("project_id", projectId)
        .order("month_year", { ascending: false });
      if (error) throw error;
      return (data || []) as SocialDeliverable[];
    },
    enabled: !!projectId,
  });
}

export function useCreateSocialDeliverable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (d: Partial<SocialDeliverable> & { project_id: string; client_id: string; month_year: string; type: string }) => {
      const { data, error } = await (supabase as any)
        .from("social_deliverables")
        .insert(d)
        .select()
        .single();
      if (error) throw error;
      return data as SocialDeliverable;
    },
    onSuccess: (data) => qc.invalidateQueries({ queryKey: ["social_deliverables", data.project_id] }),
  });
}

export function useUpdateSocialDeliverable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, projectId, ...updates }: Partial<SocialDeliverable> & { id: string; projectId: string }) => {
      const { data, error } = await (supabase as any)
        .from("social_deliverables")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return { data: data as SocialDeliverable, projectId };
    },
    onSuccess: ({ projectId }) => qc.invalidateQueries({ queryKey: ["social_deliverables", projectId] }),
  });
}
