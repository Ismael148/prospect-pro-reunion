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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const body = await req.json();
    console.log('[brevo-webhook] Received event:', JSON.stringify(body));

    // Brevo sends events as individual objects or arrays
    const events = Array.isArray(body) ? body : [body];

    for (const event of events) {
      const brevoEvent = event.event;
      const messageId = event["message-id"] || event.messageId;
      const email = event.email;

      if (!messageId || !brevoEvent) {
        console.warn('[brevo-webhook] Missing messageId or event type, skipping');
        continue;
      }

      // Map Brevo events to our status
      let status: string;
      switch (brevoEvent) {
        case 'delivered':
          status = 'delivered';
          break;
        case 'opened':
        case 'unique_opened':
          status = 'opened';
          break;
        case 'click':
          status = 'clicked';
          break;
        case 'hard_bounce':
        case 'soft_bounce':
          status = 'bounced';
          break;
        case 'spam':
        case 'complaint':
          status = 'spam';
          break;
        case 'unsubscribed':
          status = 'unsubscribed';
          break;
        case 'blocked':
          status = 'blocked';
          break;
        case 'invalid':
        case 'error':
          status = 'failed';
          break;
        default:
          console.log(`[brevo-webhook] Unknown event: ${brevoEvent}`);
          continue;
      }

      // Update existing log entry by message_id
      const { data: existing } = await supabase
        .from('email_send_log')
        .select('id, status')
        .eq('message_id', messageId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (existing) {
        // Insert a new row for this event (append-only log)
        await supabase.from('email_send_log').insert({
          message_id: messageId,
          recipient_email: email || '',
          subject: '',
          status,
          template_name: 'campaign',
          metadata: { brevo_event: brevoEvent, raw: event },
        });
      } else {
        console.warn(`[brevo-webhook] No log found for messageId: ${messageId}`);
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[brevo-webhook] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
