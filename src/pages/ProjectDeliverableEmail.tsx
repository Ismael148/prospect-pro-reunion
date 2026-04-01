import { ChangeEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useProject, useDeliverables } from "@/hooks/use-projects";
import { supabase } from "@/integrations/supabase/client";
import { triggerN8nWebhook } from "@/lib/n8n-webhook";
import { useEmailBranding } from "@/hooks/use-email-branding";
import { PUBLISHED_URL } from "@/lib/constants";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, BookmarkPlus, CheckCircle2, Clock, FolderOpen, Loader2, Mail, MailX, Paperclip, Save, Send, Trash2, TriangleAlert } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import DOMPurify from "dompurify";

// ── Types ──────────────────────────────────────────────
type UploadedAttachment = { content: string; name: string; type: string; size: number };

// ── Variables dynamiques ───────────────────────────────
const VARIABLES = [
  { code: "{{nom_entreprise}}", label: "Nom entreprise" },
  { code: "{{nom_livrable}}", label: "Nom livrable" },
  { code: "{{lien_livrable}}", label: "Lien livrable" },
  { code: "{{lien_support}}", label: "Lien support" },
] as const;

// ── Helpers ────────────────────────────────────────────
function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

import { BRAND_COLOR, BRAND_DARK, wrapInBrandedTemplate } from "@/lib/email-template";

// ── Templates par type de livrable ────────────────────
interface EmailTemplate { id: string; label: string; icon: string; subject: string; body: string; }

function makeCta(text: string, variable: string) {
  return `<div style="margin:28px 0;text-align:center">
  <a href="${variable}" style="display:inline-block;background:${BRAND_COLOR};color:#ffffff;padding:14px 36px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px">${text}</a>
</div>`;
}

