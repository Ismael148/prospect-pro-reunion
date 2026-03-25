import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Non autorisé' }), { status: 401, headers: corsHeaders });
    }

    const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY');
    if (!BREVO_API_KEY) {
      return new Response(JSON.stringify({ error: 'BREVO_API_KEY non configurée' }), { status: 500, headers: corsHeaders });
    }

    const body = await req.json();
    const { action } = body;

    if (action === 'send_campaign') {
      const { subject, htmlContent, senderName, senderEmail, recipients } = body;

      if (!subject || !htmlContent || !recipients?.length) {
        return new Response(JSON.stringify({ error: 'Champs manquants: subject, htmlContent, recipients' }), { status: 400, headers: corsHeaders });
      }

      const results = { sent: 0, failed: 0, errors: [] as string[] };

      // Send emails in batches of 10 to respect Brevo rate limits
      const batchSize = 10;
      for (let i = 0; i < recipients.length; i += batchSize) {
        const batch = recipients.slice(i, i + batchSize);
        
        const promises = batch.map(async (recipient: { email: string; name: string }) => {
          try {
            const response = await fetch('https://api.brevo.com/v3/smtp/email', {
              method: 'POST',
              headers: {
                'api-key': BREVO_API_KEY,
                'Content-Type': 'application/json',
                'accept': 'application/json',
              },
              body: JSON.stringify({
                sender: { name: senderName || 'AdamKom', email: senderEmail || 'contact@adamkom.com' },
                to: [{ email: recipient.email, name: recipient.name }],
                subject,
                htmlContent,
              }),
            });

            if (response.ok) {
              results.sent++;
            } else {
              const err = await response.text();
              results.failed++;
              results.errors.push(`${recipient.email}: ${err}`);
            }
          } catch (e) {
            results.failed++;
            results.errors.push(`${recipient.email}: ${e.message}`);
          }
        });

        await Promise.all(promises);
        
        // Small delay between batches
        if (i + batchSize < recipients.length) {
          await new Promise(r => setTimeout(r, 1000));
        }
      }

      return new Response(JSON.stringify({ success: true, results }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'send_design') {
      const { recipientEmail, recipientName, clientName, designUrl, designName, subject, htmlContent: customHtmlContent, attachment } = body;

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

      const normalizedAttachments = Array.isArray(attachment)
        ? attachment.filter((item) => item && typeof item.name === 'string' && (typeof item.url === 'string' || typeof item.content === 'string'))
        : [];

      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': BREVO_API_KEY,
          'Content-Type': 'application/json',
          'accept': 'application/json',
        },
        body: JSON.stringify({
          sender: { name: 'AdamKom Design', email: 'contact@adamkom.com' },
          to: [{ email: recipientEmail, name: recipientName || clientName }],
          subject: subject || `Votre nouveau design - ${designName || clientName}`,
          htmlContent,
          ...(normalizedAttachments.length ? { attachment: normalizedAttachments } : {}),
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        return new Response(JSON.stringify({ error: `Brevo error: ${err}` }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
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
