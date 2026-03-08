import type { Database } from "@/integrations/supabase/types";

type PipelineStatus = Database["public"]["Enums"]["pipeline_status"];
type PackType = Database["public"]["Enums"]["pack_type"];
type ProjectStatus = Database["public"]["Enums"]["project_status"];
type TaskStatus = Database["public"]["Enums"]["task_status"];
type TaskPriority = Database["public"]["Enums"]["task_priority"];
type DeliverableStatus = Database["public"]["Enums"]["deliverable_status"];

export const PIPELINE_LABELS: Record<PipelineStatus, string> = {
  nouveau: "Nouveau",
  contacte: "Contacté",
  rdv_planifie: "RDV planifié",
  proposition_envoyee: "Proposition envoyée",
  negociation: "Négociation",
  contrat_signe: "Contrat signé",
  perdu: "Perdu",
};

export const PIPELINE_COLORS: Record<PipelineStatus, string> = {
  nouveau: "bg-info/10 text-info border-info/20",
  contacte: "bg-primary/10 text-primary border-primary/20",
  rdv_planifie: "bg-warning/10 text-warning border-warning/20",
  proposition_envoyee: "bg-accent/10 text-accent-foreground border-accent/20",
  negociation: "bg-warning/10 text-warning border-warning/20",
  contrat_signe: "bg-success/10 text-success border-success/20",
  perdu: "bg-destructive/10 text-destructive border-destructive/20",
};

export const PIPELINE_ORDER: PipelineStatus[] = [
  "nouveau",
  "contacte",
  "rdv_planifie",
  "proposition_envoyee",
  "negociation",
  "contrat_signe",
  "perdu",
];

export const PACK_LABELS: Record<PackType, string> = {
  star_bizness_numerik: "STAR BIZNESS NUMERIK",
  star_bizness_nfc: "STAR BIZNESS NFC",
  autre: "Autre",
};

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  en_attente: "En attente",
  en_cours: "En cours",
  en_revision: "En révision",
  termine: "Terminé",
  annule: "Annulé",
};

export const PROJECT_STATUS_COLORS: Record<ProjectStatus, string> = {
  en_attente: "bg-muted text-muted-foreground border-border",
  en_cours: "bg-primary/10 text-primary border-primary/20",
  en_revision: "bg-warning/10 text-warning border-warning/20",
  termine: "bg-success/10 text-success border-success/20",
  annule: "bg-destructive/10 text-destructive border-destructive/20",
};

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  a_faire: "À faire",
  en_cours: "En cours",
  en_revision: "En révision",
  termine: "Terminé",
};

export const TASK_STATUS_COLORS: Record<TaskStatus, string> = {
  a_faire: "bg-muted text-muted-foreground border-border",
  en_cours: "bg-primary/10 text-primary border-primary/20",
  en_revision: "bg-warning/10 text-warning border-warning/20",
  termine: "bg-success/10 text-success border-success/20",
};

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  basse: "Basse",
  moyenne: "Moyenne",
  haute: "Haute",
  urgente: "Urgente",
};

export const TASK_PRIORITY_COLORS: Record<TaskPriority, string> = {
  basse: "text-muted-foreground",
  moyenne: "text-info",
  haute: "text-warning",
  urgente: "text-destructive",
};

export const DELIVERABLE_STATUS_LABELS: Record<DeliverableStatus, string> = {
  en_attente: "En attente",
  en_cours: "En cours",
  soumis: "Soumis",
  approuve: "Approuvé",
  rejete: "Rejeté",
};

export const DELIVERABLE_STATUS_COLORS: Record<DeliverableStatus, string> = {
  en_attente: "bg-muted text-muted-foreground border-border",
  en_cours: "bg-primary/10 text-primary border-primary/20",
  soumis: "bg-warning/10 text-warning border-warning/20",
  approuve: "bg-success/10 text-success border-success/20",
  rejete: "bg-destructive/10 text-destructive border-destructive/20",
};

