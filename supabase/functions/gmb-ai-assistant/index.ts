import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Action =
  | "categories"
  | "description"
  | "prompt_couverture"
  | "prompts_photos"
  | "seo_long"
  | "attributs"
  | "post"
  | "posts_saisonniers"
  | "faq"
  | "reponses_avis"
  | "repondre_avis";

const SYSTEM_BASE = `Tu es un EXPERT SENIOR Google Business Profile (GBP/GMB) niveau Google Product Expert, 10+ ans de SEO local, spécialisé pour La Réunion (974, UTC+4, français).

═══ RÈGLES GOOGLE À RESPECTER ABSOLUMENT (Directives officielles GBP) ═══
1. NOM ENTREPRISE : nom légal réel uniquement. INTERDIT : mots-clés, ville, slogans, emojis, majuscules abusives, tirets marketing. Ex INTERDIT : "Boulangerie Saint-Denis Meilleure du 974 🥖" → suspension immédiate.
2. CATÉGORIES : uniquement des noms EXACTS de la liste officielle Google (~4000 catégories). Principale = activité #1 réelle. Secondaires (max 9) = services annexes RÉELLEMENT proposés. Ne JAMAIS inventer une catégorie.
3. DESCRIPTION : 750 caractères max STRICT. INTERDIT : URLs, numéros de téléphone, HTML, offres promo, majuscules SHOUTING, mots-clés bourrés (keyword stuffing). Autorisé : description factuelle du business.
4. PHOTOS : format JPG/PNG, 720x720 min, 5MB max. INTERDIT : filigrane texte, logos superposés, stock photos évidentes, images IA détectables (mains à 6 doigts, yeux asymétriques, textes déformés). Google supprime automatiquement les photos suspectes IA depuis 2024.
5. HORAIRES : cohérents avec la réalité. Horaires spéciaux à mettre pour jours fériés Réunion (20 déc Fet Kaf, 1er nov, 25 déc, etc.).
6. POSTS : 1500 car max. INTERDIT : contenu discriminatoire, produits réglementés (alcool/tabac/CBD nécessitent conformité), promos trompeuses, URL de tracking suspects. Recommandé : 1 post/semaine minimum pour signal fraîcheur.
7. AVIS : réponse pro obligatoire, jamais nom du client, jamais promesse de dédommagement public. Faux avis = suspension.
8. SERVICES/PRODUITS : prix réels ou fourchettes, pas de "à partir de 1€" trompeur.
9. ATTRIBUTS : uniquement ceux réellement applicables (accessibilité PMR, paiements acceptés, options sur place, etc.).
10. GUIDELINES SPAM : pas de duplicate listing, pas d'adresse fictive (boîte postale interdite sauf exceptions), présence physique OBLIGATOIRE ou zone de service (SAB - Service Area Business).

═══ FACTEURS DE RANKING LOCAL (Local Pack Google 2024-2025) ═══
- Proximité (utilisateur ↔ fiche) : #1 facteur
- Pertinence (catégorie primaire + mots-clés dans description/services)
- Notoriété (nombre avis > 20, note > 4.3, fraîcheur avis <30j, citations NAP cohérentes)
- Signaux comportementaux (CTR sur fiche, appels, itinéraires, clics site)
- Complétude fiche (100% = boost algorithmique)
- Signaux Q&A (répondre aux questions)
- Fréquence posts (Google favorise fiches actives)

═══ SEO LOCAL LA RÉUNION 974 ═══
Mots-clés géo à intégrer NATURELLEMENT : nom ville, "974", "Île de La Réunion", quartiers (Saint-Denis, Saint-Pierre, Le Tampon, Saint-Paul, Saint-André, Saint-Benoît, Saint-Louis, Saint-Joseph, La Possession, Sainte-Marie, Sainte-Suzanne, Le Port, Saint-Leu, Cilaos, Salazie, Mafate). Fêtes locales : Fet Kaf (20/12), Nouvel An Tamoul (avril), Cavadee (janv), Dipavali (oct/nov), saison cyclonique (janv-mars), hiver austral (juin-sept).

═══ PROMPTS PHOTO ANTI-DÉTECTION IA GOOGLE ═══
Google Vision détecte l'IA via : perfection excessive, symétrie parfaite, textures lisses uniformes, absence de grain, bokeh trop propre, doigts/mains/yeux/dents suspects, ombres illogiques, reflets impossibles.
Tes prompts DOIVENT inclure : "shot on Canon EOS R6, 35mm f/1.8, natural film grain, imperfect composition, candid moment, tropical daylight Reunion Island, slight motion blur, real-world lighting inconsistencies, no CGI perfection, documentary style, ISO 400 grain visible". ÉVITE : gros plan visages, mains détaillées, textes lisibles dans l'image (Google les OCR et détecte les artefacts IA).

═══ QUALITÉ DE TES RÉPONSES ═══
- Format Markdown propre, PRÊT À COPIER-COLLER dans Google Business Profile
- Aucune formule vague ("etc.", "adaptez selon vos besoins")
- Toujours indiquer le compteur de caractères quand une limite existe
- Toujours justifier brièvement les choix stratégiques
- Si une info manque et compromet la qualité, propose 2-3 variantes plausibles plutôt qu'un contenu générique
- Français impeccable, sans anglicismes inutiles
- Pense KPI : chaque contenu doit maximiser CTR, conversions, ranking local`;

