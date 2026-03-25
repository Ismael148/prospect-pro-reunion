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
  assigned_to: string | null;
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
    onSuccess: async (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
      
      // Trigger n8n webhook when ticket is resolved — enrich with client data
      if (variables.status === 'resolu') {
        try {
          // Fetch ticket + client data for the webhook
          const { data: ticket } = await supabase
            .from("support_tickets")
            .select("ticket_number, subject, client_id")
            .eq("id", variables.id)
            .single();
          if (ticket) {
            const { data: client } = await supabase
              .from("clients")
              .select("company_name, email, support_token")
              .eq("id", ticket.client_id)
              .single();
            triggerN8nWebhook('support.resolved', {
              ticket_id: variables.id,
              ticket_number: ticket.ticket_number,
              subject: ticket.subject,
              company_name: client?.company_name || '',
              client_email: client?.email || '',
              support_link: client?.support_token ? `https://prospect-pro-reunion.lovable.app/s/${client.support_token}` : '',
            });
          }
        } catch (e) {
          console.warn('[n8n] Failed to enrich support.resolved data', e);
          triggerN8nWebhook('support.resolved', { ticket_id: variables.id });
        }
      }
    },
  });
}
