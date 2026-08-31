import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useInvoicesByClient, useSendInvoice, type Invoice } from "@/hooks/use-invoices";
import { exportInvoicePDF } from "@/lib/export-invoice-pdf";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { FileText, Eye, Download, Send, Loader2, Mail } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const STATUS_LABELS: Record<string, string> = {
  brouillon: "Brouillon",
  envoyee: "Envoyée",
  payee: "Payée",
  annulee: "Annulée",
};

const STATUS_COLORS: Record<string, string> = {
  brouillon: "bg-muted text-muted-foreground",
  envoyee: "bg-primary/10 text-primary",
  payee: "bg-success/10 text-success",
  annulee: "bg-destructive/10 text-destructive",
};

const MAIL_STATUS: Record<string, { label: string; color: string }> = {
  sent: { label: "Envoyé", color: "bg-primary/10 text-primary" },
  delivered: { label: "Délivré", color: "bg-success/10 text-success" },
  opened: { label: "Ouvert", color: "bg-success/10 text-success" },
  clicked: { label: "Cliqué", color: "bg-success/10 text-success" },
  bounced: { label: "Rebondi", color: "bg-warning/10 text-warning" },
  failed: { label: "Échoué", color: "bg-destructive/10 text-destructive" },
  pending: { label: "En attente", color: "bg-muted text-muted-foreground" },
};

interface ClientInvoicesSectionProps {
  client: {
    id: string;
    company_name: string;
    address?: string | null;
    postal_code?: string | null;
    city?: string | null;
    email?: string | null;
    phone?: string | null;
    siret?: string | null;
    vat_number?: string | null;
    ndi?: string | null;
    payment_method?: string | null;
  };
}

export default function ClientInvoicesSection({ client }: ClientInvoicesSectionProps) {
  const { data: invoices, isLoading } = useInvoicesByClient(client.id);
  const sendInvoice = useSendInvoice();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);

  const { data: emailLogs } = useQuery({
    queryKey: ["client-invoice-emails", client.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_send_log")
        .select("id, subject, status, created_at, recipient_email, metadata, error_message")
        .eq("template_name", "invoice")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data || []).filter(
        (e) => (e.metadata as any)?.client_id === client.id || e.recipient_email === client.email,
      );
    },
  });

  const buildPdfData = (inv: Invoice) => ({
    ...inv,
    client: {
      company_name: client.company_name,
      address: client.address,
      postal_code: client.postal_code,
      city: client.city,
      email: client.email,
      phone: client.phone,
      siret: client.siret,
      vat_number: client.vat_number,
      ndi: client.ndi,
      payment_method: client.payment_method,
    },
  });

  const handlePreview = (inv: Invoice) => {
    const base64 = exportInvoicePDF(buildPdfData(inv), { returnBase64: true });
    if (base64) setPreviewUrl(`data:application/pdf;base64,${base64}`);
  };

  const handleSend = async (inv: Invoice) => {
    setSendingId(inv.id);
    try {
      await sendInvoice.mutateAsync(inv);
      toast.success("Facture envoyée au client");
    } catch (e: any) {
      toast.error(e?.message || "Erreur lors de l'envoi");
    } finally {
      setSendingId(null);
    }
  };

  const logsFor = (inv: Invoice) =>
    (emailLogs || []).filter(
      (e) =>
        (e.metadata as any)?.invoice_id === inv.id ||
        (e.subject || "").includes(inv.invoice_number),
    );

  return (
    <Card className="border-0 shadow-md shadow-primary/5">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <FileText className="w-5 h-5" /> Factures du client ({invoices?.length || 0})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
        ) : !invoices || invoices.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune facture pour ce client.</p>
        ) : (
          invoices.map((inv) => {
            const logs = logsFor(inv);
            return (
              <div key={inv.id} className="rounded-lg border border-border/60 p-3 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{inv.invoice_number}</span>
                      <Badge className={STATUS_COLORS[inv.status] || "bg-muted"}>
                        {STATUS_LABELS[inv.status] || inv.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Émise le {format(new Date(inv.issued_date), "dd MMM yyyy", { locale: fr })} —{" "}
                      <span className="font-medium text-foreground">{Number(inv.total_amount).toFixed(2)} €</span>
                    </p>
                  </div>
                  <div className="flex gap-1.5">
                    <Button size="sm" variant="outline" onClick={() => handlePreview(inv)} className="gap-1.5">
                      <Eye className="w-3.5 h-3.5" /> Aperçu
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => exportInvoicePDF(buildPdfData(inv))} className="gap-1.5">
                      <Download className="w-3.5 h-3.5" /> PDF
                    </Button>
                    {inv.status === "brouillon" && (
                      <Button size="sm" onClick={() => handleSend(inv)} disabled={sendingId === inv.id} className="gap-1.5">
                        {sendingId === inv.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                        Envoyer
                      </Button>
                    )}
                  </div>
                </div>

                <div className="border-t border-border/50 pt-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-1.5">
                    <Mail className="w-3 h-3" /> Historique des emails
                  </p>
                  {logs.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Aucun email envoyé pour cette facture.</p>
                  ) : (
                    <ul className="space-y-1">
                      {logs.map((log) => {
                        const st = MAIL_STATUS[log.status] || { label: log.status, color: "bg-muted text-muted-foreground" };
                        return (
                          <li key={log.id} className="flex items-center justify-between gap-2 text-xs">
                            <span className="text-muted-foreground">
                              {format(new Date(log.created_at), "dd/MM/yyyy HH:mm", { locale: fr })} — {log.recipient_email}
                            </span>
                            <Badge className={st.color} variant="secondary">{st.label}</Badge>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>
            );
          })
        )}
      </CardContent>

      <Dialog open={!!previewUrl} onOpenChange={(o) => !o && setPreviewUrl(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader><DialogTitle>Aperçu de la facture</DialogTitle></DialogHeader>
          {previewUrl && <iframe src={previewUrl} title="Aperçu facture" className="w-full h-[70vh] rounded-md border border-border" />}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
