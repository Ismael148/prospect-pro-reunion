import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AuditEntry {
  id: string;
  user_id: string | null;
  actor_email: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  resource_label: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

export function useAuditLog(filters: { resourceType?: string; action?: string; search?: string } = {}) {
  return useQuery({
    queryKey: ["audit-log", filters],
    queryFn: async () => {
      let query = supabase
        .from("data_access_audit")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);

      if (filters.resourceType && filters.resourceType !== "all") {
        query = query.eq("resource_type", filters.resourceType);
      }
      if (filters.action && filters.action !== "all") {
        query = query.eq("action", filters.action);
      }

      const { data, error } = await query;
      if (error) throw error;

      const rows = (data ?? []) as unknown as AuditEntry[];
      const term = filters.search?.trim().toLowerCase();
      if (!term) return rows;
      return rows.filter((r) =>
        [r.actor_email, r.resource_label, r.resource_id, r.resource_type, r.action]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(term))
      );
    },
  });
}
