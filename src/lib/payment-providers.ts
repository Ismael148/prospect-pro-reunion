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
  // Brand colors (used for accents)
  color: string;
  // Real logo URL (high-quality, official sources)
  logoUrl: string;
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
  news?: string;
}

export const PAYMENT_PROVIDERS: Record<PaymentProviderKey, ProviderConfig> = {
  stripe: {
    key: "stripe",
    name: "Stripe",
    tagline: "Le standard mondial du paiement en ligne",
    color: "#635BFF",
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/b/ba/Stripe_Logo%2C_revised_2016.svg",
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
      { title: "Créez un compte Stripe gratuit", description: "Allez sur dashboard.stripe.com/register et créez votre compte avec votre email.", link: "https://dashboard.stripe.com/register" },
      { title: "Activez le mode TEST", description: "En haut à droite du dashboard, basculez sur 'Mode test' (toggle orange)." },
      { title: "Récupérez vos clés API TEST", description: "Allez dans Développeurs > Clés API. Copiez la 'Clé publique' (pk_test_) et la 'Clé secrète' (sk_test_).", link: "https://dashboard.stripe.com/test/apikeys" },
      { title: "Envoyez-nous les clés via le formulaire ci-dessous", description: "Nous testerons l'intégration avec ces clés sans risque (pas de vrais paiements)." },
    ],
    liveSteps: [
      { title: "Activez votre compte Stripe", description: "Renseignez vos infos légales (SIRET, RIB, identité) sur dashboard.stripe.com/account.", link: "https://dashboard.stripe.com/account" },
      { title: "Basculez en mode LIVE", description: "Désactivez le 'Mode test' en haut à droite." },
      { title: "Récupérez vos clés API LIVE", description: "Développeurs > Clés API. Copiez 'pk_live_' et 'sk_live_'.", link: "https://dashboard.stripe.com/apikeys" },
      { title: "Envoyez-nous les clés LIVE", description: "Nous activerons les vrais paiements après tests complets." },
    ],
    news: "✨ Nouveau 2025 : Stripe Tax inclus, paiements en plusieurs fois disponibles en France.",
  },
  paypal: {
    key: "paypal",
    name: "PayPal Pro / Business",
    tagline: "La référence mondiale, rassurante pour vos clients",
    color: "#003087",
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg",
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
      { title: "Créez un compte développeur PayPal", description: "Connectez-vous sur developer.paypal.com avec votre compte PayPal Business.", link: "https://developer.paypal.com/dashboard/" },
      { title: "Créez une App Sandbox", description: "Apps & Credentials > Sandbox > Create App. Donnez-lui un nom (ex: 'Test Adamkom')." },
      { title: "Récupérez Client ID + Secret Sandbox", description: "Cliquez sur l'app créée. Vous verrez 'Client ID' et 'Secret'. Copiez les deux." },
      { title: "Envoyez-nous via le formulaire", description: "Nous ferons des tests avec les comptes Sandbox PayPal." },
    ],
    liveSteps: [
      { title: "Compte PayPal Business validé", description: "Vérifiez que votre compte est bien Business (pas Personal) et validé.", link: "https://www.paypal.com/businessmanage/account" },
      { title: "Apps & Credentials > LIVE", description: "Sur developer.paypal.com, basculez de Sandbox à Live et créez une App LIVE." },
      { title: "Récupérez Client ID + Secret LIVE", description: "Cliquez sur l'app LIVE. Copiez Client ID + Secret." },
      { title: "Envoyez-nous + email marchand", description: "Indiquez aussi l'email PayPal qui recevra les paiements." },
    ],
  },
  alma: {
    key: "alma",
    name: "Alma",
    tagline: "Paiement en 2x, 3x, 4x — boost de conversion +20%",
    color: "#FA5022",
    logoUrl: "https://cdn.brandfetch.io/almapay.com/w/512/h/512/logo?c=1id_ZTzXPF9jTOlRVxR",
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
      { title: "Inscription Alma", description: "Créez un compte sur dashboard.getalma.eu. Validation rapide (~24h).", link: "https://dashboard.getalma.eu/signup" },
      { title: "Mode Sandbox", description: "Une fois connecté, basculez sur 'Sandbox' en haut du dashboard." },
      { title: "Paramètres > API Keys", description: "Récupérez votre clé API TEST et votre Merchant ID." },
      { title: "Envoyez-nous", description: "Nous testerons les paiements 2x/3x/4x avec les CB de test Alma." },
    ],
    liveSteps: [
      { title: "Validation KYC Alma", description: "Alma vérifie votre activité (SIRET, justificatifs)." },
      { title: "Mode Production activé", description: "Une fois validé, basculez en 'Production' dans le dashboard." },
      { title: "Récupérez clé LIVE", description: "Paramètres > API Keys > Production." },
    ],
  },
  mollie: {
    key: "mollie",
    name: "Mollie",
    tagline: "Multi-méthodes européennes (CB, iDEAL, Bancontact, SOFORT)",
    color: "#000000",
    logoUrl: "https://www.mollie.com/cdn/logos/mollie-logo-black.svg",
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
      { title: "Créez un compte Mollie", description: "Inscription sur mollie.com (gratuit, validation rapide).", link: "https://www.mollie.com/dashboard/signup" },
      { title: "Développeurs > Clés API", description: "Dans le dashboard, allez dans 'Développeurs' puis 'Clés API'." },
      { title: "Copiez la clé TEST", description: "Elle commence par 'test_'." },
      { title: "Envoyez-nous", description: "Nous testerons CB, iDEAL et Bancontact." },
    ],
    liveSteps: [
      { title: "Activation du compte", description: "Renseignez vos infos d'entreprise + RIB pour activer LIVE." },
      { title: "Récupérez la clé LIVE", description: "Développeurs > Clés API > 'live_...'" },
    ],
  },
  lyra: {
    key: "lyra",
    name: "Lyra / SystemPay",
    tagline: "Le partenaire des banques françaises (BRED, Crédit Agricole)",
    color: "#0070BA",
    logoUrl: "https://lyra.com/wp-content/uploads/2021/02/lyra-logo.svg",
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
      { title: "Demande contrat VAD à votre banque", description: "Contactez votre conseiller BRED / CA / BP pour ouvrir un contrat de Vente À Distance." },
      { title: "Réception identifiants Lyra", description: "La banque vous fournit Shop ID + accès au Back Office Marchand." },
      { title: "Connexion Back Office", description: "Allez sur secure.systempay.fr > Paramétrage > Boutique > Clés.", link: "https://secure.systempay.fr" },
      { title: "Récupérez clés TEST + HMAC", description: "Onglet 'Clés et HMAC' > copiez clé de test et HMAC SHA-256 TEST." },
    ],
    liveSteps: [
      { title: "Validation par la banque", description: "Une fois les tests OK, la banque active le mode PRODUCTION." },
      { title: "Récupérez clés PRODUCTION", description: "Même endroit dans le Back Office Lyra." },
    ],
  },
  helloasso: {
    key: "helloasso",
    name: "HelloAsso",
    tagline: "100% gratuit pour les associations 1901",
    color: "#0066FF",
    logoUrl: "https://www.helloasso.com/static-assets/img/logos/logo-helloasso.svg",
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
      { title: "Créez un compte HelloAsso", description: "Inscription gratuite avec justificatifs association (statuts, RNA).", link: "https://www.helloasso.com/inscription" },
      { title: "Demande accès API", description: "Allez dans Paramètres > Intégrations > Accès API. Demandez les identifiants OAuth." },
      { title: "Récupérez Client ID + Secret", description: "Notez les deux et le slug de votre association." },
    ],
  },
  sumup: {
    key: "sumup",
    name: "Sumup",
    tagline: "TPE physique + lien de paiement",
    color: "#3399FF",
    logoUrl: "https://logos-world.net/wp-content/uploads/2023/01/SumUp-Logo.png",
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
      { title: "Compte Sumup Developer", description: "Allez sur developer.sumup.com et créez un compte développeur.", link: "https://developer.sumup.com" },
      { title: "Créez une App OAuth Sandbox", description: "Dashboard > Apps > New App. Choisissez Sandbox." },
      { title: "Récupérez Client ID + Secret", description: "Copiez les deux identifiants générés." },
    ],
    liveSteps: [
      { title: "Compte Sumup Business validé", description: "Compte vérifié avec SIRET + RIB." },
      { title: "App OAuth LIVE", description: "Créez une App en mode Production." },
      { title: "Récupérez clés + code marchand", description: "Copiez Client ID, Secret et votre Merchant Code." },
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
