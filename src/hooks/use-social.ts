import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type SocialPlatform = "facebook" | "instagram" | "google_my_business";
export type PublicationStatus = "a_faire" | "planifie" | "publie";

export interface SocialAccount {
  id: string;
  client_id: string;
  platform: SocialPlatform;
  profile_url: string | null;
  username: string | null;
  page_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface SocialPublication {
  id: string;
  client_id: string;
  platform: SocialPlatform;
  content: string;
  image_url: string | null;
  scheduled_date: string | null;
  status: PublicationStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export function useSocialAccounts(clientId: string) {
  return useQuery({
    queryKey: ["social_accounts", clientId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("social_accounts")
        .select("*")
        .eq("client_id", clientId);
      if (error) throw error;
      return (data || []) as SocialAccount[];
    },
    enabled: !!clientId,
  });
}

export function useSocialPublications(clientId: string) {
  return useQuery({
    queryKey: ["social_publications", clientId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("social_publications")
        .select("*")
        .eq("client_id", clientId)
        .order("scheduled_date", { ascending: true });
      if (error) throw error;
      return (data || []) as SocialPublication[];
    },
    enabled: !!clientId,
  });
}

export function useUpsertSocialAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (account: Omit<SocialAccount, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await (supabase as any)
        .from("social_accounts")
        .upsert(account, { onConflict: "client_id,platform" })
        .select()
        .single();
      if (error) throw error;
      return data as SocialAccount;
    },
    onSuccess: (data: SocialAccount) => {
      queryClient.invalidateQueries({ queryKey: ["social_accounts", data.client_id] });
    },
  });
}

export function useDeleteSocialAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, clientId }: { id: string; clientId: string }) => {
      const { error } = await (supabase as any)
        .from("social_accounts")
        .delete()
        .eq("id", id);
      if (error) throw error;
      return clientId;
    },
    onSuccess: (clientId: string) => {
      queryClient.invalidateQueries({ queryKey: ["social_accounts", clientId] });
    },
  });
}

export function useCreateSocialPublication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (pub: Omit<SocialPublication, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await (supabase as any)
        .from("social_publications")
        .insert(pub)
        .select()
        .single();
      if (error) throw error;
      return data as SocialPublication;
    },
    onSuccess: (data: SocialPublication) => {
      queryClient.invalidateQueries({ queryKey: ["social_publications", data.client_id] });
    },
  });
}

export function useUpdateSocialPublication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, clientId, ...updates }: Partial<SocialPublication> & { id: string; clientId: string }) => {
      const { data, error } = await (supabase as any)
        .from("social_publications")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return { data: data as SocialPublication, clientId };
    },
    onSuccess: ({ clientId }: { data: SocialPublication; clientId: string }) => {
      queryClient.invalidateQueries({ queryKey: ["social_publications", clientId] });
    },
  });
}

export function useDeleteSocialPublication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, clientId }: { id: string; clientId: string }) => {
      const { error } = await (supabase as any)
        .from("social_publications")
        .delete()
        .eq("id", id);
      if (error) throw error;
      return clientId;
    },
    onSuccess: (clientId: string) => {
      queryClient.invalidateQueries({ queryKey: ["social_publications", clientId] });
    },
  });
}
