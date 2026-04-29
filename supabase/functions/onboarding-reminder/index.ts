// Edge function: onboarding-reminder
// Envoie un email de relance auto via Brevo aux clients dont la soumission FB/GMB est restée "recu" depuis > 5 jours
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const PUBLISHED_URL = "https://ai.adamkom.com";
const REMINDER_DELAY_DAYS = 5;
const MAX_REMINDERS = 2; // 2 relances max

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface Submission {
  id: string;
  client_ndi: string | null;
  company_name: string;
  contact_email: string;
  status: string;
  created_at: string;
  reminder_count: number;
  last_reminder_at: string | null;
}

function buildEmailHtml(kind: "facebook" | "gmb", company: string, link: string): { subject: string; html: string } {
  const isFb = kind === "facebook";
  const platform = isFb ? "Facebook & Instagram" : "Google My Business";
  const cta = isFb ? "📘 Reprendre le tutoriel Facebook" : "📍 Reprendre le tutoriel Google";
  const subject = isFb
    ? `Petit rappel — vos accès Facebook pour ${company}`
    : `Petit rappel — votre fiche Google pour ${company}`;

  const html = `<!doctype html>
<html><body style="font-family:Inter,Arial,sans-serif;background:#fafafa;margin:0;padding:24px;color:#18181b">
<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 6px 24px rgba(0,0,0,0.06)">
  <div style="background:linear-gradient(135deg,#ff006e,#c1004f);padding:28px;text-align:center;color:#fff">
    <h1 style="margin:0;font-size:22px">Adamkom</h1>
    <p style="margin:6px 0 0;opacity:.9;font-size:13px">La performance digitale</p>
  </div>
  <div style="padding:32px 28px">
    <p style="margin:0 0 18px">Bonjour <strong>${company}</strong>,</p>
    <p style="margin:0 0 18px">Nous revenons vers vous concernant les <strong>accès ${platform}</strong> nécessaires à la gestion de votre présence en ligne. Notre dernière demande date d'environ ${REMINDER_DELAY_DAYS} jours et nous n'avons pas encore reçu vos informations.</p>
    <p style="margin:0 0 18px">Pas d'inquiétude, le tutoriel reste disponible et vous guide pas à pas (pas de mot de passe demandé, vous gardez le contrôle à 100%) :</p>
    <div style="text-align:center;margin:28px 0">
      <a href="${link}" style="display:inline-block;background:#ff006e;color:#fff;text-decoration:none;padding:14px 28px;border-radius:10px;font-weight:600">${cta}</a>
    </div>
    <p style="margin:0 0 14px;font-size:13px;color:#71717a">Si vous avez la moindre difficulté, répondez simplement à cet email — un membre de l'équipe vous accompagnera personnellement.</p>
    <p style="margin:0">Très cordialement,<br><strong style="color:#ff006e">L'équipe Adamkom</strong></p>
  </div>
  <div style="padding:14px;text-align:center;font-size:11px;color:#a1a1aa;background:#fafafa">
    Adamkom by JJP — La Réunion 🇷🇪
  </div>
</div>
</body></html>`;
  return { subject, html };
}

async function sendBrevoEmail(to: string, name: string, subject: string, html: string) {
  const apiKey = Deno.env.get("BREVO_API_KEY");
  if (!apiKey) throw new Error("BREVO_API_KEY missing");
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": apiKey, "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      sender: { name: "Adamkom", email: "noreply@adamkom.com" },
      to: [{ email: to, name }],
      subject,
      htmlContent: html,
    }),
  });
  if (!res.ok) throw new Error(`Brevo ${res.status}: ${await res.text()}`);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
    const cutoff = new Date(Date.now() - REMINDER_DELAY_DAYS * 24 * 3600 * 1000).toISOString();
    const results: any = { fb: { sent: 0, errors: 0 }, gmb: { sent: 0, errors: 0 } };

    // ─── FACEBOOK ────────────────────────────────────────────
    const { data: fbSubs } = await supabase
      .from("fb_onboarding_submissions")
      .select("id,client_ndi,company_name,contact_email,status,created_at,reminder_count,last_reminder_at")
      .eq("status", "recu")
      .lt("reminder_count", MAX_REMINDERS);

    for (const s of (fbSubs || []) as Submission[]) {
      const ref = s.last_reminder_at ?? s.created_at;
      if (new Date(ref).toISOString() > cutoff) continue;
      try {
        const link = s.client_ndi
          ? `${PUBLISHED_URL}/tuto/facebook?client=${s.client_ndi}`
          : `${PUBLISHED_URL}/tuto/facebook`;
        const { subject, html } = buildEmailHtml("facebook", s.company_name, link);
        await sendBrevoEmail(s.contact_email, s.company_name, subject, html);
        await supabase
          .from("fb_onboarding_submissions")
          .update({ reminder_count: s.reminder_count + 1, last_reminder_at: new Date().toISOString() })
          .eq("id", s.id);
        results.fb.sent++;
      } catch (e) {
        console.error("FB reminder error", s.id, e);
        results.fb.errors++;
      }
    }

    // ─── GMB ─────────────────────────────────────────────────
    const { data: gmbSubs } = await supabase
      .from("gmb_onboarding_submissions")
      .select("id,client_ndi,company_name,contact_email,status,created_at,reminder_count,last_reminder_at")
      .eq("status", "recu")
      .lt("reminder_count", MAX_REMINDERS);

    for (const s of (gmbSubs || []) as Submission[]) {
      const ref = s.last_reminder_at ?? s.created_at;
      if (new Date(ref).toISOString() > cutoff) continue;
      try {
        const link = s.client_ndi
          ? `${PUBLISHED_URL}/tuto/gmb?client=${s.client_ndi}`
          : `${PUBLISHED_URL}/tuto/gmb`;
        const { subject, html } = buildEmailHtml("gmb", s.company_name, link);
        await sendBrevoEmail(s.contact_email, s.company_name, subject, html);
        await supabase
          .from("gmb_onboarding_submissions")
          .update({ reminder_count: s.reminder_count + 1, last_reminder_at: new Date().toISOString() })
          .eq("id", s.id);
        results.gmb.sent++;
      } catch (e) {
        console.error("GMB reminder error", s.id, e);
        results.gmb.errors++;
      }
    }

    return new Response(JSON.stringify({ ok: true, ...results }), {
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  } catch (e: any) {
    console.error(e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }
});
