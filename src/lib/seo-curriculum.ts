// Programme de formation SEO Webmaster — Adamkom
// Contenu pédagogique complet : fondamentaux, technique, on-page, performance,
// données structurées, SEO local, CMS (WordPress, WooCommerce, Shopify, PrestaShop,
// Wix, Webflow, Joomla, Drupal) et sites sur-mesure HTML/CSS/JS.

export interface SeoQuizQuestion {
  q: string;
  options: string[];
  answer: number;
  explanation: string;
}

export interface SeoLesson {
  id: string;
  title: string;
  duration: number; // minutes
  level: "Débutant" | "Intermédiaire" | "Avancé";
  objective: string;
  /** Blocs de contenu : paragraphes, listes, code, avertissements. */
  blocks: Array<
    | { type: "p"; text: string }
    | { type: "list"; items: string[] }
    | { type: "steps"; items: string[] }
    | { type: "code"; lang: string; label?: string; code: string }
    | { type: "tip"; text: string }
    | { type: "warn"; text: string }
    | { type: "table"; head: string[]; rows: string[][] }
  >;
  checklist: string[];
  resources?: Array<{ label: string; url: string }>;
  quiz: SeoQuizQuestion[];
}

export interface SeoModule {
  id: string;
  emoji: string;
  title: string;
  tagline: string;
  lessons: SeoLesson[];
}

