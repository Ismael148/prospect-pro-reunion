import type { Database } from "@/integrations/supabase/types";

// URL de production centralisée — utilisée pour tous les liens publics (support, formulaires, factures)
export const PUBLISHED_URL = 'https://ai.adamkom.com';

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

export const PACK_PRICES: Record<string, number> = {
  star_bizness_numerik: 1490,
  star_bizness_nfc: 279.90,
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
    "Gestion fiche Google My Business",
    "Site One Page Landing responsive",
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

// E-commerce specific tasks for site module
const ECOMMERCE_SITE_TASKS: ModuleTask[] = [
  { title: "Récupérer infos client (logo, textes, photos, coordonnées)", priority: "urgente" },
  { title: "Créer l'adresse e-mail pro : contact@[nom_de_domaine]", priority: "urgente", description: "Mot de passe par défaut : $Contact148" },
  { title: "Installer WordPress + WooCommerce sur l'hébergement LWS", priority: "urgente" },
  { title: "Configurer les identifiants admin WordPress", priority: "urgente" },
  { title: "Configurer le SMTP LWS (WP Mail SMTP)", priority: "haute", description: "Serveur: mail.nomdedomaine.com | Port: 465 SSL ou 587 TLS" },
  { title: "Choisir un thème e-commerce optimisé (Envato Elements ou GNU)", priority: "urgente", description: "Thème WooCommerce compatible, rapide, responsive" },
  { title: "Valider le thème avec le responsable (Discord)", priority: "haute" },
  { title: "Installer et activer le thème validé", priority: "urgente" },
  { title: "Configurer WooCommerce (devise, TVA, expédition)", priority: "urgente" },
  { title: "Configurer les méthodes de paiement (Stripe/PayPal)", priority: "urgente" },
  { title: "Configurer les zones et méthodes de livraison", priority: "haute" },
  { title: "Créer les catégories de produits", priority: "haute" },
  { title: "Importer/créer le catalogue produits (min 10 produits)", priority: "urgente" },
  { title: "Configurer les variantes produits (tailles, couleurs)", priority: "haute" },
  { title: "Rédiger les descriptions produits avec IA", priority: "haute" },
  { title: "Optimiser les images produits (TinyPNG/WebP)", priority: "haute" },
  { title: "Configurer le panier et le checkout", priority: "urgente" },
  { title: "Configurer les emails transactionnels WooCommerce", priority: "haute", description: "Confirmation commande, expédition, etc." },
  { title: "Créer la page Boutique / Catalogue", priority: "urgente" },
  { title: "Créer le Hero Banner (vidéo animée)", priority: "haute" },
  { title: "Respecter la charte graphique client", priority: "haute" },
  { title: "Créer la section Accueil avec produits phares", priority: "urgente" },
  { title: "Créer la section À propos", priority: "moyenne" },
  { title: "Créer la section Contact", priority: "haute" },
  { title: "Créer la section Avis clients", priority: "moyenne" },
  { title: "Ajouter des animations sur textes, boutons, images", priority: "moyenne" },
  { title: "Configurer le pied de page", priority: "haute", description: "Footer: Tous droits réservés. Propulsé par Adamkom by JJP" },
  { title: "Générer CGV, CGU, mentions légales, politique de confidentialité", priority: "haute", description: "Générer via Google IA — inclure conditions de vente e-commerce" },
  { title: "Configurer politique de retour et remboursement", priority: "haute" },
  { title: "Installer formulaire de contact (WPForms/Fluent Forms)", priority: "haute" },
  { title: "Configurer l'autorépondeur lié au mail pro", priority: "haute" },
  { title: "Intégrer l'extension de sécurité (Wordfence/Sucuri)", priority: "haute" },
  { title: "Intégrer l'extension de cookies (bannière consentement RGPD)", priority: "haute" },
  { title: "Intégrer l'outil d'inclusivité web (AdaBundle/RGAA)", priority: "haute" },
  { title: "Configurer sauvegarde auto (UpdraftPlus)", priority: "haute" },
  { title: "Intégrer l'extension de performance (WP Rocket)", priority: "haute" },
  { title: "Étude SEO et optimisation des performances du site", priority: "haute", description: "Audit SEO, balises meta, vitesse de chargement" },
  { title: "Tester le parcours d'achat complet (panier → paiement → confirmation)", priority: "urgente" },
  { title: "Tester compatibilité mobile et desktop", priority: "urgente" },
  { title: "Vérifier temps de chargement (< 3 secondes)", priority: "urgente" },
  { title: "Vérifier absence de fautes et mise en page", priority: "haute" },
  { title: "Présenter la 1ère version au client", priority: "urgente" },
];

const VITRINE_SITE_TASKS: ModuleTask[] = [
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
  { title: "Créer la section Accueil", priority: "urgente" },
  { title: "Créer la section Services / Prestations", priority: "haute" },
  { title: "Créer la section Contact", priority: "haute" },
  { title: "Créer la section À propos", priority: "moyenne" },
  { title: "Créer la section Avis clients", priority: "moyenne" },
  { title: "Ajouter des animations sur textes, boutons, images", priority: "moyenne" },
  { title: "Configurer le pied de page", priority: "haute", description: "Footer: Tous droits réservés. Propulsé par Adamkom by JJP" },
  { title: "Générer CGV, mentions légales, politique de confidentialité", priority: "haute", description: "Générer via Google IA" },
  { title: "Installer formulaire de contact (WPForms/Fluent Forms)", priority: "haute" },
  { title: "Configurer l'autorépondeur lié au mail pro", priority: "haute" },
  { title: "Vérifier les notifications (Admin + Client)", priority: "haute" },
  { title: "Intégrer l'extension de sécurité (Wordfence/Sucuri)", priority: "haute" },
  { title: "Intégrer l'extension de cookies (bannière consentement RGPD)", priority: "haute" },
  { title: "Intégrer l'outil d'inclusivité web (AdaBundle/RGAA)", priority: "haute", description: "Activer toutes les fonctionnalités d'accessibilité" },
  { title: "Configurer sauvegarde auto (UpdraftPlus)", priority: "haute" },
  { title: "Intégrer l'extension de performance (WP Rocket)", priority: "haute" },
  { title: "Étude SEO et optimisation des performances du site", priority: "haute", description: "Audit SEO, balises meta, vitesse de chargement" },
  { title: "Tester compatibilité mobile et desktop", priority: "urgente" },
  { title: "Vérifier temps de chargement (< 3 secondes)", priority: "urgente" },
  { title: "Vérifier absence de fautes et mise en page", priority: "haute" },
  { title: "Présenter la 1ère version au client", priority: "urgente" },
];

// GMB tasks with "has existing" vs "create new" logic
const GMB_TASKS_NEW: ModuleTask[] = [
  { title: "Créer la fiche Google My Business", priority: "urgente" },
  { title: "Vérifier la propriété de la fiche (courrier/téléphone)", priority: "urgente" },
  { title: "Optimiser la fiche GMB (horaires, catégories, photos)", priority: "haute" },
  { title: "Configurer le référencement local (NAP)", priority: "haute" },
  { title: "Optimiser les balises SEO (title, meta, alt)", priority: "haute" },
  { title: "Création des posts Google My Business", priority: "haute" },
  { title: "Gérer le flux Google du client", priority: "haute" },
];

const GMB_TASKS_EXISTING: ModuleTask[] = [
  { title: "Réclamer/obtenir l'accès à la fiche Google existante", priority: "urgente" },
  { title: "Audit complet de la fiche existante", priority: "urgente", description: "Captures avant/après pour rapport client" },
  { title: "Optimiser la fiche GMB (horaires, catégories, photos)", priority: "haute" },
  { title: "Corriger les informations NAP (nom, adresse, téléphone)", priority: "haute" },
  { title: "Ajouter/mettre à jour les photos professionnelles", priority: "haute" },
  { title: "Optimiser les balises SEO (title, meta, alt)", priority: "haute" },
  { title: "Création des posts Google My Business", priority: "haute" },
  { title: "Gérer le flux Google du client", priority: "haute" },
  { title: "Générer le rapport PDF de preuve de travail GMB", priority: "haute", description: "Rapport avant/après à envoyer au client" },
];

export function getPackModules(packType: string, siteType?: string, hasGmb?: boolean): ProjectModule[] {
  if (packType === "star_bizness_nfc") {
    return PACK_MODULES.star_bizness_nfc;
  }
  if (packType === "star_bizness_numerik") {
    const siteTasks = siteType === "ecommerce" ? ECOMMERCE_SITE_TASKS : VITRINE_SITE_TASKS;
    const gmbTasks = hasGmb ? GMB_TASKS_EXISTING : GMB_TASKS_NEW;
    
    return [
      {
        id: "site",
        name: siteType === "ecommerce" ? "Création du site E-commerce (WooCommerce)" : "Création du site Internet (One Page Landing)",
        icon: siteType === "ecommerce" ? "🛒" : "🌐",
        deadlineDays: siteType === "ecommerce" ? 7 : 3,
        tasks: siteTasks,
      },
      {
        id: "chatbot",
        name: "Chatbot IA & Porte-Parole",
        icon: "🤖",
        deadlineDays: 5,
        tasks: [
          { title: "Créer workspace client sur AICoaches", priority: "haute" },
          { title: "Intégration et génération de l'avatar pour le chatbot IA", priority: "haute", description: "Base prompt + infos entreprise" },
          { title: "Configurer le widget chat (thème, messages)", priority: "haute" },
          { title: "Intégrer le script chatbot sur le site", priority: "haute" },
          { title: "Créer l'accès backoffice client AICoaches", priority: "moyenne", description: "Credit: 80 tokens, Caractères: 80000" },
          { title: "Créer script de présentation (30s max) via ChatGPT", priority: "moyenne" },
          { title: "Intégration et génération de l'avatar pour le porte-parole", priority: "moyenne", description: "Synthesys Fullbody, Waving Hand, Langue FR" },
          { title: "Intégrer le script porte-parole sur le site (bas droite)", priority: "moyenne" },
        ],
      },
      {
        id: "nfc",
        name: "Carte BIZNESS NFC & Affiche connectée",
        icon: "💳",
        deadlineDays: 10,
        tasks: [
          { title: "Création de l'offre", priority: "haute" },
          { title: "Création des designs des services", priority: "haute" },
          { title: "Création des designs pour la vie client", priority: "haute" },
          { title: "Création des designs pour la vie Google", priority: "haute" },
          { title: "Création des designs pour les entreprises974", priority: "haute" },
          { title: "Création des designs pour le slogan", priority: "haute" },
          { title: "Création du design pour le Google Maps", priority: "haute" },
          { title: "Création du design pour le QR code", priority: "haute" },
          { title: "Création du backoffice client", priority: "haute" },
          { title: "Création de l'affiche connectée", priority: "haute" },
          { title: "Programmer/commander la carte NFC", priority: "haute" },
          { title: "Tester le scan NFC et le lien QR Code", priority: "haute" },
          { title: "Livrer la carte au client", priority: "urgente" },
        ],
      },
      {
        id: "seo",
        name: hasGmb ? "Optimisation fiche Google My Business existante" : "Création fiche Google My Business",
        icon: "🔍",
        deadlineDays: 5,
        tasks: gmbTasks,
      },
      {
        id: "annuaire",
        name: "Intégration Annuaire entreprises974",
        icon: "📒",
        deadlineDays: 7,
        tasks: [
          { title: "Ajout des informations de base du client", priority: "haute" },
          { title: "Création de la vidéo de présentation", priority: "haute" },
          { title: "Ajout des FAQ", priority: "haute" },
          { title: "Ajout de la description", priority: "haute" },
          { title: "Ajout des avis sur les entreprises974", priority: "haute" },
          { title: "Ajout des photos", priority: "haute" },
        ],
      },
      {
        id: "reseaux",
        name: "Réseaux sociaux & Publications",
        icon: "📱",
        deadlineDays: 10,
        tasks: [
          { title: "Créer/optimiser les comptes réseaux sociaux", priority: "haute" },
          { title: "Création du design visuel", priority: "haute" },
          { title: "Création du contenu visuel", priority: "haute" },
          { title: "Publication sur les réseaux sociaux", priority: "haute" },
          { title: "Intégrer les chatbots sur les réseaux sociaux", priority: "haute" },
        ],
      },
      {
        id: "formation",
        name: siteType === "ecommerce" 
          ? "Formation & Livraison client (site e-commerce)"
          : "Formation & Livraison client",
        icon: "📚",
        deadlineDays: 15,
        tasks: siteType === "ecommerce" ? [
          { title: "Former le client à la gestion de sa boutique WooCommerce", priority: "haute" },
          { title: "Former le client à la gestion des commandes", priority: "haute" },
          { title: "Former le client à la gestion des produits", priority: "haute" },
          { title: "Former le client à la gestion GMB", priority: "haute" },
          { title: "Former le client à l'utilisation NFC", priority: "haute" },
          { title: "Former le client aux réseaux sociaux", priority: "moyenne" },
          { title: "Livrer le projet complet et obtenir validation", priority: "urgente" },
        ] : [
          { title: "Former le client à la gestion GMB", priority: "haute" },
          { title: "Former le client à l'utilisation NFC", priority: "haute" },
          { title: "Former le client aux réseaux sociaux", priority: "moyenne" },
          { title: "Livrer le projet complet et obtenir validation", priority: "urgente" },
        ],
      },
    ];
  }
  return PACK_MODULES[packType] || [];
}

export const PACK_MODULES: Record<string, ProjectModule[]> = {
  star_bizness_numerik: [
    {
      id: "site",
      name: "Création du site Internet (One Page Landing)",
      icon: "🌐",
      deadlineDays: 3,
      tasks: VITRINE_SITE_TASKS,
    },
    {
      id: "chatbot",
      name: "Chatbot IA & Porte-Parole",
      icon: "🤖",
      deadlineDays: 5,
      tasks: [
        { title: "Créer workspace client sur AICoaches", priority: "haute" },
        { title: "Intégration et génération de l'avatar pour le chatbot IA", priority: "haute", description: "Base prompt + infos entreprise" },
        { title: "Configurer le widget chat (thème, messages)", priority: "haute" },
        { title: "Intégrer le script chatbot sur le site", priority: "haute" },
        { title: "Créer l'accès backoffice client AICoaches", priority: "moyenne", description: "Credit: 80 tokens, Caractères: 80000" },
        { title: "Créer script de présentation (30s max) via ChatGPT", priority: "moyenne" },
        { title: "Intégration et génération de l'avatar pour le porte-parole", priority: "moyenne", description: "Synthesys Fullbody, Waving Hand, Langue FR" },
        { title: "Intégrer le script porte-parole sur le site (bas droite)", priority: "moyenne" },
      ],
    },
    {
      id: "nfc",
      name: "Carte BIZNESS NFC & Affiche connectée",
      icon: "💳",
      deadlineDays: 10,
      tasks: [
        { title: "Création de l'offre", priority: "haute" },
        { title: "Création des designs des services", priority: "haute" },
        { title: "Création des designs pour la vie client", priority: "haute" },
        { title: "Création des designs pour la vie Google", priority: "haute" },
        { title: "Création des designs pour les entreprises974", priority: "haute" },
        { title: "Création des designs pour le slogan", priority: "haute" },
        { title: "Création du design pour le Google Maps", priority: "haute" },
        { title: "Création du design pour le QR code", priority: "haute" },
        { title: "Création du backoffice client", priority: "haute" },
        { title: "Création de l'affiche connectée", priority: "haute" },
        { title: "Programmer/commander la carte NFC", priority: "haute" },
        { title: "Tester le scan NFC et le lien QR Code", priority: "haute" },
        { title: "Livrer la carte au client", priority: "urgente" },
      ],
    },
    {
      id: "seo",
      name: "Gestion de fiche Google My Business",
      icon: "🔍",
      deadlineDays: 5,
      tasks: GMB_TASKS_NEW,
    },
    {
      id: "annuaire",
      name: "Intégration Annuaire entreprises974",
      icon: "📒",
      deadlineDays: 7,
      tasks: [
        { title: "Ajout des informations de base du client", priority: "haute" },
        { title: "Création de la vidéo de présentation", priority: "haute" },
        { title: "Ajout des FAQ", priority: "haute" },
        { title: "Ajout de la description", priority: "haute" },
        { title: "Ajout des avis sur les entreprises974", priority: "haute" },
        { title: "Ajout des photos", priority: "haute" },
      ],
    },
    {
      id: "reseaux",
      name: "Réseaux sociaux & Publications",
      icon: "📱",
      deadlineDays: 10,
      tasks: [
        { title: "Créer/optimiser les comptes réseaux sociaux", priority: "haute" },
        { title: "Création du design visuel", priority: "haute" },
        { title: "Création du contenu visuel", priority: "haute" },
        { title: "Publication sur les réseaux sociaux", priority: "haute" },
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
      name: "Carte BIZNESS NFC & Profil digital",
      icon: "💳",
      deadlineDays: 5,
      tasks: [
        { title: "Récupérer infos client (logo, coordonnées, réseaux)", priority: "urgente" },
        { title: "Création de l'offre", priority: "haute" },
        { title: "Création des designs des services", priority: "haute" },
        { title: "Création des designs pour la vie client", priority: "haute" },
        { title: "Création des designs pour la vie Google", priority: "haute" },
        { title: "Création des designs pour les entreprises974", priority: "haute" },
        { title: "Création des designs pour le slogan", priority: "haute" },
        { title: "Création du design pour le Google Maps", priority: "haute" },
        { title: "Création du design pour le QR code", priority: "haute" },
        { title: "Création du backoffice client", priority: "haute" },
        { title: "Création de l'affiche connectée", priority: "haute" },
        { title: "Commander / programmer la carte NFC", priority: "urgente" },
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
