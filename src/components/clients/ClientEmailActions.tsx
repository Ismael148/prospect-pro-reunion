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
  Mail, Send, Loader2, Ticket, FileText, CreditCard, Globe, Eye, Sparkles, Wand2, Star, Facebook, MapPin,
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
  ndi?: string | null;
}

// makeCta imported from @/lib/email-template

function getEmailActions(client: ClientData): EmailAction[] {
  const supportLink = client.support_token ? `${PUBLISHED_URL}/s/${client.support_token}` : '';
  const nfcFormLink = client.support_token ? `${PUBLISHED_URL}/f/${client.support_token}/nfc` : '';
  const siteFormLink = client.support_token ? `${PUBLISHED_URL}/f/${client.support_token}/site` : '';

  const greeting = client.manager_name?.trim() || client.company_name;

  return [
    {
      id: 'support_link',
      label: 'Envoyer lien support',
      icon: <Ticket className="w-4 h-4" />,
      subject: `Votre espace support — ${client.company_name}`,
      trigger: 'support_link',
      condition: (c) => !!c.support_token,
      bodyFn: () => `<p style="margin:0 0 20px">Bonjour <strong>${greeting}</strong>,</p>
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
      bodyFn: () => `<p style="margin:0 0 20px">Bonjour <strong>${greeting}</strong>,</p>
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
      bodyFn: () => `<p style="margin:0 0 20px">Bonjour <strong>${greeting}</strong>,</p>
<p style="margin:0 0 20px">Pour démarrer la création de votre <strong>site internet</strong>, nous avons besoin de vos informations.</p>
${makeCta('🌐 Remplir le formulaire site', siteFormLink)}
<p style="margin:0">Cordialement,<br><strong style="color:${BRAND_COLOR}">L'équipe Adamkom</strong></p>`,
    },
      label: 'Demande avis Google',
      icon: <Star className="w-4 h-4" />,
      subject: `Votre avis compte pour nous — ${client.company_name}`,
      trigger: 'google_review',
      bodyFn: () => {
        const greeting = client.manager_name?.trim() ? client.manager_name : client.company_name;
        const reviewLink = 'https://g.page/r/CR27lcN24038EBM/review';
        return `<p style="margin:0 0 20px">Bonjour <strong>${greeting}</strong>,</p>
<p style="margin:0 0 20px">Toute l'équipe <strong>Adamkom</strong> espère que vous êtes pleinement satisfait${client.manager_name ? '(e)' : ''} de nos services et de l'accompagnement que nous vous apportons au quotidien.</p>
<p style="margin:0 0 20px">Votre satisfaction est notre priorité, et votre retour est extrêmement précieux pour nous. Si vous avez apprécié notre travail, nous serions très reconnaissants que vous preniez quelques instants pour <strong>nous laisser un avis sur notre fiche Google</strong>.</p>
<p style="margin:0 0 20px">Vos retours nous aident à continuer de progresser et permettent à d'autres entrepreneurs de la Réunion de découvrir notre savoir-faire. 🙏</p>
${makeCta('⭐ Laisser un avis Google', reviewLink)}
<p style="margin:0 0 20px;font-size:13px;color:#71717a;text-align:center">Ou copiez ce lien dans votre navigateur :<br><a href="${reviewLink}" style="color:${BRAND_COLOR};word-break:break-all">${reviewLink}</a></p>
<p style="margin:0">Avec toute notre gratitude,<br><strong style="color:${BRAND_COLOR}">L'équipe Adamkom</strong></p>`;
      },
    },
    {
      id: 'tuto_facebook',
      label: 'Tuto Facebook (BM + Page)',
      icon: <Facebook className="w-4 h-4" />,
      subject: `Accès à votre page Facebook — ${client.company_name}`,
      trigger: 'tuto_facebook',
      bodyFn: () => {
        const greeting = client.manager_name?.trim() || client.company_name;
        const tutoLink = client.ndi
          ? `${PUBLISHED_URL}/tuto/facebook?client=${client.ndi}`
          : `${PUBLISHED_URL}/tuto/facebook`;
        return `<p style="margin:0 0 20px">Bonjour <strong>${greeting}</strong>,</p>
<p style="margin:0 0 20px">Pour pouvoir gérer efficacement vos <strong>réseaux sociaux Facebook & Instagram</strong>, nous avons besoin de quelques accès techniques que vous seul(e) pouvez nous fournir.</p>
<p style="margin:0 0 20px">Rassurez-vous : <strong>nous ne vous demandons aucun mot de passe</strong>. Tout passe par le <em>Business Manager Facebook</em>, l'outil officiel qui permet de déléguer la gestion d'une page à une agence — en gardant 100% du contrôle de votre côté.</p>
<p style="margin:0 0 20px">Pour vous simplifier la vie, nous avons préparé un <strong>tutoriel ultra-simple</strong> (5 à 10 minutes) qui vous guide pas à pas, avec des captures d'écran et des explications claires. Il fonctionne aussi si vous n'avez pas encore de page Facebook : on vous montre comment la créer.</p>
${makeCta('📘 Suivre le tutoriel Facebook', tutoLink)}
<p style="margin:0 0 20px;font-size:13px;color:#71717a">À la fin du tutoriel, un petit formulaire vous permet de nous transmettre les informations clés (ID du Business Manager, email associé). Nous prenons ensuite le relais sous 24h ouvrées.</p>
<p style="margin:0 0 20px">Si vous avez la moindre question pendant le processus, n'hésitez pas à nous écrire.</p>
<p style="margin:0">Très cordialement,<br><strong style="color:${BRAND_COLOR}">L'équipe Adamkom</strong></p>`;
      },
    },
    {
      id: 'tuto_gmb',
      label: 'Tuto Google My Business',
      icon: <MapPin className="w-4 h-4" />,
      subject: `Accès à votre fiche Google — ${client.company_name}`,
      trigger: 'tuto_gmb',
      bodyFn: () => {
        const greeting = client.manager_name?.trim() || client.company_name;
        const tutoLink = client.ndi
          ? `${PUBLISHED_URL}/tuto/gmb?client=${client.ndi}`
          : `${PUBLISHED_URL}/tuto/gmb`;
        return `<p style="margin:0 0 20px">Bonjour <strong>${greeting}</strong>,</p>
<p style="margin:0 0 20px">Pour optimiser votre <strong>visibilité locale sur Google</strong> (Google Maps + Recherche Google), nous avons besoin d'un accès <strong>Gestionnaire</strong> sur votre fiche Google My Business.</p>
<p style="margin:0 0 20px">C'est l'accès le plus respectueux qui existe : <strong>vous restez Propriétaire</strong>, vous gardez vos identifiants Google secrets, et vous pouvez retirer notre accès à tout moment d'un simple clic.</p>
<p style="margin:0 0 20px">Pour vous accompagner, nous avons préparé un <strong>tutoriel pas-à-pas</strong> (2 minutes si vous avez déjà une fiche, 8 minutes si nous devons en créer une). Il vous explique exactement quoi faire, avec des visuels et l'email Adamkom à ajouter.</p>
${makeCta('📍 Suivre le tutoriel Google', tutoLink)}
<p style="margin:0 0 20px;font-size:13px;color:#71717a">À la fin, un court formulaire confirme que tout est en place et nous transmet les infos pour qu'on puisse accepter l'invitation rapidement (sous 24h ouvrées).</p>
<p style="margin:0 0 20px">Notre équipe se tient à votre disposition si vous rencontrez le moindre obstacle pendant la procédure.</p>
<p style="margin:0">Très cordialement,<br><strong style="color:${BRAND_COLOR}">L'équipe Adamkom</strong></p>`;
      },
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

      // Tracker l'envoi du tuto pour le système de relance auto (5j)
      // Une seule invitation active par (client, kind) → upsert manuel.
      if (action.trigger === "tuto_facebook" || action.trigger === "tuto_gmb") {
        const kind = action.trigger === "tuto_facebook" ? "facebook" : "gmb";
        try {
          const { data: existing } = await (supabase as any)
            .from("onboarding_invitations")
            .select("id")
            .eq("kind", kind)
            .eq("contact_email", client.email)
            .is("completed_at", null)
            .maybeSingle();
          if (existing?.id) {
            // Reset la fenêtre de relance (renvoi manuel = nouveau point de départ)
            await (supabase as any)
              .from("onboarding_invitations")
              .update({ sent_at: new Date().toISOString(), reminder_count: 0, last_reminder_at: null })
              .eq("id", existing.id);
          } else {
            await (supabase as any).from("onboarding_invitations").insert({
              kind,
              client_id: client.id,
              client_ndi: client.ndi || null,
              contact_email: client.email,
              company_name: client.company_name,
            });
          }
        } catch (invErr) {
          console.warn("onboarding_invitations tracking failed", invErr);
        }
      }

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
