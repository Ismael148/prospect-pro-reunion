import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type CalendarEvent = {
  id: string;
  title: string;
  description: string | null;
  event_type: string; // rdv_client | visio | reunion_interne | autre
  start_at: string;
  end_at: string;
  all_day: boolean;
  location: string | null;
  meet_link: string | null;
  client_id: string | null;
  participants: string[];
  color: string;
  status: string;
  email_sent_to_client: boolean;
  email_sent_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export function useCalendarEvents() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["calendar_events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("calendar_events")
        .select("*")
        .order("start_at", { ascending: true });
      if (error) throw error;
      return (data || []) as CalendarEvent[];
    },
  });

  const create = useMutation({
    mutationFn: async (payload: Partial<CalendarEvent>) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Non connecté");
      const { data, error } = await supabase
        .from("calendar_events")
        .insert({ ...payload, created_by: u.user.id } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar_events"] });
      toast.success("Événement créé");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...payload }: Partial<CalendarEvent> & { id: string }) => {
      const { data, error } = await supabase
        .from("calendar_events")
        .update(payload as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar_events"] });
      toast.success("Événement mis à jour");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("calendar_events").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar_events"] });
      toast.success("Événement supprimé");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return { ...query, create, update, remove };
}
