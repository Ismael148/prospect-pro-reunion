import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { triggerN8nWebhook } from "@/lib/n8n-webhook";

export interface SupportTicket {
  id: string;
  client_id: string;
  ticket_number: string;
  category: string;
  subject: string;
  message: string;
  attachments: string[] | null;
  status: string;
  priority: string;
  resolved_at: string | null;
  resolved_by: string | null;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useSupportTickets() {
  return useQuery({
    queryKey: ["support-tickets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_tickets")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as SupportTicket[];
    },
  });
}

export function useClientSupportTickets(clientId: string) {
  return useQuery({
    queryKey: ["support-tickets", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_tickets")
        .select("*")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as SupportTicket[];
    },
    enabled: !!clientId,
  });
}

export function useUpdateTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<SupportTicket> & { id: string }) => {
      const { error } = await supabase
        .from("support_tickets")
        .update(updates as Record<string, unknown>)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
      
      // Trigger n8n webhook when ticket is resolved
      if (variables.status === 'resolu') {
        triggerN8nWebhook('support.resolved', {
          ticket_id: variables.id,
        });
      }
    },
  });
}
