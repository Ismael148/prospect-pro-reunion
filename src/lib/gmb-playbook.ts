// Guide Webmaster GMB — étapes pas-à-pas organisées en phases

export type GmbPhaseKey = "creation" | "optimisation" | "contenu" | "recurrent";

export interface GmbPlaybookStep {
  id: string;
  title: string;
  description: string;
  tip?: string;
  warning?: string;
  /** Column on client_gmb that this step toggles (optional). */
  checklistKey?: string;
  /** Direct link. If it starts with "gbp:" it's a template using {locationId}. */
  linkTemplate?: string;
  linkLabel?: string;
  /** Estimated time in minutes to complete. */
  eta?: number;
}

export interface GmbPlaybookPhase {
  key: GmbPhaseKey;
  title: string;
  emoji: string;
  description: string;
  steps: GmbPlaybookStep[];
}

const GBP = "https://business.google.com/n/{locationId}";
const GBP_SIMPLE = "https://business.google.com";

export const GMB_PLAYBOOK: GmbPlaybookPhase[] = [
  {
    key: "creation",
    title: "Phase 1 — Création de la fiche",
    emoji: "🏗️",
    description: "Poser les fondations : compte, adresse, catégorie, vérification.",
    steps: [
      {
        id: "account",
        title: "Créer le compte Google Business Profile",
        description:
          "Ouvre business.google.com avec l'adresse Gmail du client (ou une adresse dédiée agence). Renseigne le nom exact tel qu'il apparaît sur la devanture — pas de mots-clés ajoutés.",
        tip: "Utilise une adresse email dédiée par client si tu gères plusieurs fiches — évite les conflits.",
        checklistKey: "checklist_account_created",
        linkTemplate: "https://business.google.com/create",
        linkLabel: "Créer la fiche",
        eta: 10,
      },
      {
        id: "address",
        title: "Adresse et zone de service",
        description:
          "Choisis 'établissement avec adresse' si le client reçoit du public, sinon 'zone de service' avec liste des communes desservies.",
        warning:
          "Une adresse fausse peut suspendre la fiche. Vérifie la cohérence NAP (Nom/Adresse/Téléphone) avec le site web du client.",
        eta: 5,
      },
      {
        id: "category",
        title: "Catégorie principale + secondaires",
        description:
          "La catégorie principale est LE critère de classement local. Recherche celle utilisée par les meilleurs concurrents locaux. Ajoute 2-3 catégories secondaires pertinentes.",
        tip: "Exemple : 'Restaurant créole' > 'Restaurant' générique. Utilise l'outil pragmatic-tools.co pour trouver les catégories dispo.",
        eta: 5,
      },
      {
        id: "verification",
        title: "Demander la vérification postale",
        description:
          "Sélectionne 'carte postale' → Google envoie un code à l'adresse en 5 à 14 jours. Note la date dans les notes internes.",
        warning:
          "Après la demande, NE MODIFIE PAS l'adresse ni le nom pendant 30 jours — ça annule la vérification.",
        checklistKey: "checklist_postal_requested",
        eta: 5,
      },
      {
        id: "code",
        title: "Saisir le code de vérification",
        description:
          "Quand le client reçoit la carte, il te transmet le code à 5 chiffres. Saisis-le dans Google Business Manager pour activer la fiche.",
        tip: "Rappelle le client tous les 7 jours par SMS/email : la carte peut être jetée avec le courrier publicitaire.",
        checklistKey: "checklist_code_received",
        eta: 2,
      },
    ],
  },
  {
    key: "optimisation",
    title: "Phase 2 — Optimisation",
    emoji: "✨",
    description: "Compléter tous les champs pour maximiser la visibilité locale.",
    steps: [
      {
        id: "logo",
        title: "Ajouter le logo (200x200 min)",
        description:
          "Va dans Photos → Logo. Utilise le logo carré ou une version adaptée. Format PNG transparent recommandé.",
        checklistKey: "checklist_logo_added",
        linkTemplate: GBP_SIMPLE,
        linkLabel: "Ouvrir GBP",
        eta: 5,
      },
      {
        id: "cover",
        title: "Photo de couverture attractive",
        description:
          "Format 1080x608 minimum. Montre l'intérieur du lieu, un plat signature, l'équipe au travail — pas un simple visuel marketing.",
        tip: "Google fait tourner plusieurs couvertures selon l'utilisateur. Ajoute-en 3 à 5 différentes.",
        eta: 10,
      },
      {
        id: "photos",
        title: "10+ photos géolocalisées",
        description:
          "Extérieur, intérieur, produits, équipe. Idéalement photos prises sur place avec métadonnées GPS actives.",
        tip: "Astuce ranking : photos géolocalisées = signal fort pour Google que le lieu existe vraiment.",
        checklistKey: "checklist_photos_added",
        eta: 20,
      },
      {
        id: "hours",
        title: "Horaires précis + jours spéciaux",
        description:
          "Renseigne les horaires réguliers ET les horaires spéciaux (jours fériés Réunion : 20 déc Abolition esclavage, 1er nov, etc.).",
        checklistKey: "checklist_hours_set",
        eta: 5,
      },
      {
        id: "description",
        title: "Description SEO (750 caractères)",
        description:
          "Intègre les 3-5 mots-clés principaux (ex : 'restaurant Saint-Pierre', 'cuisine créole', 'plats à emporter'). Décris ce qui vous rend unique.",
        warning:
          "Pas de lien, pas de HTML, pas de promotions/prix — Google refuse. Focus expertise et localisation.",
        checklistKey: "checklist_description_added",
        eta: 15,
      },
      {
        id: "attributes",
        title: "Attributs et services",
        description:
          "Coche tous les attributs pertinents : accès handicapé, WiFi, terrasse, paiement CB, livraison, végétarien, etc. Renseigne les services proposés avec prix indicatifs.",
        eta: 10,
      },
      {
        id: "products",
        title: "Produits / Menu",
        description:
          "Ajoute au moins 6 produits/services avec photo, description, prix. Pour restaurants : lien vers le menu PDF ou intégration directe.",
        eta: 30,
      },
    ],
  },
  {
    key: "contenu",
    title: "Phase 3 — Contenu initial",
    emoji: "🎯",
    description: "Le lancement — 1er post, questions/réponses, appel à avis.",
    steps: [
      {
        id: "first-post",
        title: "Premier post de lancement",
        description:
          "Type 'Nouveauté' avec photo attractive + CTA (Appeler, En savoir plus). Annonce l'ouverture ou une actualité forte.",
        eta: 15,
      },
      {
        id: "qa",
        title: "Créer 3-5 Q&A anticipées",
        description:
          "Poste toi-même les questions fréquentes (parking, réservation, moyens de paiement) et réponds-y depuis le compte pro. Fait gagner du temps aux prospects.",
        tip: "Les Q&A apparaissent directement dans le Knowledge Panel — grosse visibilité.",
        eta: 20,
      },
      {
        id: "first-reviews",
        title: "Solliciter les 5 premiers avis",
        description:
          "Envoie le lien 'demander un avis' aux clients satisfaits connus. Objectif : 5 avis 5⭐ pour lancer la dynamique.",
        warning:
          "Interdiction absolue d'acheter des avis ou d'utiliser des VPN — suspension définitive garantie.",
        eta: 10,
      },
    ],
  },
  {
    key: "recurrent",
    title: "Phase 4 — Entretien récurrent",
    emoji: "🔁",
    description: "Ce qu'il faut faire chaque semaine / chaque mois.",
    steps: [
      {
        id: "weekly-post",
        title: "1 post par semaine minimum",
        description:
          "Alterne : Nouveauté, Événement, Offre. Chaque post = signal de fraîcheur pour Google. Photos + CTA obligatoires.",
        tip: "Programme les posts du mois d'un coup dans un tableur, publie-les manuellement chaque lundi.",
        eta: 15,
      },
      {
        id: "review-reply",
        title: "Répondre à 100% des avis <48h",
        description:
          "Réponse personnalisée (jamais copié-collé). Remercie pour les positifs, résous professionnellement les négatifs.",
        warning:
          "Un avis 1⭐ sans réponse fait plus de mal qu'un avis 3⭐. Le ratio de réponse est visible et pèse sur la conversion.",
        eta: 5,
      },
      {
        id: "monthly-photos",
        title: "2 photos / semaine",
        description:
          "Ajoute régulièrement de nouvelles photos — extérieur selon la saison, plats du moment, chantiers en cours. Signal fort de fraîcheur.",
        eta: 5,
      },
      {
        id: "insights",
        title: "Analyser les Insights mensuels",
        description:
          "Regarde le nb de recherches, appels, itinéraires, clics site. Repère la tendance et ajuste (plus de photos si views baissent, changer catégorie si mauvaise cible).",
        eta: 15,
      },
    ],
  },
];

export function computePhaseProgress(
  phase: GmbPlaybookPhase,
  gmb: Record<string, any>
): { done: number; total: number; pct: number } {
  const stepsWithKey = phase.steps.filter((s) => s.checklistKey);
  const total = stepsWithKey.length;
  if (total === 0) return { done: 0, total: 0, pct: 0 };
  const done = stepsWithKey.filter((s) => gmb[s.checklistKey!]).length;
  return { done, total, pct: Math.round((done / total) * 100) };
}
