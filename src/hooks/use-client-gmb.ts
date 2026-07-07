import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type GmbStatus =
  | "a_creer"
  | "compte_cree"
  | "verification_postale_demandee"
  | "code_recu"
  | "active"
  | "suspendue"
  | "non_applicable";

export type GmbAccessLevel =
  | "aucun"
  | "gestionnaire"
  | "proprietaire"
  | "proprietaire_principal";

export interface ClientGmb {
  id: string;
  client_id: string;
  status: GmbStatus;
  access_level: GmbAccessLevel;
  gmb_url: string | null;
  gmb_location_id: string | null;
  business_name_on_google: string | null;
  google_account_email: string | null;
  checklist_account_created: boolean;
  checklist_postal_requested: boolean;
  checklist_code_received: boolean;
  checklist_verified: boolean;
  checklist_logo_added: boolean;
  checklist_photos_added: boolean;
  checklist_hours_set: boolean;
  checklist_description_added: boolean;
  postal_requested_at: string | null;
  code_received_at: string | null;
  verified_at: string | null;
  last_post_at: string | null;
  last_review_replied_at: string | null;
  total_reviews: number;
  average_rating: number | null;
  unanswered_reviews: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClientGmbWithClient extends ClientGmb {
  clients?: {
    id: string;
    company_name: string;
    ndi: string | null;
    address: string | null;
    city: string | null;
    postal_code: string | null;
    phone: string | null;
    sector: string | null;
    has_gmb: boolean | null;
    gmb_public_token: string | null;
  } | null;
}

export const GMB_STATUS_LABELS: Record<GmbStatus, string> = {
  a_creer: "À créer",
  compte_cree: "Compte créé",
  verification_postale_demandee: "Code postal demandé",
  code_recu: "Code reçu",
  active: "Active",
  suspendue: "Suspendue",
  non_applicable: "Non applicable",
};

export const GMB_STATUS_COLORS: Record<GmbStatus, string> = {
  a_creer: "bg-muted text-muted-foreground",
  compte_cree: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  verification_postale_demandee: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  code_recu: "bg-purple-500/15 text-purple-700 dark:text-purple-300",
  active: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  suspendue: "bg-destructive/15 text-destructive",
  non_applicable: "bg-muted text-muted-foreground",
};

export const ACCESS_LEVEL_LABELS: Record<GmbAccessLevel, string> = {
  aucun: "Aucun",
  gestionnaire: "Gestionnaire",
  proprietaire: "Propriétaire",
  proprietaire_principal: "Propriétaire principal",
};

/** List all clients GMB rows joined with client basics. */
export function useClientGmbList(filters?: { status?: GmbStatus | "all"; search?: string }) {
  return useQuery({
    queryKey: ["client-gmb", filters],
    queryFn: async () => {
      let q = (supabase as any)
        .from("client_gmb")
        .select(
          "*, clients(id, company_name, ndi, address, city, postal_code, phone, sector, has_gmb)"
        )
        .order("updated_at", { ascending: false });
      if (filters?.status && filters.status !== "all") q = q.eq("status", filters.status);
      const { data, error } = await q;
      if (error) throw error;
      let rows = (data || []) as ClientGmbWithClient[];
      if (filters?.search) {
        const needle = filters.search.toLowerCase();
        rows = rows.filter(
          (r) =>
            r.clients?.company_name?.toLowerCase().includes(needle) ||
            r.clients?.city?.toLowerCase().includes(needle) ||
            r.clients?.ndi?.toLowerCase().includes(needle) ||
            r.business_name_on_google?.toLowerCase().includes(needle)
        );
      }
      return rows;
    },
  });
}

/** Light list of clients without a GMB row yet (for "Activer GMB" picker). */
export function useClientsWithoutGmb() {
  return useQuery({
    queryKey: ["clients-without-gmb"],
    queryFn: async () => {
      const [{ data: clients }, { data: gmb }] = await Promise.all([
        supabase
          .from("clients")
          .select("id, company_name, ndi, city, address, postal_code, phone, sector")
          .order("company_name"),
        (supabase as any).from("client_gmb").select("client_id"),
      ]);
      const taken = new Set((gmb || []).map((g: any) => g.client_id));
      return (clients || []).filter((c: any) => !taken.has(c.id));
    },
  });
}

export function useUpsertClientGmb() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<ClientGmb> & { client_id: string }) => {
      const { data: user } = await supabase.auth.getUser();
      const payload: any = {
        ...input,
        gmb_url: input.gmb_url || null,
        gmb_location_id: input.gmb_location_id || null,
        business_name_on_google: input.business_name_on_google || null,
        google_account_email: input.google_account_email || null,
        notes: input.notes || null,
      };
      if (!input.id) payload.created_by = user.user?.id;
      const { data, error } = input.id
        ? await (supabase as any)
            .from("client_gmb")
            .update(payload)
            .eq("id", input.id)
            .select()
            .single()
        : await (supabase as any).from("client_gmb").insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client-gmb"] });
      qc.invalidateQueries({ queryKey: ["clients-without-gmb"] });
      toast.success("Fiche GMB mise à jour");
    },
    onError: (e: any) => toast.error(e.message || "Erreur"),
  });
}

export function useDeleteClientGmb() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("client_gmb").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client-gmb"] });
      qc.invalidateQueries({ queryKey: ["clients-without-gmb"] });
      toast.success("Fiche GMB retirée du suivi");
    },
  });
}

/** Build a Google Business Profile creation URL pre-filled with client info. */
export function buildGmbCreateUrl(client: {
  company_name?: string | null;
  address?: string | null;
  city?: string | null;
  postal_code?: string | null;
  phone?: string | null;
}) {
  const parts = [client.address, client.postal_code, client.city].filter(Boolean).join(", ");
  const params = new URLSearchParams();
  if (client.company_name) params.set("name", client.company_name);
  if (parts) params.set("address", parts);
  if (client.phone) params.set("phone", client.phone);
  return `https://business.google.com/create?${params.toString()}`;
}
