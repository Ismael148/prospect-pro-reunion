import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

    const { kind, recipientEmail, recipientName, companyName, ndi } = await req.json();
    if (!recipientEmail || !kind) {
      return new Response(JSON.stringify({ error: "Champs manquants" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isGmb = kind === "gmb";
    const subject = isGmb
      ? "Confirmation — Demande d'accès Google My Business reçue"
      : "Confirmation — Accès Facebook Business reçus";

    const title = isGmb
      ? "Votre demande d'accès Google est bien reçue"
      : "Vos accès Facebook Business sont bien reçus";

    const htmlContent = `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff">
  <div style="background:linear-gradient(135deg,#ff006e,#ff5c8a);padding:24px;text-align:center">
    <h1 style="color:#fff;margin:0;font-size:20px">Adamkom</h1>
  </div>
  <div style="padding:30px 24px;color:#27272a">
    <h2 style="margin:0 0 12px;font-size:22px;color:#18181b">${title} 🎉</h2>
    <p style="margin:0 0 12px;line-height:1.5">
      Bonjour ${recipientName || companyName || ""},
    </p>
    <p style="margin:0 0 12px;line-height:1.5">
      Nous avons bien reçu votre soumission${companyName ? ` pour <strong>${companyName}</strong>` : ""}.
      Notre équipe la traite et reviendra vers vous rapidement.
    </p>
    ${ndi ? `<p style="margin:0 0 12px;line-height:1.5">
      <strong>Référence&nbsp;:</strong>
      <code style="background:#f4f4f5;padding:2px 8px;border-radius:4px">${ndi}</code>
    </p>` : ""}
    <p style="margin:24px 0 0;line-height:1.5;color:#71717a;font-size:13px">
      💡 Pas reçu de message de notre part dans les prochains jours ? Vérifiez vos spams ou contactez votre conseiller Adamkom.
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
        headers: { "X-Trigger": isGmb ? "onboarding_gmb_confirmation" : "onboarding_fb_confirmation" },
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
        template_name: isGmb ? "onboarding_gmb_confirmation" : "onboarding_fb_confirmation",
        error_message: err,
        metadata: { ndi, companyName, kind },
      });
      return new Response(JSON.stringify({ error: `Brevo error: ${err}` }), {
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
      template_name: isGmb ? "onboarding_gmb_confirmation" : "onboarding_fb_confirmation",
      metadata: { ndi, companyName, kind },
    });

    return new Response(JSON.stringify({ success: true, messageId: data.messageId }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("send-onboarding-confirmation error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
