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
  Mail, Send, Loader2, Ticket, FileText, CreditCard, Globe, Eye, Sparkles, Wand2, Star, Facebook, MapPin, KeyRound, Copy, CalendarCheck, AtSign,
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
      subject: `Votre lien support — ${client.company_name}`,
      trigger: 'support_link',
      condition: (c) => !!c.support_token,
      bodyFn: () => `<p style="margin:0 0 20px">Bonjour <strong>${greeting}</strong>,</p>
<p style="margin:0 0 20px">Nous avons le plaisir de vous transmettre votre lien personnel pour nous envoyer un <strong>ticket support</strong>.</p>
<p style="margin:0 0 20px">Vous pouvez l'utiliser pour nous communiquer toutes vos <strong>modifications, mises à jour ou demandes</strong> concernant l'ensemble de nos offres <strong>Adamkom by JJP</strong>. Notre équipe revient vers vous dans les meilleurs délais.</p>
<p style="margin:0 0 20px;font-size:14px;color:#52525b">👉 <a href="${supportLink}" style="color:${BRAND_COLOR};text-decoration:underline;font-weight:600">Cliquez ici pour ouvrir un ticket support</a></p>
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
    {
      id: 'google_review',
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
    {
      id: 'tuto_motopress',
      label: 'Tuto MotoPress (Réservations)',
      icon: <CalendarCheck className="w-4 h-4" />,
      subject: `Gérez vos réservations en ligne — ${client.company_name}`,
      trigger: 'tuto_motopress',
      bodyFn: () => {
        const tutoLink = `${PUBLISHED_URL}/tuto/motopress`;
        return `<p style="margin:0 0 20px">Bonjour <strong>${greeting}</strong>,</p>
<p style="margin:0 0 20px">Votre site internet est livré avec <strong>MotoPress Hotel Booking</strong>, le plugin qui transforme votre site en véritable <strong>moteur de réservation en ligne</strong> — un peu comme Airbnb ou Booking, mais 100% sur <em>votre</em> propre site (et sans commission !).</p>
<p style="margin:0 0 20px">Avec MotoPress, vous pouvez :</p>
<ul style="padding-left:20px;color:#52525b;margin:0 0 24px;line-height:2">
  <li>📅 Gérer le <strong>calendrier de disponibilités</strong> de vos logements / prestations</li>
  <li>💶 Définir vos <strong>tarifs</strong> (basse / haute saison, week-ends, promotions)</li>
  <li>📨 Recevoir les <strong>réservations en ligne</strong> directement par email</li>
  <li>🔄 <strong>Synchroniser</strong> votre calendrier avec Airbnb & Booking pour éviter les doubles réservations</li>
  <li>✅ Confirmer / refuser une demande en 1 clic depuis votre tableau de bord</li>
