import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

Deno.serve((req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  return new Response(
    JSON.stringify({
      apiKey: Deno.env.get('GOOGLE_API_KEY') ?? '',
      authDomain: 'adamkom-crm.firebaseapp.com',
      projectId: 'adamkom-crm',
      storageBucket: 'adamkom-crm.firebasestorage.app',
      messagingSenderId: '317720872928',
      appId: '1:317720872928:web:499026281ff0225d4c8d85',
      measurementId: 'G-KSW2DBKF7E',
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
});
