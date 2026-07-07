# 🤖 Assistant IA GMB pour Webmasters

Un panneau IA intégré au playbook GMB (`GmbWebmasterPlaybook`) qui génère tout le contenu depuis juste le nom d'entreprise + secteur du client. Utilise **Lovable AI Gateway** (Gemini 2.5 Flash) — pas besoin de clé OpenAI, tout est déjà configuré et gratuit pour l'équipe.

## 🎯 Générateurs disponibles

**Phase 1 — Création :**
- **Catégories GMB** → suggère 1 catégorie principale + 3-5 secondaires depuis la liste officielle Google (grounding IA + secteur client)
- **Description entreprise (750 car max)** → optimisée SEO avec mots-clés locaux Réunion

**Phase 2 — Optimisation :**
- **Prompt photo de couverture** → prompt détaillé pour Nano Banana / Midjourney, style "photo réelle non-IA détectable" (grain, lumière naturelle, imperfections)
- **Pack 10 prompts photos** → couverture + intérieur + équipe + produits/services + ambiance, tous "anti-détection IA"
- **Description SEO longue** → avec mots-clés géolocalisés (ville + secteur + Réunion)
- **Attributs / services / produits** → liste structurée à copier dans GBP

**Phase 3 — Engagement :**
- **Post GMB complet** → titre + description + prix + bouton CTA + prompt image
- **Pack 5 posts saisonniers** → adaptés au calendrier Réunion (fêtes locales, saisons)
- **FAQ anticipées** → 8-10 questions/réponses selon le secteur
- **Réponses aux avis** → 3 modèles (5★, 3★, 1★) personnalisés au secteur

**Phase 4 — Suivi avis :**
- Système de rafraîchissement du compteur d'avis via champ `total_reviews` + notification quand un nouvel avis apparaît (le webmaster met à jour manuellement le compteur → trigger crée une notif interne "🌟 Nouvel avis sur [client]")

## 🖥️ UX

Un bouton flottant **✨ Assistant IA** dans `GmbWebmasterPlaybook` ouvre un `Sheet` latéral avec :
- Header : rappel nom entreprise + secteur (lecture seule, tiré du client)
- Onglets par phase (1/2/3/4)
- Chaque générateur = une carte avec bouton "Générer", spinner, résultat en `<pre>` copiable en 1 clic (toast confirmation)
- Historique local (localStorage) des 5 dernières générations par client

## 🔧 Technique

**Edge Function** `gmb-ai-assistant` (nouvelle) :
- Auth JWT obligatoire
- Body : `{ client_id, action, extra? }` où action ∈ catégories | description | prompt_couverture | prompts_photos | seo_long | attributs | post | posts_saisonniers | faq | reponses_avis
- Charge le client depuis Supabase (nom, secteur, ville, adresse)
- Appelle `google/gemini-2.5-flash` via Lovable AI Gateway avec prompt système spécialisé par action
- Retourne JSON structuré selon l'action

**Frontend** :
- `src/components/gmb/GmbAiAssistant.tsx` (nouveau) — Sheet + onglets + générateurs
- `src/hooks/use-gmb-ai.ts` (nouveau) — mutation React Query par action
- Bouton d'ouverture dans `GmbWebmasterPlaybook.tsx` (header)

**Notif nouvel avis** :
- Trigger SQL sur `client_gmb` : si `total_reviews` augmente → insert dans `notifications` (déjà relié au push FCM)

Aucune modif de la table `client_gmb` — les résultats IA sont juste affichés/copiés, pas stockés (le webmaster copie/colle dans GBP).

## 🚀 Impact

Le webmaster passe de "je réfléchis, je rédige, je cherche" à "je clique, je copie, je colle". Chaque fiche GMB peut être remplie en ~15 min au lieu d'1h.