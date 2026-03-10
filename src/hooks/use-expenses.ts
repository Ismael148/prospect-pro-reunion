import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Expense {
  id: string;
  name: string;
  description: string | null;
  category: string;
  amount: number;
  frequency: string;
  month_year: string | null;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  created_by: string;
  created_at: string;
}

export function useExpenses() {
  return useQuery({
    queryKey: ["expenses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Expense[];
    },
  });
}

export function useCreateExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (expense: Omit<Expense, "id" | "created_at">) => {
      const { data, error } = await supabase
        .from("expenses")
        .insert(expense as Record<string, unknown>)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
    },
  });
}

export function useUpdateExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Expense> & { id: string }) => {
      const { error } = await supabase
        .from("expenses")
        .update(updates as Record<string, unknown>)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
    },
  });
}

export function useDeleteExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("expenses")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
    },
  });
}

/**
 * Calculate the monthly cost of an expense for a given month
 */
export function getMonthlyAmount(expense: Expense, monthYear: string): number {
  if (!expense.is_active) return 0;

  const [year, month] = monthYear.split("-").map(Number);
  const monthDate = new Date(year, month - 1, 1);

  // Check date bounds
  if (expense.start_date) {
    const start = new Date(expense.start_date);
    if (monthDate < new Date(start.getFullYear(), start.getMonth(), 1)) return 0;
  }
  if (expense.end_date) {
    const end = new Date(expense.end_date);
    if (monthDate > new Date(end.getFullYear(), end.getMonth(), 1)) return 0;
  }

  switch (expense.frequency) {
    case "ponctuel":
      return expense.month_year === monthYear ? Number(expense.amount) : 0;
    case "mensuel":
      return Number(expense.amount);
    case "trimestriel":
      // Apply every 3 months from start
      if (expense.start_date) {
        const start = new Date(expense.start_date);
        const diffMonths = (year - start.getFullYear()) * 12 + (month - 1 - start.getMonth());
        return diffMonths % 3 === 0 ? Number(expense.amount) : 0;
      }
      return month % 3 === 1 ? Number(expense.amount) : 0;
    case "annuel":
      if (expense.start_date) {
        const start = new Date(expense.start_date);
        return month - 1 === start.getMonth() ? Number(expense.amount) : 0;
      }
      return month === 1 ? Number(expense.amount) : 0;
    default:
      return 0;
  }
}
