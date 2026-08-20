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
  // Page de conversion (Pack Tuning)
  activity_type?: string;
  main_offer?: string;
  service_list?: string;
  prices?: string;
  guarantees?: string;
  service_area?: string;
  usp?: string;
  promo_offer?: string;
  cta_preference?: string;
  contact_phone?: string;
  whatsapp_number?: string;
  booking_url?: string;
  google_reviews_url?: string;
  reviews_examples?: string;
  faq?: string;
  certifications?: string;
  team_presentation?: string;
  payment_options?: string;
  emergency_service?: string;
  brands_handled?: string;
  photos_note?: string;
  video_url?: string;
  logo_note?: string;
  domain_name?: string;
  tracking_note?: string;
  // Multi-card
  extra_cards?: { full_name?: string; position?: string; phone?: string; email?: string; address?: string }[];
}

export function useClientFormByToken(token: string, formType: "nfc" | "site" | "conversion") {
  return useQuery({
    queryKey: ["client-form", token, formType],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_client_form_public", {
        p_token: token,
        p_form_type: formType,
      });
      if (error) throw error;

      const row = Array.isArray(data) ? data[0] : data;
      if (!row?.client_id) throw new Error("Lien invalide");

      const client = {
        id: row.client_id,
        company_name: row.company_name,
        nfc_quantity: row.nfc_quantity,
      };

      const form = row.form_id
        ? {
            id: row.form_id,
            client_id: row.client_id,
            form_type: formType,
            form_data: row.form_data,
            status: row.status,
          }
        : null;

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
      formType: "nfc" | "site" | "conversion";
      formData: ClientFormData;
    }) => {
      const { data, error } = await (supabase as any).rpc("submit_client_form_public", {
        p_token: token,
        p_form_type: formType,
        p_form_data: formData,
      });
      if (error) throw error;
      return Array.isArray(data) ? data[0] : data;
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
