import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Commission {
  id: string;
  user_id: string;
  client_id: string;
  month_year: string;
  role: string;
  pack_type: string;
  base_amount: number;
  bonus_amount: number;
  total_amount: number;
  status: string;
  paid_at: string | null;
  created_at: string;
}

export function useCommissions(monthYear?: string) {
  return useQuery({
    queryKey: ["commissions", monthYear],
    queryFn: async () => {
      let query = supabase
        .from("commissions")
        .select("*")
        .order("created_at", { ascending: false });
      if (monthYear) {
        query = query.eq("month_year", monthYear);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as Commission[];
    },
  });
}

export function useUpdateCommissionStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updates: Record<string, unknown> = { status };
      if (status === "paye") {
        updates.paid_at = new Date().toISOString();
      }
      const { error } = await supabase
        .from("commissions")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["commissions"] });
    },
  });
}
