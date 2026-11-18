import { useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllPages } from "@/hooks/use-tasks-agenda";
import type { AgentNote, AgentReminder, AgentTask, AgentTicket } from "@/lib/agent-tracking";
import type { TrackedEmail } from "@/lib/email-tracking";

export type PresentationEmail = { message_id: string | null; client_id: string | null; created_at: string; tracking: TrackedEmail | null };

export function useGlobalStats() {
  return useQuery({
    queryKey: ["global-stats"],
    staleTime: 60_000,
    queryFn: async () => {
      const [tasks, tickets, notes, reminders, logs] = await Promise.all([
        fetchAllPages<any>((from, to) =>
          supabase.from("project_tasks").select("id, status, due_date, assigned_to, projects(status)").order("id").range(from, to)),
        fetchAllPages<any>((from, to) =>
          supabase.from("support_tickets").select("id, status, created_at, first_response_at, resolved_at, assigned_to").order("id").range(from, to)),
        fetchAllPages<any>((from, to) =>
          supabase.from("client_activities").select("user_id, created_at").eq("activity_type", "note").order("id").range(from, to)),
        supabase.from("task_reminder_log").select("assignee_id, created_at, status, opened_at").order("created_at", { ascending: false }).limit(1000)
          .then((r) => { if (r.error) throw r.error; return r.data || []; }),
        supabase.from("email_send_log").select("message_id, metadata, created_at").eq("template_name", "pack_decollage").eq("status", "sent")
          .order("created_at", { ascending: false }).limit(500)
          .then((r) => { if (r.error) throw r.error; return r.data || []; }),
      ]);
      const ids = logs.map((l: any) => l.message_id).filter(Boolean);
      const { data: tracking } = ids.length
        ? await supabase.from("email_tracking").select("*").in("message_id", ids)
        : { data: [] as any[] };
      const byMsg = new Map((tracking || []).map((t: any) => [t.message_id, t as TrackedEmail]));
      const presentations: PresentationEmail[] = logs.map((l: any) => ({
        message_id: l.message_id,
        client_id: (l.metadata as any)?.client_id ?? null,
        created_at: l.created_at,
        tracking: l.message_id ? byMsg.get(l.message_id) ?? null : null,
      }));
      return {
        tasks: tasks.map((t: any) => ({ id: t.id, status: t.status, due_date: t.due_date, assigned_to: t.assigned_to, project_status: t.projects?.status ?? null })) as AgentTask[],
        tickets: tickets as AgentTicket[],
        notes: notes as AgentNote[],
        reminders: reminders as AgentReminder[],
        presentations,
      };
    },
  });
}

/** Refreshes presentation-email opens from the email service once per page visit. */
export function useSyncPresentationOpens(clientIds: string[]) {
  const qc = useQueryClient();
  const sync = useMutation({
    mutationFn: async () => {
      if (!clientIds.length) return;
      const { data, error } = await supabase.functions.invoke("send-brevo-campaign", { body: { action: "sync_tracking", client_ids: clientIds.slice(0, 300) } });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Actualisation impossible");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["global-stats"] }),
  });
  const done = useRef(false);
  useEffect(() => {
    if (done.current || !clientIds.length) return;
    done.current = true;
    sync.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientIds.length]);
  return sync;
}
