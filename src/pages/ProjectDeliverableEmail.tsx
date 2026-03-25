import { ChangeEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useProject, useDeliverables } from "@/hooks/use-projects";
import { supabase } from "@/integrations/supabase/client";
import { triggerN8nWebhook } from "@/lib/n8n-webhook";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ArrowLeft, Code, FileText, Loader2, Mail, Paperclip, Send, TriangleAlert } from "lucide-react";
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

// ── Email wrapper (header + footer with support) ──────
function wrapInBrandedTemplate(bodyHtml: string, supportLink: string) {
  return `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:640px;margin:0 auto;background:#ffffff;color:#1a1a2e;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
  <!-- HEADER -->
  <div style="background:linear-gradient(135deg,#0f2847 0%,#1E3A5F 50%,#2a5298 100%);padding:40px 32px;text-align:center;position:relative">
    <div style="position:absolute;top:0;left:0;right:0;bottom:0;background:url('data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><defs><pattern id=%22g%22 width=%2220%22 height=%2220%22 patternUnits=%22userSpaceOnUse%22><circle cx=%2210%22 cy=%2210%22 r=%221%22 fill=%22rgba(218,165,32,0.08)%22/></pattern></defs><rect fill=%22url(%23g)%22 width=%22100%22 height=%22100%22/></svg>');opacity:1"></div>
    <div style="position:relative;z-index:1">
      <div style="display:inline-block;background:rgba(255,255,255,0.1);border:1px solid rgba(218,165,32,0.3);border-radius:16px;padding:16px 40px;backdrop-filter:blur(10px)">
        <h1 style="color:#ffffff;margin:0;font-size:32px;font-weight:800;letter-spacing:2px;text-shadow:0 2px 8px rgba(0,0,0,0.3)">ADAMKOM</h1>
        <div style="display:flex;align-items:center;justify-content:center;gap:8px;margin-top:6px">
          <div style="height:1px;width:32px;background:linear-gradient(90deg,transparent,#DAA520)"></div>
          <span style="color:#DAA520;font-size:14px;font-weight:600;letter-spacing:3px">by JJP</span>
          <div style="height:1px;width:32px;background:linear-gradient(90deg,#DAA520,transparent)"></div>
        </div>
      </div>
      <p style="color:rgba(255,255,255,0.7);margin:16px 0 0;font-size:12px;letter-spacing:4px;text-transform:uppercase;font-weight:500">Solutions digitales pour entreprises</p>
    </div>
  </div>
  <!-- ACCENT BAR -->
  <div style="height:4px;background:linear-gradient(90deg,#DAA520,#f4c542,#DAA520)"></div>
  <!-- BODY -->
  <div style="padding:36px 32px;line-height:1.8;font-size:15px;color:#334155">
    ${bodyHtml}
  </div>
  <!-- FOOTER -->
  <div style="background:linear-gradient(180deg,#f8fafc,#f1f5f9);padding:28px 32px;border-top:1px solid #e2e8f0">
    <table style="width:100%;border-spacing:0"><tr>
      <td style="font-size:13px;color:#475569;vertical-align:top;padding-right:16px">
        <div style="display:inline-block;background:#1E3A5F;color:#DAA520;font-weight:800;font-size:11px;padding:4px 10px;border-radius:6px;letter-spacing:1px;margin-bottom:10px">ADAMKOM</div><br>
        <span style="font-size:14px">📞</span> <a href="tel:0262666876" style="color:#1E3A5F;text-decoration:none;font-weight:600;font-size:14px">0262 66 68 76</a><br>
        <span style="font-size:14px">✉️</span> <a href="mailto:contact@adamkom.com" style="color:#1E3A5F;text-decoration:none;font-size:13px">contact@adamkom.com</a>
      </td>
      <td style="text-align:right;vertical-align:middle">
        ${supportLink ? `<a href="${supportLink}" style="display:inline-block;background:linear-gradient(135deg,#1E3A5F,#2a5298);color:#ffffff;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:700;font-size:13px;box-shadow:0 4px 12px rgba(30,58,95,0.25);letter-spacing:0.5px">📋 Ouvrir un ticket</a>` : ""}
      </td>
    </tr></table>
    <div style="margin-top:20px;padding-top:16px;border-top:1px solid #e2e8f0;text-align:center">
      <p style="margin:0;font-size:11px;color:#94a3b8">© ${new Date().getFullYear()} AdamKom by JJP — Tous droits réservés</p>
      <p style="margin:4px 0 0;font-size:10px;color:#cbd5e1">La Réunion 🇷🇪 • Solutions digitales sur mesure</p>
    </div>
  </div>
</div>`;

}

