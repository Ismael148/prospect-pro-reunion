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
  | "reponses_avis";

const SYSTEM_BASE = `Tu es un expert SEO local et Google Business Profile spécialisé pour La Réunion (974, UTC+4).
Tu rédiges en français, style pro mais chaleureux. Tu connais toutes les catégories officielles Google Business Profile.
Tes prompts photo produisent des images RÉALISTES qui ne sont PAS détectables comme IA (grain naturel, imperfections, lumière du jour Réunion, pas de mains bizarres, pas d'yeux trop symétriques, pas de perfection artificielle).
IMPORTANT: Réponds TOUJOURS en Markdown propre, prêt à copier-coller. Pas de préambule inutile.`;

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
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_BASE },
          { role: "user", content: prompt },
        ],
        temperature: 0.8,
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
