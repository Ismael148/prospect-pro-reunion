import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Mail, Send, Loader2, Ticket, FileText, CreditCard, Globe, Eye, Sparkles, Wand2,
} from "lucide-react";
import EmailTemplateSaver from "@/components/EmailTemplateSaver";
import type { SavedTemplate } from "@/hooks/use-email-templates";

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
    <p style="margin:0 0 16px;font-size:14px;color:#52525b;line-height:1.6">Utilisez notre système de tickets pour toute demande.</p>
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
  condition?: (client: ClientData) => boolean;
}

interface ClientData {
  id: string;
  company_name: string;
  email: string | null;
  support_token: string | null;
  pack_type: string | null;
  manager_name: string | null;
  sector?: string | null;
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
<p style="margin:0 0 20px">Vous pouvez désormais accéder à votre <strong>espace support dédié</strong> pour soumettre vos demandes.</p>
<ul style="padding-left:20px;color:#52525b;margin:0 0 24px;line-height:2">
  <li>Cliquez sur le bouton ci-dessous</li>
  <li>Décrivez votre demande</li>
  <li>Notre équipe vous prend en charge rapidement</li>
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
<p style="margin:0 0 20px">Pour créer votre <strong>carte NFC personnalisée</strong>, nous avons besoin de vos informations.</p>
${makeCta('💳 Remplir le formulaire NFC', nfcFormLink)}
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
<p style="margin:0 0 20px">Pour démarrer la création de votre <strong>site internet</strong>, nous avons besoin de vos informations.</p>
${makeCta('🌐 Remplir le formulaire site', siteFormLink)}
<p style="margin:0">Cordialement,<br><strong style="color:${BRAND_COLOR}">L'équipe Adamkom</strong></p>`,
    },
  ];
}

const AI_PURPOSES = [
  { value: "bienvenue", label: "Email de bienvenue" },
  { value: "suivi_projet", label: "Suivi de projet" },
  { value: "relance_paiement", label: "Relance de paiement" },
  { value: "anniversaire", label: "Anniversaire / fidélité" },
  { value: "promotion", label: "Offre promotionnelle" },
  { value: "newsletter", label: "Newsletter sectorielle" },
  { value: "remerciement", label: "Remerciement" },
  { value: "custom", label: "Personnalisé..." },
];

interface ClientEmailActionsProps {
  client: ClientData;
}

