export type TrackedEmail = {
  message_id: string;
  client_id: string | null;
  template_name: string | null;
  recipient_email: string | null;
  subject: string | null;
  sent_at: string | null;
  status: string;
  delivered_at: string | null;
  first_opened_at: string | null;
  last_opened_at: string | null;
  open_count: number;
  click_count: number;
  last_clicked_at: string | null;
  clicked_links: unknown;
  failure_reason: string | null;
  last_synced_at: string;
};

export const FAILED_STATUSES = ["hardBounces", "softBounces", "blocked", "spam", "invalid", "error"];

export type TrackingSummary = {
  sent: number; delivered: number; opened: number; clicked: number; failed: number;
  openRate: number | null; clickRate: number | null;
};

const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : null);

/** Counts each email once. Rates use delivered emails as the base (an opened email counts as delivered). */
export function summarizeTracking(emails: Pick<TrackedEmail, "status" | "delivered_at" | "open_count" | "click_count">[]): TrackingSummary {
  let delivered = 0, opened = 0, clicked = 0, failed = 0;
  for (const e of emails) {
    const isOpened = e.open_count > 0 || e.click_count > 0;
    if (FAILED_STATUSES.includes(e.status)) failed++;
    else if (e.delivered_at || isOpened) delivered++;
    if (isOpened) opened++;
    if (e.click_count > 0) clicked++;
  }
  return { sent: emails.length, delivered, opened, clicked, failed, openRate: pct(opened, delivered), clickRate: pct(clicked, delivered) };
}

export const TRACKING_STATUS: Record<string, { label: string; tone: "muted" | "info" | "success" | "primary" | "danger" }> = {
  sent: { label: "Envoyé", tone: "muted" },
  delivered: { label: "Délivré", tone: "info" },
  opened: { label: "Ouvert", tone: "success" },
  clicked: { label: "Cliqué", tone: "primary" },
  hardBounces: { label: "Rejeté", tone: "danger" },
  softBounces: { label: "Rejet temporaire", tone: "danger" },
  blocked: { label: "Bloqué", tone: "danger" },
  spam: { label: "Spam", tone: "danger" },
  invalid: { label: "Adresse invalide", tone: "danger" },
  error: { label: "Erreur", tone: "danger" },
};

export const EMAIL_TYPE_LABELS: Record<string, string> = {
  pack_decollage: "Présentation Décollage",
  support_link: "Lien support",
  invoice: "Facture",
  quote: "Devis",
  meet_invite: "RDV visio",
};

export const clickedLinks = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
