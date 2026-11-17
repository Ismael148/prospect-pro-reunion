import { supabase } from "@/integrations/supabase/client";

/** Sends one email to one client through the shared client-email service (logged in the client's history). */
export async function sendClientEmail(payload: { to: string; name: string; subject: string; html: string; trigger: string; clientId: string }) {
  const { data, error } = await supabase.functions.invoke("send-brevo-campaign", { body: {
    action: "send_client_email", recipientEmail: payload.to, recipientName: payload.name,
    subject: payload.subject, htmlContent: payload.html, trigger: payload.trigger, client_id: payload.clientId,
  } });
  if (error) {
    const response = "context" in error ? (error as any).context : null;
    const detail = response instanceof Response ? await response.json().catch(() => null) : null;
    throw new Error(detail?.error || error.message);
  }
  if (!data?.success) throw new Error(data?.error || "L'envoi n'a pas été confirmé.");
}

export const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
