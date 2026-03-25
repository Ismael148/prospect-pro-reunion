import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type Prospect = Tables<"prospects">;

export function useProspects() {
  return useQuery({
    queryKey: ["prospects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prospects")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateProspects() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (prospects: TablesInsert<"prospects">[]) => {
      const { data, error } = await supabase
        .from("prospects")
        .insert(prospects)
        .select();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prospects"] });
    },
  });
}

export function useUpdateProspect() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<"prospects"> & { id: string }) => {
      const { data, error } = await supabase
        .from("prospects")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prospects"] });
    },
  });
}

export function useConvertProspect() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ prospect, userId }: { prospect: Prospect; userId: string }) => {
      // Create client from prospect
      const { data: client, error: clientError } = await supabase
        .from("clients")
        .insert({
          company_name: prospect.business_name,
          address: prospect.address,
          city: prospect.city,
          postal_code: prospect.postal_code,
          sector: prospect.sector,
          website: prospect.website,
          notes: prospect.notes,
          created_by: userId,
          assigned_to: prospect.assigned_to || userId,
          pipeline_status: "contacte",
        })
        .select()
        .single();
      if (clientError) throw clientError;

      // Update prospect status
      const { error: updateError } = await supabase
        .from("prospects")
        .update({ status: "converti", converted_client_id: client.id })
        .eq("id", prospect.id);
      if (updateError) throw updateError;

      // Add contact if phone/email available
      if (prospect.phone || prospect.email) {
        await supabase.from("contacts").insert({
          client_id: client.id,
          first_name: prospect.business_name.split(" ")[0] || "Contact",
          last_name: prospect.business_name.split(" ").slice(1).join(" ") || "Principal",
          phone: prospect.phone,
          email: prospect.email,
          is_primary: true,
        });
      }

      return client;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prospects"] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
  });
}

interface SearchProspectsParams {
  query: string;
  zone: string;
}

export function useSearchProspects() {
  return useMutation({
    mutationFn: async ({ query, zone }: SearchProspectsParams) => {
      const { data, error } = await supabase.functions.invoke("search-prospects", {
        body: { query, zone },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Erreur de recherche");
      return data.prospects as Array<{
        business_name: string;
        address?: string;
        city?: string;
        phone?: string;
        email?: string;
        website?: string;
        sector?: string;
        rating?: number;
        reviews_count?: number;
        google_maps_url?: string;
        source_url?: string;
        source_platform?: string;
      }>;
    },
  });
}
