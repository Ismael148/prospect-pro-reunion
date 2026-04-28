import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function htmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?\>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

function buildResolvedHtml(payload: Record<string, unknown>) {
  const company = escapeHtml(payload.company_name || payload.client_name || 'cher client');
  const ticketNumber = escapeHtml(payload.ticket_number);
  const subject = escapeHtml(payload.subject);
  const supportLink = escapeHtml(payload.support_link);

  return `<!DOCTYPE html><html lang="fr"><body style="margin:0;padding:0;background:#f7f9fc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#1d1d1f;"><table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:44px 16px;"><table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e1e8ed;"><tr><td align="center" style="padding:38px 24px 18px;"><img src="https://adamkom.com/wp-content/uploads/2026/01/logo-Adamkom-by-jjp-1.png" alt="AdamKom" width="190" style="display:block;border:0;max-width:190px;height:auto;"></td></tr><tr><td style="padding:16px 38px 38px;"><h1 style="margin:0 0 22px;font-size:25px;line-height:1.25;text-align:center;color:#1d1d1f;">Bonne nouvelle, votre demande est résolue ✅</h1><p style="margin:0 0 18px;font-size:16px;line-height:1.7;color:#555555;">Bonjour ${company},</p><p style="margin:0 0 24px;font-size:16px;line-height:1.7;color:#555555;">Notre équipe a finalisé l'intervention concernant votre ticket support <strong>${ticketNumber}</strong>.</p><div style="background:#f0f7ff;border:1px solid #e0efff;border-radius:10px;padding:18px;margin:0 0 26px;"><p style="margin:0 0 8px;font-size:13px;color:#007bff;font-weight:700;text-transform:uppercase;">Objet du ticket</p><p style="margin:0;font-size:15px;line-height:1.6;color:#333333;">${subject}</p></div><p style="margin:0 0 28px;font-size:16px;line-height:1.7;color:#555555;">Si tout est bon pour vous, aucune action n'est nécessaire. Si vous avez encore une demande, vous pouvez rouvrir un ticket via votre espace support.</p>${supportLink ? `<p style="margin:0 0 8px;text-align:center;"><a href="${supportLink}" target="_blank" style="display:inline-block;background:#007bff;color:#ffffff;text-decoration:none;border-radius:8px;padding:14px 26px;font-weight:700;">Accéder à mon espace support</a></p>` : ''}</td></tr><tr><td style="padding:28px;background:#fbfcfd;border-top:1px solid #e1e8ed;text-align:center;color:#6e7a89;font-size:13px;line-height:1.6;"><strong style="color:#1d1d1f;">AdamKom by JJP</strong><br>La performance digitale de votre entreprise<br>0262 66 68 76</td></tr></table></td></tr></table></body></html>`;
}

async function sendBrevoEmail(apiKey: string, payload: Record<string, unknown>) {
  return await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': apiKey, 'Content-Type': 'application/json', accept: 'application/json' },
    body: JSON.stringify(payload),
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      console.error('Auth error:', claimsError?.message);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }
    const user = { id: claimsData.claims.sub, email: claimsData.claims.email };

    const N8N_WEBHOOK_BASE_URL = Deno.env.get('N8N_WEBHOOK_BASE_URL');
    if (!N8N_WEBHOOK_BASE_URL) {
      return new Response(JSON.stringify({ error: 'N8N_WEBHOOK_BASE_URL not configured' }), { status: 500, headers: corsHeaders });
    }

    const body = await req.json();
    const { event, data } = body;

    if (!event) {
      return new Response(JSON.stringify({ error: 'Missing event type' }), { status: 400, headers: corsHeaders });
    }

    const validEvents = ['client.signed', 'invoice.created', 'support.created', 'support.resolved', 'project.progress', 'prospect.rdv_planifie', 'design.sent'];
    if (!validEvents.includes(event)) {
      return new Response(JSON.stringify({ error: `Unknown event: ${event}` }), { status: 400, headers: corsHeaders });
    }

    const webhookUrl = N8N_WEBHOOK_BASE_URL;
    
    const payload = {
      event,
      timestamp: new Date().toISOString(),
      triggered_by: user.id,
      ...data,
    };

    let directEmailSent = false;
    if (event === 'support.resolved' && payload.client_email) {
      const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY');
      if (BREVO_API_KEY) {
        const htmlContent = buildResolvedHtml(payload);
        const emailResponse = await sendBrevoEmail(BREVO_API_KEY, {
          sender: { name: 'Support AdamKom', email: 'contact@adamkom.com' },
          to: [{ email: payload.client_email, name: payload.company_name || payload.client_name || 'Client' }],
          subject: `Ticket ${payload.ticket_number || ''} résolu - AdamKom`,
          htmlContent,
          textContent: htmlToText(htmlContent),
        });
        const emailBody = await emailResponse.text();
        directEmailSent = emailResponse.ok;
        if (!emailResponse.ok) {
          console.error(`Brevo support.resolved failed [${emailResponse.status}]: ${emailBody}`);
        } else {
          console.log(`Brevo support.resolved sent: ${emailBody}`);
        }
      } else {
        console.warn('BREVO_API_KEY missing, direct support.resolved email skipped');
      }
    }

    console.log(`Sending ${event} to n8n: ${webhookUrl}`);
    console.log(`Payload keys: ${Object.keys(payload).join(', ')}`);
    console.log(`Payload sample: company_name=${payload.company_name}, invoice_number=${payload.invoice_number}, total_amount=${payload.total_amount}`);

    console.log(`Sending payload to n8n: ${JSON.stringify(payload).substring(0, 500)}`);
    
    const n8nResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const responseText = await n8nResponse.text();
    console.log(`n8n response status: ${n8nResponse.status}, body: ${responseText.substring(0, 300)}`);

    if (!n8nResponse.ok) {
      console.error(`n8n webhook error [${n8nResponse.status}]: ${responseText}`);
      return new Response(JSON.stringify({ success: false, warning: 'Webhook delivery failed but action completed', n8n_status: n8nResponse.status }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, direct_email_sent: directEmailSent }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('n8n-webhook error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 200, // Don't break user flow
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