const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: "site", label: "Site Internet", icon: "🌐",
    subject: "Votre site internet est prêt — {{nom_entreprise}}",
    body: `<p style="margin:0 0 20px">Bonjour <strong>{{nom_entreprise}}</strong>,</p>
<p style="margin:0 0 20px">Nous avons le plaisir de vous informer que votre <strong>site internet</strong> est terminé et en ligne ! 🎉</p>
${makeCta("🌐 Voir mon site", "{{lien_livrable}}")}
<p style="margin:0 0 12px"><strong>Ce qui a été réalisé :</strong></p>
<ul style="padding-left:20px;color:#52525b;margin:0 0 24px;line-height:2">
  <li>Design responsive (mobile, tablette, desktop)</li>
  <li>Optimisation SEO et référencement local</li>
  <li>Formulaire de contact avec autorépondeur</li>
  <li>Sécurité (SSL, Wordfence) et RGPD</li>
  <li>Chatbot IA et porte-parole intégrés</li>
</ul>
<p style="margin:0 0 20px">Si vous souhaitez des modifications, utilisez le bouton <strong>"Ouvrir un ticket support"</strong> ci-dessous — c'est le moyen le plus rapide d'être pris en charge.</p>
<p style="margin:0">Cordialement,<br><strong style="color:${BRAND_COLOR}">L'équipe Adamkom</strong></p>`,
  },
  {
    id: "chatbot", label: "Chatbot IA & Porte-Parole", icon: "🤖",
    subject: "Votre chatbot IA est activé — {{nom_entreprise}}",
    body: `<p style="margin:0 0 20px">Bonjour <strong>{{nom_entreprise}}</strong>,</p>
<p style="margin:0 0 20px">Votre <strong>chatbot IA</strong> et votre <strong>porte-parole virtuel</strong> sont désormais opérationnels ! 🤖</p>
${makeCta("🤖 Tester mon chatbot", "{{lien_livrable}}")}
<p style="margin:0 0 12px"><strong>Fonctionnalités activées :</strong></p>
<ul style="padding-left:20px;color:#52525b;margin:0 0 24px;line-height:2">
  <li>Assistant IA entraîné sur vos informations</li>
  <li>Porte-parole vidéo animé en français</li>
  <li>Réponses automatiques 24h/24</li>
  <li>Accès backoffice AICoaches</li>
</ul>
<p style="margin:0">Cordialement,<br><strong style="color:${BRAND_COLOR}">L'équipe Adamkom</strong></p>`,
  },
  {
    id: "nfc", label: "Carte NFC & Affiche", icon: "💳",
    subject: "Votre carte NFC est prête — {{nom_entreprise}}",
    body: `<p style="margin:0 0 20px">Bonjour <strong>{{nom_entreprise}}</strong>,</p>
<p style="margin:0 0 20px">Votre <strong>carte BIZNESS NFC</strong> et votre <strong>affiche connectée</strong> sont prêtes ! 💳</p>
${makeCta("💳 Voir ma page NFC", "{{lien_livrable}}")}
<p style="margin:0 0 12px"><strong>Inclus dans votre pack :</strong></p>
<ul style="padding-left:20px;color:#52525b;margin:0 0 24px;line-height:2">
  <li>Carte NFC programmée et personnalisée</li>
  <li>Page de profil digital complète</li>
  <li>QR Code personnalisé</li>
  <li>Affiche connectée pour votre vitrine</li>
</ul>
<p style="margin:0">Cordialement,<br><strong style="color:${BRAND_COLOR}">L'équipe Adamkom</strong></p>`,
  },
  {
    id: "seo", label: "Fiche Google My Business", icon: "🔍",
    subject: "Votre fiche Google est optimisée — {{nom_entreprise}}",
    body: `<p style="margin:0 0 20px">Bonjour <strong>{{nom_entreprise}}</strong>,</p>
<p style="margin:0 0 20px">Votre <strong>fiche Google My Business</strong> a été créée et optimisée ! 🔍</p>
${makeCta("🔍 Voir ma fiche Google", "{{lien_livrable}}")}
<p style="margin:0 0 12px"><strong>Optimisations réalisées :</strong></p>
<ul style="padding-left:20px;color:#52525b;margin:0 0 24px;line-height:2">
  <li>Catégories et horaires configurés</li>
  <li>Photos professionnelles ajoutées</li>
  <li>Référencement local optimisé</li>
  <li>Posts Google My Business publiés</li>
</ul>
<p style="margin:0">Cordialement,<br><strong style="color:${BRAND_COLOR}">L'équipe Adamkom</strong></p>`,
  },
  {
    id: "reseaux", label: "Réseaux Sociaux", icon: "📱",
    subject: "Vos réseaux sociaux sont lancés — {{nom_entreprise}}",
    body: `<p style="margin:0 0 20px">Bonjour <strong>{{nom_entreprise}}</strong>,</p>
<p style="margin:0 0 20px">Vos <strong>réseaux sociaux</strong> sont configurés et les premières publications sont en ligne ! 📱</p>
${makeCta("📱 Voir mes publications", "{{lien_livrable}}")}
<p style="margin:0 0 12px"><strong>Ce qui a été mis en place :</strong></p>
<ul style="padding-left:20px;color:#52525b;margin:0 0 24px;line-height:2">
  <li>Création et optimisation des comptes</li>
  <li>Designs visuels personnalisés</li>
  <li>Premières publications programmées</li>
  <li>Chatbots intégrés aux réseaux</li>
</ul>
<p style="margin:0">Cordialement,<br><strong style="color:${BRAND_COLOR}">L'équipe Adamkom</strong></p>`,
  },
  {
    id: "formation", label: "Formation & Livraison", icon: "📚",
    subject: "Votre formation est disponible — {{nom_entreprise}}",
    body: `<p style="margin:0 0 20px">Bonjour <strong>{{nom_entreprise}}</strong>,</p>
<p style="margin:0 0 20px">Votre <strong>session de formation</strong> est prête ! 📚</p>
${makeCta("📚 Accéder aux ressources", "{{lien_livrable}}")}
<ul style="padding-left:20px;color:#52525b;margin:0 0 24px;line-height:2">
  <li>Gestion de votre fiche Google</li>
  <li>Utilisation de votre carte NFC</li>
  <li>Publication sur les réseaux sociaux</li>
  <li>Gestion de votre chatbot IA</li>
</ul>
<p style="margin:0">Cordialement,<br><strong style="color:${BRAND_COLOR}">L'équipe Adamkom</strong></p>`,
  },
  {
    id: "annuaire", label: "Annuaire Entreprises974", icon: "📒",
    subject: "Votre page annuaire est en ligne — {{nom_entreprise}}",
    body: `<p style="margin:0 0 20px">Bonjour <strong>{{nom_entreprise}}</strong>,</p>
<p style="margin:0 0 20px">Votre profil sur <strong>l'annuaire Entreprises974</strong> est publié ! 📒</p>
${makeCta("📒 Voir mon profil", "{{lien_livrable}}")}
<p style="margin:0 0 12px"><strong>Contenu publié :</strong></p>
<ul style="padding-left:20px;color:#52525b;margin:0 0 24px;line-height:2">
  <li>Informations et description</li>
  <li>Vidéo de présentation</li>
  <li>FAQ et photos</li>
  <li>Avis clients</li>
</ul>
<p style="margin:0">Cordialement,<br><strong style="color:${BRAND_COLOR}">L'équipe Adamkom</strong></p>`,
  },
  {
    id: "generique", label: "Générique", icon: "📧",
    subject: "Votre livrable est prêt — {{nom_entreprise}}",
    body: `<p style="margin:0 0 20px">Bonjour <strong>{{nom_entreprise}}</strong>,</p>
<p style="margin:0 0 20px">Nous avons le plaisir de vous informer que le livrable <strong>{{nom_livrable}}</strong> est prêt !</p>
${makeCta("📦 Ouvrir {{nom_livrable}}", "{{lien_livrable}}")}
<p style="margin:0 0 20px">N'hésitez pas à utiliser le ticket support ci-dessous pour toute remarque.</p>
<p style="margin:0">Cordialement,<br><strong style="color:${BRAND_COLOR}">L'équipe Adamkom</strong></p>`,
  },
];

