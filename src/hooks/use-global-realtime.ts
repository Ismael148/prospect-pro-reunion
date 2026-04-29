import { useEffect, useSyncExternalStore } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/* ---------------------------------------------------------------------------
   Lightweight global event store for realtime activity.
   Used by the "Sync live" badge and the /debug-realtime page.
--------------------------------------------------------------------------- */

export type RealtimeEvent = {
  id: string;
  table: string;
  type: "INSERT" | "UPDATE" | "DELETE";
  row_id?: string | null;
  at: number; // epoch ms
};

const MAX_EVENTS = 200;
let events: RealtimeEvent[] = [];
const listeners = new Set<() => void>();

function emit(ev: RealtimeEvent) {
  events = [ev, ...events].slice(0, MAX_EVENTS);
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

function getSnapshot() {
  return events;
}

export function useRealtimeEvents() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/** Returns the timestamp (ms) of the most recent realtime event, or 0. */
export function useLastRealtimeAt() {
  const evs = useRealtimeEvents();
  return evs[0]?.at ?? 0;
}

/* ---------------------------------------------------------------------------
   Per-table query-key invalidation strategy.

   Each table has:
     - `lists`: broad list query keys to refresh on any change
     - `byId`:  function that returns precise per-row keys
                (only invalidated when payload exposes the id)

   This minimizes over-fetching when the volume of updates is high.
--------------------------------------------------------------------------- */

type TableConfig = {
  lists: string[][];
  byId?: (id: string, row: any) => string[][];
};

const TABLES: Record<string, TableConfig> = {
  clients: {
    lists: [["clients"], ["logo-clients"], ["nfc-clients"], ["deleted-clients"]],
    byId: (id) => [["client", id]],
  },
  projects: {
    lists: [["projects"], ["logo-clients"]],
    byId: (id, row) => {
      const k: string[][] = [["project", id]];
      if (row?.client_id) k.push(["client", row.client_id]);
      return k;
    },
  },
  project_tasks: {
    lists: [],
    byId: (_id, row) => {
      const k: string[][] = [];
      if (row?.project_id) {
        k.push(["project-tasks", row.project_id]);
        k.push(["project", row.project_id]);
      }
      return k;
    },
  },
  logo_reminder_log: {
    lists: [["logo-reminders"], ["logo-clients"]],
  },
  email_send_log: {
    lists: [["email-history"]],
    byId: (_id, row) => {
      const k: string[][] = [];
      if (row?.project_id) k.push(["project-email-history", row.project_id]);
      if (row?.client_id) k.push(["client-email-history", row.client_id]);
      return k;
    },
  },
  support_tickets: {
    lists: [["support-tickets"], ["support"]],
    byId: (id) => [["ticket", id]],
  },
  social_deliverables: {
    lists: [["social-deliverables"]],
  },
  social_publications: {
    lists: [["social-publications"], ["social"]],
  },
  partner_access: {
    lists: [["partner-access"]],
  },
  partner_notifications: {
    lists: [["partner-notifications"]],
  },
  invoices: {
    lists: [["invoices"]],
    byId: (id) => [["invoice", id]],
  },
  prospects: {
    lists: [["prospects"]],
    byId: (id) => [["prospect", id]],
  },
  client_activities: {
    lists: [],
    byId: (_id, row) => (row?.client_id ? [["client-activities", row.client_id], ["client", row.client_id]] : []),
  },
  commissions: {
    lists: [["commissions"]],
  },
  expenses: {
    lists: [["expenses"]],
  },
  client_forms: {
    lists: [["client-forms"]],
    byId: (_id, row) => (row?.client_id ? [["client", row.client_id]] : []),
  },
  domain_renewals: {
    lists: [["domain-renewals"]],
  },
  contacts: {
    lists: [],
    byId: (_id, row) => (row?.client_id ? [["contacts", row.client_id], ["client", row.client_id]] : []),
  },
  client_gmb: {
    lists: [["client-gmb"], ["clients-without-gmb"]],
  },
  fb_onboarding_submissions: {
    lists: [["fb-onboarding"]],
  },
};

/* ---------------------------------------------------------------------------
   Global realtime subscription. Mounted once at AppLayout level.
--------------------------------------------------------------------------- */

export function useGlobalRealtime() {
  const qc = useQueryClient();

  useEffect(() => {
    const channel = supabase.channel(
      `global-app-realtime-${Math.random().toString(36).slice(2, 9)}`
    );

    Object.entries(TABLES).forEach(([table, cfg]) => {
      channel.on(
        // @ts-ignore — runtime supports postgres_changes
        "postgres_changes",
        { event: "*", schema: "public", table },
        (payload: any) => {
          const row = payload.new || payload.old || {};
          const rowId: string | undefined = row?.id;

          // 1) precise keys first
          if (rowId && cfg.byId) {
            cfg.byId(rowId, row).forEach((k) =>
              qc.invalidateQueries({ queryKey: k })
            );
          }
          // 2) broad list keys
          cfg.lists.forEach((k) => qc.invalidateQueries({ queryKey: k }));

          // 3) feed the activity store
          emit({
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            table,
            type: payload.eventType,
            row_id: rowId ?? null,
            at: Date.now(),
          });
        }
      );
    });

    channel.subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);
}
