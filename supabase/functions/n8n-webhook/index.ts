import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

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

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('Auth error:', userError?.message);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    const N8N_WEBHOOK_BASE_URL = Deno.env.get('N8N_WEBHOOK_BASE_URL');
    if (!N8N_WEBHOOK_BASE_URL) {
      return new Response(JSON.stringify({ error: 'N8N_WEBHOOK_BASE_URL not configured' }), { status: 500, headers: corsHeaders });
    }

    const body = await req.json();
    const { event, data } = body;

    if (!event) {
      return new Response(JSON.stringify({ error: 'Missing event type' }), { status: 400, headers: corsHeaders });
    }

    const validEvents = ['client.signed', 'invoice.created', 'support.created', 'support.resolved', 'support.response', 'project.progress', 'prospect.rdv_planifie', 'design.sent'];
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

    return new Response(JSON.stringify({ success: true }), {
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
