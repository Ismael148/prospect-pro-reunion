import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface GmbMonthlyGoal {
  id: string;
  client_gmb_id: string;
  client_id: string;
  month_year: string;
  posts_target: number;
  posts_done: number;
  reviews_reply_target_pct: number;
  reviews_replied: number;
  reviews_received: number;
  photos_target: number;
  photos_done: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function currentMonthYear(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function useGmbGoal(clientGmbId: string | undefined, monthYear = currentMonthYear()) {
  return useQuery({
    queryKey: ["gmb-goal", clientGmbId, monthYear],
    enabled: !!clientGmbId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("gmb_monthly_goals")
        .select("*")
        .eq("client_gmb_id", clientGmbId)
        .eq("month_year", monthYear)
        .maybeSingle();
      if (error) throw error;
      return data as GmbMonthlyGoal | null;
    },
  });
}

export function useUpsertGmbGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      input: Partial<GmbMonthlyGoal> & { client_gmb_id: string; client_id: string; month_year: string }
    ) => {
      const payload: any = { ...input, notes: input.notes || null };
      let res;
      if (input.id) {
        res = await (supabase as any)
          .from("gmb_monthly_goals")
          .update(payload)
          .eq("id", input.id)
          .select()
          .single();
      } else {
        res = await (supabase as any)
          .from("gmb_monthly_goals")
          .upsert(payload, { onConflict: "client_gmb_id,month_year" })
          .select()
          .single();
      }
      if (res.error) throw res.error;
      return res.data as GmbMonthlyGoal;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["gmb-goal", data.client_gmb_id] });
    },
    onError: (e: any) => toast.error(e.message || "Erreur"),
  });
}

export function goalProgressColor(pct: number): string {
  if (pct >= 80) return "bg-emerald-500";
  if (pct >= 50) return "bg-amber-500";
  return "bg-red-500";
}
