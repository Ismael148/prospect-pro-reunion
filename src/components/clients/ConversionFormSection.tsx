import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEmailBranding } from "@/hooks/use-email-branding";
import { useClientForms } from "@/hooks/use-client-forms";
import { PUBLISHED_URL } from "@/lib/constants";
import { BRAND_COLOR, wrapInBrandedTemplate, makeCta } from "@/lib/email-template";
import { exportClientFormZip } from "@/lib/export-client-form";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Target, Eye, Send, ClipboardCopy, ExternalLink, Loader2, Download } from "lucide-react";

interface Props {
  clientId: string;
  companyName: string;
  managerName?: string | null;
  email?: string | null;
  supportToken?: string | null;
}

const STATUS_LABELS: Record<string, string> = { en_attente: "En attente", soumis: "Soumis", valide: "Validé" };

export default function ConversionFormSection({ clientId, companyName, managerName, email, supportToken }: Props) {
  const { data: branding } = useEmailBranding();
  const { data: forms } = useClientForms(clientId);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [sending, setSending] = useState(false);

  const link = supportToken ? `${PUBLISHED_URL}/f/${supportToken}/conversion` : null;
  const greeting = managerName?.trim() || companyName;
  const conversionForms = (forms || []).filter((f: any) => f.form_type === "conversion");

  const subject = `Vos informations pour votre page de conversion — ${companyName}`;
  const bodyHtml = `<p style="margin:0 0 20px">Bonjour <strong>${greeting}</strong>,</p>
<p style="margin:0 0 20px">Nous démarrons la création de votre <strong>page de conversion</strong> (la page qui transforme vos visiteurs en clients).</p>
<p style="margin:0 0 20px">Pour cela, nous avons besoin de <strong>quelques informations seulement</strong> : votre activité, votre offre principale, vos tarifs et vos coordonnées. Cela vous prendra <strong>moins de 5 minutes</strong>.</p>
${link ? makeCta("🎯 Remplir le formulaire", link) : ""}
<p style="margin:0 0 20px;font-size:13px;color:#71717a">Ce formulaire est personnel : les réponses arrivent directement sur votre dossier chez Adamkom.</p>
<p style="margin:0">Cordialement,<br><strong style="color:${BRAND_COLOR}">L'équipe Adamkom</strong></p>`;

  const fullHtml = wrapInBrandedTemplate(
    bodyHtml,
    supportToken ? `${PUBLISHED_URL}/s/${supportToken}` : undefined,
    branding || undefined,
  );

  const handleSend = async () => {
    if (!email) { toast.error("Ce client n'a pas d'email"); return; }
    setSending(true);
    try {
      const { error } = await supabase.functions.invoke("send-brevo-campaign", {
        body: {
          action: "send_client_email",
          recipientEmail: email,
          recipientName: greeting,
          subject,
          htmlContent: fullHtml,
          trigger: "form_reminder_conversion",
          client_id: clientId,
        },
      });
      if (error) throw error;
      toast.success(`Formulaire envoyé à ${email}`);
      setPreviewOpen(false);
    } catch (e: any) {
      toast.error(e?.message || "Erreur lors de l'envoi");
    } finally {
      setSending(false);
    }
  };

  return (
    <Card className="border-0 shadow-lg shadow-primary/5 ring-1 ring-primary/20">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Target className="w-5 h-5 text-primary" />
          Formulaire page de conversion
          <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px]">TUNING</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!link ? (
          <p className="text-sm text-muted-foreground">Lien indisponible : ce client n'a pas encore de jeton d'accès.</p>
        ) : (
          <>
            <div className="p-3 rounded-lg bg-muted/30 space-y-2">
              <p className="text-xs text-muted-foreground">Lien personnel du client</p>
              <code className="text-[11px] block break-all">{link}</code>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" className="gap-2" onClick={() => setPreviewOpen(true)}>
                <Eye className="w-4 h-4" /> Aperçu du mail
              </Button>
              <Button size="sm" className="gap-2" disabled={!email || sending} onClick={handleSend}>
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Envoyer par email
              </Button>
              <Button size="sm" variant="outline" className="gap-2"
                onClick={() => { navigator.clipboard.writeText(link); toast.success("Lien copié !"); }}>
                <ClipboardCopy className="w-4 h-4" /> Copier le lien
              </Button>
              <Button size="sm" variant="ghost" className="gap-2" asChild>
                <a href={link} target="_blank" rel="noreferrer"><ExternalLink className="w-4 h-4" /> Ouvrir</a>
              </Button>
            </div>
            {!email && <p className="text-xs text-muted-foreground">Ajoutez un email au client pour pouvoir l'envoyer.</p>}
          </>
        )}

        <div className="pt-2 border-t border-border/60 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Réponses reçues</p>
          {!conversionForms.length ? (
            <p className="text-sm text-muted-foreground">Aucune réponse pour le moment.</p>
          ) : (
            conversionForms.map((f: any) => (
              <div key={f.id} className="flex items-center justify-between gap-2 p-3 rounded-lg border border-border bg-muted/20">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{STATUS_LABELS[f.status] || f.status}</p>
                  {f.submitted_at && (
                    <p className="text-[11px] text-muted-foreground">
                      Reçu le {new Date(f.submitted_at).toLocaleString("fr-FR")}
                    </p>
                  )}
                </div>
                {f.status !== "en_attente" && (
                  <Button size="sm" variant="outline" className="gap-2"
                    onClick={async () => {
                      try {
                        toast.loading("Préparation de l'archive…", { id: `cv-${f.id}` });
                        await exportClientFormZip({
                          formType: f.form_type,
                          companyName,
                          formData: f.form_data,
                          submittedAt: f.submitted_at,
                        });
                        toast.success("Archive téléchargée", { id: `cv-${f.id}` });
                      } catch (e: any) {
                        toast.error(e?.message || "Erreur export", { id: `cv-${f.id}` });
                      }
                    }}>
                    <Download className="w-4 h-4" /> Exporter
                  </Button>
                )}
              </div>
            ))
          )}
        </div>
      </CardContent>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{subject}</DialogTitle></DialogHeader>
          <div className="rounded-lg border border-border overflow-hidden bg-white">
            <iframe title="Aperçu du mail" srcDoc={fullHtml} className="w-full h-[55vh] border-0" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>Fermer</Button>
            <Button disabled={!email || sending} onClick={handleSend} className="gap-2">
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Envoyer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
