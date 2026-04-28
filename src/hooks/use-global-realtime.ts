import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Global realtime subscription. Any INSERT/UPDATE/DELETE on key tables
 * triggers immediate React Query invalidation so the UI updates without
 * a manual refresh.
 *
 * Mounted once at the AppLayout level.
 */
const TABLE_KEYS: Record<string, string[][]> = {
  clients: [["clients"], ["client"], ["logo-clients"], ["nfc-clients"], ["deleted-clients"]],
  projects: [["projects"], ["project"], ["logo-clients"]],
  project_tasks: [["project-tasks"], ["project"], ["projects"]],
  logo_reminder_log: [["logo-reminders"], ["logo-clients"]],
  email_send_log: [["client-email-history"], ["project-email-history"], ["email-history"]],
  support_tickets: [["support-tickets"], ["support"]],
  social_deliverables: [["social-deliverables"]],
  social_publications: [["social-publications"], ["social"]],
  invoices: [["invoices"]],
  prospects: [["prospects"]],
  client_activities: [["client-activities"], ["client"]],
  commissions: [["commissions"]],
  expenses: [["expenses"]],
  client_forms: [["client-forms"]],
  domain_renewals: [["domain-renewals"]],
  contacts: [["contacts"], ["client"]],
};

export function useGlobalRealtime() {
  const qc = useQueryClient();

  useEffect(() => {
    const channel = supabase.channel(`global-app-realtime-${Math.random().toString(36).slice(2, 9)}`);

    Object.entries(TABLE_KEYS).forEach(([table, keys]) => {
      channel.on(
        // @ts-ignore — runtime supports postgres_changes payload
        "postgres_changes",
        { event: "*", schema: "public", table },
        () => {
          keys.forEach((k) => qc.invalidateQueries({ queryKey: k }));
        }
      );
    });

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);
}
