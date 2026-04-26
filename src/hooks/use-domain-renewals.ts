import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type DomainRenewal = {
  id: string;
  client_id: string;
  domain_name: string;
  amount: number;
  registered_date: string | null;
  renewal_date: string;
  next_renewal_date: string | null;
  status: string;
  invoice_id: string | null;
  paid_date: string | null;
  payment_method: string | null;
  notes: string | null;
  reminder_count: number;
  last_reminder_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type DomainRenewalReminder = {
  id: string;
  renewal_id: string;
  client_id: string;
  reminder_type: string;
  subject: string | null;
  message: string | null;
  recipient_email: string | null;
  status: string;
  sent_by: string | null;
  sent_at: string;
};

export function useDomainRenewals() {
  return useQuery({
    queryKey: ["domain_renewals"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("domain_renewals")
        .select("*")
        .order("renewal_date", { ascending: true });
      if (error) throw error;
      return (data || []) as DomainRenewal[];
    },
  });
}

export function useDomainRenewalReminders(renewalId?: string) {
  return useQuery({
    queryKey: ["domain_renewal_reminders", renewalId],
    queryFn: async () => {
      const query = (supabase as any)
        .from("domain_renewal_reminders")
        .select("*")
        .order("sent_at", { ascending: false });
      if (renewalId) query.eq("renewal_id", renewalId);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as DomainRenewalReminder[];
    },
    enabled: renewalId !== undefined,
  });
}

export function useAllRenewalReminders() {
  return useQuery({
    queryKey: ["domain_renewal_reminders", "all"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("domain_renewal_reminders")
        .select("*")
        .order("sent_at", { ascending: false });
      if (error) throw error;
      return (data || []) as DomainRenewalReminder[];
    },
  });
}

export function useCreateDomainRenewal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<Partial<DomainRenewal>, "id"> & { client_id: string; domain_name: string; renewal_date: string; created_by: string }) => {
      const { data, error } = await (supabase as any)
        .from("domain_renewals")
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["domain_renewals"] }),
  });
}

export function useUpdateDomainRenewal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<DomainRenewal> & { id: string }) => {
      const { data, error } = await (supabase as any)
        .from("domain_renewals")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["domain_renewals"] }),
  });
}

export function useDeleteDomainRenewal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("domain_renewals").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["domain_renewals"] }),
  });
}

export function useLogRenewalReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<Partial<DomainRenewalReminder>, "id"> & { renewal_id: string; client_id: string }) => {
      const { data, error } = await (supabase as any)
        .from("domain_renewal_reminders")
        .insert(input)
        .select()
        .single();
      if (error) throw error;

      // Increment reminder count
      const { data: cur } = await (supabase as any)
        .from("domain_renewals")
        .select("reminder_count")
        .eq("id", input.renewal_id)
        .single();
      await (supabase as any)
        .from("domain_renewals")
        .update({
          reminder_count: ((cur?.reminder_count as number) || 0) + 1,
          last_reminder_at: new Date().toISOString(),
        })
        .eq("id", input.renewal_id);

      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["domain_renewals"] });
      qc.invalidateQueries({ queryKey: ["domain_renewal_reminders", vars.renewal_id] });
      qc.invalidateQueries({ queryKey: ["domain_renewal_reminders", "all"] });
    },
  });
}
