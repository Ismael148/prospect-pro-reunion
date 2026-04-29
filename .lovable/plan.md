## Page tuto Facebook publique pour clients Adamkom

Une page web publique (non authentifiée) qui guide tes clients pas-à-pas pour créer leur Business Manager, créer/rattacher leur page Facebook, et te renvoyer les infos nécessaires. 100% intégrée au CRM, design Adamkom.

---

### URL et accès

- Route publique : `https://ai.adamkom.com/tuto/facebook?client=NDI-XXXX` (ou sans paramètre pour un partage générique)
- Si `client=` est renseigné → le formulaire de fin pré-remplit le client et lie automatiquement la soumission à sa fiche CRM
- Si pas de paramètre → le client tape son nom d'entreprise / téléphone et tu reçois l'info en alerte

---

### Structure de la page

```text
┌────────────────────────────────────────────────────┐
│ [Logo Adamkom]    Tutoriel Facebook Business      │
│                   ⏱ 10 min · 100% gratuit         │
├────────────────────────────────────────────────────┤
│ HERO glassmorphism rose                            │
│ "Créez votre Business Manager en 10 min"           │
│ [Démarrer le tuto ↓]                               │
├────────────────────────────────────────────────────┤
│ STEPPER vertical (sticky à gauche)                 │
│  ● Étape 1 — Avez-vous déjà une page FB ?         │
│  ○ Étape 2 — Créer la page (si besoin)            │
│  ○ Étape 3 — Créer le Business Manager            │
│  ○ Étape 4 — Rattacher la page au BM              │
│  ○ Étape 5 — Trouver l'ID du BM                   │
│  ○ Étape 6 — Envoyer les infos à Adamkom          │
├────────────────────────────────────────────────────┤
│ CONTENU étape active (cards glassmorphism)         │
│  - Titre + temps estimé                            │
│  - Capture d'écran annotée (flèches roses)        │
│  - Liste numérotée d'actions                       │
│  - Bouton "C'est fait, étape suivante →"          │
├────────────────────────────────────────────────────┤
│ FORMULAIRE FINAL (étape 6)                         │
│  Nom entreprise · Email rattaché · ID BM ·         │
│  Nom de page · URL page · Notes                    │
│  [Envoyer à Adamkom]                               │
├────────────────────────────────────────────────────┤
│ FOOTER : "Pas le temps ? Contactez-nous, on le    │
│          fait pour vous (sur devis)"              │
└────────────────────────────────────────────────────┘
```

---

### Contenu des 6 étapes (rédigé pour clients non-tech)

**Étape 1 — Avez-vous déjà une page Facebook ?**
- Deux gros boutons : "Oui, j'ai déjà une page" → saute à étape 3 / "Non, je dois la créer" → continue étape 2

