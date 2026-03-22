import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    const META_APP_ID = Deno.env.get("META_APP_ID")!;
    const META_APP_SECRET = Deno.env.get("META_APP_SECRET")!;
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Action 1: Generate OAuth URL
    if (action === "get_auth_url") {
      const { redirect_uri, client_id: clientId } = await req.json();
      const state = JSON.stringify({ client_id: clientId });
      const scopes = [
        "pages_show_list",
        "pages_read_engagement",
        "pages_manage_posts",
        "instagram_basic",
        "instagram_content_publish",
      ].join(",");

      const authUrl =
        `https://www.facebook.com/v21.0/dialog/oauth?client_id=${META_APP_ID}` +
        `&redirect_uri=${encodeURIComponent(redirect_uri)}` +
        `&scope=${scopes}` +
        `&state=${encodeURIComponent(state)}` +
        `&response_type=code`;

      return new Response(JSON.stringify({ auth_url: authUrl }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action 2: Exchange code for token and fetch pages
    if (action === "exchange_token") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: corsHeaders,
        });
      }

      const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: authHeader } },
      });

      const token = authHeader.replace("Bearer ", "");
      const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
      if (claimsError || !claimsData?.claims) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: corsHeaders,
        });
      }

      const { code, redirect_uri, client_id: clientId } = await req.json();

      // Exchange code for short-lived token
      const tokenRes = await fetch(
        `https://graph.facebook.com/v21.0/oauth/access_token?client_id=${META_APP_ID}&redirect_uri=${encodeURIComponent(redirect_uri)}&client_secret=${META_APP_SECRET}&code=${code}`
      );
      const tokenData = await tokenRes.json();

      if (tokenData.error) {
        return new Response(JSON.stringify({ error: tokenData.error.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Exchange for long-lived token
      const longTokenRes = await fetch(
        `https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${META_APP_ID}&client_secret=${META_APP_SECRET}&fb_exchange_token=${tokenData.access_token}`
      );
      const longTokenData = await longTokenRes.json();
      const longLivedToken = longTokenData.access_token || tokenData.access_token;
      const expiresIn = longTokenData.expires_in || 5184000; // ~60 days

      // Fetch user's pages
      const pagesRes = await fetch(
        `https://graph.facebook.com/v21.0/me/accounts?access_token=${longLivedToken}&fields=id,name,access_token,instagram_business_account{id,username}`
      );
      const pagesData = await pagesRes.json();

      if (pagesData.error) {
        return new Response(JSON.stringify({ error: pagesData.error.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const pages = (pagesData.data || []).map((page: any) => ({
        id: page.id,
        name: page.name,
        access_token: page.access_token,
        instagram: page.instagram_business_account || null,
      }));

      return new Response(JSON.stringify({ pages, user_token: longLivedToken, expires_in: expiresIn }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action 3: Save selected page to social_accounts
    if (action === "save_page") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: corsHeaders,
        });
      }

      const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: authHeader } },
      });

      const tkn = authHeader.replace("Bearer ", "");
      const { data: cd, error: ce } = await supabase.auth.getClaims(tkn);
      if (ce || !cd?.claims) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: corsHeaders,
        });
      }

      const { client_id: clientId, page, platform, expires_in } = await req.json();
      const expiresAt = new Date(Date.now() + (expires_in || 5184000) * 1000).toISOString();

      // Upsert the social account (unique on client_id, platform, page_id)
      const { error: upsertError } = await supabase
        .from("social_accounts")
        .upsert(
          {
            client_id: clientId,
            platform,
            page_id: page.id,
            username: page.name,
            profile_url: platform === "facebook"
              ? `https://facebook.com/${page.id}`
              : platform === "instagram" && page.instagram
              ? `https://instagram.com/${page.instagram.username}`
              : null,
            access_token: page.access_token,
            token_expires_at: expiresAt,
          },
          { onConflict: "client_id,platform,page_id" }
        );

      if (upsertError) {
        return new Response(JSON.stringify({ error: upsertError.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // If Instagram business account exists, save it too
      if (platform === "facebook" && page.instagram) {
        await supabase
          .from("social_accounts")
          .upsert(
            {
              client_id: clientId,
              platform: "instagram",
              page_id: page.instagram.id,
              username: page.instagram.username || page.name,
              profile_url: page.instagram.username
                ? `https://instagram.com/${page.instagram.username}`
                : null,
              access_token: page.access_token,
              token_expires_at: expiresAt,
            },
            { onConflict: "client_id,platform" }
          );
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
