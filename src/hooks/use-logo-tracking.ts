import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type LogoClient = {
  id: string;
  company_name: string;
  ndi: string | null;
  assigned_to: string | null;
  logo_created: boolean;
  logo_created_at: string | null;
  logo_published_gmb: boolean;
  logo_published_gmb_at: string | null;
  logo_validated_by_client: boolean;
  logo_validated_at: string | null;
  logo_reminder_last_sent: string | null;
  logo_file_url: string | null;
  logo_drive_url: string | null;
  logo_validation_token: string | null;
  pipeline_status: string;
};

export function useLogoClients() {
  return useQuery({
    queryKey: ["logo-clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, company_name, ndi, assigned_to, logo_created, logo_created_at, logo_published_gmb, logo_published_gmb_at, logo_validated_by_client, logo_validated_at, logo_reminder_last_sent, logo_file_url, logo_drive_url, logo_validation_token, pipeline_status")
        .eq("logo_tracking_enabled", true)
        .order("logo_reminder_last_sent", { ascending: true, nullsFirst: true });
      if (error) throw error;
      return (data || []) as unknown as LogoClient[];
    },
  });
}

export type LogoReminder = {
  id: string;
  client_id: string;
  sent_at: string;
  triggered_by: string | null;
  trigger_type: "auto" | "manual";
  step: string;
  message: string | null;
  recipients: string[];
  recipients_count: number;
};

export function useLogoReminders() {
  return useQuery({
    queryKey: ["logo-reminders"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("logo_reminder_log") as any)
        .select("*")
        .order("sent_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data || []) as LogoReminder[];
    },
  });
}

export function useSendLogoReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (client_id: string) => {
      const { data, error } = await supabase.functions.invoke("send-logo-reminder", {
        body: { client_id },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return data;
    },
    onSuccess: (data: any) => {
      toast.success(`Relance envoyée à ${data?.recipients_count || 0} personne(s)`);
      qc.invalidateQueries({ queryKey: ["logo-clients"] });
      qc.invalidateQueries({ queryKey: ["logo-reminders"] });
    },
    onError: (e: any) => toast.error(e.message || "Erreur lors de la relance"),
  });
}
