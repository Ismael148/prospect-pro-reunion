import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEmailBranding } from "@/hooks/use-email-branding";
import { useAuth } from "@/contexts/AuthContext";
import { useCreateInvoice } from "@/hooks/use-invoices";
import { exportInvoicePDF } from "@/lib/export-invoice-pdf";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Globe, Send, Loader2, FileText, Eye, Pencil } from "lucide-react";
import { motion } from "framer-motion";
import EmailTemplateSaver from "@/components/EmailTemplateSaver";
import type { SavedTemplate } from "@/hooks/use-email-templates";

import { BRAND_COLOR, wrapInBrandedTemplate } from "@/lib/email-template";

function buildEmailBody(greetingName: string, domainName: string, amount: number) {
  return `<p style="margin:0 0 20px">Bonjour <strong>${greetingName}</strong>,</p>
<p style="margin:0 0 20px">Veuillez trouver ci-jointe la facture de renouvellement de votre nom de domaine :</p>
<div style="margin:20px 0;padding:20px;background:#f8f9fa;border-radius:12px;border-left:4px solid ${BRAND_COLOR}">
  <p style="margin:0 0 8px;font-size:16px;font-weight:700;color:#1a1a2e">🌐 ${domainName}</p>
  <p style="margin:0;font-size:22px;font-weight:800;color:${BRAND_COLOR}">${amount.toFixed(2)} €</p>
</div>
<p style="margin:0 0 20px">Pour rappel, le renouvellement de votre nom de domaine assure la <strong>continuité de la visibilité de votre site en ligne</strong> et évite toute interruption d'accès pour vos visiteurs et clients.</p>
<p style="margin:0 0 20px">Pour effectuer le virement, nous vous joignons notre RIB en pièce jointe.</p>
<p style="margin:0 0 20px">Merci de procéder au règlement dans les meilleurs délais.</p>
<p style="margin:0">Cordialement,<br><strong style="color:${BRAND_COLOR}">L'équipe Adamkom</strong></p>`;
}

interface ClientData {
  id: string;
  company_name: string;
  manager_name?: string | null;
  email: string | null;
  address?: string | null;
  postal_code?: string | null;
  city?: string | null;
  phone?: string | null;
  siret?: string | null;
  payment_method?: string | null;
}

