import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { triggerN8nWebhook } from "@/lib/n8n-webhook";
import { exportInvoicePDF } from "@/lib/export-invoice-pdf";

export interface InvoiceItem {
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface Invoice {
  id: string;
  client_id: string;
  invoice_number: string;
  amount: number;
  tax_rate: number;
  tax_amount: number;
  total_amount: number;
  status: string;
  issued_date: string;
  due_date: string | null;
  paid_date: string | null;
  notes: string | null;
  items: InvoiceItem[];
  payment_methods?: string[] | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export function useInvoices() {
  return useQuery({
    queryKey: ["invoices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as Invoice[];
    },
  });
}

export function useInvoicesByClient(clientId: string | undefined) {
  return useQuery({
    queryKey: ["invoices", "client", clientId],
    enabled: !!clientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices" as any)
        .select("*")
        .eq("client_id", clientId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as Invoice[];
    },
  });
}

export function useCreateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (invoice: Partial<Invoice> & { _skipWebhook?: boolean }) => {
      const { _skipWebhook, ...invoiceData } = invoice;
      const { data, error } = await supabase
        .from("invoices" as any)
        .insert(invoiceData as any)
        .select()
        .single();
      if (error) throw error;
      return { ...(data as unknown as Invoice), _skipWebhook };
    },
    onSuccess: async (data: Invoice & { _skipWebhook?: boolean }) => {
      qc.invalidateQueries({ queryKey: ["invoices"] });

      // Skip webhook for domain renewal invoices (they send their own email)
      if (data._skipWebhook) return;

      // Fetch client info for PDF + links
      try {
        const { data: client } = await supabase
          .from("clients")
          .select("company_name, address, postal_code, city, email, phone, siret, support_token, payment_method, pack_type")
          .eq("id", data.client_id)
          .single();

        if (!client) return;

        const { PUBLISHED_URL: publishedUrl } = await import("@/lib/constants");
        const supportLink = client.support_token ? `${publishedUrl}/s/${client.support_token}` : null;
        const formNfcLink = client.support_token ? `${publishedUrl}/f/${client.support_token}/nfc` : null;
        const formSiteLink = client.support_token ? `${publishedUrl}/f/${client.support_token}/site` : null;

        // Generate PDF as base64
        const pdfBase64 = exportInvoicePDF({
          invoice_number: data.invoice_number,
          issued_date: data.issued_date,
          due_date: data.due_date,
          status: data.status,
          amount: data.amount,
          tax_rate: data.tax_rate,
          tax_amount: data.tax_amount,
          total_amount: data.total_amount,
          notes: data.notes,
          items: data.items,
          payment_methods: data.payment_methods,
          client: {
            company_name: client.company_name,
            address: client.address,
            postal_code: client.postal_code,
            city: client.city,
            email: client.email,
            phone: client.phone,
            siret: client.siret,
            payment_method: client.payment_method,
          },
        }, { returnBase64: true });

        triggerN8nWebhook('invoice.created', {
          invoice_number: data.invoice_number,
          total_amount: data.total_amount,
          due_date: data.due_date,
          client_id: data.client_id,
          client_email: client.email,
          company_name: client.company_name,
          support_link: supportLink,
          form_nfc_link: formNfcLink,
          form_site_link: formSiteLink,
          pack_type: client.pack_type,
          pdf_base64: pdfBase64,
          pdf_filename: `Facture_${data.invoice_number}.pdf`,
        });
      } catch (err) {
        console.warn('[invoice] Failed to send enriched webhook:', err);
        triggerN8nWebhook('invoice.created', {
          invoice_number: data.invoice_number,
          total_amount: data.total_amount,
          client_id: data.client_id,
        });
      }
    },
  });
}

export function useUpdateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Invoice> & { id: string }) => {
      const { error } = await supabase
        .from("invoices" as any)
        .update(updates as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invoices"] }),
  });
}

export function useDeleteInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("invoices" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invoices"] }),
  });
}