</ul>
<p style="margin:0 0 20px">Pour vous accompagner, nous avons préparé un <strong>tutoriel pas-à-pas</strong> ultra-clair (avec captures d'écran) qui vous explique tout : ajouter un logement, créer un tarif, gérer une réservation, synchroniser vos plateformes externes…</p>
${makeCta('📅 Suivre le tutoriel MotoPress', tutoLink)}
<p style="margin:0 0 20px;font-size:13px;color:#71717a">💡 Vous pouvez gérer MotoPress 100% en autonomie. Et si vous préférez nous déléguer la configuration ou la mise en ligne de vos logements, notre équipe peut s'en charger sur devis.</p>
<p style="margin:0 0 20px">N'hésitez pas à nous écrire via votre espace support si vous avez la moindre question.</p>
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

  // Pro credentials email state
  const [showProDialog, setShowProDialog] = useState(false);
  const [proLoginUrl, setProLoginUrl] = useState("");
  const [proEmail, setProEmail] = useState("");
  const [proPassword, setProPassword] = useState("");
  const [proSending, setProSending] = useState(false);

  // Tuto Email Pro → Gmail dialog state
  const [showGmailDialog, setShowGmailDialog] = useState(false);
  const [gmailProEmail, setGmailProEmail] = useState(client.email || "");
  const initialDomain = (client.email || "").includes("@") ? (client.email as string).split("@")[1] : "";
  const [gmailDomain, setGmailDomain] = useState(initialDomain);
  const [gmailPopServer, setGmailPopServer] = useState(initialDomain ? `mail.${initialDomain}` : "");
  const [gmailPopPort, setGmailPopPort] = useState("995");
  const [gmailSmtpServer, setGmailSmtpServer] = useState(initialDomain ? `mail.${initialDomain}` : "");
  const [gmailSmtpPort, setGmailSmtpPort] = useState("465");
  const [gmailPassword, setGmailPassword] = useState("");
  const [gmailLabel, setGmailLabel] = useState("Pro");
  const [gmailExtraConfig, setGmailExtraConfig] = useState("");
  const [gmailSending, setGmailSending] = useState(false);

  const greeting = client.manager_name?.trim() || client.company_name;

  const buildProCredentialsHtml = () => {
    const row = (label: string, value: string) => `
      <tr>
        <td style="padding:10px 14px;background:#f4f4f5;border:1px solid #e4e4e7;font-weight:600;color:#27272a;width:160px">${label}</td>
        <td style="padding:10px 14px;background:#fff;border:1px solid #e4e4e7;color:#18181b;font-family:'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace;word-break:break-all">${value || '—'}</td>
      </tr>`;
    const body = `<p style="margin:0 0 20px">Bonjour <strong>${greeting}</strong>,</p>
<p style="margin:0 0 20px">Voici vos <strong>accès professionnels</strong> à votre espace dédié. Nous vous recommandons de les conserver en lieu sûr et de modifier votre mot de passe lors de votre première connexion.</p>
<table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:0 0 20px;font-size:14px">
  ${row('🔗 Lien de connexion', proLoginUrl ? `<a href="${proLoginUrl}" style="color:${BRAND_COLOR};text-decoration:none">${proLoginUrl}</a>` : '')}
  ${row('📧 Email pro', proEmail)}
  ${row('🔑 Mot de passe', proPassword)}
</table>
${proLoginUrl ? makeCta('🔐 Se connecter à mon espace', proLoginUrl) : ''}

<div style="margin:24px 0;padding:18px 20px;background:#fff7fb;border:1px solid #ffd1e3;border-left:4px solid ${BRAND_COLOR};border-radius:8px">
  <p style="margin:0 0 10px;font-weight:700;color:#18181b;font-size:15px">📬 Comment utiliser votre email pro ?</p>
  <p style="margin:0 0 10px;font-size:14px;color:#3f3f46;line-height:1.6">Le lien ci-dessus ouvre une <strong>plateforme de gestion d'emails professionnelle</strong> (votre webmail). C'est votre <strong>boîte mail dédiée à votre site internet</strong>.</p>
  <p style="margin:0 0 10px;font-size:14px;color:#3f3f46;line-height:1.6">👉 <strong>Connectez-vous</strong> avec l'email et le mot de passe ci-dessus pour consulter vos messages.</p>
  <p style="margin:0;font-size:14px;color:#3f3f46;line-height:1.6">📨 <strong>Tous les messages</strong> envoyés depuis le formulaire de contact de votre site (devis, demandes clients, réservations…) arriveront <strong>directement dans cette boîte</strong>. Pensez à la consulter régulièrement !</p>
</div>

<p style="margin:0 0 20px;font-size:13px;color:#71717a">⚠️ Pour votre sécurité, ne partagez jamais ces identifiants. En cas de problème de connexion, contactez-nous via votre espace support.</p>
<p style="margin:0">Cordialement,<br><strong style="color:${BRAND_COLOR}">L'équipe Adamkom</strong></p>`;
    const supportLink = client.support_token ? `${PUBLISHED_URL}/s/${client.support_token}` : undefined;
    return wrapInBrandedTemplate(body, supportLink, branding || undefined);
  };

  const handleSendProCredentials = async () => {
    if (!client.email) { toast.error("Pas d'email client"); return; }
    if (!proLoginUrl.trim() || !proEmail.trim() || !proPassword.trim()) {
      toast.error("Remplissez les 3 champs (lien, email, mot de passe)"); return;
    }
    setProSending(true);
    try {
      const htmlContent = buildProCredentialsHtml();
      const subject = `Vos accès professionnels — ${client.company_name}`;
      const { error } = await supabase.functions.invoke("send-brevo-campaign", {
        body: {
          action: "send_client_email",
          recipientEmail: client.email,
          recipientName: greeting,
          subject,
          htmlContent,
          trigger: "pro_credentials",
          client_id: client.id,
        },
      });
      if (error) throw error;
      toast.success(`Accès envoyés à ${client.email}`);
      setShowProDialog(false);
      setProLoginUrl(""); setProEmail(""); setProPassword("");
    } catch (e: any) {
      toast.error(e.message || "Erreur lors de l'envoi");
    } finally {
      setProSending(false);
    }
  };

  const buildGmailTutoHtml = () => {
    const domain = gmailDomain.trim() || "[votredomaine]";
    const params = new URLSearchParams();
    if (gmailProEmail.trim()) params.set("email", gmailProEmail.trim());
    if (gmailDomain.trim()) params.set("domain", gmailDomain.trim());
    if (gmailPopServer.trim()) params.set("pop_server", gmailPopServer.trim());
    if (gmailPopPort.trim()) params.set("pop_port", gmailPopPort.trim());
    if (gmailSmtpServer.trim()) params.set("smtp_server", gmailSmtpServer.trim());
    if (gmailSmtpPort.trim()) params.set("smtp_port", gmailSmtpPort.trim());
    if (gmailPassword.trim()) params.set("password", gmailPassword.trim());
    if (gmailLabel.trim()) params.set("label", gmailLabel.trim());
    if (gmailExtraConfig.trim()) params.set("config", gmailExtraConfig.trim());
    const tutoLink = `${PUBLISHED_URL}/tuto/email-pro-gmail${params.toString() ? `?${params.toString()}` : ""}`;

    const row = (label: string, value: string) => `
      <tr>
        <td style="padding:8px 12px;background:#f4f4f5;border:1px solid #e4e4e7;font-weight:600;color:#27272a;width:170px;font-size:13px">${label}</td>
        <td style="padding:8px 12px;background:#fff;border:1px solid #e4e4e7;color:#18181b;font-family:'SFMono-Regular',Consolas,Menlo,monospace;font-size:13px;word-break:break-all">${value || '—'}</td>
      </tr>`;

    const credentialsTable = `
<table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:0 0 16px">
  ${row('📧 Email pro', gmailProEmail.trim())}
  ${row('🔑 Mot de passe', gmailPassword.trim() || '(celui de votre webmail)')}
  ${row('📥 Serveur POP', gmailPopServer.trim())}
  ${row('📥 Port POP', `${gmailPopPort.trim()} (SSL)`)}
  ${row('📤 Serveur SMTP', gmailSmtpServer.trim())}
  ${row('📤 Port SMTP', `${gmailSmtpPort.trim()} (SSL)`)}
  ${row('🏷️ Libellé Gmail', gmailLabel.trim() || 'Pro')}
</table>`;

    const extraBlock = gmailExtraConfig.trim()
      ? `<div style="margin:18px 0;padding:14px 18px;background:#fffbeb;border:1px solid #fde68a;border-left:4px solid #f59e0b;border-radius:8px">
  <p style="margin:0 0 8px;font-weight:700;color:#78350f">📌 Notes complémentaires :</p>
  <pre style="margin:0;font-family:'SFMono-Regular',Consolas,Menlo,monospace;font-size:13px;color:#78350f;white-space:pre-wrap">${gmailExtraConfig.trim().replace(/</g,"&lt;")}</pre>
</div>`
      : "";
    return `<p style="margin:0 0 20px">Bonjour <strong>${greeting}</strong>,</p>
<p style="margin:0 0 20px">Plutôt que de jongler entre votre webmail pro et Gmail, vous pouvez <strong>centraliser vos emails pros dans votre compte Gmail habituel</strong> — sur ordinateur ET sur téléphone.</p>
<p style="margin:0 0 16px">Voici <strong>vos informations de configuration</strong> à utiliser dans Gmail (gardez cet email sous la main pendant la procédure) :</p>
${credentialsTable}
${extraBlock}
<p style="margin:0 0 20px">Nous avons préparé un <strong>tutoriel pas-à-pas (10 minutes)</strong> qui suit la <strong>procédure officielle Gmail</strong>, avec captures d'écran et toutes les valeurs ci-dessus déjà pré-remplies pour <strong>${domain}</strong>.</p>
${makeCta('📬 Suivre le tutoriel Email Pro → Gmail', tutoLink)}
<div style="margin:24px 0;padding:18px 20px;background:#fff7fb;border:1px solid #ffd1e3;border-left:4px solid ${BRAND_COLOR};border-radius:8px">
  <p style="margin:0 0 8px;font-weight:700;color:#18181b">🔐 Pourquoi c'est à vous de le faire&nbsp;?</p>
  <p style="margin:0;font-size:14px;color:#3f3f46;line-height:1.6">Pour votre <strong>sécurité</strong>, Adamkom <strong>ne demande jamais</strong> et <strong>n'a jamais accès</strong> à vos mots de passe (ni Gmail, ni email pro). C'est donc plus <strong>pratique et plus sûr</strong> que vous fassiez cette manipulation vous-même, en 10 minutes. On vous guide à chaque étape.</p>
</div>
<p style="margin:0 0 20px;font-size:13px;color:#71717a">Besoin d'un coup de main&nbsp;? Écrivez-nous via votre espace support : on vous accompagne sans jamais vous demander vos accès.</p>
<p style="margin:0">Cordialement,<br><strong style="color:${BRAND_COLOR}">L'équipe Adamkom</strong></p>`;
  };

  const validateGmailForm = (): string | null => {
    const email = gmailProEmail.trim();
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!emailRe.test(email)) return "Email pro invalide.";
    const domain = gmailDomain.trim();
    if (!domain || !/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain)) return "Domaine invalide (ex: votresite.fr).";
    const hostRe = /^[a-z0-9.-]+\.[a-z]{2,}$/i;
    if (!hostRe.test(gmailPopServer.trim())) return "Serveur POP invalide (ex: mail.votresite.fr).";
    if (!hostRe.test(gmailSmtpServer.trim())) return "Serveur SMTP invalide (ex: mail.votresite.fr).";
    const portRe = /^\d+$/;
    const popP = Number(gmailPopPort);
    if (!portRe.test(gmailPopPort.trim()) || popP < 1 || popP > 65535) return "Port POP invalide (1-65535, ex: 995).";
    const smtpP = Number(gmailSmtpPort);
    if (!portRe.test(gmailSmtpPort.trim()) || smtpP < 1 || smtpP > 65535) return "Port SMTP invalide (1-65535, ex: 465).";
    if (![110, 995].includes(popP)) return "Port POP recommandé : 995 (SSL) ou 110.";
    if (![465, 587, 25].includes(smtpP)) return "Port SMTP recommandé : 465 (SSL), 587 (STARTTLS) ou 25.";
    if (!gmailPassword.trim()) return "Le mot de passe est requis pour que le client puisse configurer son compte.";
    if (!gmailLabel.trim()) return "Le libellé Gmail est requis.";
    return null;
  };

  const handleSendGmailTuto = async () => {
    if (!client.email) { toast.error("Pas d'email client"); return; }
    const err = validateGmailForm();
    if (err) { toast.error(err); return; }
    setGmailSending(true);
    try {
      const bodyHtml = buildGmailTutoHtml();
      const supportLink = client.support_token ? `${PUBLISHED_URL}/s/${client.support_token}` : undefined;
      const htmlContent = wrapInBrandedTemplate(bodyHtml, supportLink, branding || undefined);
      const subject = `Recevez vos emails pro dans Gmail — ${client.company_name}`;
      const { error } = await supabase.functions.invoke("send-brevo-campaign", {
        body: {
          action: "send_client_email",
          recipientEmail: client.email,
          recipientName: greeting,
          subject,
          htmlContent,
          trigger: "tuto_email_pro_gmail",
          client_id: client.id,
        },
      });
      if (error) throw error;
      toast.success(`Tuto envoyé à ${client.email}`);
      setShowGmailDialog(false);
      setGmailExtraConfig("");
    } catch (e: any) {
      toast.error(e.message || "Erreur lors de l'envoi");
    } finally {
      setGmailSending(false);
    }
  };

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
          recipientName: greeting,
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
          recipientName: greeting,
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
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={() => setShowProDialog(true)}
              >
                <KeyRound className="w-4 h-4" />
                Envoyer accès pro
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={() => setShowGmailDialog(true)}
              >
                <AtSign className="w-4 h-4" />
                Tuto Email Pro → Gmail
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 border-primary/20 text-primary hover:bg-primary/5"
                onClick={() => setShowAiDialog(true)}
              >
                <Sparkles className="w-4 h-4" />
                Générer par IA
              </Button>
            </div>
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

      {/* Pro Credentials Dialog */}
      <Dialog open={showProDialog} onOpenChange={setShowProDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-primary" /> Envoyer les accès professionnels
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Lien de connexion *</Label>
              <Input
                type="url"
                placeholder="https://espace.exemple.com/login"
                value={proLoginUrl}
                onChange={(e) => setProLoginUrl(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Email pro *</Label>
                <Input
                  type="email"
                  placeholder="contact@entreprise.com"
                  value={proEmail}
                  onChange={(e) => setProEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Mot de passe *</Label>
                <Input
                  type="text"
                  placeholder="Mot de passe"
                  value={proPassword}
                  onChange={(e) => setProPassword(e.target.value)}
                />
              </div>
            </div>

            {(proLoginUrl || proEmail || proPassword) && (
              <div className="space-y-2">
                <Label>Aperçu de l'email</Label>
                <div
                  className="border border-border rounded-lg overflow-hidden bg-white max-h-[400px] overflow-y-auto"
                  dangerouslySetInnerHTML={{ __html: buildProCredentialsHtml() }}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowProDialog(false)}>Annuler</Button>
            <Button
              onClick={handleSendProCredentials}
              disabled={proSending || !proLoginUrl.trim() || !proEmail.trim() || !proPassword.trim()}
            >
              {proSending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
              Envoyer à {client.email}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Gmail Tuto Dialog */}
      <Dialog open={showGmailDialog} onOpenChange={setShowGmailDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AtSign className="w-5 h-5 text-primary" /> Envoyer le tuto « Email Pro → Gmail »
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
              💡 Le tuto suit la <strong>procédure officielle Gmail</strong> (méthode POP, captures Google).
              Remplissez les champs ci-dessous : ils seront <strong>pré-remplis dans le tuto</strong> et
              <strong> récapitulés dans l'email</strong> envoyé au client.
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>📧 Email pro du client</Label>
                <Input
                  type="email"
                  placeholder="contact@votresite.fr"
                  value={gmailProEmail}
                  onChange={(e) => {
                    const v = e.target.value;
                    setGmailProEmail(v);
                    if (v.includes("@")) {
                      const d = v.split("@")[1];
                      setGmailDomain(d);
                      setGmailPopServer(`mail.${d}`);
                      setGmailSmtpServer(`mail.${d}`);
                    }
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label>🌐 Domaine</Label>
                <Input
                  type="text"
                  placeholder="votresite.fr"
                  value={gmailDomain}
                  onChange={(e) => {
                    const d = e.target.value;
                    setGmailDomain(d);
                    if (d) {
                      setGmailPopServer(`mail.${d}`);
                      setGmailSmtpServer(`mail.${d}`);
                    }
                  }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>🔑 Mot de passe (optionnel — rappel pour le client)</Label>
              <Input
                type="text"
                placeholder="Laissez vide si déjà communiqué dans un email précédent"
                value={gmailPassword}
                onChange={(e) => setGmailPassword(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                ⚠️ N'inscrivez le mot de passe que si vous souhaitez vraiment le rappeler au client dans cet email.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-2 sm:col-span-2">
                <Label>📥 Serveur POP (entrant)</Label>
                <Input
                  type="text"
                  placeholder="mail.votresite.fr"
                  value={gmailPopServer}
                  onChange={(e) => setGmailPopServer(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Port POP</Label>
                <Input
                  type="text"
                  placeholder="995"
                  value={gmailPopPort}
                  onChange={(e) => setGmailPopPort(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-2 sm:col-span-2">
                <Label>📤 Serveur SMTP (sortant)</Label>
                <Input
                  type="text"
                  placeholder="mail.votresite.fr"
                  value={gmailSmtpServer}
                  onChange={(e) => setGmailSmtpServer(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Port SMTP</Label>
                <Input
                  type="text"
                  placeholder="465"
                  value={gmailSmtpPort}
                  onChange={(e) => setGmailSmtpPort(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>🏷️ Libellé Gmail (pour ranger les emails entrants)</Label>
              <Input
                type="text"
                placeholder="Pro"
                value={gmailLabel}
                onChange={(e) => setGmailLabel(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>📝 Notes complémentaires (optionnel)</Label>
              <Textarea
                rows={4}
                placeholder={`Ex :\n- Si Gmail demande un « mot de passe d'application », contactez-nous.\n- Pensez à cocher « Conserver une copie sur le serveur ».`}
                value={gmailExtraConfig}
                onChange={(e) => setGmailExtraConfig(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Aperçu de l'email</Label>
              <div
                className="border border-border rounded-lg overflow-hidden bg-white max-h-[350px] overflow-y-auto"
                dangerouslySetInnerHTML={{
                  __html: wrapInBrandedTemplate(
                    buildGmailTutoHtml(),
                    client.support_token ? `${PUBLISHED_URL}/s/${client.support_token}` : undefined,
                    branding || undefined
                  ),
                }}
              />
            </div>
          </div>
          {(() => { const err = validateGmailForm(); return (
          <DialogFooter className="flex-col sm:flex-row sm:items-center gap-2">
            {err && (
              <p className="text-xs text-destructive flex-1 text-left">⚠️ {err}</p>
            )}
            <Button variant="outline" onClick={() => setShowGmailDialog(false)}>Annuler</Button>
            <Button onClick={handleSendGmailTuto} disabled={gmailSending || !!err}>
              {gmailSending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
              Envoyer à {client.email}
            </Button>
          </DialogFooter>
          ); })()}
        </DialogContent>
      </Dialog>
    </>
  );
}