**Étape 2 — Créer votre page Facebook (5 min)**
- Va sur `facebook.com/pages/create`
- Choisis un nom (ton nom d'entreprise)
- Choisis une catégorie (ex : Restaurant, Coiffeur, Boutique)
- Ajoute photo de profil (logo) + photo de couverture
- Description courte (1-2 phrases sur ton activité)
- Clique "Créer"
- Capture annotée du formulaire FB

**Étape 3 — Créer votre Business Manager (3 min)**
- Va sur `business.facebook.com/overview`
- Clique "Créer un compte"
- Renseigne : nom de l'entreprise, ton nom, ton email pro
- Valide l'email (lien reçu)
- Capture du dashboard BM vide

**Étape 4 — Rattacher votre page au BM (2 min)**
- Dans le BM → Paramètres → Comptes → Pages
- Clique "Ajouter" → "Ajouter une page"
- Tape le nom de ta page → Sélectionner → Confirmer
- Capture annotée du menu Paramètres

**Étape 5 — Trouver l'ID de votre Business Manager (30 sec)**
- Dans le BM → Paramètres → Infos sur l'entreprise
- L'ID est affiché en haut (15-16 chiffres)
- Copie-le
- Capture avec flèche rose pointant l'ID

**Étape 6 — Envoyer les infos à Adamkom**
- Formulaire intégré (zod-validé)
- À la soumission : toast de remerciement + animation confetti rose

---

### Schéma BDD (nouvelle table)

```sql
create table public.fb_onboarding_submissions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete set null,
  client_ndi text,                      -- pré-rempli si ?client=NDI-XXXX
  company_name text not null,
  contact_email text not null,
  fb_page_url text,
  fb_page_name text,
  business_manager_id text,
  business_manager_email text not null,
  notes text,
  status text not null default 'recu',  -- recu / traite / archive
  source_url text,                      -- referrer
  created_at timestamptz default now(),
  processed_at timestamptz,
  processed_by uuid references auth.users(id)
);

alter table public.fb_onboarding_submissions enable row level security;

-- Insertion publique (formulaire anonyme)
create policy "anyone can submit fb onboarding"
on public.fb_onboarding_submissions for insert to anon, authenticated
with check (true);

-- Lecture/maj réservée admin/agent_master/agent
create policy "team can read fb onboarding"
on public.fb_onboarding_submissions for select to authenticated
using (
  has_role(auth.uid(),'admin') or
  has_role(auth.uid(),'agent_master') or
  has_role(auth.uid(),'agent')
);

create policy "team can update fb onboarding"
on public.fb_onboarding_submissions for update to authenticated
using (has_role(auth.uid(),'admin') or has_role(auth.uid(),'agent_master'));
```

À la soumission, un trigger crée aussi une `notification` interne + envoi Discord via le webhook n8n existant (route déjà en place).

---

### Fichiers à créer / modifier

**Nouveaux**
- `src/pages/TutoFacebook.tsx` — page publique avec stepper, contenu, formulaire
- `src/components/tuto/TutoStepper.tsx` — stepper vertical sticky
- `src/components/tuto/TutoStep.tsx` — card glassmorphism d'une étape
- `src/components/tuto/FbOnboardingForm.tsx` — formulaire zod + submit
- `src/hooks/use-fb-onboarding.ts` — mutation insert + liste (admin)
- `src/pages/FbOnboardingInbox.tsx` — page admin `/onboarding-fb` listant les soumissions reçues
- `supabase/migrations/<ts>_fb_onboarding.sql` — table + RLS + trigger notif
- `public/tuto/fb-step1.png … fb-step5.png` — captures d'écran annotées (placeholders SVG si pas encore de vraies captures)

**Modifiés**
- `src/App.tsx` — routes `/tuto/facebook` (publique) et `/onboarding-fb` (protégée)
- `src/components/layout/AppSidebar.tsx` — entrée "Onboarding FB" pour admin/agent_master
- `src/hooks/use-global-realtime.ts` — écoute table `fb_onboarding_submissions`
- `src/components/clients/SocialMediaSection.tsx` — bouton "Envoyer le tuto FB au client" qui copie/partage le lien `/tuto/facebook?client=NDI-XXXX`

---

### Design (cohérent charte Adamkom)

- Fond : `bg-background` avec gradient subtil rose en haut (radial)
- Cards : `backdrop-blur-xl bg-white/70 border border-white/40 shadow-xl rounded-2xl`
- Accents : `#ff006e` sur titres, étapes actives, boutons CTA
- Police : Space Grotesk (déjà chargée)
- Animations : `framer-motion` sur transitions d'étapes (déjà installé)
- Responsive mobile-first (la majorité des clients ouvrira sur téléphone)

---

### Ce qui n'est PAS dans ce plan (volontairement)

- Pas de récupération d'accès via OAuth Meta (tu as dit non)
- Pas de PDF téléchargeable (tu as choisi "page web uniquement")
- Pas d'option payante "on le fait pour toi" intégrée (juste mention en footer)
- Pas de captures d'écran réelles dans v1 → on met des placeholders SVG annotés ; tu pourras me redemander d'intégrer les vraies captures plus tard
