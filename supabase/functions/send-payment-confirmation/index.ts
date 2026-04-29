import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PROVIDER_LABELS: Record<string, string> = {
  stripe: "Stripe",
  paypal: "PayPal Pro",
  alma: "Alma",
  mollie: "Mollie",
  lyra: "Lyra / SystemPay",
  helloasso: "HelloAsso",
  sumup: "Sumup",
};

function htmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");
    if (!BREVO_API_KEY) {
      return new Response(JSON.stringify({ error: "BREVO_API_KEY non configurée" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { recipientEmail, recipientName, companyName, providers, environment } = await req.json();
    if (!recipientEmail || !providers?.length) {
      return new Response(JSON.stringify({ error: "Champs manquants" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const providerLabels = (providers as string[])
      .map((p) => PROVIDER_LABELS[p] || p)
      .join(", ");

    const subject = `✅ Vos clés ${providerLabels} sont bien reçues — Adamkom`;

    const htmlContent = `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff">
  <div style="background:linear-gradient(135deg,#ff006e,#ff5c8a);padding:24px;text-align:center">
    <h1 style="color:#fff;margin:0;font-size:22px">Adamkom</h1>
    <p style="color:#fff;margin:6px 0 0;opacity:0.9;font-size:13px">Solutions de paiement en ligne</p>
  </div>
  <div style="padding:30px 24px;color:#27272a">
    <h2 style="margin:0 0 12px;font-size:22px;color:#18181b">Vos clés de paiement sont bien reçues 🔐</h2>
    <p style="margin:0 0 12px;line-height:1.5">
      Bonjour ${recipientName || companyName || ""},
    </p>
    <p style="margin:0 0 12px;line-height:1.5">
      Nous avons bien reçu vos identifiants pour <strong>${providerLabels}</strong>
      ${environment ? ` (environnement <strong>${environment.toUpperCase()}</strong>)` : ""}.
    </p>
    <div style="background:#fef3c7;border-left:4px solid #f59e0b;padding:12px 16px;margin:18px 0;border-radius:6px">
      <p style="margin:0;color:#78350f;font-size:13px;line-height:1.5">
        🔒 Vos clés sont stockées de manière sécurisée. Seuls les administrateurs Adamkom y ont accès.
      </p>
    </div>
    <h3 style="margin:24px 0 8px;color:#18181b;font-size:16px">Prochaines étapes</h3>
    <ol style="margin:0 0 16px;padding-left:20px;line-height:1.7;color:#3f3f46">
      <li>Notre équipe vérifie vos clés sous 24h ouvrées.</li>
      <li>Nous configurons l'intégration sur votre site/application.</li>
      <li>Nous effectuons des tests complets en mode TEST.</li>
      <li>Une fois validé, nous activons le mode PRODUCTION avec vos clés LIVE.</li>
    </ol>
    <p style="margin:24px 0 0;line-height:1.5;color:#71717a;font-size:13px">
      💡 Une question ? Répondez à cet email ou contactez votre conseiller Adamkom.
    </p>
  </div>
  <div style="background:#fafafa;padding:14px;text-align:center;color:#71717a;font-size:12px">
    Adamkom — contact@adamkom.com
  </div>
</div>`.trim();

    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": BREVO_API_KEY,
        "Content-Type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        sender: { name: "AdamKom", email: "contact@adamkom.com" },
        to: [{ email: recipientEmail, name: recipientName || recipientEmail }],
        subject,
        htmlContent,
        textContent: htmlToText(htmlContent),
        headers: { "X-Trigger": "payment_credentials_confirmation" },
      }),
    });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    if (!response.ok) {
      const err = await response.text();
      await supabase.from("email_send_log").insert({
        recipient_email: recipientEmail,
        recipient_name: recipientName || null,
        subject,
        status: "failed",
        template_name: "payment_credentials_confirmation",
        error_message: err,
        metadata: { providers, environment, companyName },
      });
      return new Response(JSON.stringify({ error: `Brevo: ${err}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    await supabase.from("email_send_log").insert({
      message_id: data.messageId || null,
      recipient_email: recipientEmail,
      recipient_name: recipientName || null,
      subject,
      status: "sent",
      template_name: "payment_credentials_confirmation",
      metadata: { providers, environment, companyName },
    });

    return new Response(JSON.stringify({ success: true, messageId: data.messageId }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("send-payment-confirmation error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
