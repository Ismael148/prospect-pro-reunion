import { PUBLISHED_URL } from "@/lib/constants";
import { EmailSupportOption, useEmailSupport } from "@/components/EmailSupportOption";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Video, Eye, Send, ClipboardCopy, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useEmailBranding } from "@/hooks/use-email-branding";
import { supabase } from "@/integrations/supabase/client";
import { buildGmbVideoEmail, gmbVideoGuideUrl } from "@/lib/gmb-video-guide";
import { toast } from "sonner";

interface Props { clientId: string; companyName: string; managerName?: string | null; email?: string | null; supportToken?: string | null }

export default function GmbVideoGuideSection({ clientId, companyName, managerName, email, supportToken }: Props) {
  const { data: branding } = useEmailBranding();
  const queryClient = useQueryClient();
  const { includeSupport, setIncludeSupport, applySupport } = useEmailSupport();
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const builtMail = buildGmbVideoEmail(companyName, managerName, branding || undefined);
  const mail = { ...builtMail, html: applySupport(builtMail.html, supportToken ? `${PUBLISHED_URL}/s/${supportToken}` : undefined, branding || undefined) };
  const link = gmbVideoGuideUrl(companyName);
  const send = async () => {
    if (!email || sending) return;
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-brevo-campaign", { body: {
        action: "send_client_email", recipientEmail: email, recipientName: managerName || companyName,
        subject: mail.subject, htmlContent: mail.html, trigger: "tuto_gmb_video", client_id: clientId,
      } });
      if (error) {
        const response = "context" in error ? error.context : null;
        const detail = response instanceof Response ? await response.json().catch(() => null) : null;
        throw new Error(detail?.error || error.message);
      }
      if (!data?.success) throw new Error(data?.error || "L’envoi n’a pas été confirmé.");
      await queryClient.invalidateQueries({ queryKey: ["client-email-history", clientId] });
      toast.success("Tutoriel envoyé au client");
      setOpen(false);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Impossible d’envoyer le tutoriel."); }
    finally { setSending(false); }
  };
  return <Card>
    <CardHeader><CardTitle className="flex items-start gap-2 text-lg"><Video className="mt-0.5 h-5 w-5 shrink-0 text-primary" /> Tutoriel · Validation Google par vidéo</CardTitle></CardHeader>
    <CardContent className="space-y-4">
      <p className="text-sm leading-6 text-muted-foreground">Guide client pas à pas, critères Google et vidéos officielles de démonstration.</p>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}><Eye className="mr-2 h-4 w-4" /> Aperçu du mail</Button>
        <Button size="sm" disabled={!email || sending} onClick={() => setOpen(true)}><Send className="mr-2 h-4 w-4" /> Envoyer par email</Button>
        <Button size="sm" variant="outline" onClick={async () => { try { await navigator.clipboard.writeText(link); toast.success("Lien copié"); } catch { toast.error("La copie du lien a échoué."); } }}><ClipboardCopy className="mr-2 h-4 w-4" /> Copier le lien</Button>
        <Button size="sm" variant="ghost" asChild><a href={link} target="_blank" rel="noopener noreferrer"><ExternalLink className="mr-2 h-4 w-4" /> Ouvrir le tutoriel</a></Button>
      </div>
      {!email && <p className="text-sm text-muted-foreground">Ajoutez une adresse email sur la fiche pour envoyer le tutoriel.</p>}
      <Dialog open={open} onOpenChange={(value) => { if (!sending) setOpen(value); }}><DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader><DialogTitle>Aperçu · Tutoriel validation Google</DialogTitle></DialogHeader>
        <p className="break-words text-sm">À : {email || "Adresse email manquante"}</p><p className="break-words text-sm font-medium">{mail.subject}</p>
        <EmailSupportOption checked={includeSupport} onChange={setIncludeSupport} />
        <iframe title="Aperçu du mail de validation vidéo Google" srcDoc={mail.html} sandbox="" className="h-[50vh] w-full rounded-lg border border-border" />
        <DialogFooter><Button variant="outline" disabled={sending} onClick={() => setOpen(false)}>Fermer</Button><Button disabled={!email || sending} onClick={send}>{sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />} Confirmer l’envoi</Button></DialogFooter>
      </DialogContent></Dialog>
    </CardContent>
  </Card>;
}