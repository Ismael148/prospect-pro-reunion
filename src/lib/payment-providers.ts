import type { BeginnerStep } from "@/components/tuto/BeginnerGuide";
import type { FAQItem } from "@/components/tuto/TutoFAQ";

export type PaymentProviderKey =
  | "stripe"
  | "paypal"
  | "alma"
  | "mollie"
  | "lyra"
  | "helloasso"
  | "sumup";

export interface CredentialField {
  key: string;
  label: string;
  placeholder: string;
  required?: boolean;
  type?: "text" | "password";
  helpText?: string;
}

export interface ProviderConfig {
  key: PaymentProviderKey;
  name: string;
  tagline: string;
  color: string;
  logoUrl: string;
  logoFallback: string; // emoji fallback if image fails
  description: string;
  bestFor: string[];
  pricing: string;
  hasTestMode: boolean;
  signupUrl: string;
  dashboardUrl: string;
  testFields: CredentialField[];
  liveFields: CredentialField[];
  testSteps: { title: string; description: string; link?: string }[];
  liveSteps: { title: string; description: string; link?: string }[];
  beginnerGuide?: BeginnerStep[];
  news?: string;
}

// Logos officiels via SimpleIcons CDN — fiables et toujours à jour
const SI = (slug: string, color = "000000") =>
  `https://cdn.simpleicons.org/${slug}/${color}`;