function detectTemplateId(name: string): string {
  const l = name.toLowerCase();
  if (l.includes("site") || l.includes("landing") || l.includes("web")) return "site";
  if (l.includes("chatbot") || l.includes("ia") || l.includes("porte-parole")) return "chatbot";
  if (l.includes("nfc") || l.includes("carte") || l.includes("affiche")) return "nfc";
  if (l.includes("google") || l.includes("gmb") || l.includes("fiche")) return "seo";
  if (l.includes("réseau") || l.includes("social") || l.includes("publication")) return "reseaux";
  if (l.includes("formation") || l.includes("livraison")) return "formation";
  if (l.includes("annuaire") || l.includes("974")) return "annuaire";
  return "generique";
}

// ── Hook: email send history ──────────────────────────
function useEmailHistory(deliverableId: string | undefined) {
  return useQuery({
    queryKey: ["email_send_log", deliverableId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_send_log" as any)
        .select("*")
        .eq("deliverable_id", deliverableId!)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!deliverableId,
  });
}

function useSavedTemplates() {
  return useQuery({
    queryKey: ["saved_email_templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saved_email_templates" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });
}

// ── Status badge helper ───────────────────────────────
function StatusBadge({ status }: { status: string }) {
  if (status === "sent") return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 gap-1"><CheckCircle2 className="h-3 w-3" />Envoyé</Badge>;
  if (status === "delivered") return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 gap-1"><CheckCircle2 className="h-3 w-3" />Délivré</Badge>;
  if (status === "opened") return <Badge className="bg-emerald-600/10 text-emerald-700 border-emerald-600/20 gap-1"><CheckCircle2 className="h-3 w-3" />Ouvert</Badge>;
  if (status === "clicked") return <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/20 gap-1"><CheckCircle2 className="h-3 w-3" />Cliqué</Badge>;
  if (status === "bounced") return <Badge className="bg-orange-500/10 text-orange-600 border-orange-500/20 gap-1"><MailX className="h-3 w-3" />Rebond</Badge>;
  if (status === "failed" || status === "dlq") return <Badge variant="destructive" className="gap-1"><MailX className="h-3 w-3" />Échoué</Badge>;
  if (status === "spam") return <Badge variant="destructive" className="gap-1"><MailX className="h-3 w-3" />Spam</Badge>;
  return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" />{status}</Badge>;
}

// ── Main component ────────────────────────────────────
export default function ProjectDeliverableEmail() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id: projectId, deliverableId } = useParams<{ id: string; deliverableId: string }>();
  const { data: project, isLoading: isProjectLoading } = useProject(projectId || "");
  const { data: deliverables, isLoading: isDeliverablesLoading } = useDeliverables(projectId || "");
  const { data: emailHistory } = useEmailHistory(deliverableId);
  const { data: savedTemplates } = useSavedTemplates();
  const { data: emailBranding } = useEmailBranding();
  const deliverable = useMemo(
    () => deliverables?.find((item) => item.id === deliverableId),
    [deliverables, deliverableId],
  );

  const client = (project as any)?.clients;
  const clientName = client?.company_name || "client";
  const clientEmail = client?.email || "";
  const supportToken = client?.support_token || "";
  const supportLink = supportToken ? `${PUBLISHED_URL}/s/${supportToken}` : "";

  const [recipientEmail, setRecipientEmail] = useState(clientEmail);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [uploadedAttachments, setUploadedAttachments] = useState<UploadedAttachment[]>([]);
  const [sending, setSending] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveTemplateName, setSaveTemplateName] = useState("");
  const [savingTemplate, setSavingTemplate] = useState(false);

  useEffect(() => {
    if (!deliverable || initialized) return;
    const detected = detectTemplateId(deliverable.name);
    setSelectedTemplateId(detected);
    const tpl = EMAIL_TEMPLATES.find((t) => t.id === detected) || EMAIL_TEMPLATES[EMAIL_TEMPLATES.length - 1];
    setSubject(tpl.subject);
    setMessage(tpl.body);
    setLinkUrl(deliverable.file_url || "");
    setInitialized(true);
  }, [deliverable, initialized]);

  useEffect(() => {
    if (clientEmail && !recipientEmail) setRecipientEmail(clientEmail);
  }, [clientEmail]);

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const tpl = EMAIL_TEMPLATES.find((t) => t.id === templateId);
    if (tpl) { setSubject(tpl.subject); setMessage(tpl.body); }
  };

  const handleLoadSavedTemplate = (tpl: any) => {
    setSelectedTemplateId("custom_saved");
    setSubject(tpl.subject);
    setMessage(tpl.body);
    toast.success(`Modèle "${tpl.name}" chargé`);
  };

  const handleSaveTemplate = async () => {
    if (!saveTemplateName.trim()) { toast.error("Donnez un nom au modèle"); return; }
    setSavingTemplate(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");
      const { error } = await supabase.from("saved_email_templates" as any).insert({
        name: saveTemplateName.trim(),
        subject,
        body: message,
        category: selectedTemplateId || "custom",
        created_by: user.id,
      } as any);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["saved_email_templates"] });
      toast.success("Modèle sauvegardé !");
      setSaveDialogOpen(false);
      setSaveTemplateName("");
    } catch (e: any) { toast.error(e.message || "Erreur"); }
    finally { setSavingTemplate(false); }
  };

  const handleDeleteSavedTemplate = async (id: string, name: string) => {
    const { error } = await supabase.from("saved_email_templates" as any).delete().eq("id", id);
    if (error) { toast.error("Erreur suppression"); return; }
    queryClient.invalidateQueries({ queryKey: ["saved_email_templates"] });
    toast.success(`"${name}" supprimé`);
  };

  const replaceVariables = useCallback(
    (text: string) => {
      if (!deliverable) return text;
      return text
        .replace(/\{\{nom_entreprise\}\}/g, clientName)
        .replace(/\{\{nom_livrable\}\}/g, deliverable.name)
        .replace(/\{\{lien_livrable\}\}/g, linkUrl.trim())
        .replace(/\{\{lien_support\}\}/g, supportLink);
    },
    [clientName, deliverable, linkUrl, supportLink],
  );

  const resolvedHtmlContent = useMemo(() => {
    if (!deliverable) return "";
    const resolvedBody = replaceVariables(message);
    const sanitizedBody = DOMPurify.sanitize(resolvedBody, { ADD_TAGS: ["style"], ADD_ATTR: ["style"] });
    return wrapInBrandedTemplate(sanitizedBody, replaceVariables(supportLink), emailBranding || undefined);
  }, [deliverable, message, replaceVariables, supportLink, emailBranding]);

  const resolvedSubject = useMemo(() => replaceVariables(subject), [subject, replaceVariables]);

  const handleInsertVariable = (varCode: string) => setMessage((prev) => prev + varCode);

  const handleAttachmentChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    const totalCurrentSize = uploadedAttachments.reduce((sum, a) => sum + a.size, 0);
    const newFiles = Array.from(files);
    const totalNewSize = newFiles.reduce((sum, f) => sum + f.size, 0);
    if (totalCurrentSize + totalNewSize > 15 * 1024 * 1024) { toast.error("La taille totale ne doit pas dépasser 15 Mo"); event.target.value = ""; return; }
    try {
      const newAttachments: UploadedAttachment[] = [];
      for (const file of newFiles) {
        const content = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result;
            if (typeof result !== "string") { reject(new Error("Lecture impossible")); return; }
            resolve(result.split(",")[1] || "");
          };
          reader.onerror = () => reject(reader.error || new Error("Lecture impossible"));
          reader.readAsDataURL(file);
        });
        newAttachments.push({ content, name: file.name, type: file.type || "application/octet-stream", size: file.size });
      }
      setUploadedAttachments((prev) => [...prev, ...newAttachments]);
      toast.success(`${newAttachments.length} fichier(s) ajouté(s)`);
    } catch (e: any) { toast.error(e.message || "Erreur"); }
    finally { event.target.value = ""; }
  };

  const handleSend = async () => {
    if (!deliverable) return;
    if (!recipientEmail.trim()) { toast.error("Ajoutez un email destinataire"); return; }
    if (!subject.trim() || !message.trim()) { toast.error("Complétez l'objet et le message"); return; }
    setSending(true);
    try {
      const attachments = uploadedAttachments.map((a) => ({ content: a.content, name: a.name, type: a.type }));
      const { error } = await supabase.functions.invoke("send-brevo-campaign", {
        body: {
          action: "send_design",
          recipientEmail: recipientEmail.trim(),
          recipientName: clientName,
          clientName,
          designUrl: linkUrl.trim(),
          designName: deliverable.name,
          subject: resolvedSubject,
          htmlContent: resolvedHtmlContent,
          attachment: attachments,
          // For logging
          deliverable_id: deliverable.id,
          project_id: projectId,
          template_name: selectedTemplateId,
        },
      });
      if (error) throw error;

      // Server-side logging handles email_send_log with messageId
      queryClient.invalidateQueries({ queryKey: ["email_send_log", deliverableId] });

      await triggerN8nWebhook("design.sent", {
        project_id: projectId,
        deliverable_id: deliverable.id,
        deliverable_name: deliverable.name,
        client_name: clientName,
        client_email: recipientEmail.trim(),
        deliverable_url: linkUrl.trim() || null,
      });
      toast.success(`Email envoyé pour "${deliverable.name}"`);
      navigate(`/projets/${projectId}`);
    } catch (e: any) {
      // Server-side logging handles failure logging too
      queryClient.invalidateQueries({ queryKey: ["email_send_log", deliverableId] });
      toast.error(e.message || "Erreur lors de l'envoi");
    }
    finally { setSending(false); }
  };

  if (isProjectLoading || isDeliverablesLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }
  if (!project || !deliverable) {
    return (
      <Alert variant="destructive">
        <TriangleAlert className="h-4 w-4" />
        <AlertTitle>Livrable introuvable</AlertTitle>
        <AlertDescription>Impossible d'ouvrir ce composer d'email.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Button variant="ghost" className="mb-2 px-0" asChild>
          <Link to={`/projets/${projectId}`}><ArrowLeft className="mr-2 h-4 w-4" />Retour au projet</Link>
        </Button>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Mail className="h-6 w-6 text-primary" />
          Envoyer — {deliverable.name}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Préparez et personnalisez l'email avant envoi à {clientName}.</p>
      </div>

      {!clientEmail && (
        <Alert><TriangleAlert className="h-4 w-4" /><AlertTitle>Email client manquant</AlertTitle>
          <AlertDescription>Corrigez l'email destinataire ci-dessous.</AlertDescription></Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        {/* LEFT: Composer */}
        <Card className="border-0 shadow-md shadow-primary/5">
          <CardHeader><CardTitle>Composer l'email</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            {/* Template selector */}
            <div className="space-y-2">
              <Label>Modèle de livrable</Label>
              <Select value={selectedTemplateId} onValueChange={handleTemplateChange}>
                <SelectTrigger><SelectValue placeholder="Choisir un modèle" /></SelectTrigger>
                <SelectContent>
                  {EMAIL_TEMPLATES.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      <span className="flex items-center gap-2">{t.icon} {t.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Saved templates */}
            {savedTemplates && savedTemplates.length > 0 && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><FolderOpen className="h-4 w-4" />Mes modèles sauvegardés</Label>
                <div className="grid gap-2 max-h-[160px] overflow-auto pr-1">
                  {savedTemplates.map((tpl: any) => (
                    <div key={tpl.id} className="flex items-center gap-2 rounded-lg border border-border p-2.5 hover:bg-muted/50 transition-colors group">
                      <button type="button" className="flex-1 text-left min-w-0" onClick={() => handleLoadSavedTemplate(tpl)}>
                        <p className="text-sm font-medium truncate">{tpl.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{tpl.subject}</p>
                      </button>
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive" onClick={() => handleDeleteSavedTemplate(tpl.id, tpl.name)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Save current as template */}
            <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => { setSaveTemplateName(""); setSaveDialogOpen(true); }}>
              <BookmarkPlus className="h-4 w-4" />Sauvegarder ce modèle
            </Button>

            <div className="space-y-2">
              <Label htmlFor="recipientEmail">Destinataire</Label>
              <Input id="recipientEmail" value={recipientEmail} onChange={(e) => setRecipientEmail(e.target.value)} placeholder="client@exemple.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subject">Objet</Label>
              <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Objet du mail" />
              <p className="text-xs text-muted-foreground">Aperçu : {resolvedSubject}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="linkUrl">Lien du livrable</Label>
              <Input id="linkUrl" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://..." />
            </div>

            {/* Variables */}
            <div className="space-y-2">
              <Label>Contenu HTML</Label>
              <div className="flex flex-wrap gap-1.5 pb-1">
                <span className="text-xs text-muted-foreground mr-1 self-center">Insérer :</span>
                {VARIABLES.map((v) => (
                  <Badge key={v.code} variant="secondary" className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors text-xs" onClick={() => handleInsertVariable(v.code)}>
                    {v.code}
                  </Badge>
                ))}
              </div>
              <Textarea id="message" value={message} onChange={(e) => setMessage(e.target.value)} className="min-h-[280px] font-mono text-xs" placeholder="<p>Votre contenu HTML ici...</p>" />
              <p className="text-xs text-muted-foreground">Le header (logo Adamkom) et le footer (support + contact) sont ajoutés automatiquement.</p>
            </div>

            {/* Attachments */}
            <div className="space-y-3 rounded-xl border border-border p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">Pièces jointes ({uploadedAttachments.length})</p>
                  <p className="text-xs text-muted-foreground">Max 15 Mo au total • {formatBytes(uploadedAttachments.reduce((s, a) => s + a.size, 0))} utilisés</p>
                </div>
                <Button type="button" variant="outline" asChild>
                  <label htmlFor="attachment-upload" className="cursor-pointer"><Paperclip className="mr-2 h-4 w-4" />Ajouter</label>
                </Button>
              </div>
              <input id="attachment-upload" type="file" className="hidden" onChange={handleAttachmentChange} multiple />
              {uploadedAttachments.length > 0 && (
                <div className="space-y-2">
                  {uploadedAttachments.map((att, idx) => (
                    <div key={`${att.name}-${idx}`} className="flex items-center gap-3 rounded-lg bg-muted/50 p-2.5 text-sm">
                      <Paperclip className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{att.name}</p>
                        <p className="text-xs text-muted-foreground">{formatBytes(att.size)}</p>
                      </div>
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setUploadedAttachments((prev) => prev.filter((_, i) => i !== idx))}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                  <Button type="button" variant="link" className="h-auto p-0 text-xs text-destructive" onClick={() => setUploadedAttachments([])}>Tout retirer</Button>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-3">
              <Button onClick={handleSend} disabled={sending} className="gap-2">
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Envoyer le mail
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate(`/projets/${projectId}`)}>Annuler</Button>
            </div>
          </CardContent>
        </Card>

        {/* RIGHT: Preview + History */}
        <div className="space-y-6">
          {/* Preview */}
          <Card className="border-0 shadow-md shadow-primary/5">
            <CardHeader><CardTitle>Aperçu</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-xl border border-border bg-card p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Objet</p>
                <p className="mt-1 text-sm font-medium">{resolvedSubject || "Aucun objet"}</p>
              </div>
              <div className="overflow-hidden rounded-xl border border-border bg-white">
                <div className="border-b border-border px-4 py-3 text-sm text-muted-foreground">Prévisualisation</div>
                <div className="max-h-[500px] overflow-auto">
                  <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(resolvedHtmlContent, { ADD_TAGS: ["style"], ADD_ATTR: ["style"] }) }} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Email History */}
          <Card className="border-0 shadow-md shadow-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-muted-foreground" />
                Historique d'envoi
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!emailHistory || emailHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Aucun email envoyé pour ce livrable.</p>
              ) : (
                <div className="space-y-3">
                  {emailHistory.map((log: any) => (
                    <div key={log.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{log.recipient_email}</p>
                        <p className="text-xs text-muted-foreground truncate">{log.subject}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(log.created_at).toLocaleDateString("fr-FR", { timeZone: "Indian/Reunion", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                      <StatusBadge status={log.status} />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Save template dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Save className="h-5 w-5 text-primary" />Sauvegarder le modèle</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="tpl-name">Nom du modèle</Label>
              <Input id="tpl-name" value={saveTemplateName} onChange={(e) => setSaveTemplateName(e.target.value)} placeholder="Ex: Email livraison site vitrine" />
            </div>
            <div className="rounded-lg bg-muted/50 p-3 text-xs space-y-1">
              <p><strong>Objet :</strong> {subject}</p>
              <p className="text-muted-foreground">Le contenu HTML actuel sera sauvegardé avec les variables dynamiques intactes.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSaveTemplate} disabled={savingTemplate} className="gap-2">
              {savingTemplate ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Sauvegarder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