export default function DomainRenewalInvoice({ client }: { client: ClientData }) {
  const { user } = useAuth();
  const createInvoice = useCreateInvoice();
  const { data: branding } = useEmailBranding();
  const [domainName, setDomainName] = useState("");
  const [amount, setAmount] = useState("");
  const [sending, setSending] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [subject, setSubject] = useState("");
  const [emailBodyOverride, setEmailBodyOverride] = useState("");

  const amountNum = Number(amount) || 0;
  const defaultSubject = `Facture renouvellement nom de domaine — ${domainName.trim()}`;
  const defaultBody = buildEmailBody(client.company_name, domainName.trim(), amountNum);

  const previewHtml = useMemo(() => {
    return wrapInBrandedTemplate(emailBodyOverride || defaultBody, undefined, branding || undefined);
  }, [emailBodyOverride, defaultBody, branding]);

  if (!client.email) return null;

  const handlePreview = () => {
    if (!domainName.trim()) { toast.error("Saisissez un nom de domaine"); return; }
    if (!amount || amountNum <= 0) { toast.error("Saisissez un montant valide"); return; }
    setSubject(defaultSubject);
    setEmailBodyOverride(defaultBody);
    setEditMode(false);
    setShowPreview(true);
  };

  const handleSend = async () => {
    if (!user) return;
    setSending(true);
    try {
      const invoiceItems = [
        { description: `Renouvellement nom de domaine : ${domainName.trim()}`, quantity: 1, unit_price: amountNum, total: amountNum },
      ];

      const invoice = await createInvoice.mutateAsync({
        client_id: client.id,
        created_by: user.id,
        amount: amountNum,
        tax_rate: 0,
        tax_amount: 0,
        total_amount: amountNum,
        items: invoiceItems as any,
        notes: `Renouvellement du nom de domaine ${domainName.trim()}`,
        status: "envoyee",
        _skipWebhook: true,
      } as any);

      const pdfBase64 = exportInvoicePDF({
        invoice_number: invoice.invoice_number,
        issued_date: invoice.issued_date,
        due_date: invoice.due_date,
        status: invoice.status,
        amount: amountNum,
        tax_rate: 0,
        tax_amount: 0,
        total_amount: amountNum,
        notes: `Renouvellement du nom de domaine ${domainName.trim()}`,
        items: invoiceItems,
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

      // Use the edited body
      const finalBody = emailBodyOverride;
      const htmlContent = wrapInBrandedTemplate(finalBody, undefined, branding || undefined);

      // Fetch RIB file as base64
      let ribBase64: string | null = null;
      try {
        const ribResp = await fetch("/documents/RIB_Adamkom_by_JJP.pdf");
        const ribBlob = await ribResp.blob();
        ribBase64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve((reader.result as string).split(",")[1]);
          reader.readAsDataURL(ribBlob);
        });
      } catch (e) {
        console.warn("Could not load RIB file", e);
      }

      const attachments: { content: string; name: string }[] = [];
      if (pdfBase64) {
        attachments.push({
          content: pdfBase64,
          name: `Facture_${invoice.invoice_number}_${client.company_name.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`,
        });
      }
      if (ribBase64) {
        attachments.push({
          content: ribBase64,
          name: "RIB_Adamkom_by_JJP.pdf",
        });
      }

      const { error } = await supabase.functions.invoke("send-brevo-campaign", {
        body: {
          action: "send_client_email",
          recipientEmail: client.email,
          recipientName: client.company_name,
          subject,
          htmlContent,
          trigger: "domain_renewal_invoice",
          client_id: client.id,
          attachment: attachments.length > 0 ? attachments : undefined,
        },
      });

      if (error) throw error;

      // Auto-create / update domain_renewals tracking entry to avoid manual entry
      try {
        const today = new Date();
        const renewalDateStr = today.toISOString().slice(0, 10);
        const nextYear = new Date(today);
        nextYear.setFullYear(today.getFullYear() + 1);
        const nextRenewalStr = nextYear.toISOString().slice(0, 10);

        // Check if a renewal already exists for this client + domain
        const { data: existing } = await (supabase as any)
          .from("domain_renewals")
          .select("id")
          .eq("client_id", client.id)
          .eq("domain_name", domainName.trim())
          .maybeSingle();

        let renewalId: string | null = existing?.id ?? null;

        if (existing) {
          await (supabase as any)
            .from("domain_renewals")
            .update({
              amount: amountNum,
              status: "facture_envoyee",
              invoice_id: invoice.id,
              renewal_date: renewalDateStr,
              next_renewal_date: nextRenewalStr,
              last_reminder_at: new Date().toISOString(),
              reminder_count: ((existing as any).reminder_count ?? 0) + 1,
            })
            .eq("id", existing.id);
        } else {
          const { data: inserted } = await (supabase as any)
            .from("domain_renewals")
            .insert({
              client_id: client.id,
              created_by: user.id,
              domain_name: domainName.trim(),
              amount: amountNum,
              renewal_date: renewalDateStr,
              next_renewal_date: nextRenewalStr,
              status: "facture_envoyee",
              invoice_id: invoice.id,
              last_reminder_at: new Date().toISOString(),
              reminder_count: 1,
            })
            .select("id")
            .single();
          renewalId = inserted?.id ?? null;
        }

        // Log the reminder/email in history
        if (renewalId) {
          await (supabase as any).from("domain_renewal_reminders").insert({
            renewal_id: renewalId,
            client_id: client.id,
            reminder_type: "facture",
            subject,
            message: emailBodyOverride,
            recipient_email: client.email,
            status: "sent",
            sent_by: user.id,
          });
        }
      } catch (trackErr) {
        console.warn("Domain renewal tracking failed", trackErr);
      }

      toast.success(`Facture de renouvellement envoyée à ${client.email}`);
      setDomainName("");
      setAmount("");
      setShowPreview(false);
    } catch (e: any) {
      toast.error(e.message || "Erreur lors de l'envoi");
    } finally {
      setSending(false);
    }
  };


  return (
    <>
      <Card className="border-0 shadow-md shadow-primary/5">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Globe className="w-5 h-5 text-primary" /> Facture renouvellement NDD
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="domain-name" className="text-sm">Nom de domaine</Label>
              <Input
                id="domain-name"
                placeholder="exemple.re"
                value={domainName}
                onChange={(e) => setDomainName(e.target.value)}
              />
            </div>
            <div className="w-full sm:w-32 space-y-1.5">
              <Label htmlFor="domain-amount" className="text-sm">Montant (€)</Label>
              <Input
                id="domain-amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="29.90"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <Button
              onClick={handlePreview}
              disabled={!domainName.trim() || !amount}
              className="whitespace-nowrap"
            >
              <Eye className="w-4 h-4 mr-1.5" />
              Aperçu & Envoyer
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            <FileText className="w-3 h-3 inline mr-1" />
            La facture PDF sera générée et envoyée par email à {client.email}
          </p>
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-primary" /> Aperçu de l'email
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Subject */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">Objet</Label>
              {editMode ? (
                <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
              ) : (
                <p className="text-sm font-medium p-2 rounded-lg bg-muted/30">{subject}</p>
              )}
            </div>

            {/* Recipient */}
            <div className="flex gap-4 text-sm">
              <div>
                <span className="text-xs text-muted-foreground">À :</span>{" "}
                <span className="font-medium">{client.company_name}</span>{" "}
                <span className="text-muted-foreground">&lt;{client.email}&gt;</span>
              </div>
            </div>

            {/* Edit toggle + Template saver */}
            <div className="flex items-center justify-between">
              <EmailTemplateSaver
                subject={subject}
                body={emailBodyOverride}
                category="ndd_renewal"
                onLoad={(tpl: SavedTemplate) => {
                  setSubject(tpl.subject);
                  setEmailBodyOverride(tpl.body);
                }}
              />
              <Button
                variant={editMode ? "default" : "outline"}
                size="sm"
                className="gap-1.5"
                onClick={() => setEditMode(!editMode)}
              >
                <Pencil className="w-3.5 h-3.5" />
                {editMode ? "Voir l'aperçu" : "Modifier le contenu"}
              </Button>
            </div>

            {editMode ? (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Contenu HTML</Label>
                <Textarea
                  value={emailBodyOverride}
                  onChange={(e) => setEmailBodyOverride(e.target.value)}
                  rows={14}
                  className="font-mono text-xs resize-none"
                />
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="border border-border/50 rounded-xl overflow-hidden shadow-sm"
              >
                <div
                  className="bg-white p-0"
                  dangerouslySetInnerHTML={{ __html: previewHtml }}
                />
              </motion.div>
            )}

            {/* Attachment info */}
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30 text-sm">
              <FileText className="w-4 h-4 text-primary shrink-0" />
              <div>
                <span className="font-medium">Pièce jointe :</span>{" "}
                Facture_{client.company_name.replace(/[^a-zA-Z0-9]/g, "_")}.pdf
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              Annuler
            </Button>
            <Button onClick={handleSend} disabled={sending} className="gap-1.5">
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Envoyer la facture
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
