import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type FbOnboardingStatus = "recu" | "traite" | "archive";

export interface FbOnboardingSubmission {
  id: string;
  client_id: string | null;
  client_ndi: string | null;
  company_name: string;
  contact_email: string;
  fb_page_url: string | null;
  fb_page_name: string | null;
  business_manager_id: string | null;
  business_manager_email: string;
  has_existing_page: boolean | null;
  notes: string | null;
  status: FbOnboardingStatus;
  source_url: string | null;
  created_at: string;
  updated_at: string;
  processed_at: string | null;
  processed_by: string | null;
}

export interface FbOnboardingInput {
  client_id?: string | null;
  client_ndi?: string | null;
  company_name: string;
  contact_email: string;
  fb_page_url?: string | null;
  fb_page_name?: string | null;
  business_manager_id?: string | null;
  business_manager_email: string;
  has_existing_page: boolean;
  notes?: string | null;
  source_url?: string | null;
}

/** Public submission (anonymous) — used by /tuto/facebook */
export function useSubmitFbOnboarding() {
  return useMutation({
    mutationFn: async (input: FbOnboardingInput) => {
      const payload = {
        client_id: input.client_id || null,
        client_ndi: input.client_ndi || null,
        company_name: input.company_name.trim(),
        contact_email: input.contact_email.trim(),
        fb_page_url: input.fb_page_url?.trim() || null,
        fb_page_name: input.fb_page_name?.trim() || null,
        business_manager_id: input.business_manager_id?.trim() || null,
        business_manager_email: input.business_manager_email.trim(),
        has_existing_page: input.has_existing_page,
        notes: input.notes?.trim() || null,
        source_url: input.source_url || (typeof window !== "undefined" ? window.location.href : null),
      };
      const { data, error } = await (supabase as any)
        .from("fb_onboarding_submissions")
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data as FbOnboardingSubmission;
    },
    onSuccess: () => toast.success("Merci ! Vos infos ont bien été envoyées à Adamkom."),
    onError: (e: any) => toast.error(e.message || "Erreur lors de l'envoi"),
  });
}

/** Admin/agent view — list all submissions */
export function useFbOnboardingList(filters?: { status?: FbOnboardingStatus | "all" }) {
  return useQuery({
    queryKey: ["fb-onboarding", filters],
    queryFn: async () => {
      let q = (supabase as any)
        .from("fb_onboarding_submissions")
        .select("*")
        .order("created_at", { ascending: false });
      if (filters?.status && filters.status !== "all") q = q.eq("status", filters.status);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as FbOnboardingSubmission[];
    },
  });
}

export function useUpdateFbOnboardingStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: FbOnboardingStatus }) => {
      const { data: user } = await supabase.auth.getUser();
      const payload: any = { status };
      if (status === "traite") {
        payload.processed_at = new Date().toISOString();
        payload.processed_by = user.user?.id;
      }
      const { error } = await (supabase as any)
        .from("fb_onboarding_submissions")
        .update(payload)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fb-onboarding"] });
      toast.success("Statut mis à jour");
    },
    onError: (e: any) => toast.error(e.message || "Erreur"),
  });
}

export function useDeleteFbOnboarding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("fb_onboarding_submissions")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fb-onboarding"] });
      toast.success("Soumission supprimée");
    },
  });
}

/** Lookup a client by NDI to pre-fill the public form */
export function useClientByNdi(ndi: string | null) {
  return useQuery({
    queryKey: ["client-by-ndi", ndi],
    enabled: !!ndi,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, ndi, company_name, email")
        .eq("ndi", ndi!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}
