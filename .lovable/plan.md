# Suite GMB complète — Suivi, guide webmaster, livrable client

## Objectif
Faire de la gestion de fiches Google un module leader : le webmaster sait quoi faire, l'admin voit tout d'un coup d'œil, le client voit ce qu'on fait pour lui.

## 1. Base de données (nouvelles tables)

### `gmb_activities` — Journal d'activité par fiche
- `id`, `client_gmb_id`, `client_id`
- `action_type` enum : `post_publie`, `photo_ajoutee`, `avis_repondu`, `description_maj`, `horaires_maj`, `produit_ajoute`, `qa_repondue`, `verification`, `autre`
- `description` text, `link` text (URL post/photo), `visible_to_client` bool (default true)
- `performed_by` uuid, `performed_at` timestamptz
- RLS : admin/webmaster CRUD ; lecture publique via token client (voir §3)

### `gmb_monthly_goals` — Objectifs mensuels par fiche
- `id`, `client_gmb_id`, `month_year` (YYYY-MM)
- `posts_target` int (défaut 4), `posts_done` int
- `reviews_reply_target_pct` int (défaut 100), `reviews_replied` int, `reviews_received` int
- `photos_target` int (défaut 8), `photos_done` int
- unique (`client_gmb_id`, `month_year`)

### `clients.gmb_public_token` (uuid)
Token pour la page livrable client publique (généré à l'activation du suivi GMB).

## 2. Guide Webmaster GMB pas-à-pas

Nouveau composant `GmbWebmasterPlaybook` intégré dans la fiche GMB (page `/gmb` détail modal ou nouvelle route `/gmb/:id`) :
- Checklist enrichie regroupée en 4 phases : **Création** (compte, adresse, catégorie, vérification postale), **Optimisation** (logo, photos couverture/intérieur, horaires, description SEO, attributs, services), **Contenu** (1er post, produits, Q&A), **Récurrent** (posts hebdo, réponses avis <48h, photos mensuelles).
- Chaque étape : titre, description, astuce, lien 1-clic vers la section Google Business Profile correspondante (via `business.google.com/n/<locationId>/...` quand `gmb_location_id` est renseigné).
- Coche = met à jour `client_gmb.checklist_*` et loggue une entrée dans `gmb_activities`.

## 3. Dashboard suivi global GMB (enrichissement `/gmb`)

- Cartes KPI en haut : total fiches, % checklist moyen, avis non répondus (total), fiches en retard (>30j sans post ou avis >48h)
- Tableau enrichi : colonnes `% checklist`, `Dernier post` (jours), `Avis non répondus`, `Objectif mois` (barre), `Alertes` (badges rouges), `Livrable client` (bouton "Copier le lien")
- Filtres : statut, alertes seulement, mois
- Export CSV bouton

## 4. Page livrable client publique

Nouvelle route publique `/mon-gmb/:token` (pas d'auth) :
- Résout `token` → `clients.gmb_public_token` → `client_gmb` + `gmb_activities` (visible_to_client=true) + `gmb_monthly_goals`
- Affiche : nom entreprise, statut fiche (badge), progression checklist (grande barre), objectifs du mois (posts/avis/photos), timeline des 20 dernières actions visibles, lien vers la fiche Google
- RPC `SECURITY DEFINER` `get_public_gmb_dashboard(p_token uuid)` renvoie tout en un appel (pas d'accès direct anon aux tables)
- Design : cohérent charte Adamkom (Space Grotesk, #ff006e, glassmorphism)

## 5. Journal d'activité (timeline)

- Composant `GmbActivityTimeline` : liste chronologique inversée, icône par type, badge "visible client" toggle
- Formulaire rapide "Logger une action" dans la modale fiche : type, description, lien, checkbox visible client
- Auto-log : quand webmaster coche checklist, quand statut change, quand objectifs mis à jour

## 6. Objectifs mensuels

- Section dans la modale fiche : sliders/inputs pour cibles + comptage manuel (incrément +1 quand action loggée du bon type)
- Barre de progression 3 couleurs (rouge <50%, ambre <80%, vert)
- Auto-création du mois courant à l'ouverture

## Fichiers touchés

**Migration SQL** (une seule) :
- créer `gmb_activities`, `gmb_monthly_goals`, colonne `clients.gmb_public_token` + trigger génération
- RPC `get_public_gmb_dashboard`
- GRANT + RLS

**Front** :
- `src/hooks/use-gmb-activities.ts` (nouveau)
- `src/hooks/use-gmb-goals.ts` (nouveau)
- `src/hooks/use-client-gmb.ts` (étendre)
- `src/components/gmb/GmbWebmasterPlaybook.tsx` (nouveau)
- `src/components/gmb/GmbActivityTimeline.tsx` (nouveau)
- `src/components/gmb/GmbMonthlyGoals.tsx` (nouveau)
- `src/components/gmb/GmbFicheModal.tsx` (nouveau — regroupe playbook + timeline + objectifs)
- `src/pages/Gmb.tsx` (enrichir : KPI, alertes, colonnes, CSV, bouton lien public)
- `src/pages/GmbPublic.tsx` (nouveau — route publique)
- `src/App.tsx` (route `/mon-gmb/:token`)
- `src/lib/gmb-playbook.ts` (structure de données des étapes du playbook)

## Hors périmètre (pour plus tard)
- Rappels pg_cron automatiques (post hebdo, avis >48h)
- Rapport PDF mensuel auto envoyé au client
- Benchmark concurrents
- Synchronisation API Google Business (nécessite validation Meta/Google)

## Livraison
Un seul lot cohérent, testé au build. Les objectifs mensuels sont inclus comme demandé.
