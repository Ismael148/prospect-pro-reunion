import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Strip HTML tags for plain-text fallback
function htmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<a[^>]*href="([^"]*)"[^>]*>[^<]*<\/a>/gi, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function sendBrevoEmail(apiKey: string, payload: Record<string, unknown>) {
  return await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'Content-Type': 'application/json',
      'accept': 'application/json',
    },
    body: JSON.stringify(payload),
  });
}

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

    const serviceSupabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Non autorisé' }), { status: 401, headers: corsHeaders });
    }
    const user = { id: claimsData.claims.sub, email: claimsData.claims.email };

    const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY');
    if (!BREVO_API_KEY) {
      return new Response(JSON.stringify({ error: 'BREVO_API_KEY non configurée' }), { status: 500, headers: corsHeaders });
    }

    const body = await req.json();
    const { action } = body;

    // ═══════════════════════════════════════════
    // ACTION: send_campaign (bulk emails)
    // ═══════════════════════════════════════════
    if (action === 'send_campaign') {
      const { subject, htmlContent, senderName, senderEmail, recipients, campaignName } = body;

      if (!subject || !htmlContent || !recipients?.length) {
        return new Response(JSON.stringify({ error: 'Champs manquants: subject, htmlContent, recipients' }), { status: 400, headers: corsHeaders });
      }

      const textContent = htmlToText(htmlContent);
      const results = { sent: 0, failed: 0, errors: [] as string[] };
      const batchSize = 10;

      for (let i = 0; i < recipients.length; i += batchSize) {
        const batch = recipients.slice(i, i + batchSize);
        
        const promises = batch.map(async (recipient: { email: string; name: string }) => {
          try {
            const response = await sendBrevoEmail(BREVO_API_KEY, {
              sender: { name: senderName || 'AdamKom', email: senderEmail || 'contact@adamkom.com' },
              to: [{ email: recipient.email, name: recipient.name }],
              subject,
              htmlContent,
              textContent,
            });

            if (response.ok) {
              const data = await response.json();
              results.sent++;
              await serviceSupabase.from('email_send_log').insert({
                message_id: data.messageId || null,
                recipient_email: recipient.email,
                recipient_name: recipient.name,
                subject,
                status: 'sent',
                template_name: 'campaign',
                campaign_name: campaignName || subject,
                metadata: { sender: senderName, campaign: true },
              });
            } else {
              const err = await response.text();
              results.failed++;
              results.errors.push(`${recipient.email}: ${err}`);
              await serviceSupabase.from('email_send_log').insert({
                recipient_email: recipient.email,
                recipient_name: recipient.name,
                subject,
                status: 'failed',
                template_name: 'campaign',
                campaign_name: campaignName || subject,
                error_message: err,
              });
            }
          } catch (e) {
            results.failed++;
            results.errors.push(`${recipient.email}: ${e.message}`);
            await serviceSupabase.from('email_send_log').insert({
              recipient_email: recipient.email,
              recipient_name: recipient.name,
              subject,
              status: 'failed',
              template_name: 'campaign',
              campaign_name: campaignName || subject,
              error_message: e.message,
            });
          }
        });

        await Promise.all(promises);
        if (i + batchSize < recipients.length) {
          await new Promise(r => setTimeout(r, 1000));
        }
      }

      return new Response(JSON.stringify({ success: true, results }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ═══════════════════════════════════════════
    // ACTION: send_design (single deliverable email)
    // ═══════════════════════════════════════════
    if (action === 'send_design') {
      const { recipientEmail, recipientName, clientName, designUrl, designName, subject, htmlContent: customHtmlContent, attachment, deliverable_id, project_id, template_name: tplName } = body;

      if (!recipientEmail) {
        return new Response(JSON.stringify({ error: 'Champs manquants' }), { status: 400, headers: corsHeaders });
      }

      const htmlContent = customHtmlContent || `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
          <div style="background:#1E3A5F;padding:20px;text-align:center">
            <h1 style="color:#fff;margin:0">ADAMKOM by JJP</h1>
            <p style="color:#DAA520;margin:5px 0 0">Solutions digitales pour entreprises</p>
          </div>
          <div style="padding:30px">
            <p>Bonjour <strong>${recipientName || clientName}</strong>,</p>
            <p>Voici votre nouveau design <strong>${designName || ''}</strong> :</p>
            ${designUrl ? `
              <div style="text-align:center;margin:20px 0">
                <img src="${designUrl}" alt="Design" style="max-width:100%;border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,0.1)" />
              </div>
            ` : ''}
            <p>N'hésitez pas à nous contacter si vous avez des remarques ou modifications à apporter.</p>
            <p>Cordialement,<br>L'équipe AdamKom</p>
          </div>
          <div style="background:#1E3A5F;padding:15px;text-align:center">
            <p style="color:#fff;margin:0;font-size:12px">ADAMKOM by JJP — contact@adamkom.com — 0693 802 201</p>
          </div>
        </div>
      `;

      const textContent = htmlToText(htmlContent);

      const normalizedAttachments = Array.isArray(attachment)
        ? attachment.filter((item) => item && typeof item.name === 'string' && (typeof item.url === 'string' || typeof item.content === 'string'))
        : [];

      const finalSubject = subject || `Votre nouveau design - ${designName || clientName}`;

      const response = await sendBrevoEmail(BREVO_API_KEY, {
        sender: { name: 'AdamKom Design', email: 'contact@adamkom.com' },
        to: [{ email: recipientEmail, name: recipientName || clientName }],
        subject: finalSubject,
        htmlContent,
        textContent,
        ...(normalizedAttachments.length ? { attachment: normalizedAttachments } : {}),
      });

      if (!response.ok) {
        const err = await response.text();
        await serviceSupabase.from('email_send_log').insert({
          recipient_email: recipientEmail,
          recipient_name: recipientName || clientName,
          subject: finalSubject,
          status: 'failed',
          template_name: tplName || 'design',
          deliverable_id: deliverable_id || null,
          project_id: project_id || null,
          error_message: err,
        });
        return new Response(JSON.stringify({ error: `Brevo error: ${err}` }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const brevoData = await response.json();
      const messageId = brevoData.messageId || null;

      await serviceSupabase.from('email_send_log').insert({
        message_id: messageId,
        recipient_email: recipientEmail,
        recipient_name: recipientName || clientName,
        subject: finalSubject,
        status: 'sent',
        template_name: tplName || 'design',
        deliverable_id: deliverable_id || null,
        project_id: project_id || null,
        metadata: { has_attachment: normalizedAttachments.length > 0, design_name: designName },
      });

      return new Response(JSON.stringify({ success: true, messageId }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ═══════════════════════════════════════════
    // ACTION: send_client_email (per-client actions: support, form reminders, custom)
    // ═══════════════════════════════════════════
    if (action === 'send_client_email') {
      const { recipientEmail, recipientName, subject, htmlContent, trigger, client_id, attachment } = body;

      if (!recipientEmail || !subject || !htmlContent) {
        return new Response(JSON.stringify({ error: 'Champs manquants: recipientEmail, subject, htmlContent' }), { status: 400, headers: corsHeaders });
      }

      const textContent = htmlToText(htmlContent);

      const normalizedAttachments = Array.isArray(attachment)
        ? attachment.filter((item: any) => item && typeof item.name === 'string' && (typeof item.url === 'string' || typeof item.content === 'string'))
        : [];

      const response = await sendBrevoEmail(BREVO_API_KEY, {
        sender: { name: 'AdamKom', email: 'contact@adamkom.com' },
        to: [{ email: recipientEmail, name: recipientName || recipientEmail }],
        subject,
        htmlContent,
        textContent,
        ...(normalizedAttachments.length ? { attachment: normalizedAttachments } : {}),
        headers: { 'X-Trigger': trigger || 'manual' },
      });

      if (!response.ok) {
        const err = await response.text();
        await serviceSupabase.from('email_send_log').insert({
          recipient_email: recipientEmail,
          recipient_name: recipientName || null,
          subject,
          status: 'failed',
          template_name: trigger || 'client_email',
          error_message: err,
          metadata: { client_id, trigger },
        });
        return new Response(JSON.stringify({ error: `Brevo error: ${err}` }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const brevoData = await response.json();
      const messageId = brevoData.messageId || null;

      await serviceSupabase.from('email_send_log').insert({
        message_id: messageId,
        recipient_email: recipientEmail,
        recipient_name: recipientName || null,
        subject,
        status: 'sent',
        template_name: trigger || 'client_email',
        metadata: { client_id, trigger },
      });

      return new Response(JSON.stringify({ success: true, messageId }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Action inconnue' }), { status: 400, headers: corsHeaders });
  } catch (error) {
    console.error('send-brevo-campaign error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
