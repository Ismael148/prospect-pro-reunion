// Edge function: payment-reminder
// Relances email auto J+3, J+7, J+14 pour les invitations Tuto Paiements non complétées.
// Si un payment_credentials existe pour le client → marque l'invitation completed et stop.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PUBLISHED_URL = "https://ai.adamkom.com";
const REMINDER_OFFSETS_DAYS = [3, 7, 14]; // J+3, J+7, J+14 puis stop
const MAX_REMINDERS = REMINDER_OFFSETS_DAYS.length;

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function buildEmailHtml(company: string, link: string, reminderIndex: number) {
  const titles = [
    "Petit rappel — vos moyens de paiement en ligne",
    "Deuxième rappel — activez vos paiements en ligne",
    "Dernier rappel — vos paiements en ligne",
  ];
  const subject = `${titles[reminderIndex]} pour ${company}`;
  const html = `<!doctype html>
<html><body style="font-family:Inter,Arial,sans-serif;background:#fafafa;margin:0;padding:24px;color:#18181b">
<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:18px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.08)">
  <div style="background:linear-gradient(135deg,#ff006e,#ff5c8a);padding:32px;text-align:center;color:#fff">
    <div style="font-size:40px;line-height:1;margin-bottom:6px">💳</div>
    <h1 style="margin:0;font-size:22px">Activez vos paiements en ligne</h1>
    <p style="margin:6px 0 0;opacity:.9;font-size:13px">Adamkom — La performance digitale</p>
  </div>
  <div style="padding:32px 28px">
    <p style="margin:0 0 18px">Bonjour <strong>${company}</strong>,</p>
    <p style="margin:0 0 18px">Nous n'avons pas encore reçu vos clés API (<strong>Stripe, PayPal, Alma</strong>…) pour activer les paiements en ligne sur votre site.</p>
    <p style="margin:0 0 18px">Pas d'inquiétude, le tutoriel sécurisé reste disponible et vous guide pas-à-pas pour créer vos comptes et nous transmettre vos clés (vous gardez la propriété complète) :</p>
    <div style="text-align:center;margin:28px 0">
      <a href="${link}" style="display:inline-block;background:linear-gradient(135deg,#ff006e,#ff5c8a);color:#fff;text-decoration:none;padding:14px 32px;border-radius:12px;font-weight:700">▶ Reprendre le tutoriel</a>
    </div>
    <p style="margin:0 0 14px;font-size:13px;color:#71717a">Si vous avez déjà rempli le formulaire, merci d'ignorer ce message. Pour toute question, répondez simplement à cet email.</p>
    <p style="margin:0">Très cordialement,<br><strong style="color:#ff006e">L'équipe Adamkom</strong></p>
  </div>
  <div style="padding:14px;text-align:center;font-size:11px;color:#a1a1aa;background:#fafafa">Adamkom by JJP — La Réunion 🇷🇪</div>
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
      sender: { name: "Adamkom", email: "contact@adamkom.com" },
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
    const now = Date.now();
    const results = { sent: 0, skipped_already_submitted: 0, errors: 0, skipped_too_early: 0 };

    const { data: invitations, error } = await supabase
      .from("payment_invitations")
      .select("*")
      .is("completed_at", null)
      .lt("reminder_count", MAX_REMINDERS);

    if (error) throw error;

    for (const inv of invitations || []) {
      // Vérifier que le client n'a pas déjà soumis ses clés
      let q = supabase.from("payment_credentials").select("id", { count: "exact", head: true });
      if (inv.client_id) q = q.eq("client_id", inv.client_id);
      else q = q.eq("contact_email", inv.contact_email);
      const { count } = await q;

      if ((count ?? 0) > 0) {
        await supabase
          .from("payment_invitations")
          .update({ completed_at: new Date().toISOString() })
          .eq("id", inv.id);
        results.skipped_already_submitted++;
        continue;
      }

      // Calculer si la prochaine relance est due
      const nextOffsetDays = REMINDER_OFFSETS_DAYS[inv.reminder_count];
      const refDate = new Date(inv.last_sent_at || inv.created_at).getTime();
      const dueAt = refDate + nextOffsetDays * 24 * 3600 * 1000;
      if (now < dueAt) {
        results.skipped_too_early++;
        continue;
      }

      try {
        const link = `${PUBLISHED_URL}/tuto/paiements?token=${inv.token}`;
        const company = inv.company_name || inv.contact_email;
        const { subject, html } = buildEmailHtml(company, link, inv.reminder_count);
        await sendBrevoEmail(inv.contact_email, company, subject, html);

        await supabase
          .from("payment_invitations")
          .update({
            reminder_count: inv.reminder_count + 1,
            last_reminder_at: new Date().toISOString(),
          })
          .eq("id", inv.id);

        await supabase.from("email_send_log").insert({
          recipient_email: inv.contact_email,
          recipient_name: company,
          subject,
          status: "sent",
          template_name: "payment_reminder",
          metadata: { client_id: inv.client_id, invitation_id: inv.id, reminder_index: inv.reminder_count + 1 },
        });

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