export default function ClientEmailActions({ client }: ClientEmailActionsProps) {
  const [sendingAction, setSendingAction] = useState<string | null>(null);
  const [previewAction, setPreviewAction] = useState<EmailAction | null>(null);
  const [customSubject, setCustomSubject] = useState("");

  // AI Generation state
  const [showAiDialog, setShowAiDialog] = useState(false);
  const [aiPurpose, setAiPurpose] = useState("");
  const [aiCustomInstructions, setAiCustomInstructions] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiResult, setAiResult] = useState<{ subject: string; htmlContent: string } | null>(null);
  const [aiSending, setAiSending] = useState(false);

  if (!client.email) {
    return null;
  }

  const actions = getEmailActions(client).filter(a => !a.condition || a.condition(client));

  const handlePreview = (action: EmailAction) => {
    setCustomSubject(action.subject);
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

  const handleAiGenerate = async () => {
    if (!aiPurpose) { toast.error("Choisissez un objectif"); return; }
    setAiGenerating(true);
    setAiResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("generate-client-email", {
        body: {
          company_name: client.company_name,
          manager_name: client.manager_name,
          sector: client.sector || null,
          pack_type: client.pack_type,
          email: client.email,
          purpose: aiPurpose === "custom" ? aiCustomInstructions : aiPurpose,
          custom_instructions: aiPurpose !== "custom" ? aiCustomInstructions : undefined,
        },
      });
      if (error) throw error;
      setAiResult(data);
      toast.success("Email généré par l'IA !");
    } catch (e: any) {
      toast.error(e.message || "Erreur de génération IA");
    } finally {
      setAiGenerating(false);
    }
  };

  const handleAiSend = async () => {
    if (!aiResult || !client.email) return;
    setAiSending(true);
    try {
      const { error } = await supabase.functions.invoke("send-brevo-campaign", {
        body: {
          action: "send_client_email",
          recipientEmail: client.email,
          recipientName: client.company_name,
          subject: aiResult.subject,
          htmlContent: aiResult.htmlContent,
          trigger: "ai_generated",
          client_id: client.id,
        },
      });
      if (error) throw error;
      toast.success(`Email IA envoyé à ${client.email}`);
      setShowAiDialog(false);
      setAiResult(null);
      setAiPurpose("");
      setAiCustomInstructions("");
    } catch (e: any) {
      toast.error(e.message || "Erreur d'envoi");
    } finally {
      setAiSending(false);
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
          <CardTitle className="text-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mail className="w-5 h-5" /> Actions Email Client
            </div>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 border-primary/20 text-primary hover:bg-primary/5"
              onClick={() => setShowAiDialog(true)}
            >
              <Sparkles className="w-4 h-4" />
              Générer par IA
            </Button>
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
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => handlePreview(action)}>
                    <Eye className="w-3.5 h-3.5 mr-1" /> Aperçu
                  </Button>
                  <Button size="sm" className="flex-1" onClick={() => handleSend(action)} disabled={sendingAction === action.id}>
                    {sendingAction === action.id ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Send className="w-3.5 h-3.5 mr-1" />}
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
              <Input value={customSubject || previewAction?.subject || ""} onChange={(e) => setCustomSubject(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Aperçu de l'email</Label>
              <div className="border border-border rounded-lg overflow-hidden bg-white" dangerouslySetInnerHTML={{ __html: previewHtml }} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewAction(null)}>Annuler</Button>
            <Button onClick={() => previewAction && handleSend(previewAction)} disabled={!!sendingAction}>
              {sendingAction ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
              Envoyer à {client.email}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI Generation Dialog */}
      <Dialog open={showAiDialog} onOpenChange={(open) => { if (!open) { setShowAiDialog(false); setAiResult(null); } }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Générer un email personnalisé par IA
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Client summary */}
            <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-muted/30 text-sm">
              <div><span className="text-muted-foreground">Client :</span> <strong>{client.company_name}</strong></div>
              <div><span className="text-muted-foreground">Gérant :</span> <strong>{client.manager_name || "—"}</strong></div>
              <div><span className="text-muted-foreground">Secteur :</span> <strong>{client.sector || "—"}</strong></div>
              <div><span className="text-muted-foreground">Pack :</span> <Badge variant="outline" className="ml-1">{client.pack_type || "—"}</Badge></div>
            </div>

            {/* Purpose */}
            <div className="space-y-2">
              <Label>Objectif de l'email</Label>
              <Select value={aiPurpose} onValueChange={setAiPurpose}>
                <SelectTrigger><SelectValue placeholder="Choisir un objectif..." /></SelectTrigger>
                <SelectContent>
                  {AI_PURPOSES.map((p) => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Custom instructions */}
            <div className="space-y-2">
              <Label>{aiPurpose === "custom" ? "Décrivez l'email souhaité" : "Instructions supplémentaires (optionnel)"}</Label>
              <Textarea
                value={aiCustomInstructions}
                onChange={(e) => setAiCustomInstructions(e.target.value)}
                placeholder={aiPurpose === "custom" ? "Ex: Email pour informer le client que son site est en ligne avec le lien..." : "Ex: Mentionner la fiche Google, ton amical..."}
                rows={3}
              />
            </div>

            <Button onClick={handleAiGenerate} disabled={aiGenerating || !aiPurpose} className="w-full gap-2">
              {aiGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
              {aiGenerating ? "Génération en cours..." : "Générer l'email"}
            </Button>

            {/* Result preview */}
            {aiResult && (
              <div className="space-y-3 pt-2 border-t">
                <div className="space-y-2">
                  <Label>Objet généré</Label>
                  <Input
                    value={aiResult.subject}
                    onChange={(e) => setAiResult({ ...aiResult, subject: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Aperçu de l'email</Label>
                  <div className="border border-border rounded-lg overflow-hidden bg-white max-h-[400px] overflow-y-auto">
                    <div dangerouslySetInnerHTML={{ __html: aiResult.htmlContent }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {aiResult && (
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={handleAiGenerate} disabled={aiGenerating}>
                <Wand2 className="w-4 h-4 mr-1" /> Régénérer
              </Button>
              <Button onClick={handleAiSend} disabled={aiSending} className="gap-2">
                {aiSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Envoyer à {client.email}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
