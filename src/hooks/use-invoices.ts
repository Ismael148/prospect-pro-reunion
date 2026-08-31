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
      return data as unknown as Invoice;
    },
    // No email is sent on creation: the invoice stays a draft until it is
    // explicitly reviewed and sent from the invoices list.
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
    },
  });
}

/** Sends the invoice email (PDF attached) to the client via n8n. */
export async function sendInvoiceEmail(data: Invoice) {
  const { data: client } = await supabase
    .from("clients")
    .select("company_name, manager_name, address, postal_code, city, email, phone, siret, vat_number, ndi, support_token, payment_method, pack_type, tuning_website_addon")
    .eq("id", data.client_id)
    .single();


  if (!client) throw new Error("Client introuvable");
  if (!client.email) throw new Error("Ce client n'a pas d'adresse email");

  const { PUBLISHED_URL: publishedUrl, PACK_LABELS } = await import("@/lib/constants");
  const packLabel = (PACK_LABELS as Record<string, string>)[client.pack_type as string] || null;
  const supportLink = client.support_token ? `${publishedUrl}/s/${client.support_token}` : null;
  const formNfcLink = client.support_token ? `${publishedUrl}/f/${client.support_token}/nfc` : null;
  const formSiteLink = client.support_token ? `${publishedUrl}/f/${client.support_token}/site` : null;

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
      vat_number: (client as any).vat_number,
      ndi: (client as any).ndi,
      payment_method: client.payment_method,
    },
  }, { returnBase64: true });

  await triggerN8nWebhook('invoice.created', {
    invoice_number: data.invoice_number,
    total_amount: data.total_amount,
    due_date: data.due_date,
    client_id: data.client_id,
    client_email: client.email,
    company_name: client.company_name,
    manager_name: client.manager_name,
    greeting_name: (client.manager_name?.trim() || client.company_name),
    support_link: supportLink,
    form_nfc_link: formNfcLink,
    form_site_link: formSiteLink,
    pack_type: client.pack_type,
    pack_label: client.tuning_website_addon ? `${packLabel} + Création site internet` : packLabel,
    pdf_base64: pdfBase64,
    pdf_filename: `Facture_${data.invoice_number}.pdf`,
  });

  // Journal des emails : trace date + statut par facture
  await supabase.from("email_send_log").insert({
    recipient_email: client.email,
    recipient_name: client.manager_name || client.company_name,
    subject: `Facture n° ${data.invoice_number}`,
    template_name: "invoice",
    status: "sent",
    metadata: {
      invoice_id: data.id,
      invoice_number: data.invoice_number,
      client_id: data.client_id,
      total_amount: data.total_amount,
    } as any,
  } as any);
}


export function useSendInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (invoice: Invoice) => {
      await sendInvoiceEmail(invoice);
      const { error } = await supabase
        .from("invoices" as any)
        .update({ status: "envoyee" } as any)
        .eq("id", invoice.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["client-invoice-emails"] });
      qc.invalidateQueries({ queryKey: ["client-email-history"] });
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
