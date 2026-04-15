import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function scoreColor(score: number): string {
  if (score >= 90) return '#0cce6b';
  if (score >= 50) return '#ffa400';
  return '#ff4e42';
}

function scoreEmoji(score: number): string {
  if (score >= 90) return '🟢';
  if (score >= 50) return '🟡';
  return '🔴';
}

function buildReportHtml(url: string, clientName: string, data: any): string {
  const categories = data.lighthouseResult?.categories || {};
  const perf = Math.round((categories.performance?.score || 0) * 100);
  const seo = Math.round((categories.seo?.score || 0) * 100);
  const access = Math.round((categories.accessibility?.score || 0) * 100);
  const bp = Math.round((categories['best-practices']?.score || 0) * 100);

  const audits = data.lighthouseResult?.audits || {};
  const fcp = audits['first-contentful-paint']?.displayValue || 'N/A';
  const lcp = audits['largest-contentful-paint']?.displayValue || 'N/A';
  const cls = audits['cumulative-layout-shift']?.displayValue || 'N/A';
  const si = audits['speed-index']?.displayValue || 'N/A';
  const tbt = audits['total-blocking-time']?.displayValue || 'N/A';

  const now = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

  const scoreCard = (label: string, score: number) => `
    <td style="padding:12px;text-align:center;width:25%">
      <div style="width:70px;height:70px;border-radius:50%;border:4px solid ${scoreColor(score)};display:inline-flex;align-items:center;justify-content:center;margin:0 auto 8px">
        <span style="font-size:22px;font-weight:bold;color:${scoreColor(score)}">${score}</span>
      </div>
      <div style="font-size:13px;color:#555;font-weight:600">${label}</div>
    </td>`;

  return `
<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:650px;margin:0 auto;background:#fff">
  <div style="background:linear-gradient(135deg,#1E3A5F 0%,#0d2137 100%);padding:30px;text-align:center;border-radius:12px 12px 0 0">
    <img src="https://qaxlpmxekcvbrcnqopbp.supabase.co/storage/v1/object/public/email-assets/logo-adamkom-black.png" alt="AdamKom" style="height:40px;margin-bottom:12px;filter:brightness(10)" />
    <h1 style="color:#fff;margin:0;font-size:22px">📊 Rapport de Performance Web</h1>
    <p style="color:#DAA520;margin:8px 0 0;font-size:14px">${now}</p>
  </div>
  
  <div style="padding:30px;border:1px solid #eee;border-top:0">
    <p style="font-size:16px;color:#333">Bonjour <strong>${clientName}</strong>,</p>
    <p style="color:#555">Voici le rapport de performance mensuel de votre site web :</p>
    <p style="background:#f8f9fa;padding:10px 16px;border-radius:8px;font-family:monospace;color:#1E3A5F;font-size:14px">🌐 ${url}</p>
    
    <h2 style="color:#1E3A5F;font-size:18px;margin:28px 0 16px;border-bottom:2px solid #ff006e;padding-bottom:8px">Scores Globaux</h2>
    <table style="width:100%;border-collapse:collapse"><tr>
      ${scoreCard('Performance', perf)}
      ${scoreCard('SEO', seo)}
      ${scoreCard('Accessibilité', access)}
      ${scoreCard('Bonnes pratiques', bp)}
    </tr></table>
    
    <h2 style="color:#1E3A5F;font-size:18px;margin:28px 0 16px;border-bottom:2px solid #ff006e;padding-bottom:8px">Métriques Détaillées</h2>
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      <tr style="background:#f8f9fa"><td style="padding:10px 14px;font-weight:600">⚡ First Contentful Paint</td><td style="padding:10px 14px;text-align:right">${fcp}</td></tr>
      <tr><td style="padding:10px 14px;font-weight:600">🖼️ Largest Contentful Paint</td><td style="padding:10px 14px;text-align:right">${lcp}</td></tr>
      <tr style="background:#f8f9fa"><td style="padding:10px 14px;font-weight:600">📐 Cumulative Layout Shift</td><td style="padding:10px 14px;text-align:right">${cls}</td></tr>
      <tr><td style="padding:10px 14px;font-weight:600">🏎️ Speed Index</td><td style="padding:10px 14px;text-align:right">${si}</td></tr>
      <tr style="background:#f8f9fa"><td style="padding:10px 14px;font-weight:600">⏱️ Total Blocking Time</td><td style="padding:10px 14px;text-align:right">${tbt}</td></tr>
    </table>
    
    <div style="background:linear-gradient(135deg,#f0f4ff,#fff0f6);border-radius:10px;padding:20px;margin:24px 0;border-left:4px solid #ff006e">
      <p style="margin:0;font-size:14px;color:#333"><strong>💡 Légende des scores :</strong></p>
      <p style="margin:8px 0 0;font-size:13px;color:#555">🟢 90-100 : Excellent &nbsp;|&nbsp; 🟡 50-89 : À améliorer &nbsp;|&nbsp; 🔴 0-49 : Critique</p>
    </div>
    
    <p style="color:#555;font-size:14px">Si vous avez des questions sur ces résultats ou souhaitez améliorer les performances de votre site, n'hésitez pas à nous contacter.</p>
    <p style="color:#333;font-size:14px">Cordialement,<br><strong style="color:#ff006e">L'équipe AdamKom</strong></p>
  </div>
  
  <div style="background:#1E3A5F;padding:16px;text-align:center;border-radius:0 0 12px 12px">
    <p style="color:#fff;margin:0;font-size:12px">ADAMKOM by JJP — contact@adamkom.com — 0693 802 201</p>
  </div>
</div>`;
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

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Non autorisé' }), { status: 401, headers: corsHeaders });
    }

    const { url, clientName, clientEmail, projectId } = await req.json();

    if (!url || !clientEmail) {
      return new Response(JSON.stringify({ error: 'URL et email client requis' }), { status: 400, headers: corsHeaders });
    }

    // Normalize URL
    let targetUrl = url.trim();
    if (!targetUrl.startsWith('http')) targetUrl = 'https://' + targetUrl;

    // Call Google PageSpeed Insights API (free, no key needed)
    const psiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(targetUrl)}&category=performance&category=seo&category=accessibility&category=best-practices&strategy=mobile`;
    
    const psiResponse = await fetch(psiUrl);
    if (!psiResponse.ok) {
      const err = await psiResponse.text();
      return new Response(JSON.stringify({ error: `Erreur PageSpeed: ${err}` }), { status: 500, headers: corsHeaders });
    }

    const psiData = await psiResponse.json();
    const htmlContent = buildReportHtml(targetUrl, clientName || 'Client', psiData);

    // Extract scores for response
    const categories = psiData.lighthouseResult?.categories || {};
    const scores = {
      performance: Math.round((categories.performance?.score || 0) * 100),
      seo: Math.round((categories.seo?.score || 0) * 100),
      accessibility: Math.round((categories.accessibility?.score || 0) * 100),
      bestPractices: Math.round((categories['best-practices']?.score || 0) * 100),
    };

    // Send via Brevo
    const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY');
    if (!BREVO_API_KEY) {
      return new Response(JSON.stringify({ error: 'BREVO_API_KEY non configurée' }), { status: 500, headers: corsHeaders });
    }

    const subject = `📊 Rapport de performance — ${targetUrl.replace(/https?:\/\//, '')}`;

    const brevoResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': BREVO_API_KEY,
        'Content-Type': 'application/json',
        'accept': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: 'AdamKom Performance', email: 'contact@adamkom.com' },
        to: [{ email: clientEmail, name: clientName || clientEmail }],
        subject,
        htmlContent,
        textContent: `Rapport de performance web pour ${targetUrl} — Performance: ${scores.performance}/100, SEO: ${scores.seo}/100, Accessibilité: ${scores.accessibility}/100`,
      }),
    });

    // Log in email_send_log
    const serviceSupabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    if (brevoResponse.ok) {
      const brevoData = await brevoResponse.json();
      await serviceSupabase.from('email_send_log').insert({
        message_id: brevoData.messageId || null,
        recipient_email: clientEmail,
        recipient_name: clientName,
        subject,
        status: 'sent',
        template_name: 'performance_report',
        project_id: projectId || null,
        metadata: { scores, url: targetUrl },
      });

      return new Response(JSON.stringify({ success: true, scores, messageId: brevoData.messageId }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else {
      const err = await brevoResponse.text();
      await serviceSupabase.from('email_send_log').insert({
        recipient_email: clientEmail,
        recipient_name: clientName,
        subject,
        status: 'failed',
        template_name: 'performance_report',
        project_id: projectId || null,
        error_message: err,
      });
      return new Response(JSON.stringify({ error: `Erreur Brevo: ${err}` }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    console.error('pagespeed-report error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
