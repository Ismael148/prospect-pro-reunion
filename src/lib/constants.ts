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

// ============ PROJECT MODULES ============

export interface ModuleTask {
  title: string;
  description?: string;
  priority: TaskPriority;
}

export interface ProjectModule {
  id: string;
  name: string;
  icon: string;
  deadlineDays: number; // days from project start
  tasks: ModuleTask[];
}

export const PACK_MODULES: Record<string, ProjectModule[]> = {
  star_bizness_numerik: [
    {
      id: "site",
      name: "Création du site Internet",
      icon: "🌐",
      deadlineDays: 3,
      tasks: [
        { title: "Récupérer infos client (logo, textes, photos, coordonnées)", priority: "urgente" },
        { title: "Créer l'adresse e-mail pro : contact@[nom_de_domaine]", priority: "urgente", description: "Mot de passe par défaut : $Contact148" },
        { title: "Installer WordPress sur l'hébergement LWS", priority: "urgente" },
        { title: "Configurer les identifiants admin WordPress", priority: "urgente" },
        { title: "Configurer le SMTP LWS (WP Mail SMTP)", priority: "haute", description: "Serveur: mail.nomdedomaine.com | Port: 465 SSL ou 587 TLS" },
        { title: "Choisir un thème optimisé (Envato Elements ou GNU)", priority: "urgente", description: "Thème rapide, responsive, compatible extensions" },
        { title: "Valider le thème avec le responsable (Discord)", priority: "haute" },
        { title: "Installer et activer le thème validé", priority: "urgente" },
        { title: "Structurer le site avec Google AI", priority: "haute" },
        { title: "Créer le Hero Banner (vidéo animée)", priority: "haute" },
        { title: "Respecter la charte graphique client", priority: "haute" },
        { title: "Optimiser les images (TinyPNG/Imagify, WebP)", priority: "haute" },
        { title: "Créer la page d'accueil", priority: "urgente" },
        { title: "Créer la page Services / Prestations", priority: "haute" },
        { title: "Créer la page Contact", priority: "haute" },
        { title: "Créer la page À propos", priority: "moyenne" },
        { title: "Ajouter des animations sur textes, boutons, images", priority: "moyenne" },
        { title: "Configurer le pied de page", priority: "haute", description: "Footer: Tous droits réservés. Propulsé par Adamkom by JJP" },
        { title: "Générer CGV, mentions légales, politique de confidentialité", priority: "haute", description: "Générer via Google IA" },
        { title: "Installer formulaire de contact (WPForms/Fluent Forms)", priority: "haute" },
        { title: "Configurer l'autorépondeur lié au mail pro", priority: "haute" },
        { title: "Vérifier les notifications (Admin + Client)", priority: "haute" },
        { title: "Installer plugin sécurité (Wordfence/Sucuri)", priority: "haute" },
        { title: "Configurer sauvegarde auto (UpdraftPlus)", priority: "haute" },
        { title: "Installer WP Rocket (performance)", priority: "haute" },
        { title: "Installer outil RGAA/inclusivité (AdaBundle)", priority: "haute", description: "Activer toutes les fonctionnalités" },
        { title: "Ajouter bannière consentement cookies", priority: "haute" },
        { title: "Tester compatibilité mobile et desktop", priority: "urgente" },
        { title: "Vérifier temps de chargement (< 3 secondes)", priority: "urgente" },
        { title: "Vérifier absence de fautes et mise en page", priority: "haute" },
        { title: "Présenter la 1ère version au client", priority: "urgente" },
      ],
    },
    {
      id: "chatbot",
      name: "Chatbot IA & Porte-Parole",
      icon: "🤖",
      deadlineDays: 5,
      tasks: [
        { title: "Créer workspace client sur AICoaches", priority: "haute" },
        { title: "Créer/choisir l'avatar coach IA adapté", priority: "haute", description: "Base prompt + infos entreprise" },
        { title: "Configurer le widget chat (thème, messages)", priority: "haute" },
        { title: "Intégrer le script chatbot sur le site", priority: "haute" },
        { title: "Créer l'accès backoffice client AICoaches", priority: "moyenne", description: "Credit: 80 tokens, Caractères: 80000" },
        { title: "Créer script de présentation (30s max) via ChatGPT", priority: "moyenne" },
        { title: "Créer avatar parlant Synthesys (Fullbody, Waving Hand)", priority: "moyenne", description: "Langue FR, décocher filigrane" },
        { title: "Intégrer le script Synthesys sur le site (bas droite)", priority: "moyenne" },
      ],
    },
    {
      id: "nfc",
      name: "Cartes Business NFC & Affiches connectées",
      icon: "💳",
      deadlineDays: 10,
      tasks: [
        { title: "Concevoir le design de la carte NFC personnalisée", priority: "haute" },
        { title: "Créer la page de profil digital (liens, réseaux)", priority: "haute" },
        { title: "Générer le QR Code personnalisé", priority: "haute" },
        { title: "Créer les affiches connectées avec QR code", priority: "moyenne" },
        { title: "Programmer/commander la carte NFC", priority: "haute" },
        { title: "Tester le scan NFC et le lien QR Code", priority: "haute" },
        { title: "Livrer la carte au client", priority: "urgente" },
      ],
    },
    {
      id: "seo",
      name: "SEO & Google My Business",
      icon: "🔍",
      deadlineDays: 5,
      tasks: [
        { title: "Créer/réclamer la fiche Google My Business", priority: "urgente" },
        { title: "Optimiser les balises SEO (title, meta, alt)", priority: "haute" },
        { title: "Configurer le référencement local (NAP)", priority: "haute" },
        { title: "Optimiser la fiche GMB (horaires, catégories, photos)", priority: "haute" },
        { title: "Gérer le flux Google du client", priority: "haute" },
      ],
    },
    {
      id: "annuaire",
      name: "Intégration Annuaire entreprises974",
      icon: "📒",
      deadlineDays: 7,
      tasks: [
        { title: "Créer la fiche entreprise sur lesentreprises974.re", priority: "haute" },
        { title: "Remplir toutes les informations (description, contact, photos)", priority: "haute" },
        { title: "Vérifier l'affichage et le lien vers le site", priority: "haute" },
      ],
    },
    {
      id: "reseaux",
      name: "Réseaux sociaux & Publications",
      icon: "📱",
      deadlineDays: 10,
      tasks: [
        { title: "Créer/optimiser les comptes réseaux sociaux", priority: "haute" },
        { title: "Créer les visuels de lancement (bannières, posts)", priority: "haute" },
        { title: "Planifier les 2 premiers contenus visuels du mois", priority: "moyenne" },
        { title: "Intégrer les chatbots sur les réseaux sociaux", priority: "haute" },
      ],
    },
    {
      id: "formation",
      name: "Formation & Livraison client",
      icon: "📚",
      deadlineDays: 15,
      tasks: [
        { title: "Former le client à la gestion GMB", priority: "haute" },
        { title: "Former le client à l'utilisation NFC", priority: "haute" },
        { title: "Former le client aux réseaux sociaux", priority: "moyenne" },
        { title: "Livrer le projet complet et obtenir validation", priority: "urgente" },
      ],
    },
  ],
  star_bizness_nfc: [
    {
      id: "nfc",
      name: "Carte NFC & Profil digital",
      icon: "💳",
      deadlineDays: 5,
      tasks: [
        { title: "Récupérer infos client (logo, coordonnées, réseaux)", priority: "urgente" },
        { title: "Concevoir le design de la carte NFC", priority: "urgente" },
        { title: "Créer la page de profil digital", priority: "urgente" },
        { title: "Intégrer les liens réseaux sociaux", priority: "haute" },
        { title: "Générer le QR Code personnalisé", priority: "haute" },
        { title: "Créer les visuels de présentation", priority: "moyenne" },
        { title: "Commander / programmer la carte NFC", priority: "urgente" },
        { title: "Créer les affiches connectées avec QR code", priority: "moyenne" },
        { title: "Tester le scan NFC et le lien QR Code", priority: "haute" },
      ],
    },
    {
      id: "formation",
      name: "Formation & Livraison",
      icon: "📚",
      deadlineDays: 7,
      tasks: [
        { title: "Former le client à l'utilisation NFC", priority: "haute" },
        { title: "Livrer la carte et obtenir validation", priority: "urgente" },
      ],
    },
  ],
  autre: [],
};

// Total project deadline per pack (in days)
export const PACK_DEADLINE_DAYS: Record<string, number> = {
  star_bizness_numerik: 15,
  star_bizness_nfc: 7,
  autre: 30,
};
