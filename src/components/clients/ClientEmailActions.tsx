import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { triggerN8nWebhook } from "@/lib/n8n-webhook";
import { PUBLISHED_URL } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Mail, Send, Loader2, Ticket, FileText, CreditCard, Globe, Eye,
} from "lucide-react";

const BRAND_COLOR = "#ff006e";

function wrapInBrandedTemplate(bodyHtml: string, supportLink?: string) {
  return `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,0.06)">
  <div style="padding:40px 40px 32px;text-align:center;background:#ffffff">
    <img src="https://ai.adamkom.com/lovable-uploads/d6c24753-6c76-49a3-8a6d-fe0dd4a898be.png" alt="Adamkom" style="height:72px;width:auto;display:block;margin:0 auto 12px" />
    <p style="margin:0;font-size:13px;color:#71717a;letter-spacing:0.5px">La performance digitale pour votre entreprise</p>
  </div>
  <div style="height:3px;background:linear-gradient(90deg,${BRAND_COLOR},#ff5c8a,${BRAND_COLOR})"></div>
  <div style="padding:40px 40px 32px;line-height:1.8;font-size:15px;color:#27272a">
    ${bodyHtml}
  </div>
  ${supportLink ? `<div style="margin:0 40px 32px;padding:24px;background:#fff0f6;border-radius:12px;border:1px solid #ffe0ec">
    <p style="margin:0 0 8px;font-size:15px;font-weight:700;color:#b8004a">📋 Besoin d'aide ?</p>
    <p style="margin:0 0 16px;font-size:14px;color:#52525b;line-height:1.6">Utilisez notre système de tickets pour toute demande — c'est le moyen le plus rapide d'être pris en charge.</p>
    <div style="text-align:center">
      <a href="${supportLink}" style="display:inline-block;background:${BRAND_COLOR};color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;box-shadow:0 4px 12px rgba(255,0,110,0.3)">📋 Ouvrir un ticket support</a>
    </div>
  </div>` : ''}
  <div style="padding:28px 40px;border-top:1px solid #f0f0f0;background:#fafafa;text-align:center">
    <p style="margin:0 0 8px;font-size:14px;color:#b8004a"><strong>Adamkom</strong> — La performance digitale</p>
    <p style="margin:0 0 4px;font-size:13px;color:#71717a">📞 <a href="tel:0262666876" style="color:${BRAND_COLOR};text-decoration:none;font-weight:600">0262 66 68 76</a></p>
    <p style="margin:12px 0 0;font-size:11px;color:#a1a1aa">© ${new Date().getFullYear()} Adamkom by JJP — La Réunion 🇷🇪</p>
  </div>
</div>`;
}

interface EmailAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  subject: string;
  bodyFn: (client: ClientData) => string;
  trigger: string;
  condition?: (client: ClientData, forms?: any[]) => boolean;
}

interface ClientData {
  id: string;
  company_name: string;
  email: string | null;
  support_token: string | null;
  pack_type: string | null;
  manager_name: string | null;
}

function makeCta(text: string, url: string) {
  return `<div style="margin:28px 0;text-align:center">
  <a href="${url}" style="display:inline-block;background:${BRAND_COLOR};color:#ffffff;padding:14px 36px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px">${text}</a>
</div>`;
}

function getEmailActions(client: ClientData): EmailAction[] {
  const supportLink = client.support_token ? `${PUBLISHED_URL}/s/${client.support_token}` : '';
  const nfcFormLink = client.support_token ? `${PUBLISHED_URL}/f/${client.support_token}/nfc` : '';
  const siteFormLink = client.support_token ? `${PUBLISHED_URL}/f/${client.support_token}/site` : '';

  return [
    {
      id: 'support_link',
      label: 'Envoyer lien support',
      icon: <Ticket className="w-4 h-4" />,
      subject: `Votre espace support — ${client.company_name}`,
      trigger: 'support_link',
      condition: (c) => !!c.support_token,
      bodyFn: () => `<p style="margin:0 0 20px">Bonjour <strong>${client.company_name}</strong>,</p>
<p style="margin:0 0 20px">Vous pouvez désormais accéder à votre <strong>espace support dédié</strong> pour soumettre vos demandes de modification, signaler un problème ou poser une question.</p>
<p style="margin:0 0 12px"><strong>Comment ça marche ?</strong></p>
<ul style="padding-left:20px;color:#52525b;margin:0 0 24px;line-height:2">
  <li>Cliquez sur le bouton ci-dessous</li>
  <li>Décrivez votre demande (ajoutez des captures d'écran si nécessaire)</li>
  <li>Notre équipe technique vous prend en charge rapidement</li>
</ul>
${makeCta('📋 Accéder à mon espace support', supportLink)}
<p style="margin:0">Cordialement,<br><strong style="color:${BRAND_COLOR}">L'équipe Adamkom</strong></p>`,
    },
    {
      id: 'form_nfc',
      label: 'Relance formulaire NFC',
      icon: <CreditCard className="w-4 h-4" />,
      subject: `Complétez votre formulaire carte NFC — ${client.company_name}`,
      trigger: 'form_reminder_nfc',
      condition: (c) => !!c.support_token,
      bodyFn: () => `<p style="margin:0 0 20px">Bonjour <strong>${client.company_name}</strong>,</p>
<p style="margin:0 0 20px">Pour que nous puissions créer votre <strong>carte NFC personnalisée</strong>, nous avons besoin de vos informations.</p>
<p style="margin:0 0 12px"><strong>Remplissez le formulaire ci-dessous avec :</strong></p>
<ul style="padding-left:20px;color:#52525b;margin:0 0 24px;line-height:2">
  <li>Vos coordonnées complètes</li>
  <li>Votre logo en haute résolution</li>
  <li>Vos liens réseaux sociaux</li>
  <li>Toute information spécifique à afficher</li>
</ul>
${makeCta('💳 Remplir le formulaire NFC', nfcFormLink)}
<p style="margin:0 0 20px">⏱ <strong>Durée estimée : 5 minutes.</strong> Plus vite nous recevrons vos informations, plus vite votre carte sera prête !</p>
<p style="margin:0">Cordialement,<br><strong style="color:${BRAND_COLOR}">L'équipe Adamkom</strong></p>`,
    },
    {
      id: 'form_site',
      label: 'Relance formulaire site',
      icon: <Globe className="w-4 h-4" />,
      subject: `Complétez votre formulaire site internet — ${client.company_name}`,
      trigger: 'form_reminder_site',
      condition: (c) => !!c.support_token && c.pack_type !== 'star_bizness_nfc',
      bodyFn: () => `<p style="margin:0 0 20px">Bonjour <strong>${client.company_name}</strong>,</p>
<p style="margin:0 0 20px">Pour que nous puissions démarrer la création de votre <strong>site internet</strong>, nous avons besoin de vos informations.</p>
<p style="margin:0 0 12px"><strong>Merci de renseigner :</strong></p>
<ul style="padding-left:20px;color:#52525b;margin:0 0 24px;line-height:2">
  <li>Description de votre activité et services</li>
  <li>Vos coordonnées et horaires</li>
  <li>Votre logo et photos professionnelles</li>
  <li>Vos comptes réseaux sociaux</li>
</ul>
${makeCta('🌐 Remplir le formulaire site', siteFormLink)}
<p style="margin:0 0 20px">⏱ <strong>Durée estimée : 10 minutes.</strong> Ces informations sont essentielles pour commencer votre projet dans les meilleurs délais.</p>
<p style="margin:0">Cordialement,<br><strong style="color:${BRAND_COLOR}">L'équipe Adamkom</strong></p>`,
    },
  ];
}

