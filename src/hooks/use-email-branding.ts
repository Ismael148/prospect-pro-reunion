import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface EmailBranding {
  id: string;
  logo_url: string;
  slogan: string;
  brand_color: string;
  footer_company: string;
  footer_tagline: string;
  footer_phone: string;
  footer_copyright: string;
  support_cta_title: string;
  support_cta_text: string;
  support_cta_button: string;
  updated_at: string;
  updated_by: string | null;
}

export const DEFAULT_BRANDING: EmailBranding = {
  id: "",
  logo_url: "https://qaxlpmxekcvbrcnqopbp.supabase.co/storage/v1/object/public/email-assets/logo-adamkom-black.png",
  slogan: "La performance digitale pour votre entreprise",
  brand_color: "#ff006e",
  footer_company: "Adamkom",
  footer_tagline: "La performance digitale",
  footer_phone: "0262 66 68 76",
  footer_copyright: "Adamkom by JJP — La Réunion 🇷🇪",
  support_cta_title: "📋 Besoin d'une modification ?",
  support_cta_text: "Chez Adamkom, toutes vos demandes de modifications passent par notre système de ticket support. C'est le moyen le plus rapide et le plus efficace pour être pris en charge.",
  support_cta_button: "📋 Ouvrir un ticket support",
  updated_at: "",
  updated_by: null,
};

export function useEmailBranding() {
  return useQuery({
    queryKey: ["email-branding"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_branding")
        .select("*")
        .limit(1)
        .single();
      if (error) throw error;
      return data as unknown as EmailBranding;
    },
  });
}

export function useUpdateEmailBranding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (updates: Partial<EmailBranding> & { id: string }) => {
      const { id, ...rest } = updates;
      const { error } = await supabase
        .from("email_branding")
        .update({ ...rest, updated_at: new Date().toISOString() } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["email-branding"] }),
  });
}