// Default deliverables per pack type
export const PACK_DELIVERABLES: Record<string, string[]> = {
  star_bizness_numerik: [
    "Création page Google My Business",
    "Site vitrine responsive",
    "Référencement local SEO",
    "Fiche établissement optimisée",
    "Photos professionnelles",
    "Formation gestion GMB",
  ],
  star_bizness_nfc: [
    "Carte NFC personnalisée",
    "Page de profil digital",
    "QR Code personnalisé",
    "Intégration réseaux sociaux",
    "Formation utilisation NFC",
  ],
  autre: [],
};

// Webmaster checklist templates per pack type (with day offset from project start)
export interface ChecklistItem {
  title: string;
  description?: string;
  dayOffset: number;
  priority: TaskPriority;
  category: string;
}

export const CHECKLIST_CATEGORY_LABELS: Record<string, string> = {
  admin: "📋 Administratif",
  mail: "📧 Mail professionnel",
  wordpress: "⚙️ WordPress",
  theme: "🎨 Thème & Design",
  contenu: "📝 Contenu & Images",
  formulaire: "📬 Formulaires & SMTP",
  securite: "🔒 Sécurité",
  rgaa_rgpd: "♿ RGAA / RGPD",
  chatbot: "🤖 Chatbot IA",
  porteparole: "🗣️ Porte-Parole Virtuel",
  seo: "🔍 SEO / Référencement",
  nfc: "💳 Carte NFC & Affiches",
  annuaire: "📒 Annuaire entreprises974",
  reseaux: "📱 Réseaux sociaux",
  qualite: "✅ Contrôle qualité",
  formation: "📚 Formation client",
};

export const CHECKLIST_CATEGORY_ORDER: string[] = [
  "admin", "mail", "wordpress", "theme", "contenu", "formulaire",
  "securite", "rgaa_rgpd", "chatbot", "porteparole", "seo",
  "nfc", "annuaire", "reseaux", "qualite", "formation",
];