export const PAYMENT_PROVIDERS: Record<PaymentProviderKey, ProviderConfig> = {
  stripe: {
    key: "stripe",
    name: "Stripe",
    tagline: "Le standard mondial du paiement en ligne",
    color: "#635BFF",
    logoUrl: SI("stripe", "635BFF"),
    logoFallback: "💳",
    description:
      "Stripe est utilisé par des millions d'entreprises (Amazon, Shopify, Lyft). Cartes, Apple Pay, Google Pay, SEPA, Bancontact, abonnements — tout est géré.",
    bestFor: ["E-commerce", "SaaS / abonnements", "Marketplaces", "Apps mobiles"],
    pricing: "1,4% + 0,25€ par transaction CB EU · 2,9% + 0,25€ hors UE",
    hasTestMode: true,
    signupUrl: "https://dashboard.stripe.com/register",
    dashboardUrl: "https://dashboard.stripe.com",
    testFields: [
      { key: "publishable_key_test", label: "Clé publique TEST", placeholder: "pk_test_...", required: true, helpText: "Commence par pk_test_" },
      { key: "secret_key_test", label: "Clé secrète TEST", placeholder: "sk_test_...", required: true, type: "password", helpText: "Commence par sk_test_" },
      { key: "webhook_secret_test", label: "Webhook secret TEST (optionnel)", placeholder: "whsec_...", type: "password" },
    ],
    liveFields: [
      { key: "publishable_key_live", label: "Clé publique LIVE", placeholder: "pk_live_...", required: true, helpText: "Commence par pk_live_" },
      { key: "secret_key_live", label: "Clé secrète LIVE", placeholder: "sk_live_...", required: true, type: "password", helpText: "Commence par sk_live_" },
      { key: "webhook_secret_live", label: "Webhook secret LIVE (optionnel)", placeholder: "whsec_...", type: "password" },
    ],
    testSteps: [
      { title: "Créez un compte Stripe gratuit", description: "Allez sur dashboard.stripe.com/register.", link: "https://dashboard.stripe.com/register" },
      { title: "Activez le mode TEST", description: "Toggle 'Mode test' en haut à droite." },
      { title: "Récupérez vos clés API TEST", description: "Développeurs > Clés API.", link: "https://dashboard.stripe.com/test/apikeys" },
      { title: "Envoyez-nous les clés", description: "Via le formulaire ci-dessous." },
    ],
    liveSteps: [
      { title: "Activez votre compte Stripe", description: "SIRET, RIB, identité.", link: "https://dashboard.stripe.com/account" },
      { title: "Basculez en mode LIVE", description: "Désactivez 'Mode test'." },
      { title: "Récupérez les clés LIVE", description: "Développeurs > Clés API (pk_live_, sk_live_).", link: "https://dashboard.stripe.com/apikeys" },
      { title: "Envoyez-nous les clés LIVE", description: "Activation des vrais paiements après tests." },
    ],
    beginnerGuide: [
      {
        title: "Préparez vos documents avant de commencer",
        description: "Avant de cliquer sur 'Inscription', regroupez ces documents pour gagner du temps :",
        substeps: [
          "🆔 Pièce d'identité (CNI ou passeport) en cours de validité",
          "🏢 Numéro SIRET ou Kbis de moins de 3 mois",
          "🏦 RIB de votre compte professionnel (où Stripe versera l'argent)",
          "📞 Téléphone portable (pour la vérification SMS)",
          "💼 Site web ou nom de domaine de votre activité",
        ],
        tip: "Si vous êtes auto-entrepreneur, votre SIRET et votre RIB perso suffisent.",
      },
      {
        title: "Inscrivez-vous sur Stripe",
        description: "Cliquez sur le bouton ci-dessous, entrez votre email, créez un mot de passe fort et sélectionnez 'France' comme pays.",
        link: "https://dashboard.stripe.com/register",
        warning: "Choisissez bien le pays 'France' (ou Réunion 974) — il n'est PAS modifiable après !",
      },
      {
        title: "Validez votre email",
        description: "Stripe vous envoie un lien de confirmation. Cliquez dessus dans les 5 minutes (vérifiez aussi le dossier 'Spam').",
        tip: "Si vous ne trouvez pas l'email, demandez un renvoi depuis la page de connexion.",
      },
      {
        title: "Récupérez d'abord les clés TEST (sans danger)",
        description: "En haut à droite du dashboard Stripe, basculez sur le mode 'Test' (l'interface devient orange). Allez dans Développeurs > Clés API.",
        link: "https://dashboard.stripe.com/test/apikeys",
        substeps: [
          "Copiez la <strong>Clé publique</strong> qui commence par <code>pk_test_...</code>",
          "Cliquez sur 'Révéler la clé secrète' puis copiez celle qui commence par <code>sk_test_...</code>",
        ],
        tip: "Les clés TEST permettent de simuler des paiements sans vrai argent. Aucun risque !",
      },
      {
        title: "Envoyez-nous vos clés TEST via le formulaire",
        description: "Collez les 2 clés dans le formulaire en bas de cette page. Nous installerons Stripe sur votre site et ferons des tests.",
      },
      {
        title: "Activez votre compte pour passer en LIVE",
        description: "Une fois les tests validés, complétez l'activation : Stripe vous demande votre SIRET, votre RIB et une pièce d'identité.",
        link: "https://dashboard.stripe.com/account/onboarding",
        substeps: [
          "Type d'entreprise (SARL, SAS, auto-entrepreneur…)",
          "Adresse de l'entreprise + activité",
          "RIB pour les virements (sous 7 jours après chaque vente)",
          "Vérification d'identité par photo (carte d'identité + selfie)",
        ],
        warning: "Sans activation, vous ne pouvez recevoir aucun vrai paiement.",
      },
      {
        title: "Récupérez les clés LIVE et envoyez-les",
        description: "Une fois le compte activé, désactivez le 'Mode test' et récupérez les clés qui commencent par <code>pk_live_...</code> et <code>sk_live_...</code>. Envoyez-les via le même formulaire en cochant 'PRODUCTION'.",
      },
    ],
    news: "✨ Nouveau 2025 : Stripe Tax inclus, paiements en plusieurs fois disponibles en France.",
  },

  paypal: {
    key: "paypal",
    name: "PayPal Pro / Business",
    tagline: "La référence mondiale, rassurante pour vos clients",
    color: "#003087",
    logoUrl: SI("paypal", "003087"),
    logoFallback: "🅿️",
    description:
      "PayPal Business permet d'accepter cartes + comptes PayPal. Idéal pour rassurer les acheteurs hésitants. L'API REST utilise un Client ID + Secret.",
    bestFor: ["E-commerce B2C", "International", "Rassurance acheteur", "Dons"],
    pricing: "2,9% + 0,35€ (CB EU) · 3,4% + 0,35€ (cross-border)",
    hasTestMode: true,
    signupUrl: "https://www.paypal.com/fr/business",
    dashboardUrl: "https://developer.paypal.com/dashboard/",
    testFields: [
      { key: "client_id_sandbox", label: "Client ID Sandbox", placeholder: "AeA1Q...", required: true },
      { key: "client_secret_sandbox", label: "Secret Sandbox", placeholder: "EFkX...", required: true, type: "password" },
      { key: "merchant_email_sandbox", label: "Email marchand Sandbox", placeholder: "sb-merchant@business.example.com" },
    ],
    liveFields: [
      { key: "client_id_live", label: "Client ID LIVE", placeholder: "AeA1Q...", required: true },
      { key: "client_secret_live", label: "Secret LIVE", placeholder: "EFkX...", required: true, type: "password" },
      { key: "merchant_email_live", label: "Email marchand PayPal", placeholder: "vous@entreprise.com", required: true },
    ],
    testSteps: [
      { title: "Compte développeur PayPal", description: "Connectez-vous sur developer.paypal.com.", link: "https://developer.paypal.com/dashboard/" },
      { title: "Créez une App Sandbox", description: "Apps & Credentials > Sandbox > Create App." },
      { title: "Récupérez Client ID + Secret Sandbox", description: "Cliquez sur l'app puis copiez les deux." },
      { title: "Envoyez-nous", description: "Via le formulaire." },
    ],
    liveSteps: [
      { title: "Compte PayPal Business validé", description: "Vérifiez Business + validation.", link: "https://www.paypal.com/businessmanage/account" },
      { title: "Apps & Credentials > LIVE", description: "Basculez Sandbox → Live, créez App LIVE." },
      { title: "Récupérez Client ID + Secret LIVE", description: "Copiez les deux." },
      { title: "Envoyez + email marchand", description: "Email PayPal qui recevra les paiements." },
    ],
    beginnerGuide: [
      {
        title: "Convertissez votre compte PayPal en compte Business",
        description: "Si vous avez déjà un compte PayPal personnel, vous devez créer un compte Business séparé (PayPal n'autorise pas la conversion).",
        link: "https://www.paypal.com/fr/business",
        substeps: [
          "Allez sur paypal.com/fr/business",
          "Cliquez sur <strong>S'inscrire</strong>",
          "Choisissez <strong>Compte Business</strong>",
          "Utilisez un email <strong>différent</strong> de votre compte personnel",
        ],
        warning: "Vous ne pouvez PAS utiliser le même email que votre compte personnel PayPal.",
      },
      {
        title: "Renseignez vos infos d'entreprise",
        description: "PayPal vous demande votre type d'activité, votre SIRET, votre adresse et un téléphone. Soyez précis : un mauvais code activité peut bloquer votre compte.",
        substeps: [
          "Type d'activité (le plus précis possible)",
          "Numéro SIRET + raison sociale",
          "Adresse professionnelle complète",
          "Téléphone direct (pas de standard)",
        ],
      },
      {
        title: "Vérifiez votre email + téléphone",
        description: "PayPal envoie un lien par email et un code SMS. Validez les deux pour débloquer votre compte.",
      },
      {
        title: "Liez votre compte bancaire (RIB)",
        description: "Indispensable pour récupérer l'argent encaissé. PayPal fait 2 micro-virements de quelques centimes pour vérifier le RIB.",
        substeps: [
          "Paramètres > Banque > Ajouter une banque",
          "Entrez votre IBAN + BIC",
          "Attendez 2-3 jours les micro-virements",
          "Confirmez les montants exacts dans PayPal",
        ],
        tip: "Vous pouvez utiliser votre PayPal en attendant : la vérification du RIB sert juste pour les retraits.",
      },
      {
        title: "Activez l'accès API Développeur",
        description: "C'est cette étape qui bloque le plus de débutants ! Allez sur developer.paypal.com et connectez-vous avec votre compte Business.",
        link: "https://developer.paypal.com/dashboard/",
      },
      {
        title: "Créez votre première App API (Sandbox)",
        description: "Dans le menu, cliquez sur <strong>Apps & Credentials</strong> puis vérifiez que vous êtes en mode <strong>Sandbox</strong> (toggle en haut). Cliquez sur <strong>Create App</strong>.",
        substeps: [
          "Donnez un nom (ex: <em>Adamkom Test</em>)",
          "Type : <strong>Merchant</strong>",
          "Validez — PayPal génère <strong>Client ID</strong> et <strong>Secret</strong>",
          "Cliquez sur l'œil 👁️ pour révéler le Secret",
        ],
        tip: "Copiez ces valeurs immédiatement dans un endroit sûr — vous en aurez besoin pour le formulaire.",
      },
      {
        title: "Refaites pareil en mode LIVE",
        description: "Une fois les tests validés, retournez sur Apps & Credentials, basculez sur <strong>Live</strong> en haut, et créez une App LIVE. Récupérez les nouveaux Client ID + Secret et envoyez-les.",
      },
    ],
  },

  alma: {
    key: "alma",
    name: "Alma",
    tagline: "Paiement en 2x, 3x, 4x — boost de conversion +20%",
    color: "#FA5022",
    logoUrl: "https://cdn.brandfetch.io/almapay.com/w/512/h/512/logo?c=1id_ZTzXPF9jTOlRVxR",
    logoFallback: "🟣",
    description:
      "Alma permet à vos clients de payer en plusieurs fois sans frais (vous payez une commission). Très populaire en France et DOM-TOM.",
    bestFor: ["E-commerce >50€", "Mobilier / mode", "Bien-être", "Réunion / DOM"],
    pricing: "Commission ~1,7% à 5,9% selon paiement choisi (2x/3x/4x/10x)",
    hasTestMode: true,
    signupUrl: "https://dashboard.getalma.eu/signup",
    dashboardUrl: "https://dashboard.getalma.eu",
    testFields: [
      { key: "api_key_test", label: "Clé API TEST (sandbox)", placeholder: "sk_test_...", required: true, type: "password" },
      { key: "merchant_id_test", label: "Merchant ID TEST", placeholder: "merchant_..." },
    ],
    liveFields: [
      { key: "api_key_live", label: "Clé API LIVE", placeholder: "sk_live_...", required: true, type: "password" },
      { key: "merchant_id_live", label: "Merchant ID LIVE", placeholder: "merchant_...", required: true },
    ],
    testSteps: [
      { title: "Inscription Alma", description: "Compte sur dashboard.getalma.eu.", link: "https://dashboard.getalma.eu/signup" },
      { title: "Mode Sandbox", description: "Bascule Sandbox en haut." },
      { title: "Paramètres > API Keys", description: "Clé TEST + Merchant ID." },
      { title: "Envoyez-nous", description: "Tests 2x/3x/4x avec CB de test Alma." },
    ],
    liveSteps: [
      { title: "Validation KYC Alma", description: "SIRET + justificatifs." },
      { title: "Mode Production activé", description: "Bascule Production." },
      { title: "Récupérez clé LIVE", description: "Paramètres > API Keys > Production." },
    ],
    beginnerGuide: [
      {
        title: "Vérifiez l'éligibilité de votre activité",
        description: "Alma accepte la plupart des e-commerces avec un panier moyen >50€. Sont exclus : tabac, alcool fort en ligne, jeux d'argent, services financiers.",
        tip: "À La Réunion, Alma fonctionne très bien — beaucoup de clients adorent payer en 4x.",
      },
      {
        title: "Inscrivez-vous sur Alma",
        description: "Allez sur dashboard.getalma.eu/signup et créez votre compte avec votre email pro.",
        link: "https://dashboard.getalma.eu/signup",
      },
      {
        title: "Remplissez votre dossier KYC",
        description: "Alma vérifie chaque marchand. Préparez :",
        substeps: [
          "Kbis ou avis SIRENE de moins de 3 mois",
          "RIB du compte qui recevra les paiements",
          "Pièce d'identité du dirigeant + justif de domicile",
          "URL du site web ou maquette si en construction",
          "Estimation de votre chiffre d'affaires mensuel",
        ],
      },
      {
        title: "Attendez la validation (24-72h)",
        description: "Alma examine votre dossier. Vous recevez un email d'approbation et l'accès au dashboard.",
        warning: "Si refus, vous recevez un mail expliquant pourquoi (ex: site indisponible, document manquant).",
      },
      {
        title: "Récupérez vos clés en mode SANDBOX d'abord",
        description: "Une fois connecté au dashboard, basculez sur 'Sandbox' (toggle en haut) puis allez dans <strong>Paramètres > API Keys</strong>.",
        substeps: [
          "Copiez la <strong>Clé API Sandbox</strong> (commence par <code>sk_test_</code>)",
          "Notez votre <strong>Merchant ID</strong>",
        ],
        tip: "En mode Sandbox, Alma fournit des numéros de carte de test (4111 1111 1111 1111) pour simuler tous les scénarios.",
      },
      {
        title: "Passez en Production une fois les tests OK",
        description: "Basculez sur 'Production' et récupérez la clé LIVE (commence par <code>sk_live_</code>). Envoyez-la via le formulaire en cochant 'PRODUCTION'.",
      },
    ],
  },

  mollie: {
    key: "mollie",
    name: "Mollie",
    tagline: "Multi-méthodes européennes (CB, iDEAL, Bancontact, SOFORT)",
    color: "#000000",
    logoUrl: "/logos/mollie.svg",
    logoFallback: "🌷",
    description:
      "Mollie est l'alternative européenne à Stripe. Excellent support, méthodes locales (iDEAL Pays-Bas, Bancontact Belgique, SOFORT Allemagne).",
    bestFor: ["E-commerce EU", "Multi-méthodes", "Marchands BeNeLux"],
    pricing: "1,8% + 0,25€ (CB EU) · 0,29€ par iDEAL",
    hasTestMode: true,
    signupUrl: "https://www.mollie.com/dashboard/signup",
    dashboardUrl: "https://www.mollie.com/dashboard",
    testFields: [
      { key: "api_key_test", label: "Clé API TEST", placeholder: "test_...", required: true, type: "password" },
    ],
    liveFields: [
      { key: "api_key_live", label: "Clé API LIVE", placeholder: "live_...", required: true, type: "password" },
      { key: "profile_id", label: "Profile ID (optionnel)", placeholder: "pfl_..." },
    ],
    testSteps: [
      { title: "Compte Mollie", description: "Inscription sur mollie.com.", link: "https://www.mollie.com/dashboard/signup" },
      { title: "Développeurs > Clés API", description: "Dashboard > Développeurs > Clés API." },
      { title: "Copiez la clé TEST", description: "Commence par 'test_'." },
      { title: "Envoyez-nous", description: "Tests CB, iDEAL, Bancontact." },
    ],
    liveSteps: [
      { title: "Activation du compte", description: "Infos d'entreprise + RIB." },
      { title: "Récupérez la clé LIVE", description: "Développeurs > Clés API > 'live_...'" },
    ],
    beginnerGuide: [
      {
        title: "Créez votre compte Mollie",
        description: "Inscription en 2 minutes sur mollie.com avec email pro.",
        link: "https://www.mollie.com/dashboard/signup",
      },
      {
        title: "Récupérez la clé TEST tout de suite",
        description: "Pas besoin d'activation pour tester ! Dès la création du compte, allez dans <strong>Développeurs > Clés API</strong> et copiez la clé qui commence par <code>test_</code>.",
        tip: "Mollie est l'un des plus rapides à mettre en place pour faire des tests.",
      },
      {
        title: "Activez votre compte pour le mode LIVE",
        description: "Cliquez sur 'Activer le compte'. Mollie demande :",
        substeps: [
          "Type d'entreprise + SIRET",
          "RIB où seront virés les paiements",
          "Pièce d'identité + selfie",
          "URL du site web et description de l'activité",
        ],
      },
      {
        title: "Validez les méthodes de paiement souhaitées",
        description: "Dans 'Méthodes de paiement', activez celles que vous voulez : Cartes bancaires, Apple Pay, PayPal, virement SEPA, etc.",
      },
      {
        title: "Récupérez la clé LIVE et envoyez-la",
        description: "Développeurs > Clés API > clé qui commence par <code>live_</code>. Collez-la dans le formulaire en cochant 'PRODUCTION'.",
      },
    ],
  },

  lyra: {
    key: "lyra",
    name: "Lyra / SystemPay",
    tagline: "Le partenaire des banques françaises (BRED, Crédit Agricole)",
    color: "#0070BA",
    logoUrl: "/logos/lyra.png",
    logoFallback: "🔷",
    description:
      "Lyra (ex-PayZen / SystemPay) est utilisé par les banques françaises. Idéal à La Réunion : BRED, Crédit Agricole, Banque Populaire, Crédit Mutuel.",
    bestFor: ["Banques françaises", "La Réunion", "Marchands BRED/CA", "TPE/PME"],
    pricing: "Selon contrat banque (~0,5% à 2% + frais fixe)",
    hasTestMode: true,
    signupUrl: "https://secure.systempay.fr",
    dashboardUrl: "https://secure.systempay.fr/vads-merchant/",
    testFields: [
      { key: "shop_id", label: "Identifiant boutique (Shop ID)", placeholder: "12345678", required: true },
      { key: "test_key", label: "Clé de test", placeholder: "1111111111111111", required: true, type: "password" },
      { key: "hmac_test", label: "HMAC SHA-256 TEST", placeholder: "...", type: "password" },
    ],
    liveFields: [
      { key: "shop_id", label: "Identifiant boutique", placeholder: "12345678", required: true },
      { key: "prod_key", label: "Clé de production", placeholder: "...", required: true, type: "password" },
      { key: "hmac_prod", label: "HMAC SHA-256 PRODUCTION", placeholder: "...", required: true, type: "password" },
    ],
    testSteps: [
      { title: "Contrat VAD à votre banque", description: "Conseiller BRED / CA / BP." },
      { title: "Identifiants Lyra", description: "Banque fournit Shop ID + accès Back Office." },
      { title: "Connexion Back Office", description: "secure.systempay.fr > Paramétrage > Boutique > Clés.", link: "https://secure.systempay.fr" },
      { title: "Récupérez clés TEST + HMAC", description: "Onglet 'Clés et HMAC'." },
    ],
    liveSteps: [
      { title: "Validation par la banque", description: "Tests OK = activation PRODUCTION." },
      { title: "Récupérez clés PRODUCTION", description: "Même endroit dans Back Office Lyra." },
    ],
    beginnerGuide: [
      {
        title: "Contactez votre conseiller bancaire",
        description: "Lyra (ex-PayZen) n'est pas une inscription en ligne libre : c'est votre banque qui ouvre le contrat. Demandez un <strong>contrat de Vente À Distance (VAD)</strong>.",
        warning: "Comptez 1-3 semaines selon la banque. À La Réunion : BRED, Crédit Agricole, Banque Populaire, Crédit Mutuel.",
      },
      {
        title: "Signez le contrat VAD + payez les frais",
        description: "Frais d'ouverture ~30-80€ + abonnement mensuel ~10-25€ + commission par transaction selon votre négociation.",
        tip: "Négociez bien le pourcentage par transaction selon votre volume prévisionnel.",
      },
      {
        title: "Recevez vos identifiants Lyra par email",
        description: "Une fois le contrat actif, la banque (ou Lyra directement) vous envoie :",
        substeps: [
          "Votre <strong>Shop ID</strong> (8 chiffres, ex: 12345678)",
          "Un mot de passe pour accéder au Back Office Marchand",
          "Un lien vers <code>secure.systempay.fr</code>",
        ],
      },
      {
        title: "Connectez-vous au Back Office Lyra",
        description: "Utilisez le lien et les identifiants reçus.",
        link: "https://secure.systempay.fr",
      },
      {
        title: "Récupérez les clés TEST",
        description: "Dans le menu, allez dans <strong>Paramétrage > Boutique</strong> puis cliquez sur l'onglet <strong>Clés</strong>.",
        substeps: [
          "Copiez la <strong>Clé de test</strong> (16 chiffres)",
          "Copiez le <strong>HMAC SHA-256 TEST</strong> (longue chaîne)",
        ],
      },
      {
        title: "Envoyez-nous + faites valider par la banque",
        description: "Après nos tests, la banque doit valider en pré-production avant d'activer le mode PRODUCTION. Récupérez ensuite la clé PROD au même endroit.",
      },
    ],
  },

  helloasso: {
    key: "helloasso",
    name: "HelloAsso",
    tagline: "100% gratuit pour les associations 1901",
    color: "#0066FF",
    logoUrl: "/logos/helloasso.png",
    logoFallback: "💙",
    description:
      "HelloAsso est gratuit pour les associations (financement par pourboires des donateurs). Solution leader pour collectes, adhésions, billetterie.",
    bestFor: ["Associations 1901", "Collectes de dons", "Adhésions", "Événements"],
    pricing: "0% — financé par les pourboires volontaires des donateurs",
    hasTestMode: false,
    signupUrl: "https://www.helloasso.com/inscription",
    dashboardUrl: "https://www.helloasso.com/connexion",
    testFields: [],
    liveFields: [
      { key: "client_id", label: "Client ID API", placeholder: "...", required: true },
      { key: "client_secret", label: "Client Secret API", placeholder: "...", required: true, type: "password" },
      { key: "organization_slug", label: "Slug de l'association", placeholder: "mon-association" },
    ],
    testSteps: [],
    liveSteps: [
      { title: "Compte HelloAsso", description: "Inscription gratuite + justificatifs.", link: "https://www.helloasso.com/inscription" },
      { title: "Demande accès API", description: "Paramètres > Intégrations > Accès API." },
      { title: "Récupérez Client ID + Secret", description: "+ slug de votre association." },
    ],
    beginnerGuide: [
      {
        title: "Vérifiez que vous êtes bien une association loi 1901",
        description: "HelloAsso est réservé aux associations déclarées. Préparez votre récépissé de déclaration en préfecture (RNA W...) et vos statuts.",
        warning: "Les fondations, syndicats et entreprises ne sont pas éligibles.",
      },
      {
        title: "Créez le compte HelloAsso",
        description: "Inscription gratuite avec :",
        link: "https://www.helloasso.com/inscription",
        substeps: [
          "Email du président ou trésorier",
          "Numéro RNA (W751234567)",
          "Statuts de l'association (PDF)",
          "Procès-verbal de la dernière AG",
          "RIB de l'association",
        ],
      },
      {
        title: "Validation par l'équipe HelloAsso",
        description: "Délai 48-72h. Vous recevez un email de confirmation et accès au tableau de bord.",
      },
      {
        title: "Demandez l'accès API",
        description: "Allez dans <strong>Paramètres > Intégrations > Accès API</strong>. Cliquez sur <strong>Demander un accès</strong>. Précisez votre cas d'usage (ex: 'intégration sur site web Adamkom').",
        tip: "L'accès API est validé manuellement par HelloAsso, comptez 24-48h.",
      },
      {
        title: "Récupérez Client ID + Secret + Slug",
        description: "Une fois validé, vous voyez 3 valeurs à copier :",
        substeps: [
          "<strong>Client ID</strong> (chaîne de caractères)",
          "<strong>Client Secret</strong> (long mot de passe — copiez-le immédiatement, vous ne le reverrez plus)",
          "<strong>Slug</strong> de votre association (ex: <code>mon-asso-974</code> — visible dans l'URL de votre page HelloAsso)",
        ],
        warning: "Le Client Secret n'est affiché qu'UNE SEULE FOIS — sauvegardez-le bien !",
      },
    ],
  },

  sumup: {
    key: "sumup",
    name: "Sumup",
    tagline: "TPE physique + lien de paiement",
    color: "#3399FF",
    logoUrl: "/logos/sumup.png",
    logoFallback: "🟦",
    description:
      "Sumup est connu pour ses TPE mobiles. Propose aussi des liens de paiement et une API pour e-commerce. Sans abonnement.",
    bestFor: ["Restos", "Boutiques physiques", "Liens paiement", "Petits e-commerces"],
    pricing: "1,75% par transaction CB · TPE à partir de 39€",
    hasTestMode: true,
    signupUrl: "https://me.sumup.com/fr-fr/signup",
    dashboardUrl: "https://me.sumup.com",
    testFields: [
      { key: "client_id_sandbox", label: "Client ID Sandbox", placeholder: "cc_...", required: true },
      { key: "client_secret_sandbox", label: "Secret Sandbox", placeholder: "...", required: true, type: "password" },
    ],
    liveFields: [
      { key: "client_id_live", label: "Client ID LIVE", placeholder: "cc_...", required: true },
      { key: "client_secret_live", label: "Secret LIVE", placeholder: "...", required: true, type: "password" },
      { key: "merchant_code", label: "Code marchand", placeholder: "M...", required: true },
    ],
    testSteps: [
      { title: "Compte Sumup Developer", description: "developer.sumup.com.", link: "https://developer.sumup.com" },
      { title: "App OAuth Sandbox", description: "Dashboard > Apps > New App > Sandbox." },
      { title: "Récupérez Client ID + Secret", description: "Copiez les deux." },
    ],
    liveSteps: [
      { title: "Compte Sumup Business validé", description: "SIRET + RIB." },
      { title: "App OAuth LIVE", description: "App en mode Production." },
      { title: "Récupérez clés + Merchant Code", description: "Client ID, Secret, Merchant Code." },
    ],
    beginnerGuide: [
      {
        title: "Créez votre compte Sumup",
        description: "Inscription gratuite sans abonnement ni frais d'ouverture.",
        link: "https://me.sumup.com/fr-fr/signup",
        substeps: [
          "Email + mot de passe",
          "Type d'activité",
          "SIRET ou statut auto-entrepreneur",
          "RIB (paiement à J+1)",
        ],
      },
      {
        title: "Validez votre identité",
        description: "Sumup demande une pièce d'identité + selfie via leur app mobile (le plus rapide). Validation en 1-24h.",
      },
      {
        title: "Récupérez votre Code Marchand",
        description: "Visible dans <strong>Profil > Informations entreprise</strong>. Format : <code>M+chiffres</code> (ex: M12345678).",
        tip: "C'est cette valeur qui identifie votre boutique dans toutes les API Sumup.",
      },
      {
        title: "Activez l'accès Développeur",
        description: "Allez sur developer.sumup.com et connectez-vous avec le même compte. Cliquez sur <strong>Apps & API > Create new app</strong>.",
        link: "https://developer.sumup.com",
      },
      {
        title: "Choisissez Sandbox d'abord",
        description: "Toggle 'Environment' sur Sandbox. Donnez un nom à l'app, validez. Sumup affiche :",
        substeps: [
          "<strong>Client ID</strong> (commence par <code>cc_</code>)",
          "<strong>Client Secret</strong> (à révéler en cliquant sur 👁️)",
        ],
      },
      {
        title: "Refaites en LIVE après tests",
        description: "Créez une 2ème App en mode Live et envoyez-nous Client ID + Secret + Code Marchand via le formulaire (cocher 'PRODUCTION').",
      },
    ],
  },
};

