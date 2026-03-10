import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    // Get all admin users
    const { data: adminRoles } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");

    // Create notifications for all admins
    if (adminRoles?.length) {
      const notifications = adminRoles.map((r: any) => ({
        user_id: r.user_id,
        title: `Nouveau support : ${client_name}`,
        message: `[${ticket_number}] ${category} — ${subject}`,
        type: "support",
        link: "/support",
      }));

      await supabase.from("notifications").insert(notifications);
    }

    // Log: In production, you'd send emails here via a transactional email service
    // For now, we create in-app notifications which is the primary channel
    console.log(`Support ticket ${ticket_number} created for ${client_name} (${client_email})`);
    console.log(`Category: ${category}, Subject: ${subject}`);

    return new Response(
      JSON.stringify({ success: true, ticket_number }),
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
