# Adamkom — CRM & Gestion de Projets

Plateforme interne d'Adamkom (agence marketing digital à La Réunion 🇷🇪) pour gérer les clients, projets, factures, communications et automatisations.

- **URL de production** : https://ai.adamkom.com
- **Région** : EMEA · Fuseau **UTC+4 (La Réunion)**
- **Devise** : Euro (€)

---

## 🧱 Stack technique

### 🎨 Frontend

| Techno | Rôle |
|---|---|
| **React 18** + **TypeScript 5** | Framework UI typé, base de toute l'application |
| **Vite 5** | Bundler ultra-rapide pour le dev et la prod |
| **Tailwind CSS v3** + `tailwindcss-animate` | Styling utilitaire et animations CSS |
| **shadcn/ui** (Radix UI) | Composants accessibles (Dialog, Select, Combobox, Popover…) |
| **Framer Motion** | Animations fluides (navigation Pipeline, hover calendrier…) |
| **React Router** | Routing client-side |
| **TanStack Query** | Cache, refetch et synchronisation des données serveur |
| **Lucide React** | Bibliothèque d'icônes SVG |
| **Sonner** | Toasts élégants pour les notifications utilisateur |
| **react-day-picker** | Sélecteur de date (calendrier) |
| **date-fns** | Manipulation de dates en français |

### ⚙️ Backend — Lovable Cloud (Supabase)

| Techno | Rôle |
|---|---|
| **PostgreSQL** | Base de données relationnelle (clients, projets, factures, etc.) |
| **Row Level Security (RLS)** | Sécurité au niveau ligne par rôle utilisateur |
| **Edge Functions (Deno)** | Logique serveur : webhooks, envois email, génération IA, suppression utilisateurs |
| **Supabase Auth** | Authentification (login uniquement, inscription désactivée) |
| **Supabase Storage** | Stockage fichiers (logos, images formulaires clients, max 10/client) |
| **Realtime (Postgres Changes)** | Synchronisation live (notifications, badge sync, /debug-realtime) |
| **pg_cron** | Tâches planifiées (alertes deadlines, rappels) |

### 🤖 Intelligence artificielle

| Techno | Rôle |
|---|---|
| **Lovable AI Gateway** | Accès aux modèles sans clé API |
| **Google Gemini 2.5 Flash** | Génération des emails clients personnalisés (HTML) |

### 🔌 Intégrations externes

| Service | Rôle |
|---|---|
| **n8n** | Routeur central d'automatisations (webhook unique → Switch node) |
| **Brevo (ex-Sendinblue)** | Envoi des emails transactionnels et campagnes marketing |
| **Meta (Facebook / Instagram)** | OAuth multi-pages, publication sociale |
| **Google Business Manager** | Module GMB centralisé (checklist 8 étapes) |
| **Firecrawl** | Prospection (scraping de leads, dédupliqué avec la DB) |
| **Discord** | Notifications support, prospects RDV |
| **Google Meet** | Liens visio pour les événements calendrier |

### 📄 Génération de documents

| Techno | Rôle |
|---|---|
| **jsPDF** + **jspdf-autotable** | Factures (charte navy/gold JJ Pothin), exports clients, rapports GMB |

### 🛠️ Outils de développement

| Techno | Rôle |
|---|---|
| **ESLint** | Linting du code TypeScript/React |
| **Vitest** | Tests unitaires |
| **bun / npm** | Gestion des dépendances |
| **lovable-tagger** | Plugin Vite (mode dev) pour le tagging composants |

### 🌍 Déploiement

- **Lovable** — hébergement, CI/CD et previews
- Domaine custom : **ai.adamkom.com**
- Région : **EMEA**
- Workflows n8n importables : `public/n8n-workflows/*.json`

---

## 🔐 Sécurité & rôles

6 rôles distincts (admin, agent_master, agent_support, webmaster, commercial, agent) avec contraintes RLS strictes.
Inscription publique **désactivée** — création des comptes par les admins uniquement.

## 📦 Structure projet

```
src/
├── components/       Composants UI (shadcn + métier)
├── hooks/            Hooks TanStack Query (use-clients, use-invoices…)
├── pages/            Routes (Clients, Projects, Calendrier, Gmb…)
├── lib/              Helpers (PDF, email-template, constants)
└── integrations/     Client Supabase auto-généré
supabase/
├── functions/        Edge Functions (Deno)
└── migrations/       SQL versionné
public/n8n-workflows/ Workflows n8n importables
```
