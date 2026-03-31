import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCreateInvoice } from "@/hooks/use-invoices";
import { exportInvoicePDF } from "@/lib/export-invoice-pdf";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Globe, Send, Loader2, FileText } from "lucide-react";

const BRAND_COLOR = "#ff006e";

function wrapInBrandedTemplate(bodyHtml: string) {
  return `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,0.06)">
  <div style="padding:40px 40px 32px;text-align:center;background:#ffffff">
    <img src="https://ai.adamkom.com/lovable-uploads/d6c24753-6c76-49a3-8a6d-fe0dd4a898be.png" alt="Adamkom" style="height:72px;width:auto;display:block;margin:0 auto 12px" />
    <p style="margin:0;font-size:13px;color:#71717a;letter-spacing:0.5px">La performance digitale pour votre entreprise</p>
  </div>
  <div style="height:3px;background:linear-gradient(90deg,${BRAND_COLOR},#ff5c8a,${BRAND_COLOR})"></div>
  <div style="padding:40px 40px 32px;line-height:1.8;font-size:15px;color:#27272a">
    ${bodyHtml}
  </div>
  <div style="padding:28px 40px;border-top:1px solid #f0f0f0;background:#fafafa;text-align:center">
    <p style="margin:0 0 8px;font-size:14px;color:#b8004a"><strong>Adamkom</strong> — La performance digitale</p>
    <p style="margin:0 0 4px;font-size:13px;color:#71717a">📞 <a href="tel:0262666876" style="color:${BRAND_COLOR};text-decoration:none;font-weight:600">0262 66 68 76</a></p>
    <p style="margin:12px 0 0;font-size:11px;color:#a1a1aa">© ${new Date().getFullYear()} Adamkom by JJP — La Réunion 🇷🇪</p>
  </div>
</div>`;
}

interface ClientData {
  id: string;
  company_name: string;
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
  const [domainName, setDomainName] = useState("");
  const [amount, setAmount] = useState("");
  const [sending, setSending] = useState(false);

  if (!client.email) return null;

  const handleSend = async () => {
    if (!domainName.trim()) { toast.error("Saisissez un nom de domaine"); return; }
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) { toast.error("Saisissez un montant valide"); return; }
    if (!user) return;

    setSending(true);
    try {
      const amountNum = Number(amount);
      const invoiceItems = [
        { description: `Renouvellement nom de domaine : ${domainName.trim()}`, quantity: 1, unit_price: amountNum, total: amountNum },
      ];

      // Create invoice in DB
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
      });

      // Generate PDF as base64
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

      // Build email HTML
      const emailBody = `
        <p style="margin:0 0 20px">Bonjour <strong>${client.company_name}</strong>,</p>
        <p style="margin:0 0 20px">Veuillez trouver ci-jointe la facture de renouvellement de votre nom de domaine :</p>
        <div style="margin:20px 0;padding:20px;background:#f8f9fa;border-radius:12px;border-left:4px solid #1E3A5F">
          <p style="margin:0 0 8px;font-size:16px;font-weight:700;color:#1E3A5F">🌐 ${domainName.trim()}</p>
          <p style="margin:0;font-size:22px;font-weight:800;color:#DAA520">${amountNum.toFixed(2)} €</p>
          <p style="margin:8px 0 0;font-size:13px;color:#71717a">Facture N° ${invoice.invoice_number}</p>
        </div>
        <p style="margin:0 0 20px">Merci de procéder au règlement dans les meilleurs délais.</p>
        <p style="margin:0">Cordialement,<br><strong style="color:${BRAND_COLOR}">L'équipe Adamkom</strong></p>
      `;

      const htmlContent = wrapInBrandedTemplate(emailBody);

      // Send via Brevo with PDF attachment
      const { error } = await supabase.functions.invoke("send-brevo-campaign", {
        body: {
          action: "send_client_email",
          recipientEmail: client.email,
          recipientName: client.company_name,
          subject: `Facture renouvellement nom de domaine — ${domainName.trim()}`,
          htmlContent,
          trigger: "domain_renewal_invoice",
          client_id: client.id,
          attachment: pdfBase64 ? [{
            content: pdfBase64,
            name: `Facture_${invoice.invoice_number}_${client.company_name.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`,
          }] : undefined,
        },
      });

      if (error) throw error;

      toast.success(`Facture de renouvellement envoyée à ${client.email}`);
      setDomainName("");
      setAmount("");
    } catch (e: any) {
      toast.error(e.message || "Erreur lors de l'envoi");
    } finally {
      setSending(false);
    }
  };

  return (
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
            onClick={handleSend}
            disabled={sending || !domainName.trim() || !amount}
            className="whitespace-nowrap"
          >
            {sending ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Send className="w-4 h-4 mr-1.5" />}
            Envoyer la facture
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          <FileText className="w-3 h-3 inline mr-1" />
          La facture PDF sera générée et envoyée par email à {client.email}
        </p>
      </CardContent>
    </Card>
  );
}
