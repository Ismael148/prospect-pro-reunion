import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SalaryAdvance {
  id: string;
  expense_id: string;
  employee_name: string;
  amount: number;
  reason: string | null;
  request_date: string;
  status: string; // 'en_cours' | 'rembourse'
  reimbursed_at: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export function useSalaryAdvances(expenseId?: string) {
  return useQuery({
    queryKey: ["salary_advances", expenseId ?? "all"],
    queryFn: async () => {
      let query = supabase.from("salary_advances" as any).select("*").order("request_date", { ascending: false });
      if (expenseId) query = query.eq("expense_id", expenseId);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as SalaryAdvance[];
    },
  });
}

export function useCreateSalaryAdvance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (advance: Omit<SalaryAdvance, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase.from("salary_advances" as any).insert([advance as any]).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["salary_advances"] }),
  });
}

export function useUpdateSalaryAdvance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<SalaryAdvance> & { id: string }) => {
      const { error } = await supabase.from("salary_advances" as any).update(updates as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["salary_advances"] }),
  });
}

export function useDeleteSalaryAdvance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("salary_advances" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["salary_advances"] }),
  });
}
