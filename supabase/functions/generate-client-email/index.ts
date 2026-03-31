const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Non autorisé' }), { status: 401, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Non autorisé' }), { status: 401, headers: corsHeaders });
    }

    const { company_name, manager_name, sector, pack_type, email, purpose, custom_instructions } = await req.json();

    if (!company_name || !purpose) {
      return new Response(JSON.stringify({ error: 'company_name et purpose requis' }), { status: 400, headers: corsHeaders });
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY non configurée' }), { status: 500, headers: corsHeaders });
    }

    const prompt = `Tu es un expert en email marketing pour une agence digitale à La Réunion appelée Adamkom.
Génère un email HTML/CSS professionnel et personnalisé.

INFORMATIONS CLIENT :
- Entreprise : ${company_name}
- Gérant : ${manager_name || 'Non renseigné'}
- Secteur : ${sector || 'Non renseigné'}
- Pack : ${pack_type || 'Non renseigné'}
- Email : ${email || 'Non renseigné'}

OBJECTIF DE L'EMAIL : ${purpose}

${custom_instructions ? `INSTRUCTIONS SUPPLÉMENTAIRES : ${custom_instructions}` : ''}

CONTRAINTES :
- Le HTML doit être compatible Gmail/Outlook (tables inline, pas de CSS externe)
- Utiliser les couleurs de marque Adamkom : #ff006e (rose), #27272a (texte)
- Inclure le logo Adamkom : https://ai.adamkom.com/lovable-uploads/d6c24753-6c76-49a3-8a6d-fe0dd4a898be.png
- Maximum 600px de largeur
- Inclure un header avec le logo, un corps de message engageant, et un footer avec les coordonnées Adamkom
- Footer : "Adamkom by JJP — La Réunion 🇷🇪 — 📞 0262 66 68 76 — contact@adamkom.com"
- Ton professionnel mais chaleureux, adapté au secteur du client
- Personnaliser le contenu selon le secteur d'activité du client

Retourne UNIQUEMENT un JSON valide avec cette structure exacte :
{
  "subject": "L'objet de l'email",
  "htmlContent": "<div>Le HTML complet de l'email</div>"
}

Pas de texte avant ni après le JSON.`;

    const response = await fetch('https://api.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('AI API error:', errText);
      return new Response(JSON.stringify({ error: 'Erreur API IA' }), { status: 500, headers: corsHeaders });
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content || '';

    // Extract JSON from response
    let parsed;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found');
      parsed = JSON.parse(jsonMatch[0]);
    } catch {
      console.error('Failed to parse AI response:', content);
      return new Response(JSON.stringify({ error: 'Format de réponse IA invalide' }), { status: 500, headers: corsHeaders });
    }

    return new Response(JSON.stringify({
      subject: parsed.subject,
      htmlContent: parsed.htmlContent,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('generate-client-email error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
