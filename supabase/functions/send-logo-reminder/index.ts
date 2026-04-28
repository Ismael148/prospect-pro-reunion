import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Validate user
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { client_id } = await req.json();
    if (!client_id) {
      return new Response(JSON.stringify({ error: "client_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: client } = await supabase
      .from("clients")
      .select("id, company_name, logo_created, logo_published_gmb, logo_validated_by_client, assigned_to")
      .eq("id", client_id)
      .single();

    if (!client) {
      return new Response(JSON.stringify({ error: "Client not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (client.logo_validated_by_client) {
      return new Response(JSON.stringify({ error: "Logo déjà validé" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const step = client.logo_published_gmb
      ? "à faire valider par le client"
      : client.logo_created ? "à publier sur la fiche Google" : "à créer";
    const stepKey = client.logo_published_gmb ? "validation" : client.logo_created ? "publication" : "creation";

    const { data: roleRows } = await supabase
      .from("user_roles")
      .select("user_id, role")
      .in("role", ["admin", "agent_master"]);

    const recipients = new Set<string>();
    if (client.assigned_to) recipients.add(client.assigned_to);
    (roleRows || []).forEach((r: any) => recipients.add(r.user_id));

    const title = "🔔 Relance manuelle — Logo";
    const message = `Logo de "${client.company_name}" toujours ${step}. Relance déclenchée manuellement.`;
    const link = `/clients/${client.id}`;

    const notifs = Array.from(recipients).map((uid) => ({
      user_id: uid, title, message, type: "logo_reminder", link,
    }));

    if (notifs.length > 0) {
      await supabase.from("notifications").insert(notifs);
    }

    // Log it
    await supabase.from("logo_reminder_log").insert({
      client_id,
      triggered_by: user.id,
      trigger_type: "manual",
      step: stepKey,
      message,
      recipients: Array.from(recipients),
      recipients_count: recipients.size,
    });

    await supabase
      .from("clients")
      .update({ logo_reminder_last_sent: new Date().toISOString() })
      .eq("id", client_id);

    return new Response(JSON.stringify({ success: true, recipients_count: recipients.size }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
