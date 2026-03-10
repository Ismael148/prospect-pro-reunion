import { supabase } from "@/integrations/supabase/client";

type WebhookEvent =
  | "client.signed"
  | "invoice.created"
  | "support.created"
  | "support.resolved"
  | "project.progress";

export async function triggerN8nWebhook(event: WebhookEvent, data: Record<string, unknown>) {
  try {
    const { data: result, error } = await supabase.functions.invoke("n8n-webhook", {
      body: { event, data },
    });

    if (error) {
      console.warn(`[n8n] Webhook ${event} failed:`, error);
      return;
    }

    console.log(`[n8n] Webhook ${event} sent successfully`);
    return result;
  } catch (err) {
    // Never block user actions because of webhook failures
    console.warn(`[n8n] Webhook ${event} error:`, err);
  }
}
