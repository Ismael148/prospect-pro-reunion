import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type GmbOnboardingStatus = "recu" | "traite" | "archive";

export interface GmbOnboardingSubmission {
  id: string;
  client_id: string | null;
  client_ndi: string | null;
  company_name: string;
  contact_email: string;
  has_existing_listing: boolean | null;
  gmb_business_name: string | null;
  gmb_maps_url: string | null;
  gmb_address: string | null;
  gmb_phone: string | null;
  manager_added: boolean | null;
  google_account_email: string | null;
  notes: string | null;
  status: GmbOnboardingStatus;
  source_url: string | null;
  created_at: string;
  updated_at: string;
  processed_at: string | null;
  processed_by: string | null;
}

export interface GmbOnboardingInput {
  client_id?: string | null;
  client_ndi?: string | null;
  company_name: string;
  contact_email: string;
  has_existing_listing: boolean;
  gmb_business_name?: string | null;
  gmb_maps_url?: string | null;
  gmb_address?: string | null;
  gmb_phone?: string | null;
  manager_added: boolean;
  google_account_email?: string | null;
  notes?: string | null;
  source_url?: string | null;
}

export function useSubmitGmbOnboarding() {
  return useMutation({
    mutationFn: async (input: GmbOnboardingInput) => {
      const payload = {
        client_id: input.client_id || null,
        client_ndi: input.client_ndi || null,
        company_name: input.company_name.trim(),
        contact_email: input.contact_email.trim(),
        has_existing_listing: input.has_existing_listing,
        gmb_business_name: input.gmb_business_name?.trim() || null,
        gmb_maps_url: input.gmb_maps_url?.trim() || null,
        gmb_address: input.gmb_address?.trim() || null,
        gmb_phone: input.gmb_phone?.trim() || null,
        manager_added: input.manager_added,
        google_account_email: input.google_account_email?.trim() || null,
        notes: input.notes?.trim() || null,
        source_url: input.source_url || (typeof window !== "undefined" ? window.location.href : null),
      };
      const { data, error } = await (supabase as any)
        .from("gmb_onboarding_submissions")
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data as GmbOnboardingSubmission;
    },
    onSuccess: () => toast.success("Merci ! Vos infos GMB ont bien été envoyées à Adamkom."),
    onError: (e: any) => toast.error(e.message || "Erreur lors de l'envoi"),
  });
}

export function useGmbOnboardingList(filters?: { status?: GmbOnboardingStatus | "all" }) {
  return useQuery({
    queryKey: ["gmb-onboarding", filters],
    queryFn: async () => {
      let q = (supabase as any)
        .from("gmb_onboarding_submissions")
        .select("*")
        .order("created_at", { ascending: false });
      if (filters?.status && filters.status !== "all") q = q.eq("status", filters.status);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as GmbOnboardingSubmission[];
    },
  });
}

export function useUpdateGmbOnboardingStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: GmbOnboardingStatus }) => {
      const { data: user } = await supabase.auth.getUser();
      const payload: any = { status };
      if (status === "traite") {
        payload.processed_at = new Date().toISOString();
        payload.processed_by = user.user?.id;
      }
      const { error } = await (supabase as any)
        .from("gmb_onboarding_submissions")
        .update(payload)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["gmb-onboarding"] });
      toast.success("Statut mis à jour");
    },
    onError: (e: any) => toast.error(e.message || "Erreur"),
  });
}

export function useDeleteGmbOnboarding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("gmb_onboarding_submissions")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["gmb-onboarding"] });
      toast.success("Soumission supprimée");
    },
  });
}
