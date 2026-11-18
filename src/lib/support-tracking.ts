/**
 * Suivi des tickets support : délais de première réponse et de résolution.
 * La « première réponse » est enregistrée par la base : premier commentaire de
 * l'équipe, ou premier passage du statut « Ouvert » à un autre statut.
 */

/** Délai cible de première réponse ; au-delà, un ticket sans réponse est « en retard ». */
export const RESPONSE_TARGET_HOURS = 24;
const HOUR = 3_600_000;
const TARGET_MS = RESPONSE_TARGET_HOURS * HOUR;

export interface TrackableTicket {
  status: string;
  created_at: string;
  first_response_at: string | null;
  resolved_at: string | null;
}

export type ResponseState = "repondu" | "en_attente" | "en_retard" | "clos_sans_reponse";

export interface TicketTracking {
  responseMs: number | null;
  waitingMs: number | null;
  resolutionMs: number | null;
  responseState: ResponseState;
  respondedWithinTarget: boolean | null;
}

const isActive = (status: string) => status === "ouvert" || status === "en_cours";

export function getTicketTracking(t: TrackableTicket, now: Date = new Date()): TicketTracking {
  const opened = Date.parse(t.created_at);
  const responded = t.first_response_at ? Date.parse(t.first_response_at) : null;
  const resolved = t.resolved_at && !isActive(t.status) ? Date.parse(t.resolved_at) : null;

  const responseMs = responded != null ? Math.max(0, responded - opened) : null;
  const resolutionMs = resolved != null ? Math.max(0, resolved - opened) : null;
  const waitingMs = responded == null && isActive(t.status) ? Math.max(0, now.getTime() - opened) : null;

  let responseState: ResponseState;
  if (responseMs != null) responseState = "repondu";
  else if (waitingMs != null) responseState = waitingMs > TARGET_MS ? "en_retard" : "en_attente";
  else responseState = "clos_sans_reponse";

  return {
    responseMs,
    waitingMs,
    resolutionMs,
    responseState,
    respondedWithinTarget: responseMs != null ? responseMs <= TARGET_MS : null,
  };
}

export interface SupportSummary {
  total: number;
  responded: number;
  responseRate: number | null;
  withinTargetRate: number | null;
  avgResponseMs: number | null;
  avgResolutionMs: number | null;
  resolved: number;
  awaiting: number;
  late: number;
}

const average = (values: number[]) =>
  values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;

export function getSupportSummary(tickets: TrackableTicket[], now: Date = new Date()): SupportSummary {
  const tracked = tickets.map((t) => getTicketTracking(t, now));
  const responseTimes = tracked.flatMap((x) => (x.responseMs != null ? [x.responseMs] : []));
  const resolutionTimes = tracked.flatMap((x) => (x.resolutionMs != null ? [x.resolutionMs] : []));
  const within = tracked.filter((x) => x.respondedWithinTarget === true).length;
  return {
    total: tickets.length,
    responded: responseTimes.length,
    responseRate: tickets.length ? Math.round((responseTimes.length / tickets.length) * 100) : null,
    withinTargetRate: responseTimes.length ? Math.round((within / responseTimes.length) * 100) : null,
    avgResponseMs: average(responseTimes),
    avgResolutionMs: average(resolutionTimes),
    resolved: resolutionTimes.length,
    awaiting: tracked.filter((x) => x.responseState === "en_attente" || x.responseState === "en_retard").length,
    late: tracked.filter((x) => x.responseState === "en_retard").length,
  };
}

/** « moins d'1 min », « 45 min », « 3 h 05 », « 2 j 4 h ». */
export function formatDuration(ms: number | null): string {
  if (ms == null) return "—";
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 1) return "moins d'1 min";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ${String(minutes % 60).padStart(2, "0")}`;
  const days = Math.floor(hours / 24);
  const rest = hours % 24;
  return rest ? `${days} j ${rest} h` : `${days} j`;
}

export function formatTicketDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("fr-FR", {
    timeZone: "Indian/Reunion",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const TICKET_STATUS_LABELS: Record<string, string> = {
  ouvert: "Ouvert",
  en_cours: "En cours",
  resolu: "Résolu",
  ferme: "Fermé",
};

export const TICKET_PRIORITY_LABELS: Record<string, string> = {
  normale: "Normale",
  haute: "Haute",
  urgente: "Urgente",
};