// ── Templates par type de livrable ────────────────────
interface EmailTemplate {
  id: string;
  label: string;
  icon: string;
  subject: string;
  body: string;
}

const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: "site",
    label: "Site Internet",
    icon: "🌐",
    subject: "Votre site internet est prêt — {{nom_entreprise}}",
    body: `<p style="margin-top:0">Bonjour <strong>{{nom_entreprise}}</strong>,</p>
<p>Nous avons le plaisir de vous informer que votre <strong>site internet</strong> est terminé et en ligne ! 🎉</p>
<p>Vous pouvez le découvrir dès maintenant :</p>
<div style="margin:24px 0;text-align:center">
  <a href="{{lien_livrable}}" style="display:inline-block;background:linear-gradient(135deg,#1E3A5F,#2a5298);color:#ffffff;padding:14px 32px;border-radius:999px;text-decoration:none;font-weight:700;font-size:16px;box-shadow:0 4px 15px rgba(30,58,95,0.3)">🌐 Voir mon site</a>
</div>
<p><strong>Ce qui a été réalisé :</strong></p>
<ul style="padding-left:20px;color:#475569">
  <li>Design responsive (mobile, tablette, desktop)</li>
  <li>Optimisation SEO et référencement local</li>
  <li>Formulaire de contact avec autorépondeur</li>
  <li>Sécurité (SSL, Wordfence) et RGPD</li>
  <li>Chatbot IA et porte-parole intégrés</li>
</ul>
<p>Si vous souhaitez des modifications, n'hésitez pas à <a href="{{lien_support}}" style="color:#1E3A5F;font-weight:600">ouvrir un ticket support</a>. Notre équipe technique vous répondra rapidement.</p>
<p>Cordialement,<br><strong>L'équipe AdamKom</strong></p>`,
  },
  {
    id: "chatbot",
    label: "Chatbot IA & Porte-Parole",
    icon: "🤖",
    subject: "Votre chatbot IA est activé — {{nom_entreprise}}",
    body: `<p style="margin-top:0">Bonjour <strong>{{nom_entreprise}}</strong>,</p>
<p>Votre <strong>chatbot IA</strong> et votre <strong>porte-parole virtuel</strong> sont désormais opérationnels sur votre site ! 🤖</p>
<div style="margin:24px 0;text-align:center">
  <a href="{{lien_livrable}}" style="display:inline-block;background:linear-gradient(135deg,#1E3A5F,#2a5298);color:#ffffff;padding:14px 32px;border-radius:999px;text-decoration:none;font-weight:700;font-size:16px;box-shadow:0 4px 15px rgba(30,58,95,0.3)">🤖 Tester mon chatbot</a>
</div>
<p><strong>Fonctionnalités activées :</strong></p>
<ul style="padding-left:20px;color:#475569">
  <li>Assistant IA entraîné sur les informations de votre entreprise</li>
  <li>Porte-parole vidéo animé en français</li>
  <li>Réponses automatiques 24h/24 pour vos visiteurs</li>
  <li>Accès à votre backoffice AICoaches</li>
</ul>
<p>Pour toute question ou ajustement, <a href="{{lien_support}}" style="color:#1E3A5F;font-weight:600">contactez notre support</a>.</p>
<p>Cordialement,<br><strong>L'équipe AdamKom</strong></p>`,
  },
  {
    id: "nfc",
    label: "Carte NFC & Affiche",
    icon: "💳",
    subject: "Votre carte NFC est prête — {{nom_entreprise}}",
    body: `<p style="margin-top:0">Bonjour <strong>{{nom_entreprise}}</strong>,</p>
<p>Excellente nouvelle ! Votre <strong>carte BIZNESS NFC</strong> et votre <strong>affiche connectée</strong> sont prêtes ! 💳</p>
<div style="margin:24px 0;text-align:center">
  <a href="{{lien_livrable}}" style="display:inline-block;background:linear-gradient(135deg,#1E3A5F,#2a5298);color:#ffffff;padding:14px 32px;border-radius:999px;text-decoration:none;font-weight:700;font-size:16px;box-shadow:0 4px 15px rgba(30,58,95,0.3)">💳 Voir ma page NFC</a>
</div>
<p><strong>Inclus dans votre pack :</strong></p>
<ul style="padding-left:20px;color:#475569">
  <li>Carte NFC programmée et personnalisée</li>
  <li>Page de profil digital complète</li>
  <li>QR Code personnalisé</li>
  <li>Affiche connectée pour votre vitrine</li>
  <li>Intégration réseaux sociaux</li>
</ul>
<p>La livraison physique de la carte sera organisée prochainement. En attendant, vous pouvez tester le scan.</p>
<p>Besoin d'aide ? <a href="{{lien_support}}" style="color:#1E3A5F;font-weight:600">Ouvrez un ticket support</a>.</p>
<p>Cordialement,<br><strong>L'équipe AdamKom</strong></p>`,
  },
  {
    id: "seo",
    label: "Fiche Google My Business",
    icon: "🔍",
    subject: "Votre fiche Google est optimisée — {{nom_entreprise}}",
    body: `<p style="margin-top:0">Bonjour <strong>{{nom_entreprise}}</strong>,</p>
<p>Votre <strong>fiche Google My Business</strong> a été créée et optimisée ! 🔍</p>
<div style="margin:24px 0;text-align:center">
  <a href="{{lien_livrable}}" style="display:inline-block;background:linear-gradient(135deg,#1E3A5F,#2a5298);color:#ffffff;padding:14px 32px;border-radius:999px;text-decoration:none;font-weight:700;font-size:16px;box-shadow:0 4px 15px rgba(30,58,95,0.3)">🔍 Voir ma fiche Google</a>
</div>
<p><strong>Optimisations réalisées :</strong></p>
<ul style="padding-left:20px;color:#475569">
  <li>Catégories et horaires configurés</li>
  <li>Photos professionnelles ajoutées</li>
  <li>Référencement local (NAP) optimisé</li>
  <li>Posts Google My Business publiés</li>
  <li>Flux Google géré</li>
</ul>
<p>Pour toute modification, <a href="{{lien_support}}" style="color:#1E3A5F;font-weight:600">ouvrez un ticket support</a>.</p>
<p>Cordialement,<br><strong>L'équipe AdamKom</strong></p>`,
  },
  {
    id: "reseaux",
    label: "Réseaux Sociaux",
    icon: "📱",
    subject: "Vos réseaux sociaux sont lancés — {{nom_entreprise}}",
    body: `<p style="margin-top:0">Bonjour <strong>{{nom_entreprise}}</strong>,</p>
<p>Vos <strong>réseaux sociaux</strong> sont configurés et les premières publications sont en ligne ! 📱</p>
<div style="margin:24px 0;text-align:center">
  <a href="{{lien_livrable}}" style="display:inline-block;background:linear-gradient(135deg,#1E3A5F,#2a5298);color:#ffffff;padding:14px 32px;border-radius:999px;text-decoration:none;font-weight:700;font-size:16px;box-shadow:0 4px 15px rgba(30,58,95,0.3)">📱 Voir mes publications</a>
</div>
<p><strong>Ce qui a été mis en place :</strong></p>
<ul style="padding-left:20px;color:#475569">
  <li>Création et optimisation des comptes sociaux</li>
  <li>Designs visuels personnalisés</li>
  <li>Premières publications programmées</li>
  <li>Chatbots intégrés aux réseaux</li>
</ul>
<p>Pour toute demande, <a href="{{lien_support}}" style="color:#1E3A5F;font-weight:600">ouvrez un ticket support</a>.</p>
<p>Cordialement,<br><strong>L'équipe AdamKom</strong></p>`,
  },
  {
    id: "formation",
    label: "Formation & Livraison",
    icon: "📚",
    subject: "Votre formation est disponible — {{nom_entreprise}}",
    body: `<p style="margin-top:0">Bonjour <strong>{{nom_entreprise}}</strong>,</p>
<p>Votre <strong>session de formation</strong> est prête ! 📚</p>
<p>Nous vous accompagnons pour la prise en main de vos outils digitaux :</p>
<ul style="padding-left:20px;color:#475569">
  <li>Gestion de votre fiche Google My Business</li>
  <li>Utilisation de votre carte NFC</li>
  <li>Publication sur les réseaux sociaux</li>
  <li>Gestion de votre chatbot IA</li>
</ul>
<p>Un membre de notre équipe vous contactera pour planifier la session.</p>
<p>En attendant, vous pouvez consulter vos livrables ci-dessous :</p>
<div style="margin:24px 0;text-align:center">
  <a href="{{lien_livrable}}" style="display:inline-block;background:linear-gradient(135deg,#1E3A5F,#2a5298);color:#ffffff;padding:14px 32px;border-radius:999px;text-decoration:none;font-weight:700;font-size:16px;box-shadow:0 4px 15px rgba(30,58,95,0.3)">📚 Accéder aux ressources</a>
</div>
<p>Besoin d'aide ? <a href="{{lien_support}}" style="color:#1E3A5F;font-weight:600">Contactez notre support</a>.</p>
<p>Cordialement,<br><strong>L'équipe AdamKom</strong></p>`,
  },
  {
    id: "annuaire",
    label: "Annuaire Entreprises974",
    icon: "📒",
    subject: "Votre page annuaire est en ligne — {{nom_entreprise}}",
    body: `<p style="margin-top:0">Bonjour <strong>{{nom_entreprise}}</strong>,</p>
<p>Votre profil sur <strong>l'annuaire Entreprises974</strong> est publié ! 📒</p>
<div style="margin:24px 0;text-align:center">
  <a href="{{lien_livrable}}" style="display:inline-block;background:linear-gradient(135deg,#1E3A5F,#2a5298);color:#ffffff;padding:14px 32px;border-radius:999px;text-decoration:none;font-weight:700;font-size:16px;box-shadow:0 4px 15px rgba(30,58,95,0.3)">📒 Voir mon profil</a>
</div>
<p><strong>Contenu publié :</strong></p>
<ul style="padding-left:20px;color:#475569">
  <li>Informations de base et description</li>
  <li>Vidéo de présentation</li>
  <li>FAQ et photos</li>
  <li>Avis clients</li>
</ul>
<p>Pour des modifications, <a href="{{lien_support}}" style="color:#1E3A5F;font-weight:600">ouvrez un ticket support</a>.</p>
<p>Cordialement,<br><strong>L'équipe AdamKom</strong></p>`,
  },
  {
    id: "generique",
    label: "Générique",
    icon: "📧",
    subject: "Votre livrable est prêt — {{nom_entreprise}}",
    body: `<p style="margin-top:0">Bonjour <strong>{{nom_entreprise}}</strong>,</p>
<p>Nous avons le plaisir de vous informer que le livrable <strong>{{nom_livrable}}</strong> est prêt !</p>
<div style="margin:24px 0;text-align:center">
  <a href="{{lien_livrable}}" style="display:inline-block;background:linear-gradient(135deg,#1E3A5F,#2a5298);color:#ffffff;padding:14px 32px;border-radius:999px;text-decoration:none;font-weight:700;font-size:16px;box-shadow:0 4px 15px rgba(30,58,95,0.3)">📦 Ouvrir {{nom_livrable}}</a>
</div>
<p>N'hésitez pas à nous faire part de vos remarques.</p>
<p>Besoin d'aide ? <a href="{{lien_support}}" style="color:#1E3A5F;font-weight:600">Ouvrez un ticket support</a> et notre équipe technique vous répondra sous 24h.</p>
<p>Cordialement,<br><strong>L'équipe AdamKom</strong></p>`,
  },
];

