import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function htmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?\>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

async function sendBrevoEmail(apiKey: string, payload: Record<string, unknown>) {
  return await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "Content-Type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify(payload),
  });
}

function buildCreatedHtml(data: Record<string, unknown>) {
  const company = escapeHtml(data.company_name || data.client_name || "cher client");
  const ticketNumber = escapeHtml(data.ticket_number);
  const subject = escapeHtml(data.subject);

  return `<!DOCTYPE html><html lang="fr"><body style="margin:0;padding:0;background:#f4f7f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#1d1d1f;"><table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 16px;"><table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e8edf3;"><tr><td align="center" style="padding:34px 24px 18px;"><img src="https://adamkom.com/wp-content/uploads/2026/01/logo-Adamkom-by-jjp-1.png" alt="AdamKom" width="180" style="display:block;border:0;max-width:180px;height:auto;"></td></tr><tr><td style="padding:16px 36px 36px;"><h1 style="margin:0 0 18px;font-size:24px;line-height:1.3;color:#1d1d1f;">Nous avons bien reçu votre demande ✅</h1><p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#515154;">Bonjour ${company},</p><p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#515154;">Merci pour votre message. Votre demande <strong>${ticketNumber}</strong> a bien été enregistrée.</p><p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:#515154;">Nous revenons vers vous dès que votre ticket aura été traité avec succès.</p><div style="background:#f9f9fb;border:1px solid #eeeeee;border-radius:12px;padding:16px 18px;margin:0 0 24px;"><p style="margin:0 0 6px;font-size:13px;color:#86868b;">Objet de votre demande</p><p style="margin:0;font-size:15px;color:#1d1d1f;">${subject}</p></div><p style="margin:0;font-size:14px;line-height:1.6;color:#86868b;">Cordialement,<br><strong style="color:#1d1d1f;">L'équipe Adamkom by JJP</strong></p></td></tr></table></td></tr></table></body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { ticket_id, client_name, client_email, category, subject, message, ticket_number } = await req.json();

    // Create admin notification in the database
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let emailSent = false;
    let resolvedData: Record<string, unknown> = { ticket_id, client_name, client_email, category, subject, message, ticket_number };

    if (ticket_id) {
      const { data: ticket } = await supabase
        .from("support_tickets")
        .select("id, ticket_number, category, subject, message, priority, client_id")
        .eq("id", ticket_id)
        .maybeSingle();

      if (ticket) {
        const { data: client } = await supabase
          .from("clients")
          .select("company_name, email, support_token")
          .eq("id", ticket.client_id)
          .maybeSingle();

        resolvedData = {
          ...resolvedData,
          ...ticket,
          company_name: client?.company_name || client_name,
          client_name: client?.company_name || client_name,
          client_email: client?.email || client_email,
          support_link: client?.support_token ? `https://ai.adamkom.com/s/${client.support_token}` : "",
        };
      }
    }

    // Get all admin users
    const { data: adminRoles } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");

    // Create notifications for all admins
    if (adminRoles?.length) {
      const notifications = adminRoles.map((r: any) => ({
        user_id: r.user_id,
        title: `Nouveau support : ${resolvedData.client_name || resolvedData.company_name || client_name}`,
        message: `[${resolvedData.ticket_number || ticket_number}] ${resolvedData.category || category} — ${resolvedData.subject || subject}`,
        type: "support",
        link: "/support",
      }));

      await supabase.from("notifications").insert(notifications);
    }

    const brevoApiKey = Deno.env.get("BREVO_API_KEY");
    if (brevoApiKey && resolvedData.client_email) {
      const htmlContent = buildCreatedHtml(resolvedData);
      const emailResponse = await sendBrevoEmail(brevoApiKey, {
        sender: { name: "Support AdamKom", email: "contact@adamkom.com" },
        to: [{ email: resolvedData.client_email, name: resolvedData.company_name || resolvedData.client_name || "Client" }],
        subject: `Ticket ${resolvedData.ticket_number || ticket_number} reçu - AdamKom Support`,
        htmlContent,
        textContent: htmlToText(htmlContent),
      });

      emailSent = emailResponse.ok;
      const emailBody = await emailResponse.text();
      if (!emailResponse.ok) {
        console.error(`Brevo support confirmation failed [${emailResponse.status}]: ${emailBody}`);
      } else {
        console.log(`Brevo support confirmation sent: ${emailBody}`);
      }
    } else if (!brevoApiKey) {
      console.warn("BREVO_API_KEY missing, support confirmation email skipped");
    }

    console.log(`Support ticket ${resolvedData.ticket_number || ticket_number} created for ${resolvedData.client_name || client_name} (${resolvedData.client_email || client_email})`);
    console.log(`Category: ${resolvedData.category || category}, Subject: ${resolvedData.subject || subject}`);

    return new Response(
      JSON.stringify({ success: true, ticket_number: resolvedData.ticket_number || ticket_number, email_sent: emailSent }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Support notification error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
