import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const { company_name, sector, pack_type, manager_name, context, current_subject } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), { status: 500, headers: corsHeaders });
    }

    const brandColor = "#ff006e";

    const systemPrompt = `Tu es un expert en email marketing pour Adamkom, une agence digitale à La Réunion spécialisée dans la création de sites web, cartes NFC et solutions numériques pour les entreprises locales.

Tu génères des emails HTML professionnels et engageants. Le style doit être :
- Professionnel mais chaleureux
- Adapté au contexte réunionnais
- Utilisant du HTML inline CSS (pas de classes CSS)
- Couleur principale : ${brandColor}
- Typographie : font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif

IMPORTANT : Tu ne génères QUE le contenu du body (pas le wrapper/header/footer qui sont ajoutés automatiquement).
Utilise des balises <p>, <ul>, <strong>, <a> avec des styles inline.
Inclus toujours une formule de politesse et signe "L'équipe Adamkom".

Réponds UNIQUEMENT en JSON avec exactement ces clés : { "subject": "...", "body": "..." }`;

    const contextMap: Record<string, string> = {
      support_link: "Email pour envoyer le lien d'accès à l'espace support client",
      form_nfc: "Email de relance pour compléter le formulaire de carte NFC",
      form_site: "Email de relance pour compléter le formulaire de site internet",
      ai_custom: "Email commercial personnalisé de suivi client",
      custom: "Email commercial personnalisé",
    };

    const userPrompt = `Génère un email pour le client suivant :
- Entreprise : ${company_name}
- Secteur : ${sector || "Non précisé"}
- Pack : ${pack_type === "star_bizness_numerik" ? "Star Bizness Numerik (site + réseaux)" : pack_type === "star_bizness_nfc" ? "Star Bizness NFC (carte NFC)" : "Autre"}
- Contact : ${manager_name || "Non précisé"}
- Contexte : ${contextMap[context] || "Email personnalisé"}
${current_subject ? `- Sujet actuel (comme inspiration) : ${current_subject}` : ""}

Génère un email adapté, personnalisé et engageant.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_email",
              description: "Generate a personalized email with subject and HTML body",
              parameters: {
                type: "object",
                properties: {
                  subject: { type: "string", description: "Email subject line" },
                  body: { type: "string", description: "HTML body content with inline CSS" },
                },
                required: ["subject", "body"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_email" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite IA atteinte, réessayez dans un instant" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Crédits IA épuisés" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erreur IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await response.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    
    let result: { subject: string; body: string };
    if (toolCall?.function?.arguments) {
      result = JSON.parse(toolCall.function.arguments);
    } else {
      // Fallback: try parsing content as JSON
      const content = aiData.choices?.[0]?.message?.content || "";
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        return new Response(JSON.stringify({ error: "Réponse IA invalide" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("generate-client-email error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
