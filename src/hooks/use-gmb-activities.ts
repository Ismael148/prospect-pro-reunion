import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type GmbActivityType =
  | "post_publie"
  | "photo_ajoutee"
  | "avis_repondu"
  | "description_maj"
  | "horaires_maj"
  | "produit_ajoute"
  | "qa_repondue"
  | "verification"
  | "checklist_maj"
  | "statut_maj"
  | "autre";

export interface GmbActivity {
  id: string;
  client_gmb_id: string;
  client_id: string;
  action_type: GmbActivityType;
  description: string;
  link: string | null;
  visible_to_client: boolean;
  performed_by: string | null;
  performed_at: string;
  created_at: string;
}

export const GMB_ACTIVITY_LABELS: Record<GmbActivityType, string> = {
  post_publie: "Post publié",
  photo_ajoutee: "Photo ajoutée",
  avis_repondu: "Avis répondu",
  description_maj: "Description mise à jour",
  horaires_maj: "Horaires mis à jour",
  produit_ajoute: "Produit / service ajouté",
  qa_repondue: "Question/Réponse traitée",
  verification: "Vérification",
  checklist_maj: "Checklist mise à jour",
  statut_maj: "Statut modifié",
  autre: "Autre action",
};

export const GMB_ACTIVITY_ICONS: Record<GmbActivityType, string> = {
  post_publie: "📝",
  photo_ajoutee: "📷",
  avis_repondu: "💬",
  description_maj: "📄",
  horaires_maj: "🕒",
  produit_ajoute: "🛍️",
  qa_repondue: "❓",
  verification: "✅",
  checklist_maj: "☑️",
  statut_maj: "🔄",
  autre: "•",
};

export function useGmbActivities(clientGmbId: string | undefined) {
  return useQuery({
    queryKey: ["gmb-activities", clientGmbId],
    enabled: !!clientGmbId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("gmb_activities")
        .select("*")
        .eq("client_gmb_id", clientGmbId)
        .order("performed_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data || []) as GmbActivity[];
    },
  });
}

export function useCreateGmbActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      input: Omit<Partial<GmbActivity>, "id" | "created_at" | "performed_at"> & {
        client_gmb_id: string;
        client_id: string;
        description: string;
        action_type: GmbActivityType;
      }
    ) => {
      const { data: user } = await supabase.auth.getUser();
      const payload: any = {
        ...input,
        link: input.link || null,
        visible_to_client: input.visible_to_client ?? true,
        performed_by: user.user?.id,
      };
      const { data, error } = await (supabase as any)
        .from("gmb_activities")
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data as GmbActivity;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["gmb-activities", data.client_gmb_id] });
      qc.invalidateQueries({ queryKey: ["client-gmb"] });
    },
    onError: (e: any) => toast.error(e.message || "Erreur"),
  });
}

export function useDeleteGmbActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, client_gmb_id }: { id: string; client_gmb_id: string }) => {
      const { error } = await (supabase as any).from("gmb_activities").delete().eq("id", id);
      if (error) throw error;
      return client_gmb_id;
    },
    onSuccess: (client_gmb_id) => {
      qc.invalidateQueries({ queryKey: ["gmb-activities", client_gmb_id] });
    },
  });
}

export function useToggleActivityVisibility() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, visible_to_client, client_gmb_id }: { id: string; visible_to_client: boolean; client_gmb_id: string }) => {
      const { error } = await (supabase as any)
        .from("gmb_activities")
        .update({ visible_to_client })
        .eq("id", id);
      if (error) throw error;
      return client_gmb_id;
    },
    onSuccess: (client_gmb_id) => {
      qc.invalidateQueries({ queryKey: ["gmb-activities", client_gmb_id] });
    },
  });
}