export const PROVIDER_KEYS_ORDER: PaymentProviderKey[] = [
  "stripe",
  "paypal",
  "alma",
  "lyra",
  "mollie",
  "sumup",
  "helloasso",
];

// FAQ commune à tous les providers
export const PAYMENT_FAQ: FAQItem[] = [
  {
    q: "Est-ce que mes clés API sont vraiment en sécurité ?",
    a: "Oui. Vos clés sont chiffrées en base de données dès leur réception. Seuls les administrateurs Adamkom peuvent les consulter (avec masquage par défaut <code>abcd••••••••wxyz</code>). Aucun autre membre de notre équipe (commercial, support, designer…) n'y a accès. Le lien que vous utilisez pour nous transmettre vos clés est unique et expire au bout de 30 jours.",
  },
  {
    q: "Quelle est la différence entre TEST et PRODUCTION ?",
    a: "Les clés <strong>TEST</strong> simulent des paiements sans aucun mouvement d'argent réel — c'est obligatoire pour vérifier que tout fonctionne. Les clés <strong>PRODUCTION</strong> (ou LIVE) déclenchent de vrais paiements depuis la carte bancaire de vos clients. On commence TOUJOURS par les tests.",
  },
  {
    q: "Combien de moyens de paiement dois-je activer ?",
    a: "Pas de règle stricte. Stripe seul couvre déjà 95% des cas (CB + Apple/Google Pay). Ajoutez <strong>PayPal</strong> pour rassurer les acheteurs hésitants, <strong>Alma</strong> pour proposer le paiement en plusieurs fois (très populaire à La Réunion), et <strong>Lyra</strong> si votre banque française vous l'impose.",
  },
  {
    q: "Combien de temps avant de pouvoir encaisser des vrais paiements ?",
    a: "Une fois vos clés TEST envoyées, comptez <strong>2-5 jours ouvrés</strong> pour la mise en place + tests sur votre site. Le passage en production dépend ensuite de la validation de votre compte chez le provider (24h pour Stripe/Mollie, 24-72h pour Alma/Sumup, 1-3 semaines pour Lyra car il faut un contrat bancaire).",
  },
  {
    q: "Quels frais vais-je payer ?",
    a: "Tous les providers prennent une <strong>commission par transaction</strong> (1,4% à 3,4% selon les cas, voir détail sur chaque provider). Pas d'abonnement caché chez Stripe, PayPal, Mollie ou Sumup. HelloAsso est <strong>100% gratuit</strong> (financé par pourboires). Lyra a un abonnement mensuel via votre banque.",
  },
  {
    q: "J'ai peur de me tromper. Que se passe-t-il si j'envoie de mauvaises clés ?",
    a: "Aucun risque ! Si une clé est invalide, notre équipe technique le détecte immédiatement lors de l'installation et vous demande de la regénérer. Aucun paiement ne peut être fait avec une clé incorrecte.",
  },
  {
    q: "Quand vais-je recevoir l'argent encaissé sur mon compte ?",
    a: "Cela dépend du provider : Stripe vire à <strong>J+7</strong> par défaut (configurable J+2 après quelques mois), Sumup à <strong>J+1</strong>, PayPal en <strong>instantané</strong> sur votre solde PayPal (puis virement sous 1-2 jours), Alma à <strong>J+15</strong> du paiement client, Mollie à <strong>J+3</strong>.",
  },
  {
    q: "Mon site doit-il être en HTTPS pour accepter des paiements ?",
    a: "Oui, c'est <strong>obligatoire</strong> pour tous les providers. Tous les sites créés par Adamkom sont automatiquement en HTTPS — vous n'avez rien à faire.",
  },
  {
    q: "Puis-je rembourser un client ?",
    a: "Oui, depuis le dashboard de chaque provider (Stripe Dashboard, PayPal, etc.). Le remboursement total est <strong>gratuit</strong> chez la plupart des providers — la commission initiale vous est rendue.",
  },
  {
    q: "Que faire si je suis bloqué pendant l'inscription chez un provider ?",
    a: "Contactez-nous directement à <a href='mailto:contact@adamkom.com' class='text-primary underline'>contact@adamkom.com</a> ou via le support de votre fiche client. Nous pouvons faire une visio pour vous accompagner pas-à-pas.",
  },
];
