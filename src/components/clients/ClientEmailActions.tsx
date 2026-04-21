import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEmailBranding } from "@/hooks/use-email-branding";
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
  Mail, Send, Loader2, Ticket, FileText, CreditCard, Globe, Eye, Sparkles, Wand2, Star,
} from "lucide-react";
import EmailTemplateSaver from "@/components/EmailTemplateSaver";
import type { SavedTemplate } from "@/hooks/use-email-templates";
import { BRAND_COLOR, wrapInBrandedTemplate, makeCta } from "@/lib/email-template";

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

// makeCta imported from @/lib/email-template

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
  const { data: branding } = useEmailBranding();

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
      const htmlContent = wrapInBrandedTemplate(bodyHtml, supportLink, branding || undefined);
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
        client.support_token ? `${PUBLISHED_URL}/s/${client.support_token}` : undefined,
        branding || undefined
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
            <div className="flex items-center justify-between">
              <Label>Objet</Label>
              <EmailTemplateSaver
                subject={customSubject || previewAction?.subject || ""}
                body={previewAction?.bodyFn(client) || ""}
                category="client_email"
                onLoad={(tpl: SavedTemplate) => {
                  setCustomSubject(tpl.subject);
                  // For loaded templates, create a custom action
                  setPreviewAction({
                    ...previewAction!,
                    subject: tpl.subject,
                    bodyFn: () => tpl.body,
                    label: tpl.name,
                  });
                }}
              />
            </div>
            <Input value={customSubject || previewAction?.subject || ""} onChange={(e) => setCustomSubject(e.target.value)} />
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
              <div className="flex items-center justify-between">
                  <Label>Objet généré</Label>
                  <EmailTemplateSaver
                    subject={aiResult.subject}
                    body={aiResult.htmlContent}
                    category="ai_generated"
                    onLoad={(tpl: SavedTemplate) => setAiResult({ subject: tpl.subject, htmlContent: tpl.body })}
                  />
                </div>
                <div className="space-y-2">
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
