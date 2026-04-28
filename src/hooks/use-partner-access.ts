import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type PartnerAccessStatus =
  | "a_inviter"
  | "invitation_envoyee"
  | "accepte"
  | "refuse"
  | "expire"
  | "revoque";

export type PartnerAccessType =
  | "fb_page"
  | "fb_business_manager"
  | "ig_account"
  | "ad_account"
  | "catalog"
  | "gmb_location"
  | "pixel";

export type PartnerAccessRole =
  | "admin"
  | "editor"
  | "advertiser"
  | "analyst"
  | "manager"
  | "owner";

export type PartnerNotificationType =
  | "post"
  | "story"
  | "reel"
  | "gmb_post"
  | "gmb_review_reply"
  | "message_reply"
  | "announcement";

export type PartnerNotificationStatus =
  | "brouillon"
  | "planifie"
  | "publie_manuel"
  | "publie_api"
  | "echec";

export interface PartnerAccess {
  id: string;
  client_id: string;
  platform: string;
  access_type: PartnerAccessType;
  status: PartnerAccessStatus;
  invitation_email: string | null;
  business_manager_id: string | null;
  asset_id: string | null;
  asset_name: string | null;
  granted_role: PartnerAccessRole | null;
  invitation_link: string | null;
  invitation_sent_at: string | null;
  accepted_at: string | null;
  expires_at: string | null;
  notes: string | null;
  last_reminder_sent_at: string | null;
  created_at: string;
  updated_at: string;
  clients?: { id: string; company_name: string; ndi: string | null } | null;
}

export interface PartnerNotification {
  id: string;
  partner_access_id: string | null;
  client_id: string;
  platform: string;
  notification_type: PartnerNotificationType;
  title: string | null;
  content: string;
  media_urls: string[] | null;
  target_url: string | null;
  status: PartnerNotificationStatus;
  scheduled_for: string | null;
  published_at: string | null;
  external_post_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  clients?: { id: string; company_name: string } | null;
}

export function usePartnerAccessList(filters?: { clientId?: string; status?: PartnerAccessStatus | "all" }) {
  return useQuery({
    queryKey: ["partner-access", filters],
    queryFn: async () => {
      let q = (supabase as any)
        .from("partner_access")
        .select("*, clients(id, company_name, ndi)")
        .order("updated_at", { ascending: false });
      if (filters?.clientId) q = q.eq("client_id", filters.clientId);
      if (filters?.status && filters.status !== "all") q = q.eq("status", filters.status);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as PartnerAccess[];
    },
  });
}

export function useUpsertPartnerAccess() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<PartnerAccess> & { client_id: string; platform: string; access_type: PartnerAccessType }) => {
      const { data: user } = await supabase.auth.getUser();
      const payload: any = {
        ...input,
        invitation_email: input.invitation_email || null,
        business_manager_id: input.business_manager_id || null,
        asset_id: input.asset_id || null,
        asset_name: input.asset_name || null,
        invitation_link: input.invitation_link || null,
        notes: input.notes || null,
        granted_role: input.granted_role || null,
      };
      if (!input.id) payload.created_by = user.user?.id;
      const { data, error } = input.id
        ? await (supabase as any).from("partner_access").update(payload).eq("id", input.id).select().single()
        : await (supabase as any).from("partner_access").insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["partner-access"] });
      toast.success("Accès partenaire enregistré");
    },
    onError: (e: any) => toast.error(e.message || "Erreur"),
  });
}

export function useDeletePartnerAccess() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("partner_access").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["partner-access"] });
      toast.success("Accès supprimé");
    },
  });
}

export function usePartnerNotifications(filters?: { clientId?: string; status?: PartnerNotificationStatus | "all" }) {
  return useQuery({
    queryKey: ["partner-notifications", filters],
    queryFn: async () => {
      let q = (supabase as any)
        .from("partner_notifications")
        .select("*, clients(id, company_name)")
        .order("created_at", { ascending: false });
      if (filters?.clientId) q = q.eq("client_id", filters.clientId);
      if (filters?.status && filters.status !== "all") q = q.eq("status", filters.status);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as PartnerNotification[];
    },
  });
}

export function useUpsertPartnerNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<PartnerNotification> & { client_id: string; platform: string; notification_type: PartnerNotificationType; content: string }) => {
      const { data: user } = await supabase.auth.getUser();
      const payload: any = {
        ...input,
        title: input.title || null,
        target_url: input.target_url || null,
        partner_access_id: input.partner_access_id || null,
        scheduled_for: input.scheduled_for || null,
        notes: input.notes || null,
        media_urls: input.media_urls || [],
      };
      if (!input.id) payload.created_by = user.user?.id;
      const { data, error } = input.id
        ? await (supabase as any).from("partner_notifications").update(payload).eq("id", input.id).select().single()
        : await (supabase as any).from("partner_notifications").insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["partner-notifications"] });
      toast.success("Notification enregistrée");
    },
    onError: (e: any) => toast.error(e.message || "Erreur"),
  });
}

export function useMarkNotificationPublished() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, externalPostId }: { id: string; externalPostId?: string }) => {
      const { data: user } = await supabase.auth.getUser();
      const { error } = await (supabase as any)
        .from("partner_notifications")
        .update({
          status: "publie_manuel",
          published_by: user.user?.id,
          external_post_id: externalPostId || null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["partner-notifications"] });
      toast.success("Notification marquée comme publiée");
    },
  });
}

export function useDeletePartnerNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("partner_notifications").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["partner-notifications"] });
      toast.success("Supprimée");
    },
  });
}

export function useClientsLight() {
  return useQuery({
    queryKey: ["clients-light"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, company_name, ndi")
        .order("company_name");
      if (error) throw error;
      return data || [];
    },
  });
}
