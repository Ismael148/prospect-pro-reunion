import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface SavedTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  category: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export function useSavedTemplates(category?: string) {
  return useQuery({
    queryKey: ["saved_email_templates", category],
    queryFn: async () => {
      let query = supabase
        .from("saved_email_templates")
        .select("*")
        .order("created_at", { ascending: false });
      if (category) {
        query = query.eq("category", category);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as SavedTemplate[];
    },
  });
}

export function useSaveTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ name, subject, body, category }: { name: string; subject: string; body: string; category?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");
      const { error } = await supabase.from("saved_email_templates").insert({
        name: name.trim(),
        subject,
        body,
        category: category || null,
        created_by: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved_email_templates"] });
      toast.success("Modèle sauvegardé !");
    },
    onError: () => toast.error("Erreur lors de la sauvegarde"),
  });
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("saved_email_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved_email_templates"] });
      toast.success("Modèle supprimé");
    },
    onError: () => toast.error("Erreur lors de la suppression"),
  });
}