export const SEO_CURRICULUM: SeoModule[] = [
  /* ------------------------------------------------------------------ */
  {
    id: "fondamentaux",
    emoji: "🎯",
    title: "Module 1 — Fondamentaux du référencement",
    tagline: "Comprendre comment Google trouve, comprend et classe une page.",
    lessons: [
      {
        id: "f1-fonctionnement",
        title: "Comment fonctionne un moteur de recherche",
        duration: 15,
        level: "Débutant",
        objective:
          "Savoir expliquer à un client les 4 étapes : crawl, indexation, classement, affichage.",
        blocks: [
          {
            type: "p",
            text: "Un moteur de recherche fonctionne en 4 temps. Si une seule étape casse, le site est invisible — même s'il est magnifique.",
          },
          {
            type: "steps",
            items: [
              "CRAWL — Googlebot découvre les URLs via les liens, le sitemap.xml et les soumissions Search Console.",
              "RENDU / INDEXATION — Google exécute le HTML (et le JavaScript), extrait le contenu et le stocke dans son index.",
              "CLASSEMENT — Des centaines de signaux déterminent la position : pertinence sémantique, autorité (liens), expérience utilisateur, intention.",
              "AFFICHAGE (SERP) — Google génère le titre, la description, les rich results, le pack local, les AI Overviews.",
            ],
          },
          {
            type: "p",
            text: "Retiens la règle d'or : accessible → compréhensible → mérité. Une page doit d'abord être atteignable, ensuite compréhensible, et seulement après elle peut mériter une position.",
          },
          {
            type: "list",
            items: [
              "Budget de crawl : nombre d'URLs que Google accepte d'explorer par site et par jour. Les petits sites ne sont pas concernés, les e-commerce à facettes oui.",
              "Index ≠ position : être indexé ne garantit rien, mais ne pas l'être garantit zéro trafic.",
              "L'intention de recherche prime : informationnelle, navigationnelle, commerciale, transactionnelle.",
            ],
          },
          {
            type: "tip",
            text: "Test rapide chez le client : tape `site:sondomaine.fr` dans Google. Si le nombre de résultats est très inférieur au nombre de pages réelles, il y a un problème d'indexation.",
          },
        ],
        checklist: [
          "Je sais faire une recherche `site:` pour estimer l'indexation",
          "Je sais nommer les 4 étapes du moteur",
          "Je sais identifier l'intention derrière un mot-clé",
        ],
        resources: [
          {
            label: "Guide SEO officiel Google",
            url: "https://developers.google.com/search/docs/fundamentals/seo-starter-guide?hl=fr",
          },
        ],
        quiz: [
          {
            q: "Une page est indexée mais n'apparaît sur aucun mot-clé. Que faut-il travailler en priorité ?",
            options: [
              "Le crawl (robots.txt)",
              "La pertinence du contenu et l'autorité",
              "Le certificat SSL",
              "Rien, il faut attendre 2 ans",
            ],
            answer: 1,
            explanation:
              "Elle est déjà accessible et indexée : c'est l'étape de classement (contenu + netlinking + intention) qui pêche.",
          },
          {
            q: "Qu'est-ce que le budget de crawl impacte le plus ?",
            options: [
              "Un site vitrine de 8 pages",
              "Un blog de 40 articles",
              "Un e-commerce avec filtres générant des milliers d'URLs",
              "Une landing page unique",
            ],
            answer: 2,
            explanation:
              "Les URLs à facettes explosent le nombre d'adresses et gaspillent le crawl sur des pages sans valeur.",
          },
        ],
      },
      {
        id: "f2-mots-cles",
        title: "Recherche de mots-clés & intention",
        duration: 20,
        level: "Débutant",
        objective:
          "Construire une liste de mots-clés exploitable pour un client local (La Réunion) et la mapper aux pages.",
        blocks: [
          {
            type: "p",
            text: "Sans mapping mots-clés → pages, on optimise à l'aveugle. Une page = une intention principale = un cluster de mots-clés.",
          },
          {
            type: "steps",
            items: [
              "Lister le vocabulaire métier du client (interview de 15 min, verbatims clients, devis).",
              "Élargir avec : suggestions Google, 'Autres questions posées', recherches associées, Google Trends, Search Console (si le site existe déjà).",
              "Qualifier chaque mot-clé : volume, difficulté, intention, valeur business.",
              "Ajouter la dimension locale : « + Saint-Denis », « + 974 », « + Réunion », « près de moi ».",
              "Mapper : une URL cible par intention. Deux pages sur la même intention = cannibalisation.",
            ],
          },
          {
            type: "table",
            head: ["Intention", "Exemple", "Type de page"],
            rows: [
              ["Informationnelle", "comment entretenir une clim", "Article de blog"],
              ["Commerciale", "meilleur installateur clim Réunion", "Page comparatif / avis"],
              ["Transactionnelle", "devis installation clim Saint-Pierre", "Page service + formulaire"],
              ["Navigationnelle", "adamkom contact", "Page contact"],
            ],
          },
          {
            type: "warn",
            text: "Cannibalisation : si deux pages visent « plombier Saint-Denis », Google en choisit une au hasard et les deux perdent. Fusionne ou différencie.",
          },
        ],
        checklist: [
          "J'ai un tableau mots-clés → URL pour le client",
          "Chaque page a une intention unique",
          "Les variantes locales (ville, 974) sont couvertes",
        ],
        quiz: [
          {
            q: "Deux pages du site visent exactement « pizzeria Saint-Denis ». C'est :",
            options: [
              "Excellent, on double les chances",
              "De la cannibalisation, il faut fusionner ou différencier",
              "Sans impact",
              "Interdit par la CNIL",
            ],
            answer: 1,
            explanation:
              "Google doit choisir : les signaux se diluent. Fusionner les deux pages en une plus complète est presque toujours gagnant.",
          },
        ],
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  {
    id: "technique",
    emoji: "🔧",
    title: "Module 2 — SEO technique",
    tagline: "Indexation, robots.txt, sitemap, canonical, redirections, HTTPS.",
    lessons: [
      {
        id: "t1-indexation",
        title: "Robots.txt, sitemap.xml et indexation",
        duration: 25,
        level: "Intermédiaire",
        objective:
          "Mettre en place un robots.txt et un sitemap corrects sur n'importe quel type de site.",
        blocks: [
          {
            type: "p",
            text: "robots.txt contrôle le CRAWL, la balise meta robots contrôle l'INDEXATION. Confondre les deux est l'erreur n°1 des débutants.",
          },
          {
            type: "warn",
            text: "Bloquer une page dans robots.txt n'empêche PAS son indexation si elle reçoit des liens. Pour désindexer, il faut laisser Google crawler la page et y placer `noindex`.",
          },
          {
            type: "code",
            lang: "txt",
            label: "public/robots.txt — modèle site vitrine",
            code: `User-agent: *
Allow: /
Disallow: /wp-admin/
Disallow: /panier
Disallow: /*?orderby=
Disallow: /recherche

Sitemap: https://www.exemple.fr/sitemap.xml`,
          },
          {
            type: "code",
            lang: "html",
            label: "Désindexer une page (dans le <head>)",
            code: `<meta name="robots" content="noindex, follow">`,
          },
          {
            type: "code",
            lang: "xml",
            label: "sitemap.xml minimal",
            code: `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://www.exemple.fr/</loc>
    <lastmod>2026-01-15</lastmod>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://www.exemple.fr/services/depannage</loc>
    <lastmod>2026-01-10</lastmod>
    <priority>0.8</priority>
  </url>
</urlset>`,
          },
          {
            type: "list",
            items: [
              "Le sitemap ne contient QUE des URLs 200, canoniques, indexables (pas de redirections, pas de noindex).",
              "Soumets le sitemap dans Search Console → Sitemaps.",
              "Une seule version du site accessible : https + www (ou sans www), les 3 autres redirigent en 301.",
              "Vérifie l'absence de `noindex` global oublié après une mise en ligne (piège WordPress : Réglages → Lecture).",
            ],
          },
        ],
        checklist: [
          "robots.txt en ligne et accessible sur /robots.txt",
          "sitemap.xml généré et soumis à Search Console",
          "Aucune page importante en noindex",
          "Une seule version canonique du domaine (https + www)",
        ],
        resources: [
          { label: "Search Console", url: "https://search.google.com/search-console" },
        ],
        quiz: [
          {
            q: "Pour retirer une page des résultats Google, il faut :",
            options: [
              "La bloquer dans robots.txt",
              "Ajouter `noindex` et laisser Google la crawler",
              "Supprimer le sitemap",
              "Mettre un mot de passe",
            ],
            answer: 1,
            explanation:
              "Si tu bloques le crawl, Google ne verra jamais le noindex et peut garder l'URL indexée.",
          },
          {
            q: "Le sitemap doit contenir :",
            options: [
              "Toutes les URLs même redirigées",
              "Uniquement les URLs canoniques en 200 et indexables",
              "Les pages admin",
              "Les images uniquement",
            ],
            answer: 1,
            explanation: "Un sitemap sale dégrade la confiance et gaspille le crawl.",
          },
        ],
      },
      {
        id: "t2-canonical-redirections",
        title: "URL, canonical, redirections et duplicate content",
        duration: 25,
        level: "Intermédiaire",
        objective: "Éliminer le contenu dupliqué et gérer proprement une refonte.",
        blocks: [
          {
            type: "list",
            items: [
              "URL propre : minuscules, tirets (pas d'underscore), sans accents, courte, descriptive : /services/climatisation-saint-denis",
              "Pas de paramètres inutiles indexés (?utm_, ?sort=, ?sessionid=).",
              "Canonical auto-référente sur chaque page : elle déclare l'URL officielle.",
              "301 = permanent (transmet l'autorité). 302 = temporaire. Ne jamais chaîner plus de 2 redirections.",
              "Refonte : TOUJOURS produire un plan de redirection ancienne URL → nouvelle URL avant la mise en ligne.",
            ],
          },
          {
            type: "code",
            lang: "html",
            label: "Balise canonical",
            code: `<link rel="canonical" href="https://www.exemple.fr/services/climatisation" />`,
          },
          {
            type: "code",
            lang: "apache",
            label: ".htaccess — forcer https + www et rediriger",
            code: `RewriteEngine On
RewriteCond %{HTTPS} off [OR]
RewriteCond %{HTTP_HOST} !^www\\. [NC]
RewriteRule ^ https://www.%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

# Redirection d'une ancienne page
Redirect 301 /ancienne-page.html /services/climatisation`,
          },
          {
            type: "code",
            lang: "nginx",
            label: "Nginx — équivalent",
            code: `server {
  listen 80;
  server_name exemple.fr www.exemple.fr;
  return 301 https://www.exemple.fr$request_uri;
}
location = /ancienne-page.html { return 301 /services/climatisation; }`,
          },
          {
            type: "warn",
            text: "Une refonte sans plan de redirection = perte de 40 à 80 % du trafic organique. C'est la faute la plus coûteuse d'un webmaster.",
          },
        ],
        checklist: [
          "Canonical présente sur toutes les pages",
          "http, non-www, /index.php redirigent en 301",
          "Plan de redirection livré avant toute refonte",
          "Aucune chaîne de redirection > 2 sauts",
        ],
        quiz: [
          {
            q: "Lors d'une refonte, quel livrable est obligatoire ?",
            options: [
              "Un nouveau logo",
              "Le tableau de redirections 301 ancienne → nouvelle URL",
              "Un compte Instagram",
              "Un blog",
            ],
            answer: 1,
            explanation: "Sans lui, l'autorité accumulée est perdue et les 404 explosent.",
          },
        ],
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  {
    id: "onpage",
    emoji: "✍️",
    title: "Module 3 — On-page & contenu",
    tagline: "Title, meta, Hn, contenu, images, maillage interne.",
    lessons: [
      {
        id: "o1-balises",
        title: "Balises title, meta description et structure Hn",
        duration: 20,
        level: "Débutant",
        objective: "Rédiger des balises qui font cliquer et qui positionnent.",
        blocks: [
          {
            type: "list",
            items: [
              "Title : 50-60 caractères, mot-clé principal en début, marque à la fin. Unique sur chaque page.",
              "Meta description : 140-155 caractères, argument + bénéfice + appel à l'action. N'influence pas le classement mais le taux de clic.",
              "Un seul H1 par page, qui reprend l'intention. Puis H2/H3 hiérarchisés — jamais utilisés pour le style.",
              "Le contenu doit répondre à la question dans les 100 premiers mots.",
            ],
          },
          {
            type: "code",
            lang: "html",
            label: "Head type d'une page service locale",
            code: `<title>Installation climatisation Saint-Denis 974 | Adamkom</title>
<meta name="description" content="Installation et entretien de climatisation à Saint-Denis. Devis gratuit sous 24h, techniciens certifiés, intervention sur tout le nord de La Réunion.">
<link rel="canonical" href="https://www.exemple.fr/climatisation-saint-denis">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta property="og:title" content="Installation climatisation Saint-Denis | Adamkom">
<meta property="og:description" content="Devis gratuit sous 24h à La Réunion.">
<meta property="og:image" content="https://www.exemple.fr/og.jpg">
<meta name="twitter:card" content="summary_large_image">`,
          },
          {
            type: "tip",
            text: "Écris le title pour l'humain d'abord : « Plombier Saint-Denis – Dépannage 24/7 » convertit mieux que « plombier saint denis plombier 974 plomberie ».",
          },
        ],
        checklist: [
          "Chaque page a un title unique < 60 caractères",
          "Chaque page a une meta description rédigée (pas générée)",
          "Un seul H1 par page",
          "Balises Open Graph présentes",
        ],
        quiz: [
          {
            q: "Combien de H1 par page ?",
            options: ["Autant qu'on veut", "Un seul", "Minimum trois", "Aucun"],
            answer: 1,
            explanation: "Un H1 unique clarifie le sujet principal de la page.",
          },
          {
            q: "La meta description influence :",
            options: [
              "Directement le classement",
              "Le taux de clic dans les résultats",
              "La vitesse du site",
              "Le budget de crawl",
            ],
            answer: 1,
            explanation: "Ce n'est pas un facteur de classement direct, mais le CTR compte.",
          },
        ],
      },
      {
        id: "o2-contenu-maillage",
        title: "Contenu, sémantique et maillage interne",
        duration: 25,
        level: "Intermédiaire",
        objective: "Structurer un site en silos et écrire un contenu qui couvre le sujet.",
        blocks: [
          {
            type: "p",
            text: "Google évalue la couverture sémantique : un bon contenu traite le sujet ET ses sous-questions. Objectif : être la dernière page que l'internaute a besoin de lire.",
          },
          {
            type: "steps",
            items: [
              "Analyse le top 10 : quels sous-sujets reviennent chez tous les concurrents ? Ce sont les incontournables.",
              "Ajoute la valeur qu'eux n'ont pas : photos réelles, tarifs, cas client, FAQ locale, process.",
              "Structure en silos : page pilier (ex. /climatisation) → pages filles (installation, entretien, dépannage, tarifs).",
              "Maille : chaque page fille pointe vers la pilière et vers 2-3 sœurs, avec des ancres descriptives.",
              "Évite « cliquez ici » : l'ancre doit décrire la destination.",
            ],
          },
          {
            type: "list",
            items: [
              "Contenu dupliqué interne (descriptions produits copiées) = dilution. Réécris au moins les 30 premiers %.",
              "Les pages orphelines (aucun lien interne) sont mal crawlées : chaque page doit être atteignable en ≤ 3 clics.",
              "Mets à jour les contenus anciens : la fraîcheur est un signal sur les requêtes évolutives.",
              "E-E-A-T : montre l'expérience réelle (photos chantier, auteur identifié, mentions légales, avis).",
            ],
          },
        ],
        checklist: [
          "Arborescence en silos validée",
          "Chaque page accessible en 3 clics max",
          "Ancres de liens descriptives",
          "Page auteur / à propos / mentions légales présentes",
        ],
        quiz: [
          {
            q: "Une page orpheline est une page :",
            options: [
              "Sans image",
              "Qui ne reçoit aucun lien interne",
              "Sans meta description",
              "En 404",
            ],
            answer: 1,
            explanation: "Sans lien entrant interne, elle est difficilement crawlée et peu valorisée.",
          },
        ],
      },
      {
        id: "o3-images",
        title: "Images, médias et accessibilité",
        duration: 15,
        level: "Débutant",
        objective: "Optimiser les médias sans casser la performance.",
        blocks: [
          {
            type: "list",
            items: [
              "Nom de fichier descriptif : installation-clim-saint-denis.webp (pas IMG_4821.JPG).",
              "Attribut alt : décrit l'image pour les non-voyants et Google. Vide (alt=\"\") si purement décorative.",
              "Format WebP ou AVIF, qualité 75-85. Objectif : < 200 Ko par visuel.",
              "Toujours renseigner width et height pour éviter le décalage de mise en page (CLS).",
              "loading=\"lazy\" partout SAUF sur l'image principale au-dessus de la ligne de flottaison (fetchpriority=\"high\").",
            ],
          },
          {
            type: "code",
            lang: "html",
            label: "Image responsive optimisée",
            code: `<picture>
  <source srcset="/img/clim-800.avif 800w, /img/clim-1600.avif 1600w" type="image/avif">
  <source srcset="/img/clim-800.webp 800w, /img/clim-1600.webp 1600w" type="image/webp">
  <img src="/img/clim-800.jpg"
       width="800" height="600"
       alt="Technicien installant une climatisation murale à Saint-Denis"
       loading="lazy" decoding="async">
</picture>`,
          },
          {
            type: "code",
            lang: "bash",
            label: "Conversion en masse (ligne de commande)",
            code: `# WebP
for f in *.jpg; do cwebp -q 80 "$f" -o "\${f%.jpg}.webp"; done
# ou avec ffmpeg
ffmpeg -i photo.jpg -q:v 80 photo.webp`,
          },
        ],
        checklist: [
          "Toutes les images ont un alt pertinent",
          "Images converties en WebP/AVIF",
          "width/height présents sur chaque <img>",
          "Lazy loading sauf image héro",
        ],
        quiz: [
          {
            q: "Sur l'image principale visible dès le chargement, il faut :",
            options: [
              "loading=\"lazy\"",
              "Pas de lazy loading, plutôt fetchpriority=\"high\"",
              "L'enlever",
              "Un GIF",
            ],
            answer: 1,
            explanation: "Le lazy loading sur l'image héro dégrade le LCP.",
          },
        ],
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  {
    id: "performance",
    emoji: "⚡",
    title: "Module 4 — Performance & Core Web Vitals",
    tagline: "LCP, INP, CLS : mesurer et corriger.",
    lessons: [
      {
        id: "p1-cwv",
        title: "Comprendre et corriger les Core Web Vitals",
        duration: 30,
        level: "Avancé",
        objective: "Passer un site au vert sur PageSpeed Insights (mobile).",
        blocks: [
          {
            type: "table",
            head: ["Métrique", "Mesure", "Bon", "À corriger"],
            rows: [
              ["LCP", "Affichage du plus grand élément", "< 2,5 s", "> 4 s"],
              ["INP", "Réactivité aux interactions", "< 200 ms", "> 500 ms"],
              ["CLS", "Stabilité visuelle", "< 0,1", "> 0,25"],
              ["TTFB", "Réponse serveur", "< 800 ms", "> 1,8 s"],
            ],
          },
          {
            type: "p",
            text: "Corrections par symptôme :",
          },
          {
            type: "list",
            items: [
              "LCP lent → image héro trop lourde, police bloquante, TTFB serveur, absence de cache/CDN. Précharge l'image héro.",
              "INP mauvais → trop de JavaScript, scripts tiers (chat, pixels), gros gestionnaires d'événements. Découpe et diffère.",
              "CLS élevé → images sans dimensions, bannières injectées, polices sans font-display: swap, publicités.",
              "TTFB élevé → hébergement mutualisé saturé, pas de cache serveur, base de données lente, trop de plugins.",
            ],
          },
          {
            type: "code",
            lang: "html",
            label: "Optimisations à copier dans le <head>",
            code: `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="preload" as="image" href="/img/hero-800.webp" fetchpriority="high">
<style>
  @font-face{font-family:Inter;src:url(/fonts/inter.woff2) format('woff2');font-display:swap}
</style>
<script src="/js/app.js" defer></script>
<script src="/js/analytics.js" async></script>`,
          },
          {
            type: "code",
            lang: "apache",
            label: "Cache navigateur + compression (.htaccess)",
            code: `<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/css application/javascript image/svg+xml
</IfModule>
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType image/webp "access plus 1 year"
  ExpiresByType text/css "access plus 1 year"
  ExpiresByType application/javascript "access plus 1 year"
</IfModule>`,
          },
          {
            type: "tip",
            text: "Mesure toujours en mobile et en 4G simulée. Les données « terrain » (CrUX) de Search Console priment sur le score labo de PageSpeed.",
          },
        ],
        checklist: [
          "PageSpeed mobile ≥ 80 sur les pages clés",
          "LCP < 2,5 s en données terrain",
          "CLS < 0,1",
          "Compression Gzip/Brotli + cache navigateur activés",
        ],
        resources: [
          { label: "PageSpeed Insights", url: "https://pagespeed.web.dev/" },
        ],
        quiz: [
          {
            q: "Un CLS élevé est le plus souvent causé par :",
            options: [
              "Trop de texte",
              "Des images sans width/height et des éléments injectés",
              "Un nom de domaine long",
              "Trop de balises H2",
            ],
            answer: 1,
            explanation: "Le navigateur ne réserve pas l'espace, la page saute au chargement.",
          },
          {
            q: "Quelle valeur de LCP est considérée comme bonne ?",
            options: ["< 2,5 s", "< 6 s", "< 10 s", "Peu importe"],
            answer: 0,
            explanation: "Seuil officiel Google : 2,5 secondes.",
          },
        ],
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  {
    id: "structured",
    emoji: "🧩",
    title: "Module 5 — Données structurées (Schema.org)",
    tagline: "Obtenir des résultats enrichis et être compris des IA.",
    lessons: [
      {
        id: "s1-jsonld",
        title: "JSON-LD : LocalBusiness, Service, FAQ, Produit, Avis",
        duration: 25,
        level: "Intermédiaire",
        objective: "Implémenter et valider le balisage adapté à chaque type de client.",
        blocks: [
          {
            type: "p",
            text: "Le JSON-LD s'ajoute dans le <head> ou en fin de <body>. C'est le format recommandé par Google, valable sur tous les CMS et sites sur-mesure.",
          },
          {
            type: "code",
            lang: "html",
            label: "LocalBusiness — entreprise locale (La Réunion)",
            code: `<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "Nom de l'entreprise",
  "image": "https://www.exemple.fr/photo-devanture.jpg",
  "url": "https://www.exemple.fr",
  "telephone": "+262692000000",
  "priceRange": "€€",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "12 rue de Paris",
    "addressLocality": "Saint-Denis",
    "postalCode": "97400",
    "addressCountry": "RE"
  },
  "geo": { "@type": "GeoCoordinates", "latitude": -20.8789, "longitude": 55.4481 },
  "openingHoursSpecification": [{
    "@type": "OpeningHoursSpecification",
    "dayOfWeek": ["Monday","Tuesday","Wednesday","Thursday","Friday"],
    "opens": "08:00", "closes": "17:00"
  }],
  "sameAs": ["https://www.facebook.com/...", "https://www.instagram.com/..."]
}
</script>`,
          },
          {
            type: "code",
            lang: "html",
            label: "FAQPage — gagne de la place dans la SERP",
            code: `<script type="application/ld+json">
{
  "@context":"https://schema.org","@type":"FAQPage",
  "mainEntity":[{
    "@type":"Question","name":"Intervenez-vous dans tout le 974 ?",
    "acceptedAnswer":{"@type":"Answer","text":"Oui, nous couvrons l'ensemble de l'île sous 48h."}
  }]
}
</script>`,
          },
          {
            type: "code",
            lang: "html",
            label: "Product + AggregateRating (e-commerce)",
            code: `<script type="application/ld+json">
{
  "@context":"https://schema.org","@type":"Product",
  "name":"Ventilateur plafond 120cm","image":["https://.../v.jpg"],
  "description":"Ventilateur silencieux 3 vitesses.",
  "sku":"VENT-120","brand":{"@type":"Brand","name":"Marque"},
  "offers":{"@type":"Offer","url":"https://.../produit","priceCurrency":"EUR",
    "price":"149.90","availability":"https://schema.org/InStock"},
  "aggregateRating":{"@type":"AggregateRating","ratingValue":"4.7","reviewCount":"23"}
}
</script>`,
          },
          {
            type: "warn",
            text: "Ne balise jamais une information absente de la page visible (faux avis, faux prix) : c'est une violation des règles Google et un motif d'action manuelle.",
          },
          {
            type: "list",
            items: [
              "Autres types utiles : BreadcrumbList (fil d'Ariane), Article, Event, Restaurant/Menu, LodgingBusiness (gîtes/locations), Organization.",
              "Valide systématiquement avec le test des résultats enrichis de Google.",
              "Les données structurées aident aussi les IA (AI Overviews, ChatGPT search) à citer le site.",
            ],
          },
        ],
        checklist: [
          "LocalBusiness ou Organization sur la home",
          "BreadcrumbList sur les pages internes",
          "FAQPage sur au moins une page",
          "Balisage validé sans erreur dans l'outil Google",
        ],
        resources: [
          { label: "Test des résultats enrichis", url: "https://search.google.com/test/rich-results" },
          { label: "Schema.org", url: "https://schema.org/docs/schemas.html" },
        ],
        quiz: [
          {
            q: "Quel format Google recommande-t-il pour les données structurées ?",
            options: ["Microdata", "RDFa", "JSON-LD", "XML-RPC"],
            answer: 2,
            explanation: "JSON-LD est le format recommandé, simple à injecter et à maintenir.",
          },
          {
            q: "Baliser des avis qui n'existent pas sur la page :",
            options: [
              "Est une bonne astuce",
              "Est une violation pouvant entraîner une action manuelle",
              "Est obligatoire",
              "Améliore le LCP",
            ],
            answer: 1,
            explanation: "Le balisage doit toujours refléter le contenu visible.",
          },
        ],
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  {
    id: "local",
    emoji: "📍",
    title: "Module 6 — SEO local (974)",
    tagline: "Pack local, fiche Google, NAP, pages villes.",
    lessons: [
      {
        id: "l1-local",
        title: "Dominer le pack local à La Réunion",
        duration: 20,
        level: "Intermédiaire",
        objective: "Faire apparaître un client dans les 3 résultats de la carte Google.",
        blocks: [
          {
            type: "list",
            items: [
              "Les 3 piliers du pack local : Pertinence (catégorie + contenu), Distance (position de l'internaute), Notoriété (avis, citations, liens).",
              "NAP strictement identique partout : site, fiche Google, annuaires, réseaux sociaux. Même format de téléphone, même écriture d'adresse.",
              "Fiche Google Business Profile complète : catégorie principale exacte, services, photos réelles récentes, horaires, description, posts hebdomadaires.",
              "Avis : viser un flux régulier plutôt qu'un pic. Répondre à 100 % des avis en < 48h, avec mention du service et de la ville.",
              "Créer une page dédiée par ville réellement desservie, avec du contenu unique (références locales, photos, temps d'intervention) — jamais du copier-coller avec le nom de ville remplacé.",
              "Citations locales 974 : annuaires réunionnais, chambres de commerce, fédérations métier, presse locale.",
            ],
          },
          {
            type: "code",
            lang: "html",
            label: "NAP cohérent en HTML",
            code: `<address itemscope itemtype="https://schema.org/PostalAddress">
  <span itemprop="streetAddress">12 rue de Paris</span>,
  <span itemprop="postalCode">97400</span>
  <span itemprop="addressLocality">Saint-Denis</span>
  <a href="tel:+262692000000">0692 00 00 00</a>
</address>`,
          },
          {
            type: "warn",
            text: "Pages villes dupliquées = pénalité de qualité. Si tu ne peux pas écrire 300 mots uniques et vrais sur une ville, ne crée pas la page.",
          },
        ],
        checklist: [
          "NAP identique sur site + fiche Google + annuaires",
          "Fiche Google complétée à 100 %",
          "Page ville unique pour chaque zone desservie",
          "Processus de collecte d'avis mis en place",
        ],
        quiz: [
          {
            q: "Le NAP désigne :",
            options: [
              "Nom, Adresse, Téléphone",
              "Nouvelle Analyse de Page",
              "Netlinking Automatique Payant",
              "Note d'Autorité de Page",
            ],
            answer: 0,
            explanation: "Sa cohérence sur tout le web est un signal local majeur.",
          },
        ],
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  {
    id: "cms",
    emoji: "🧱",
    title: "Module 7 — SEO par CMS",
    tagline: "WordPress, WooCommerce, Shopify, PrestaShop, Wix, Webflow, Joomla, Drupal.",
    lessons: [
      {
        id: "c1-wordpress",
        title: "WordPress & WooCommerce",
        duration: 30,
        level: "Intermédiaire",
        objective: "Configurer un WordPress propre pour le SEO de A à Z.",
        blocks: [
          {
            type: "steps",
            items: [
              "Réglages → Lecture : décocher « Demander aux moteurs de recherche de ne pas indexer » (piège n°1 après mise en ligne).",
              "Réglages → Permaliens : choisir « Titre de la publication » (/%postname%/).",
              "Installer UN seul plugin SEO : Rank Math ou Yoast (jamais les deux).",
              "Configurer le sitemap du plugin, puis le soumettre à Search Console.",
              "Désindexer les archives inutiles : étiquettes, auteurs, dates, pages de recherche, pièces jointes.",
              "Renseigner title + meta description sur chaque page/article via le plugin.",
              "Activer le balisage Schema du plugin (LocalBusiness / Organization).",
              "Performance : cache (WP Rocket, LiteSpeed Cache ou WP Super Cache) + conversion WebP + lazy load + minification CSS/JS.",
              "Nettoyer : supprimer les plugins inutilisés, les thèmes inactifs, les révisions et le spam en base.",
              "Sécurité/SEO : HTTPS forcé, mises à jour à jour, sauvegarde avant chaque intervention.",
            ],
          },
          {
            type: "p",
            text: "Spécifique WooCommerce :",
          },
          {
            type: "list",
            items: [
              "Noindex sur panier, commande, mon-compte : ces pages n'ont rien à faire dans l'index.",
              "Descriptions produits uniques : ne jamais coller la fiche du fournisseur.",
              "Gérer les filtres (facettes) : bloquer les paramètres ?filter_, ?orderby, ?min_price dans robots.txt et mettre une canonical vers la catégorie mère.",
              "Produits en rupture : ne pas supprimer l'URL, afficher un statut + alternatives, ou rediriger en 301 si suppression définitive.",
              "Balisage Product + Offer + AggregateRating sur chaque fiche.",
              "Pagination des catégories : liens rel prev/next logiques + contenu de catégorie unique en haut.",
            ],
          },
          {
            type: "code",
            lang: "php",
            label: "functions.php — nettoyer les URLs de recherche & désactiver l'auteur",
            code: `// Désindexer les pages d'archive auteur (site à un seul auteur)
add_action('template_redirect', function () {
  if (is_author()) { wp_redirect(home_url(), 301); exit; }
});

// Supprimer les emojis inutiles (poids JS)
remove_action('wp_head', 'print_emoji_detection_script', 7);
remove_action('wp_print_styles', 'print_emoji_styles');`,
          },
          {
            type: "warn",
            text: "Deux plugins SEO actifs = balises canonical et meta dupliquées. Toujours en désinstaller un après migration des données.",
          },
        ],
        checklist: [
          "Indexation autorisée (Réglages → Lecture)",
          "Permaliens en /%postname%/",
          "Un seul plugin SEO configuré + sitemap soumis",
          "Cache + WebP + lazy load actifs",
          "Panier/compte/commande en noindex (WooCommerce)",
        ],
        quiz: [
          {
            q: "Après la mise en ligne d'un WordPress, quel réglage doit-on impérativement vérifier ?",
            options: [
              "La couleur du thème",
              "La case « ne pas indexer » dans Réglages → Lecture",
              "Le nombre de widgets",
              "Le fuseau horaire",
            ],
            answer: 1,
            explanation: "Oubliée, elle rend le site totalement invisible.",
          },
          {
            q: "Sur WooCommerce, les pages panier et commande doivent être :",
            options: ["Indexées", "En noindex", "Supprimées", "En 301"],
            answer: 1,
            explanation: "Elles n'ont aucune valeur de recherche et polluent l'index.",
          },
        ],
      },
      {
        id: "c2-shopify-presta",
        title: "Shopify & PrestaShop",
        duration: 25,
        level: "Intermédiaire",
        objective: "Traiter les contraintes SEO propres aux e-commerce hébergés.",
        blocks: [
          { type: "p", text: "SHOPIFY — structure d'URL imposée, à connaître :" },
          {
            type: "list",
            items: [
              "URLs figées : /products/, /collections/, /pages/, /blogs/. On ne peut pas les supprimer.",
              "Duplication majeure : un produit est accessible via /products/x ET /collections/y/products/x. Vérifie que la canonical pointe toujours vers /products/x.",
              "Modifier title/description : Boutique en ligne → Préférences (accueil) et champ « Référencement » de chaque produit/collection/page.",
              "robots.txt éditable via robots.txt.liquid depuis 2021.",
              "Ajoute le JSON-LD Product dans theme.liquid ou product.liquid si le thème ne le fait pas.",
              "Limite les applications : chacune injecte du JS et dégrade l'INP.",
              "Blog Shopify pauvre en fonctionnalités : structure quand même les articles avec H2/H3 et liens internes vers les collections.",
            ],
          },
          {
            type: "code",
            lang: "liquid",
            label: "Shopify — canonical propre dans theme.liquid",
            code: `<link rel="canonical" href="{{ canonical_url }}">
{%- if template contains 'product' -%}
  <link rel="canonical" href="{{ shop.url }}{{ product.url }}">
{%- endif -%}`,
          },
          { type: "p", text: "PRESTASHOP — points de contrôle :" },
          {
            type: "list",
            items: [
              "Préférences → SEO & URLs : activer les URL simplifiées (réécriture d'URL) et le HTTPS.",
              "Supprimer l'ID produit de l'URL si possible, garder une structure /categorie/produit.",
              "Gérer les URL canoniques (natif depuis 1.7) et vérifier les déclinaisons (attributs) qui créent des doublons.",
              "Paramètres de tri et de pagination : noindex/canonical vers la page 1 de la catégorie.",
              "Multiboutique / multilingue : balises hreflang obligatoires.",
              "Activer le cache, la compression Smarty et le CCC (combiner/compresser/mettre en cache) avec prudence.",
            ],
          },
          {
            type: "code",
            lang: "html",
            label: "hreflang multilingue (tous CMS)",
            code: `<link rel="alternate" hreflang="fr-re" href="https://www.exemple.fr/">
<link rel="alternate" hreflang="fr" href="https://www.exemple.fr/">
<link rel="alternate" hreflang="en" href="https://www.exemple.fr/en/">
<link rel="alternate" hreflang="x-default" href="https://www.exemple.fr/">`,
          },
        ],
        checklist: [
          "Canonical produit vérifiée (Shopify)",
          "URLs simplifiées activées (PrestaShop)",
          "Tri/pagination non indexés",
          "hreflang posé si multilingue",
        ],
        quiz: [
          {
            q: "Sur Shopify, un produit accessible via /collections/x/products/y doit avoir une canonical vers :",
            options: [
              "/collections/x",
              "/products/y",
              "La home",
              "Aucune canonical",
            ],
            answer: 1,
            explanation: "L'URL courte produit est l'URL de référence.",
          },
        ],
      },
      {
        id: "c3-wix-webflow-joomla",
        title: "Wix, Squarespace, Webflow, Joomla & Drupal",
        duration: 20,
        level: "Intermédiaire",
        objective: "Savoir intervenir sur les autres plateformes rencontrées chez les clients.",
        blocks: [
          { type: "p", text: "WIX / SQUARESPACE (constructeurs fermés) :" },
          {
            type: "list",
            items: [
              "Wix : utiliser l'assistant « SEO Wiz », éditer les balises via Paramètres SEO de chaque page, activer le sitemap automatique et connecter Search Console.",
              "Wix permet d'ajouter du JSON-LD personnalisé par page (Paramètres SEO → Balisage de schéma) et des redirections 301 (Paramètres → Redirections d'URL).",
              "Attention au JS lourd et aux animations : la performance mobile est le point faible historique de ces plateformes.",
              "Squarespace : Paramètres → SEO pour les modèles de titre, et injection de code dans Paramètres avancés → Injection de code.",
            ],
          },
          { type: "p", text: "WEBFLOW (excellent terrain SEO) :" },
          {
            type: "list",
            items: [
              "Page Settings : title, description, Open Graph, noindex par page.",
              "Champs SEO dynamiques pour les Collections CMS : title = « {{Nom}} à {{Ville}} | Marque ».",
              "Sitemap auto + robots.txt éditables dans Project Settings → SEO.",
              "Redirections 301 dans Project Settings → Publishing.",
              "Injecter le JSON-LD via un bloc « Embed » dans le head de la page.",
              "Activer la compression des images et le lazy load natif dans les paramètres d'image.",
            ],
          },
          { type: "p", text: "JOOMLA / DRUPAL :" },
          {
            type: "list",
            items: [
              "Joomla : activer « Réécriture d'URL » et « Ajouter un suffixe » dans Configuration globale → SEO, renommer htaccess.txt en .htaccess, installer sh404SEF ou 4SEO pour les métadonnées avancées.",
              "Joomla : attention aux doublons créés par les menus (même contenu sous plusieurs Itemid) → canonical obligatoire.",
              "Drupal : modules Metatag, Pathauto (URLs propres), Simple XML Sitemap, Redirect, Schema.org Metatag.",
              "Drupal : configurer le cache interne et l'agrégation CSS/JS dans Performance.",
            ],
          },
          {
            type: "tip",
            text: "Sur toute plateforme fermée, la question à se poser est toujours la même : puis-je éditer le title, la description, la canonical, le robots, les redirections et injecter du JSON-LD ? Si oui, on peut faire du bon SEO.",
          },
        ],
        checklist: [
          "Search Console connectée à la plateforme",
          "Balises éditées page par page",
          "Redirections 301 configurées dans l'outil natif",
          "JSON-LD injecté",
        ],
        quiz: [
          {
            q: "Sur Webflow, où configure-t-on les redirections 301 ?",
            options: [
              "Dans le fichier .htaccess",
              "Project Settings → Publishing",
              "Ce n'est pas possible",
              "Dans le CSS",
            ],
            answer: 1,
            explanation: "Webflow gère nativement les redirections dans les paramètres de projet.",
          },
        ],
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  {
    id: "custom",
    emoji: "💻",
    title: "Module 8 — Sites sur-mesure (HTML / CSS / JS)",
    tagline: "Statique, SPA, React : tout ce qu'il faut coder à la main.",
    lessons: [
      {
        id: "x1-html-statique",
        title: "Site statique HTML/CSS : la base parfaite",
        duration: 30,
        level: "Intermédiaire",
        objective: "Livrer un site codé main 100 % conforme aux exigences SEO.",
        blocks: [
          {
            type: "p",
            text: "Un site statique bien codé est le meilleur terrain SEO possible : rapide, propre, sans plugin. Mais tout est à faire manuellement — rien n'est automatique.",
          },
          {
            type: "code",
            lang: "html",
            label: "Squelette de page complet et conforme",
            code: `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Rénovation de toiture Saint-Paul 974 | Nom Entreprise</title>
  <meta name="description" content="Rénovation et étanchéité de toiture à Saint-Paul. Devis gratuit 48h, garantie décennale, intervention dans tout l'ouest de La Réunion.">
  <link rel="canonical" href="https://www.exemple.fr/renovation-toiture-saint-paul">
  <meta property="og:type" content="website">
  <meta property="og:title" content="Rénovation de toiture Saint-Paul | Nom Entreprise">
  <meta property="og:description" content="Devis gratuit sous 48h à La Réunion.">
  <meta property="og:image" content="https://www.exemple.fr/img/og.jpg">
  <meta property="og:url" content="https://www.exemple.fr/renovation-toiture-saint-paul">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="preload" as="image" href="/img/hero-800.webp" fetchpriority="high">
  <link rel="icon" href="/favicon.ico">
</head>
<body>
  <header>
    <nav aria-label="Navigation principale">
      <a href="/"><img src="/img/logo.svg" width="140" height="40" alt="Nom Entreprise"></a>
      <ul>
        <li><a href="/services">Nos services</a></li>
        <li><a href="/realisations">Réalisations</a></li>
        <li><a href="/contact">Contact</a></li>
      </ul>
    </nav>
  </header>

  <main>
    <h1>Rénovation de toiture à Saint-Paul</h1>
    <p>Nous rénovons les toitures de l'ouest de La Réunion depuis 2008…</p>
    <h2>Nos prestations de couverture</h2>
    <h3>Étanchéité</h3>
    <article>…</article>
  </main>

  <footer>
    <address>12 rue de Paris, 97460 Saint-Paul — <a href="tel:+262692000000">0692 00 00 00</a></address>
  </footer>

  <script src="/js/app.js" defer></script>
</body>
</html>`,
          },
          {
            type: "list",
            items: [
              "HTML sémantique obligatoire : header, nav, main (un seul), article, section, aside, footer. Pas de soupe de <div>.",
              "lang=\"fr\" sur <html> : indispensable pour le ciblage et l'accessibilité.",
              "Fil d'Ariane visible + BreadcrumbList en JSON-LD.",
              "Page 404 personnalisée qui renvoie bien un code HTTP 404 (pas 200 !).",
              "Accessibilité = SEO : contrastes, focus visible, aria-label sur les icônes, ordre de tabulation logique.",
              "Génère robots.txt et sitemap.xml à la main ou via un script de build.",
            ],
          },
          {
            type: "code",
            lang: "js",
            label: "Script Node pour générer le sitemap au build",
            code: `import { writeFileSync } from "fs";
const BASE = "https://www.exemple.fr";
const routes = ["/", "/services", "/realisations", "/contact"];
const xml = \`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
\${routes.map(r => \`  <url><loc>\${BASE}\${r}</loc><lastmod>\${new Date().toISOString().slice(0,10)}</lastmod></url>\`).join("\\n")}
</urlset>\`;
writeFileSync("dist/sitemap.xml", xml);`,
          },
          {
            type: "warn",
            text: "Erreur fréquente sur du sur-mesure : une seule et même balise title copiée sur toutes les pages. Vérifie page par page avant livraison.",
          },
        ],
        checklist: [
          "HTML sémantique et lang=\"fr\"",
          "Title + description + canonical uniques par page",
          "robots.txt et sitemap.xml livrés",
          "404 personnalisée renvoyant un vrai code 404",
          "Open Graph complet",
        ],
        quiz: [
          {
            q: "Combien de balises <main> par page ?",
            options: ["Une seule", "Deux", "Autant que de sections", "Aucune"],
            answer: 0,
            explanation: "<main> identifie le contenu principal unique de la page.",
          },
          {
            q: "Une page 404 doit renvoyer :",
            options: [
              "Un code 200 avec un joli design",
              "Un vrai code HTTP 404",
              "Un code 301 vers la home",
              "Un code 500",
            ],
            answer: 1,
            explanation:
              "Une « soft 404 » (200 sur une page d'erreur) pollue l'index. Rediriger tout en 301 vers la home est également déconseillé.",
          },
        ],
      },
      {
        id: "x2-js-spa",
        title: "JavaScript, SPA et React : les pièges SEO",
        duration: 30,
        level: "Avancé",
        objective:
          "Rendre indexable un site JS (React, Vue, vanilla) et gérer les métadonnées dynamiques.",
        blocks: [
          {
            type: "p",
            text: "Google exécute le JavaScript, mais en deuxième vague et avec un budget limité. Les autres moteurs et surtout les IA/crawlers sociaux (Facebook, LinkedIn, WhatsApp) ne l'exécutent PAS. D'où les règles suivantes.",
          },
          {
            type: "list",
            items: [
              "Le contenu essentiel doit être présent dans le HTML initial : SSR (rendu serveur), SSG (pré-génération) ou prerendering. Une SPA 100 % client est un risque.",
              "Les liens doivent être de vraies balises <a href=\"/page\">. Un onclick={navigate()} sur un <div> n'est pas un lien pour Google.",
              "Une URL unique par contenu, avec la History API — jamais de routing par #hash.",
              "Chaque route doit mettre à jour title, description et canonical.",
              "Les partages sociaux exigent des balises OG dans le HTML servi : si elles sont injectées en JS, l'aperçu sera vide.",
              "Contenu au clic (onglets, accordéons) : le HTML doit exister dans le DOM, masqué en CSS — pas chargé uniquement au clic.",
              "Le défilement infini doit être doublé d'une pagination avec vraies URLs.",
            ],
          },
          {
            type: "code",
            lang: "tsx",
            label: "React — métadonnées par route sans dépendance",
            code: `import { useEffect } from "react";

export function useSeo({ title, description, canonical }: {
  title: string; description: string; canonical: string;
}) {
  useEffect(() => {
    document.title = title;
    const set = (sel: string, attr: string, val: string) => {
      let el = document.head.querySelector(sel) as HTMLElement | null;
      if (!el) {
        el = document.createElement(sel.startsWith("link") ? "link" : "meta");
        if (sel.includes("description")) el.setAttribute("name", "description");
        if (sel.includes("canonical")) el.setAttribute("rel", "canonical");
        if (sel.includes("og:title")) el.setAttribute("property", "og:title");
        document.head.appendChild(el);
      }
      el.setAttribute(attr, val);
    };
    set('meta[name="description"]', "content", description);
    set('link[rel="canonical"]', "href", canonical);
    set('meta[property="og:title"]', "content", title);
  }, [title, description, canonical]);
}`,
          },
          {
            type: "code",
            lang: "html",
            label: "Navigation correcte vs incorrecte",
            code: `<!-- ✅ crawlable -->
<a href="/services/toiture">Rénovation de toiture</a>

<!-- ❌ invisible pour Google -->
<div onclick="router.push('/services/toiture')">Rénovation de toiture</div>

<!-- ❌ routing par hash : une seule URL réelle -->
<a href="#/services/toiture">Rénovation de toiture</a>`,
          },
          {
            type: "code",
            lang: "nginx",
            label: "Serveur SPA — fallback index.html SANS casser les 404",
            code: `location / {
  try_files $uri $uri/ /index.html;
}
# Attention : toute URL inconnue renvoie 200. Prévois une route 404 applicative
# qui injecte <meta name="robots" content="noindex"> côté rendu.`,
          },
          {
            type: "steps",
            items: [
              "Vérifie le rendu réel : Search Console → Inspection d'URL → « Tester l'URL en direct » → onglet HTML rendu.",
              "Compare avec `curl -s https://url | head -100` : ce que voit un crawler sans JS.",
              "Si le contenu n'apparaît qu'après JS, mets en place un prerender (Netlify Prerendering, Prerender.io) ou passe en SSG au build.",
              "Contrôle chaque route dans un crawler (Screaming Frog en mode rendu JavaScript).",
            ],
          },
          {
            type: "tip",
            text: "Solution la plus simple sur un projet Vite/React vitrine : pré-générer les pages au build (SSG) avec vite-plugin-ssg ou un script Puppeteer qui écrit un HTML statique par route.",
          },
        ],
        checklist: [
          "Contenu visible dans le HTML source (curl) ou prerender actif",
          "Tous les liens sont des <a href>",
          "Métadonnées mises à jour à chaque changement de route",
          "Aucune URL en #hash",
          "Route 404 en noindex",
        ],
        quiz: [
          {
            q: "Pourquoi les balises Open Graph injectées en JavaScript posent problème ?",
            options: [
              "Elles ralentissent le site",
              "Les robots des réseaux sociaux n'exécutent pas le JS : l'aperçu de partage est vide",
              "Elles sont interdites",
              "Elles cassent le CSS",
            ],
            answer: 1,
            explanation:
              "Facebook, LinkedIn et WhatsApp lisent le HTML brut : les OG doivent y être présentes.",
          },
          {
            q: "Un menu construit avec des <div onclick> :",
            options: [
              "Est équivalent à des liens",
              "N'est pas suivi comme un lien par Google",
              "Améliore le crawl",
              "Est recommandé en SPA",
            ],
            answer: 1,
            explanation: "Seule une balise <a href> transmet un lien crawlable.",
          },
          {
            q: "Comment vérifier ce que voit un crawler sans JavaScript ?",
            options: [
              "En regardant la page dans le navigateur",
              "Avec `curl` sur l'URL ou l'inspection d'URL de Search Console",
              "En vidant le cache",
              "En imprimant la page",
            ],
            answer: 1,
            explanation: "curl affiche le HTML brut servi, avant toute exécution JS.",
          },
        ],
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  {
    id: "mesure",
    emoji: "📊",
    title: "Module 9 — Mesure, outils & audit",
    tagline: "Search Console, GA4, crawl, reporting client.",
    lessons: [
      {
        id: "m1-outils",
        title: "Search Console, GA4 et outils de crawl",
        duration: 25,
        level: "Intermédiaire",
        objective: "Installer le suivi et lire les bons indicateurs.",
        blocks: [
          {
            type: "steps",
            items: [
              "Créer la propriété Search Console (préférer le type « Domaine » via DNS) et valider.",
              "Soumettre le sitemap, vérifier « Pages » → raisons de non-indexation.",
              "Installer GA4 (balise gtag ou Google Tag Manager) et vérifier les événements clés (formulaire, appel, itinéraire).",
              "Lier GA4 ↔ Search Console pour croiser requêtes et conversions.",
              "Crawler le site (Screaming Frog gratuit jusqu'à 500 URLs) : titres dupliqués, 404, redirections, profondeur, poids des pages.",
              "Mesurer les Core Web Vitals sur PageSpeed Insights + rapport « Signaux web essentiels » de Search Console.",
            ],
          },
          {
            type: "code",
            lang: "html",
            label: "Installation GA4",
            code: `<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXX');
</script>`,
          },
          {
            type: "list",
            items: [
              "Indicateurs à suivre chaque mois : clics, impressions, position moyenne, pages indexées, CWV, conversions.",
              "Rapport client mensuel : 1 page — évolution, actions réalisées, actions du mois suivant, un chiffre business (appels/formulaires).",
              "Ne jamais promettre une position : on s'engage sur des actions et des tendances.",
            ],
          },
        ],
        checklist: [
          "Search Console vérifiée et sitemap soumis",
          "GA4 installé avec conversions configurées",
          "Crawl complet réalisé et corrections listées",
          "Modèle de rapport mensuel prêt",
        ],
        resources: [
          { label: "Search Console", url: "https://search.google.com/search-console" },
          { label: "Screaming Frog", url: "https://www.screamingfrog.co.uk/seo-spider/" },
        ],
        quiz: [
          {
            q: "Quel outil indique pourquoi une page n'est pas indexée ?",
            options: [
              "Google Analytics",
              "Search Console → rapport Pages / Inspection d'URL",
              "PageSpeed Insights",
              "Google Maps",
            ],
            answer: 1,
            explanation: "Search Console donne le motif exact d'exclusion de l'index.",
          },
        ],
      },
      {
        id: "m2-audit",
        title: "Méthode d'audit SEO en 60 minutes",
        duration: 20,
        level: "Avancé",
        objective: "Auditer n'importe quel site client et produire un plan d'action priorisé.",
        blocks: [
          {
            type: "steps",
            items: [
              "1. Indexation (10 min) — `site:domaine`, Search Console, robots.txt, sitemap, noindex.",
              "2. Technique (10 min) — HTTPS, redirections, canonical, 404, profondeur, mobile.",
              "3. Performance (10 min) — PageSpeed mobile, LCP/INP/CLS, poids des images.",
              "4. On-page (15 min) — titles/descriptions dupliqués ou manquants, H1, contenu léger, maillage.",
              "5. Local & données structurées (5 min) — fiche Google, NAP, JSON-LD.",
              "6. Contenu & concurrence (10 min) — mots-clés positionnés, gaps vs top 3.",
              "7. Livrable : tableau à 3 colonnes — Problème / Impact (fort-moyen-faible) / Action + estimation en heures.",
            ],
          },
          {
            type: "tip",
            text: "Priorise toujours par impact/effort. Corriger un noindex oublié prend 2 minutes et peut multiplier le trafic ; réécrire 50 fiches produits prend 3 jours.",
          },
        ],
        checklist: [
          "Grille d'audit en 6 étapes maîtrisée",
          "Plan d'action priorisé impact/effort produit",
          "Estimation en heures fournie au client",
        ],
        quiz: [
          {
            q: "Par quoi commence tout audit SEO ?",
            options: [
              "Le netlinking",
              "L'indexation et l'accessibilité",
              "Le design",
              "Les réseaux sociaux",
            ],
            answer: 1,
            explanation: "Inutile d'optimiser une page que Google ne peut pas voir.",
          },
        ],
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  {
    id: "autorite",
    emoji: "🔗",
    title: "Module 10 — Autorité & pérennité",
    tagline: "Netlinking propre, IA & recherche générative, suivi long terme.",
    lessons: [
      {
        id: "a1-netlinking",
        title: "Netlinking éthique et visibilité dans les IA",
        duration: 20,
        level: "Avancé",
        objective: "Développer l'autorité d'un site sans risque de pénalité.",
        blocks: [
          {
            type: "list",
            items: [
              "Un bon lien : site thématiquement proche, trafic réel, contenu éditorial, ancre naturelle, en dofollow, placé dans le corps du texte.",
              "Sources saines à La Réunion : partenaires et fournisseurs, associations et fédérations, presse locale, annuaires qualitatifs, sponsoring d'événements, interviews et témoignages.",
              "À éviter absolument : achat massif de liens, fermes de liens, échanges triangulaires industrialisés, commentaires spammés, PBN.",
              "Varier les ancres : marque (40 %), URL nue, générique (« en savoir plus »), et seulement une minorité d'ancres exactes optimisées.",
              "Surveiller les liens toxiques dans Search Console → Liens, et désavouer uniquement en cas d'attaque avérée.",
            ],
          },
          { type: "p", text: "Recherche générative (AI Overviews, ChatGPT, Perplexity) :" },
          {
            type: "list",
            items: [
              "Réponses claires et directes en début de page : les IA extraient des passages autonomes.",
              "Structure en questions/réponses et FAQ balisée.",
              "Données factuelles vérifiables : prix, délais, zones, chiffres, dates de mise à jour.",
              "Entité forte : Organization en JSON-LD, cohérence du nom partout, page « À propos » détaillée, avis et mentions externes.",
              "Ne pas bloquer les crawlers d'IA dans robots.txt si l'on souhaite être cité.",
            ],
          },
          {
            type: "warn",
            text: "Le SEO est un travail de fond : compte 3 à 6 mois pour des résultats stables sur un site local, davantage sur un secteur concurrentiel. Annonce-le au client dès le départ.",
          },
        ],
        checklist: [
          "Stratégie de liens locale identifiée pour le client",
          "Profil d'ancres varié",
          "Contenu structuré en questions/réponses",
          "Organization JSON-LD posé",
        ],
        quiz: [
          {
            q: "Quelle pratique risque une pénalité Google ?",
            options: [
              "Un partenariat avec un fournisseur local",
              "L'achat massif de liens sur des fermes de liens",
              "Un article invité pertinent",
              "Une inscription à la CCI",
            ],
            answer: 1,
            explanation: "Les liens artificiels à grande échelle sont explicitement sanctionnés.",
          },
          {
            q: "Pour être cité par les IA de recherche, il faut surtout :",
            options: [
              "Cacher du texte",
              "Des réponses claires, factuelles et structurées",
              "Beaucoup de publicités",
              "Un design animé",
            ],
            answer: 1,
            explanation:
              "Les modèles extraient des passages autonomes, vérifiables et bien structurés.",
          },
        ],
      },
    ],
  },
];

export const ALL_LESSONS = SEO_CURRICULUM.flatMap((m) =>
  m.lessons.map((l) => ({ ...l, moduleId: m.id, moduleTitle: m.title })),
);

export const TOTAL_LESSONS = ALL_LESSONS.length;
export const TOTAL_DURATION = ALL_LESSONS.reduce((s, l) => s + l.duration, 0);

export function getLevelBadge(level: SeoLesson["level"]) {
  switch (level) {
    case "Débutant":
      return "bg-emerald-500/10 text-emerald-500 border-emerald-500/30";
    case "Intermédiaire":
      return "bg-amber-500/10 text-amber-500 border-amber-500/30";
    default:
      return "bg-rose-500/10 text-rose-500 border-rose-500/30";
  }
}