interface ClientEmailActionsProps {
  client: ClientData;
}

export default function ClientEmailActions({ client }: ClientEmailActionsProps) {
  const [sendingAction, setSendingAction] = useState<string | null>(null);
  const [previewAction, setPreviewAction] = useState<EmailAction | null>(null);
  const [customSubject, setCustomSubject] = useState("");
  const [customBody, setCustomBody] = useState("");

  if (!client.email) {
    return null;
  }

  const actions = getEmailActions(client).filter(a => !a.condition || a.condition(client));

  const handlePreview = (action: EmailAction) => {
    setCustomSubject(action.subject);
    setCustomBody(""); // Will use default
    setPreviewAction(action);
  };

  const handleSend = async (action: EmailAction) => {
    if (!client.email) { toast.error("Pas d'email client"); return; }
    
    setSendingAction(action.id);
    try {
      const supportLink = client.support_token ? `${PUBLISHED_URL}/s/${client.support_token}` : undefined;
      const bodyHtml = action.bodyFn(client);
      const htmlContent = wrapInBrandedTemplate(bodyHtml, supportLink);
      const subject = customSubject || action.subject;

      const { error } = await supabase.functions.invoke("send-brevo-campaign", {
        body: {
          action: "send_client_email",
          recipientEmail: client.email,
          recipientName: client.company_name,
          subject,
          htmlContent,
          trigger: action.trigger,
          client_id: client.id,
        },
      });

      if (error) throw error;
      toast.success(`Email "${action.label}" envoyé à ${client.email}`);
      setPreviewAction(null);
    } catch (e: any) {
      toast.error(e.message || "Erreur lors de l'envoi");
    } finally {
      setSendingAction(null);
    }
  };

  const previewHtml = previewAction
    ? wrapInBrandedTemplate(
        previewAction.bodyFn(client),
        client.support_token ? `${PUBLISHED_URL}/s/${client.support_token}` : undefined
      )
    : "";

  return (
    <>
      <Card className="border-0 shadow-md shadow-primary/5">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Mail className="w-5 h-5" /> Actions Email Client
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {actions.map((action) => (
              <div key={action.id} className="flex flex-col gap-2 p-3 rounded-lg bg-muted/30">
                <div className="flex items-center gap-2">
                  {action.icon}
                  <span className="text-sm font-medium">{action.label}</span>
                </div>
                <div className="flex gap-2 mt-auto">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => handlePreview(action)}
                  >
                    <Eye className="w-3.5 h-3.5 mr-1" /> Aperçu
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() => handleSend(action)}
                    disabled={sendingAction === action.id}
                  >
                    {sendingAction === action.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                    ) : (
                      <Send className="w-3.5 h-3.5 mr-1" />
                    )}
                    Envoyer
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            📧 Destinataire : <strong>{client.email}</strong>
          </p>
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={!!previewAction} onOpenChange={(open) => !open && setPreviewAction(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {previewAction?.icon}
              {previewAction?.label}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Objet</Label>
              <Input
                value={customSubject || previewAction?.subject || ""}
                onChange={(e) => setCustomSubject(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Aperçu de l'email</Label>
              <div
                className="border border-border rounded-lg overflow-hidden bg-white"
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewAction(null)}>Annuler</Button>
            <Button
              onClick={() => previewAction && handleSend(previewAction)}
              disabled={!!sendingAction}
            >
              {sendingAction ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
              Envoyer à {client.email}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
