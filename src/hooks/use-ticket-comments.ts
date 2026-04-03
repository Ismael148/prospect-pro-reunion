import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface TicketComment {
  id: string;
  ticket_id: string;
  user_id: string;
  content: string;
  created_at: string;
}

export function useTicketComments(ticketId: string | null) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!ticketId) return;
    const channel = supabase
      .channel(`ticket-comments-${ticketId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ticket_comments", filter: `ticket_id=eq.${ticketId}` },
        () => queryClient.invalidateQueries({ queryKey: ["ticket-comments", ticketId] })
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [ticketId, queryClient]);

  return useQuery({
    queryKey: ["ticket-comments", ticketId],
    enabled: !!ticketId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ticket_comments")
        .select("*")
        .eq("ticket_id", ticketId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as TicketComment[];
    },
  });
}

export function useAddTicketComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ ticket_id, user_id, content }: { ticket_id: string; user_id: string; content: string }) => {
      const { error } = await supabase
        .from("ticket_comments")
        .insert({ ticket_id, user_id, content });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ["ticket-comments", vars.ticket_id] });
    },
  });
}
