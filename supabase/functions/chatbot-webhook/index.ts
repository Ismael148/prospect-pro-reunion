// Webhook Meta Messenger / Instagram → Chatbot IA Adamkom
// Reçoit les messages entrants des pages FB/IG des clients,
// génère une réponse via Lovable AI, et la renvoie via la Send API Meta.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const META_VERIFY_TOKEN = Deno.env.get("META_VERIFY_TOKEN") || "adamkom-chatbot-verify";
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

async function generateAIReply(config: any, incomingMessage: string): Promise<{ text: string; tokens: number }> {
  const businessContext = config.business_info ? `\n\nInformations sur l'entreprise :\n${config.business_info}` : "";
  const systemPrompt = `${config.system_prompt}${businessContext}\n\nSi tu ne sais pas répondre ou si la question nécessite une intervention humaine, réponds exactement : ESCALATE`;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.ai_model || "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: incomingMessage },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`AI gateway ${response.status}: ${await response.text()}`);
  }
  const data = await response.json();
  return {
    text: data.choices?.[0]?.message?.content || config.fallback_message,
    tokens: data.usage?.total_tokens || 0,
  };
}

async function sendMetaReply(pageAccessToken: string, recipientId: string, text: string, platform: string) {
  const url = `https://graph.facebook.com/v21.0/me/messages?access_token=${pageAccessToken}`;
  const body = {
    recipient: { id: recipientId },
    message: { text },
    messaging_type: "RESPONSE",
  };
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    console.error(`Send API error ${platform}:`, await r.text());
    return false;
  }
  return true;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Verification handshake (GET) requis par Meta
  if (req.method === "GET") {
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    if (mode === "subscribe" && token === META_VERIFY_TOKEN) {
      return new Response(challenge || "", { status: 200, headers: corsHeaders });
    }
    return new Response("Forbidden", { status: 403, headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    const entries = payload.entry || [];

    for (const entry of entries) {
      const pageId = entry.id;
      const messaging = entry.messaging || [];
      const platform = payload.object === "instagram" ? "instagram" : "facebook";

      // Trouver le client lié à cette page
      const { data: account } = await admin
        .from("social_accounts")
        .select("client_id, access_token")
        .eq("page_id", pageId)
        .eq("platform", platform)
        .maybeSingle();

      if (!account) {
        console.warn("No account found for page", pageId);
        continue;
      }

      // Charger la config chatbot
      const { data: config } = await admin
        .from("chatbot_configs")
        .select("*")
        .eq("client_id", account.client_id)
        .maybeSingle();

      if (!config?.enabled || !config.platforms?.includes(platform)) {
        console.log("Chatbot disabled for client", account.client_id);
        continue;
      }

      for (const ev of messaging) {
        const senderId = ev.sender?.id;
        const text = ev.message?.text;
        if (!senderId || !text) continue;

        // Détection escalade par mots-clés
        const lowerText = text.toLowerCase();
        const shouldEscalate = (config.escalation_keywords || []).some((k: string) =>
          lowerText.includes(k.toLowerCase())
        );

        let aiResponse = "";
        let tokens = 0;
        let status = "auto_replied";
        let errorMsg: string | null = null;

        try {
          if (shouldEscalate) {
            aiResponse = config.fallback_message;
            status = "escalated";
          } else {
            const r = await generateAIReply(config, text);
            aiResponse = r.text;
            tokens = r.tokens;
            if (aiResponse.trim().toUpperCase().includes("ESCALATE")) {
              aiResponse = config.fallback_message;
              status = "escalated";
            }
          }

          if (account.access_token) {
            const ok = await sendMetaReply(account.access_token, senderId, aiResponse, platform);
            if (!ok) status = "failed";
          } else {
            status = "failed";
            errorMsg = "Aucun access_token Meta sur le compte social";
          }
        } catch (e: any) {
          status = "failed";
          errorMsg = e.message;
          console.error("Chatbot error:", e);
        }

        await admin.from("chatbot_conversations").insert({
          client_id: account.client_id,
          platform,
          sender_id: senderId,
          incoming_message: text,
          ai_response: aiResponse,
          status,
          tokens_used: tokens,
          error_message: errorMsg,
        });
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("Webhook error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