// Auto-detect template from deliverable name
function detectTemplateId(deliverableName: string): string {
  const lower = deliverableName.toLowerCase();
  if (lower.includes("site") || lower.includes("landing") || lower.includes("web")) return "site";
  if (lower.includes("chatbot") || lower.includes("ia") || lower.includes("porte-parole")) return "chatbot";
  if (lower.includes("nfc") || lower.includes("carte") || lower.includes("affiche")) return "nfc";
  if (lower.includes("google") || lower.includes("gmb") || lower.includes("fiche")) return "seo";
  if (lower.includes("réseau") || lower.includes("social") || lower.includes("publication")) return "reseaux";
  if (lower.includes("formation") || lower.includes("livraison")) return "formation";
  if (lower.includes("annuaire") || lower.includes("974")) return "annuaire";
  return "generique";
}

// ── Main component ────────────────────────────────────
export default function ProjectDeliverableEmail() {
  const navigate = useNavigate();
  const { id: projectId, deliverableId } = useParams<{ id: string; deliverableId: string }>();
  const { data: project, isLoading: isProjectLoading } = useProject(projectId || "");
  const { data: deliverables, isLoading: isDeliverablesLoading } = useDeliverables(projectId || "");
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
  const [editorMode, setEditorMode] = useState<"html">("html");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [uploadedAttachment, setUploadedAttachment] = useState<UploadedAttachment | null>(null);
  const [sending, setSending] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Auto-detect template and initialize
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

  // Update email on recipient load
  useEffect(() => {
    if (clientEmail && !recipientEmail) setRecipientEmail(clientEmail);
  }, [clientEmail]);

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const tpl = EMAIL_TEMPLATES.find((t) => t.id === templateId);
    if (tpl) {
      setSubject(tpl.subject);
      setMessage(tpl.body);
    }
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
    return wrapInBrandedTemplate(sanitizedBody, replaceVariables(supportLink));
  }, [deliverable, message, replaceVariables, supportLink]);

  const resolvedSubject = useMemo(() => replaceVariables(subject), [subject, replaceVariables]);

  const handleInsertVariable = (varCode: string) => {
    setMessage((prev) => prev + varCode);
  };

  const handleAttachmentChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) { toast.error("Le fichier ne doit pas dépasser 15 Mo"); return; }
    try {
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
      setUploadedAttachment({ content, name: file.name, type: file.type || "application/octet-stream", size: file.size });
      toast.success("Pièce jointe ajoutée");
    } catch (e: any) { toast.error(e.message || "Erreur"); }
    finally { event.target.value = ""; }
  };

  const handleSend = async () => {
    if (!deliverable) return;
    if (!recipientEmail.trim()) { toast.error("Ajoutez un email destinataire"); return; }
    if (!subject.trim() || !message.trim()) { toast.error("Complétez l'objet et le message"); return; }
    setSending(true);
    try {
      const attachments = uploadedAttachment
        ? [{ content: uploadedAttachment.content, name: uploadedAttachment.name, type: uploadedAttachment.type }]
        : [];
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
        },
      });
      if (error) throw error;
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
    } catch (e: any) { toast.error(e.message || "Erreur lors de l'envoi"); }
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
              <p className="text-xs text-muted-foreground">URL du site, chatbot, vidéo, etc. Variable : <code className="rounded bg-muted px-1">{"{{lien_livrable}}"}</code></p>
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
              <p className="text-xs text-muted-foreground">HTML/CSS direct. Les variables sont remplacées automatiquement. Le header AdamKom et le footer avec support sont ajoutés automatiquement.</p>
            </div>

            {/* Attachments */}
            <div className="space-y-3 rounded-xl border border-border p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">Pièces jointes</p>
                  <p className="text-xs text-muted-foreground">Fichier, image, PDF ou vidéo.</p>
                </div>
                <Button type="button" variant="outline" asChild>
                  <label htmlFor="attachment-upload" className="cursor-pointer"><Paperclip className="mr-2 h-4 w-4" />Ajouter</label>
                </Button>
              </div>
              <input id="attachment-upload" type="file" className="hidden" onChange={handleAttachmentChange} />
              {uploadedAttachment && (
                <div className="rounded-lg bg-muted/50 p-3 text-sm">
                  <p className="font-medium">{uploadedAttachment.name}</p>
                  <p className="text-xs text-muted-foreground">{formatBytes(uploadedAttachment.size)}</p>
                  <Button type="button" variant="link" className="h-auto p-0 text-xs" onClick={() => setUploadedAttachment(null)}>Retirer</Button>
                </div>
              )}
            </div>

            {/* Support link info */}
            {supportLink && (
              <div className="rounded-lg bg-success/5 border border-success/20 p-3 text-sm">
                <p className="font-medium text-success">✅ Lien support intégré</p>
                <p className="text-xs text-muted-foreground mt-1">Le footer inclut un bouton "Ouvrir un ticket support" qui pointe vers : <code className="text-xs break-all">{supportLink}</code></p>
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <Button onClick={handleSend} disabled={sending} className="gap-2">
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Envoyer le mail
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate(`/projets/${projectId}`)}>Annuler</Button>
            </div>
          </CardContent>
        </Card>

        {/* RIGHT: Preview */}
        <Card className="border-0 shadow-md shadow-primary/5">
          <CardHeader><CardTitle>Aperçu</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Objet</p>
              <p className="mt-1 text-sm font-medium">{resolvedSubject || "Aucun objet"}</p>
            </div>
            <div className="overflow-hidden rounded-xl border border-border bg-background">
              <div className="border-b border-border px-4 py-3 text-sm text-muted-foreground">Prévisualisation</div>
              <div className="max-h-[600px] overflow-auto p-1">
                <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(resolvedHtmlContent, { ADD_TAGS: ["style"], ADD_ATTR: ["style"] }) }} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}