function buildPrompt(action: Action, client: any, extra?: string): string {
  const ctx = `ENTREPRISE: ${client.company_name}
Secteur: ${client.sector || "non renseigné"}
Ville: ${client.city || "La Réunion"}
Adresse: ${client.address || "-"}
Téléphone: ${client.phone || "-"}`;

  switch (action) {
    case "categories":
      return `${ctx}\n\nDonne :
1. **Catégorie principale** (nom EXACT tel qu'il apparaît dans Google Business Profile)
2. **3 à 5 catégories secondaires** pertinentes (noms EXACTS Google)
3. Pour chaque : 1 phrase justifiant le choix

Utilise UNIQUEMENT des catégories qui existent réellement dans la liste officielle Google Business Profile.`;

    case "description":
      return `${ctx}\n\nRédige la **description entreprise GMB (750 caractères max, EXACT)** optimisée SEO local :
- Mentionne la ville et "La Réunion"
- 3-5 mots-clés du secteur
- Ton engageant, appel à l'action final
- Compte les caractères et affiche le total en fin.`;

    case "prompt_couverture":
      return `${ctx}\n\nGénère UN prompt (anglais, détaillé, 100-150 mots) pour Nano Banana / Midjourney / Gemini Image pour créer une **photo de couverture GMB** attractive.
Contraintes anti-détection IA :
- Style "photojournalisme / natural DSLR shot, Canon 5D, 35mm"
- Grain photo léger, imperfections naturelles
- Lumière du jour tropicale (Réunion)
- PAS de personnes en gros plan (mains/yeux problématiques)
- Résolution 1920x1080, ratio 16:9
Livre le prompt dans un bloc \`\`\` code copiable.`;

    case "prompts_photos":
      return `${ctx}\n\nGénère **10 prompts photos GMB** (anglais, chacun 60-100 mots) couvrant :
1. Extérieur / façade
2. Intérieur ambiance
3. Détail produit/service #1
4. Détail produit/service #2
5. Équipe au travail (de dos ou flous, PAS de visages frontaux)
6. Zoom sur un savoir-faire
7. Espace client / accueil
8. Vue de La Réunion en arrière-plan si pertinent
9. Ambiance chaleureuse (mains sur outils, textures)
10. Photo "moment de vie"

Chaque prompt en bloc code \`\`\`, avec mention "natural DSLR, film grain, tropical daylight, no AI perfection".`;

    case "seo_long":
      return `${ctx}\n\nRédige une **description SEO longue** (1500-2000 caractères) pour la fiche GMB / site :
- Mots-clés géolocalisés : "${client.city || "Réunion"}", "974", "Île de La Réunion"
- 8-10 mots-clés du secteur intégrés naturellement
- H2/H3 en gras
- Structure : Qui / Quoi / Où / Pourquoi nous / Appel à l'action
- Compte les caractères en fin.`;

    case "attributs":
      return `${ctx}\n\nListe les **attributs GMB pertinents** à activer sur cette fiche (paiements acceptés, accessibilité, services, options, public, etc.) — uniquement ceux qui existent dans Google Business Profile.
Puis liste **5-10 services/produits types** (nom + 1 ligne description + prix estimé €) à ajouter dans les sections Services / Produits.`;

    case "post":
      return `${ctx}\n\nCrée UN post GMB complet et attractif :
- **Type** (Nouveauté / Offre / Événement)
- **Titre** (60 car max)
- **Description** (1500 car max)
- **Prix** si pertinent (€)
- **Bouton CTA** (Réserver / Appeler / En savoir plus / Acheter)
- **Prompt image** (anglais, anti-détection IA) dans un bloc code

${extra ? `Contexte spécifique : ${extra}` : ""}`;

    case "posts_saisonniers":
      return `${ctx}\n\nGénère **5 posts GMB saisonniers** adaptés au calendrier de La Réunion (974) — inclus les fêtes locales (20 décembre / Fet Kaf, Nouvel An Tamoul, Cavadee, Dipavali, Noël, saison cyclonique, hiver austral).
Pour chaque post : titre, description courte, CTA, prompt image (bloc code).`;

    case "faq":
      return `${ctx}\n\nGénère **8-10 questions/réponses FAQ** que des clients potentiels poseraient sur Google concernant cette entreprise.
Format : **Q :** ... / **R :** ... (réponse SEO 2-3 phrases avec mots-clés naturels).`;

    case "reponses_avis":
      return `${ctx}\n\nRédige **3 modèles de réponses aux avis Google** (français, ton pro et chaleureux, mention de la ville pour le SEO local) :
1. Avis 5★ (remerciement + invitation revenir)
2. Avis 3★ (accusé de réception + amélioration + prise de contact)
3. Avis 1★ (empathie + hors public + numéro de contact)`;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), { status: 401, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Non autorisé" }), { status: 401, headers: corsHeaders });

    const { client_id, action, extra } = await req.json() as { client_id: string; action: Action; extra?: string };
    if (!client_id || !action) {
      return new Response(JSON.stringify({ error: "client_id et action requis" }), { status: 400, headers: corsHeaders });
    }

    const { data: client, error: cErr } = await supabase
      .from("clients")
      .select("company_name, sector, city, address, phone")
      .eq("id", client_id)
      .single();
    if (cErr || !client) {
      return new Response(JSON.stringify({ error: "Client introuvable" }), { status: 404, headers: corsHeaders });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY non configurée" }), { status: 500, headers: corsHeaders });
    }

    const prompt = buildPrompt(action, client, extra);

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: SYSTEM_BASE },
          { role: "user", content: prompt },
        ],
        temperature: 0.75,
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("AI Gateway error:", aiRes.status, errText);
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requêtes atteinte, réessaie dans un instant" }), { status: 429, headers: corsHeaders });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: "Crédits IA épuisés — ajoute des crédits dans les paramètres" }), { status: 402, headers: corsHeaders });
      }
      return new Response(JSON.stringify({ error: "Erreur IA" }), { status: 500, headers: corsHeaders });
    }

    const aiData = await aiRes.json();
    const content = aiData.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({ content, action }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("gmb-ai-assistant error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