export const PACK_CHECKLISTS: Record<string, ChecklistItem[]> = {
  star_bizness_numerik: [
    // ADMIN
    { title: "Récupérer infos client (logo, textes, photos, coordonnées)", dayOffset: 0, priority: "urgente", category: "admin" },
    { title: "Stocker toutes les infos client dans le CRM", dayOffset: 0, priority: "haute", category: "admin" },

    // MAIL PRO
    { title: "Créer l'adresse e-mail pro : contact@[nom_de_domaine]", dayOffset: 0, priority: "urgente", category: "mail", description: "Mot de passe par défaut : $Contact148" },
    { title: "Configurer le SMTP LWS sur WordPress (WP Mail SMTP)", dayOffset: 1, priority: "haute", category: "mail", description: "Serveur: mail.nomdedomaine.com | Port: 465 SSL ou 587 TLS" },
    { title: "Tester l'envoi d'e-mail via le SMTP configuré", dayOffset: 1, priority: "haute", category: "mail" },

    // WORDPRESS
    { title: "Installer WordPress sur l'hébergement LWS", dayOffset: 0, priority: "urgente", category: "wordpress" },
    { title: "Configurer les identifiants admin WordPress", dayOffset: 0, priority: "urgente", category: "wordpress" },

    // THÈME & DESIGN
    { title: "Choisir un thème optimisé sur Envato Elements ou GNU", dayOffset: 0, priority: "urgente", category: "theme", description: "Thème rapide, responsive, compatible extensions" },
    { title: "Valider le thème choisi avec le responsable (Discord)", dayOffset: 0, priority: "haute", category: "theme" },
    { title: "Installer et activer le thème validé", dayOffset: 1, priority: "urgente", category: "theme" },
    { title: "Structurer le site avec Google AI selon infos client", dayOffset: 1, priority: "haute", category: "theme" },
    { title: "Créer le Hero Banner (vidéo animée en arrière-plan)", dayOffset: 1, priority: "haute", category: "theme" },
    { title: "Respecter la charte graphique client (couleurs, logo)", dayOffset: 1, priority: "haute", category: "theme" },
    { title: "Ajouter des animations sur textes, boutons, images", dayOffset: 2, priority: "moyenne", category: "theme" },
    { title: "Configurer le pied de page (fond sombre, infos clés)", dayOffset: 2, priority: "haute", category: "theme", description: "Footer: Tous droits réservés. Propulsé par Adamkom by JJP" },

    // CONTENU & IMAGES
    { title: "Optimiser les images (TinyPNG/Imagify, format WebP)", dayOffset: 1, priority: "haute", category: "contenu" },
    { title: "Utiliser des visuels clairs et professionnels (Freepik si besoin)", dayOffset: 1, priority: "haute", category: "contenu" },
    { title: "Créer la page d'accueil", dayOffset: 1, priority: "urgente", category: "contenu" },
    { title: "Créer la page Services / Prestations", dayOffset: 1, priority: "haute", category: "contenu" },
    { title: "Créer la page Contact", dayOffset: 1, priority: "haute", category: "contenu" },
    { title: "Créer la page À propos", dayOffset: 2, priority: "moyenne", category: "contenu" },
    { title: "Générer CGV, mentions légales, politique de confidentialité", dayOffset: 2, priority: "haute", category: "contenu", description: "Générer via Google IA" },

    // FORMULAIRES & SMTP
    { title: "Installer un formulaire de contact (WPForms/Fluent Forms)", dayOffset: 2, priority: "haute", category: "formulaire" },
    { title: "Configurer l'autorépondeur lié au mail pro", dayOffset: 2, priority: "haute", category: "formulaire" },
    { title: "Vérifier les notifications (Notif Admin + Notif Client)", dayOffset: 2, priority: "haute", category: "formulaire" },

    // SÉCURITÉ
    { title: "Installer un plugin de sécurité (Wordfence/Sucuri)", dayOffset: 2, priority: "haute", category: "securite" },
    { title: "Configurer sauvegarde automatique (UpdraftPlus/BackupBuddy)", dayOffset: 2, priority: "haute", category: "securite" },
    { title: "Installer WP Rocket pour la performance", dayOffset: 2, priority: "haute", category: "securite" },

    // RGAA / RGPD
    { title: "Installer l'outil d'inclusivité web (AdaBundle/RGAA)", dayOffset: 2, priority: "haute", category: "rgaa_rgpd", description: "Configurer sur AdaBundle, activer toutes les fonctionnalités" },
    { title: "Ajouter la bannière de consentement cookies (Cookies Yes)", dayOffset: 2, priority: "haute", category: "rgaa_rgpd" },

    // CHATBOT IA
    { title: "Créer un workspace client sur AICoaches", dayOffset: 2, priority: "haute", category: "chatbot" },
    { title: "Créer/choisir l'avatar coach IA adapté à l'activité", dayOffset: 2, priority: "haute", category: "chatbot", description: "Ajouter base prompt + infos entreprise" },
    { title: "Configurer le widget chat (thème, apparence, messages)", dayOffset: 3, priority: "haute", category: "chatbot" },
    { title: "Intégrer le script chatbot sur le site", dayOffset: 3, priority: "haute", category: "chatbot" },
    { title: "Créer l'accès backoffice client sur AICoaches", dayOffset: 3, priority: "moyenne", category: "chatbot", description: "Credit: 80 tokens, Caractères: 80000" },

    // PORTE-PAROLE VIRTUEL
    { title: "Créer le script de présentation (30s max) via ChatGPT", dayOffset: 2, priority: "moyenne", category: "porteparole" },
    { title: "Créer l'avatar parlant sur Synthesys (Fullbody, Waving Hand)", dayOffset: 2, priority: "moyenne", category: "porteparole", description: "Langue FR, décocher filigrane Synthesys" },
    { title: "Intégrer le script Synthesys sur le site (bas droite)", dayOffset: 3, priority: "moyenne", category: "porteparole" },

    // SEO
    { title: "Créer/réclamer la fiche Google My Business", dayOffset: 1, priority: "urgente", category: "seo" },
    { title: "Optimiser les balises SEO (title, meta description, alt)", dayOffset: 3, priority: "haute", category: "seo" },
    { title: "Configurer le référencement local (NAP cohérent)", dayOffset: 3, priority: "haute", category: "seo" },
    { title: "Optimiser la fiche GMB (horaires, catégories, photos)", dayOffset: 3, priority: "haute", category: "seo" },

    // CARTE NFC & AFFICHES
    { title: "Concevoir le design de la carte NFC personnalisée", dayOffset: 1, priority: "haute", category: "nfc" },
    { title: "Créer la page de profil digital (liens, réseaux)", dayOffset: 2, priority: "haute", category: "nfc" },
    { title: "Générer le QR Code personnalisé", dayOffset: 2, priority: "haute", category: "nfc" },
    { title: "Créer les affiches connectées avec QR code", dayOffset: 2, priority: "moyenne", category: "nfc" },
    { title: "Programmer/commander la carte NFC", dayOffset: 3, priority: "haute", category: "nfc" },
    { title: "Tester le scan NFC et le lien QR Code", dayOffset: 3, priority: "haute", category: "nfc" },

    // ANNUAIRE
    { title: "Intégrer l'entreprise dans lesentreprises974.re", dayOffset: 3, priority: "haute", category: "annuaire" },

    // RÉSEAUX SOCIAUX
    { title: "Créer/optimiser les comptes réseaux sociaux client", dayOffset: 2, priority: "haute", category: "reseaux" },
    { title: "Créer les visuels de lancement (bannières, posts)", dayOffset: 3, priority: "haute", category: "reseaux" },
    { title: "Planifier les 2 premiers contenus visuels du mois", dayOffset: 3, priority: "moyenne", category: "reseaux" },

    // CONTRÔLE QUALITÉ
    { title: "Tester la compatibilité mobile et desktop", dayOffset: 3, priority: "urgente", category: "qualite" },
    { title: "Vérifier le temps de chargement (< 3 secondes)", dayOffset: 3, priority: "urgente", category: "qualite" },
    { title: "Vérifier tous les formulaires et autorépondeurs", dayOffset: 3, priority: "urgente", category: "qualite" },
    { title: "Vérifier l'absence de fautes et la mise en page", dayOffset: 3, priority: "haute", category: "qualite" },
    { title: "Présenter la première version au client (2-3 jours)", dayOffset: 3, priority: "urgente", category: "qualite" },

    // FORMATION
    { title: "Former le client à la gestion GMB", dayOffset: 3, priority: "haute", category: "formation" },
    { title: "Former le client à l'utilisation NFC", dayOffset: 3, priority: "haute", category: "formation" },
    { title: "Livrer le site et obtenir validation client", dayOffset: 3, priority: "urgente", category: "formation" },
  ],
  star_bizness_nfc: [
    { title: "Récupérer les infos client (logo, coordonnées, réseaux)", dayOffset: 0, priority: "urgente", category: "admin" },
    { title: "Concevoir le design de la carte NFC", dayOffset: 0, priority: "urgente", category: "nfc" },
    { title: "Créer la page de profil digital", dayOffset: 0, priority: "urgente", category: "contenu" },
    { title: "Intégrer les liens réseaux sociaux sur le profil", dayOffset: 1, priority: "haute", category: "contenu" },
    { title: "Générer le QR Code personnalisé", dayOffset: 1, priority: "haute", category: "nfc" },
    { title: "Créer les visuels de présentation", dayOffset: 1, priority: "moyenne", category: "contenu" },
    { title: "Commander / programmer la carte NFC", dayOffset: 2, priority: "urgente", category: "nfc" },
    { title: "Tester le scan NFC et le lien QR Code", dayOffset: 2, priority: "haute", category: "nfc" },
    { title: "Créer les affiches connectées avec QR code", dayOffset: 2, priority: "moyenne", category: "nfc" },
    { title: "Former le client à l'utilisation NFC", dayOffset: 3, priority: "haute", category: "formation" },
    { title: "Livrer la carte et obtenir validation", dayOffset: 3, priority: "urgente", category: "qualite" },
  ],
  autre: [],
};
