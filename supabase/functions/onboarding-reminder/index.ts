// Edge function: onboarding-reminder
// Envoie un email de relance auto via Brevo aux clients à qui on a envoyé le tuto FB/GMB
// MAIS qui n'ont JAMAIS rempli le formulaire (pas de soumission existante).
// Dès qu'un client soumet le formulaire, plus aucune relance n'est envoyée.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const PUBLISHED_URL = "https://ai.adamkom.com";
const REMINDER_DELAY_DAYS = 5;
const MAX_REMINDERS = 2;

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface Invitation {
  id: string;
  kind: "facebook" | "gmb";
  client_id: string | null;
  client_ndi: string | null;
  contact_email: string;
  company_name: string;
  sent_at: string;
  reminder_count: number;
  last_reminder_at: string | null;
  completed_at: string | null;
}

function buildEmailHtml(kind: "facebook" | "gmb", company: string, link: string) {
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
    <p style="margin:0 0 14px;font-size:13px;color:#71717a">Si vous avez déjà rempli le formulaire, merci d'ignorer ce message. Pour toute question, répondez simplement à cet email.</p>
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
    const results = { sent: 0, skipped_already_submitted: 0, errors: 0 };

    // 1. Charger les invitations actives (non complétées, < MAX relances, anciennes de > 5j)
    const { data: invitations, error } = await supabase
      .from("onboarding_invitations")
      .select("*")
      .is("completed_at", null)
      .lt("reminder_count", MAX_REMINDERS);

    if (error) throw error;

    for (const inv of (invitations || []) as Invitation[]) {
      const ref = inv.last_reminder_at ?? inv.sent_at;
      if (new Date(ref).toISOString() > cutoff) continue;

      // 2. SÉCURITÉ : vérifier qu'aucune soumission n'existe pour ce client
      const table = inv.kind === "facebook" ? "fb_onboarding_submissions" : "gmb_onboarding_submissions";
      let query = supabase.from(table).select("id", { count: "exact", head: true });
      if (inv.client_ndi) {
        query = query.eq("client_ndi", inv.client_ndi);
      } else {
        query = query.eq("contact_email", inv.contact_email);
      }
      const { count } = await query;

      if ((count ?? 0) > 0) {
        // Le client a déjà rempli → marquer comme complété, AUCUNE relance
        await supabase
          .from("onboarding_invitations")
          .update({ completed_at: new Date().toISOString() })
          .eq("id", inv.id);
        results.skipped_already_submitted++;
        continue;
      }

      // 3. Envoyer la relance
      try {
        const link = inv.client_ndi
          ? `${PUBLISHED_URL}/tuto/${inv.kind}?client=${inv.client_ndi}`
          : `${PUBLISHED_URL}/tuto/${inv.kind}`;
        const { subject, html } = buildEmailHtml(inv.kind, inv.company_name, link);
        await sendBrevoEmail(inv.contact_email, inv.company_name, subject, html);
        await supabase
          .from("onboarding_invitations")
          .update({
            reminder_count: inv.reminder_count + 1,
            last_reminder_at: new Date().toISOString(),
          })
          .eq("id", inv.id);
        results.sent++;
      } catch (e) {
        console.error("Reminder error", inv.id, e);
        results.errors++;
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
