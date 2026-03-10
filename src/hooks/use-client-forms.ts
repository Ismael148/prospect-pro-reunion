import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ClientFormData {
  // NFC fields
  full_name?: string;
  position?: string;
  phone?: string;
  email?: string;
  company_name?: string;
  logo_url?: string;
  photo_url?: string;
  website?: string;
  address?: string;
  facebook?: string;
  instagram?: string;
  linkedin?: string;
  tiktok?: string;
  whatsapp?: string;
  google_maps_url?: string;
  preferred_color?: string;
  notes?: string;
  // Site fields
  company_description?: string;
  services?: string;
  slogan?: string;
  opening_hours?: string;
  gallery_urls?: string[];
  target_audience?: string;
  competitors?: string;
  preferred_style?: string;
  additional_pages?: string;
}

export function useClientFormByToken(token: string, formType: "nfc" | "site") {
  return useQuery({
    queryKey: ["client-form", token, formType],
    queryFn: async () => {
      // First get client by token
      const { data: client, error: clientError } = await supabase
        .from("clients")
        .select("id, company_name")
        .eq("support_token", token)
        .single();
      if (clientError) throw clientError;

      // Then get or create form
      const { data: form } = await supabase
        .from("client_forms")
        .select("*")
        .eq("client_id", client.id)
        .eq("form_type", formType)
        .maybeSingle();

      return { client, form };
    },
    enabled: !!token,
  });
}

export function useSubmitClientForm() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      token,
      formType,
      formData,
    }: {
      token: string;
      formType: "nfc" | "site";
      formData: ClientFormData;
    }) => {
      // Get client by token
      const { data: client, error: clientError } = await supabase
        .from("clients")
        .select("id")
        .eq("support_token", token)
        .single();
      if (clientError) throw clientError;

      // Upsert form
      const { data, error } = await supabase
        .from("client_forms")
        .upsert(
          {
            client_id: client.id,
            form_type: formType,
            form_data: formData as any,
            status: "soumis",
            submitted_at: new Date().toISOString(),
          },
          { onConflict: "client_id,form_type" }
        )
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-form"] });
      queryClient.invalidateQueries({ queryKey: ["client-forms"] });
    },
  });
}

export function useClientForms(clientId: string) {
  return useQuery({
    queryKey: ["client-forms", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_forms")
        .select("*")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });
}

export function useValidateForm() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ formId, userId }: { formId: string; userId: string }) => {
      const { data, error } = await supabase
        .from("client_forms")
        .update({
          status: "valide",
          validated_at: new Date().toISOString(),
          validated_by: userId,
        })
        .eq("id", formId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-forms"] });
    },
  });
}
