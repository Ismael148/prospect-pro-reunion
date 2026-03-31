import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { triggerN8nWebhook } from "@/lib/n8n-webhook";

export type Client = Tables<"clients">;
export type Contact = Tables<"contacts">;
export type ClientActivity = Tables<"client_activities">;

export function useClients() {
  return useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useClient(id: string) {
  return useQuery({
    queryKey: ["clients", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useClientContacts(clientId: string) {
  return useQuery({
    queryKey: ["contacts", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .eq("client_id", clientId)
        .order("is_primary", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });
}

export function useClientActivities(clientId: string) {
  return useQuery({
    queryKey: ["activities", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_activities")
        .select("*")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });
}

export function useCreateClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (client: TablesInsert<"clients">) => {
      const { data, error } = await supabase
        .from("clients")
        .insert(client)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
  });
}

export function useUpdateClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, _previousStatus, ...rawUpdates }: TablesUpdate<"clients"> & { id: string; _previousStatus?: string }) => {
      const payload = Object.fromEntries(
        Object.entries({
          company_name: typeof rawUpdates.company_name === "string" ? rawUpdates.company_name.trim() : rawUpdates.company_name,
          manager_name: typeof rawUpdates.manager_name === "string" ? rawUpdates.manager_name.trim() || null : rawUpdates.manager_name,
          phone: typeof rawUpdates.phone === "string" ? rawUpdates.phone.trim() || null : rawUpdates.phone,
          email: typeof rawUpdates.email === "string" ? rawUpdates.email.trim() || null : rawUpdates.email,
          website: typeof rawUpdates.website === "string" ? rawUpdates.website.trim() || null : rawUpdates.website,
          address: typeof rawUpdates.address === "string" ? rawUpdates.address.trim() || null : rawUpdates.address,
          city: typeof rawUpdates.city === "string" ? rawUpdates.city.trim() || null : rawUpdates.city,
          postal_code: typeof rawUpdates.postal_code === "string" ? rawUpdates.postal_code.trim() || null : rawUpdates.postal_code,
          sector: typeof rawUpdates.sector === "string" ? rawUpdates.sector.trim() || null : rawUpdates.sector,
          notes: typeof rawUpdates.notes === "string" ? rawUpdates.notes.trim() || null : rawUpdates.notes,
          siret: typeof rawUpdates.siret === "string" ? rawUpdates.siret.trim() || null : rawUpdates.siret,
          payment_method: rawUpdates.payment_method === "" ? null : rawUpdates.payment_method,
          pack_amount: rawUpdates.pack_amount === "" || rawUpdates.pack_amount == null ? null : Number(rawUpdates.pack_amount),
          nfc_quantity: rawUpdates.nfc_quantity == null ? undefined : Number(rawUpdates.nfc_quantity),
          has_gmb: rawUpdates.has_gmb,
          site_type: rawUpdates.site_type === "" ? null : rawUpdates.site_type,
          assigned_to: rawUpdates.assigned_to === "" ? null : rawUpdates.assigned_to,
          signed_by: rawUpdates.signed_by === "" ? null : rawUpdates.signed_by,
          signed_by_commercial: rawUpdates.signed_by_commercial === "" ? null : rawUpdates.signed_by_commercial,
          pipeline_status: rawUpdates.pipeline_status,
          pack_type: rawUpdates.pack_type,
          signature_date: rawUpdates.signature_date,
          signed_by_commercial: null,
        }).filter(([, value]) => value !== undefined)
      );

      const { data, error } = await supabase
        .from("clients")
        .update(payload)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return { ...data, _previousStatus };
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["clients", data.id] });
      
      const wasAlreadySigned = data._previousStatus === 'contrat_signe';
      if (variables.pipeline_status === 'contrat_signe' && !wasAlreadySigned) {
        triggerN8nWebhook('client.signed', {
          company_name: data.company_name,
          client_email: data.email,
          pack_type: data.pack_type,
          ndi: data.ndi,
          signature_date: data.signature_date,
          client_id: data.id,
        });
      }
    },
  });
}

export function useCreateContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (contact: TablesInsert<"contacts">) => {
      const { data, error } = await supabase
        .from("contacts")
        .insert(contact)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["contacts", data.client_id] });
    },
  });
}

export function useDeleteClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("clients").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
  });
}

export function useCreateActivity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (activity: TablesInsert<"client_activities">) => {
      const { data, error } = await supabase
        .from("client_activities")
        .insert(activity)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["activities", data.client_id] });
    },
  });
}
