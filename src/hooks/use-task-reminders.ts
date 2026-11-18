import { useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { ReminderRow } from "@/lib/reminder-tracking";

export async function invokeTaskReminders(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("task-overdue-reminders", { body });
  if (error) {
    const ctx = (error as any).context;
    const detail = ctx instanceof Response ? await ctx.json().catch(() => null) : null;
    throw new Error(detail?.error || error.message);
  }
  if (!data?.success) throw new Error(data?.error || "Erreur");
  return data;
}

/** Latest reminder emails (one row per individual email). */
export function useTaskReminderLog() {
  return useQuery({
    queryKey: ["task-reminders"],
    queryFn: async (): Promise<ReminderRow[]> => {
      const { data, error } = await supabase.from("task_reminder_log").select("*")
        .order("created_at", { ascending: false }).limit(1000);
      if (error) throw error;
      return (data || []) as ReminderRow[];
    },
  });
}

/** Refreshes reminder opens from the email service once per page visit (support managers only). */
export function useSyncReminderOpens() {
  const { hasRole } = useAuth();
  const canSync = hasRole("admin") || hasRole("agent_master") || hasRole("agent_support");
  const qc = useQueryClient();
  const sync = useMutation({
    mutationFn: () => invokeTaskReminders({ action: "sync" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["task-reminders"] });
      qc.invalidateQueries({ queryKey: ["global-stats"] });
    },
  });
  const done = useRef(false);
  useEffect(() => {
    if (canSync && !done.current) { done.current = true; sync.mutate(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canSync]);
  return { ...sync, canSync };
}

/** Real addresses where team members receive their reminders (not their login id). */
export function useReminderAddresses() {
  return useQuery({
    queryKey: ["team-reminder-addresses"],
    queryFn: async () => {
      const { data, error } = await supabase.from("team_notification_emails").select("user_id, email, updated_at");
      if (error) throw error;
      return new Map((data || []).map((r) => [r.user_id, r.email]));
    },
  });
}

export function useSaveReminderAddress() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ userId, email }: { userId: string; email: string }) => {
      const clean = email.trim().toLowerCase();
      if (!clean) {
        const { error } = await supabase.from("team_notification_emails").delete().eq("user_id", userId);
        if (error) throw error;
        return;
      }
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(clean) || clean.length > 255) throw new Error("Adresse email invalide");
      const { error } = await supabase.from("team_notification_emails")
        .upsert({ user_id: userId, email: clean, updated_by: user?.id ?? null, updated_at: new Date().toISOString() });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["team-reminder-addresses"] }),
  });
}
