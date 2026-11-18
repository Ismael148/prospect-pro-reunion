import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSupportTicketEvents, type SupportTicketEvent } from "@/hooks/use-support";
import {
  formatDuration, formatTicketDate, getTicketTracking,
  TICKET_PRIORITY_LABELS, TICKET_STATUS_LABELS, RESPONSE_TARGET_HOURS,
} from "@/lib/support-tracking";
import { Badge } from "@/components/ui/badge";
import { Loader2, History, MessageCircle, UserPlus, Flag, RefreshCw, Inbox } from "lucide-react";

interface TicketLike {
  id: string;
  status: string;
  created_at: string;
  first_response_at: string | null;
  first_response_by: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
}

/** Badge compact de réponse, utilisé dans la liste des tickets. */
export function ResponseBadge({ ticket }: { ticket: TicketLike }) {
  const t = getTicketTracking(ticket);
  if (t.responseState === "repondu") {
    return (
      <Badge variant="outline" className={`text-[10px] ${t.respondedWithinTarget ? "bg-success/10 text-success border-success/20" : "bg-warning/10 text-warning border-warning/20"}`}>
        Répondu en {formatDuration(t.responseMs)}
      </Badge>
    );
  }
  if (t.responseState === "en_retard") {
    return <Badge variant="destructive" className="text-[10px]">Sans réponse · {formatDuration(t.waitingMs)}</Badge>;
  }
  if (t.responseState === "en_attente") {
    return <Badge variant="outline" className="text-[10px] bg-warning/10 text-warning border-warning/20">En attente · {formatDuration(t.waitingMs)}</Badge>;
  }
  return <Badge variant="outline" className="text-[10px] text-muted-foreground">Clos sans réponse</Badge>;
}

const EVENT_ICONS: Record<SupportTicketEvent["event_type"], typeof History> = {
  ouverture: Inbox,
  statut: RefreshCw,
  assignation: UserPlus,
  priorite: Flag,
  reponse: MessageCircle,
};

function useNames(ids: string[]) {
  const [names, setNames] = useState<Record<string, string>>({});
  const key = ids.slice().sort().join(",");
  useEffect(() => {
    if (!ids.length) return;
    supabase.from("profiles").select("user_id, full_name").in("user_id", ids).then(({ data }) => {
      if (!data) return;
      setNames(Object.fromEntries(data.map((p) => [p.user_id, p.full_name || "Membre"])));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return names;
}

/** Bloc de suivi du ticket : dates clés, délais et historique complet. */
export function TicketTracking({ ticket }: { ticket: TicketLike }) {
  const { data: events, isLoading } = useSupportTicketEvents(ticket.id);
  const tracking = getTicketTracking(ticket);

  const ids = useMemo(() => {
    const set = new Set<string>();
    [ticket.first_response_by, ticket.resolved_by].forEach((v) => v && set.add(v));
    events?.forEach((e) => {
      if (e.actor_id) set.add(e.actor_id);
      if (e.event_type === "assignation") [e.from_value, e.to_value].forEach((v) => v && set.add(v));
    });
    return [...set];
  }, [events, ticket.first_response_by, ticket.resolved_by]);
  const names = useNames(ids);
  const who = (id: string | null) => (id ? names[id] || "Membre de l'équipe" : null);

  const describe = (e: SupportTicketEvent) => {
    switch (e.event_type) {
      case "ouverture":
        return "Ticket ouvert";
      case "statut":
        return e.from_value
          ? `Statut : ${TICKET_STATUS_LABELS[e.from_value] || e.from_value} → ${TICKET_STATUS_LABELS[e.to_value || ""] || e.to_value}`
          : `Statut : ${TICKET_STATUS_LABELS[e.to_value || ""] || e.to_value}`;
      case "assignation":
        return e.to_value ? `Assigné à ${who(e.to_value)}` : "Assignation retirée";
      case "priorite":
        return `Priorité : ${TICKET_PRIORITY_LABELS[e.from_value || ""] || e.from_value || "—"} → ${TICKET_PRIORITY_LABELS[e.to_value || ""] || e.to_value}`;
      case "reponse":
        return e.from_value === "note" ? "Note interne de l'équipe" : "Commentaire de l'équipe";
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <div className="rounded-lg bg-muted/30 p-3">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Ouvert le</p>
          <p className="text-sm font-medium mt-0.5">{formatTicketDate(ticket.created_at)}</p>
        </div>
        <div className="rounded-lg bg-muted/30 p-3">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Première réponse</p>
          {ticket.first_response_at ? (
            <>
              <p className="text-sm font-medium mt-0.5">{formatTicketDate(ticket.first_response_at)}</p>
              <p className={`text-[11px] ${tracking.respondedWithinTarget ? "text-success" : "text-warning"}`}>
                en {formatDuration(tracking.responseMs)}{who(ticket.first_response_by) ? ` · ${who(ticket.first_response_by)}` : ""}
              </p>
            </>
          ) : tracking.waitingMs != null ? (
            <p className={`text-sm font-medium mt-0.5 ${tracking.responseState === "en_retard" ? "text-destructive" : "text-warning"}`}>
              En attente depuis {formatDuration(tracking.waitingMs)}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground mt-0.5">Aucune</p>
          )}
        </div>
        <div className="rounded-lg bg-muted/30 p-3">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Résolution</p>
          {tracking.resolutionMs != null ? (
            <>
              <p className="text-sm font-medium mt-0.5">{formatTicketDate(ticket.resolved_at)}</p>
              <p className="text-[11px] text-muted-foreground">
                en {formatDuration(tracking.resolutionMs)}{who(ticket.resolved_by) ? ` · ${who(ticket.resolved_by)}` : ""}
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground mt-0.5">
              {ticket.status === "ferme" ? "Fermé (date inconnue)" : "Pas encore résolu"}
            </p>
          )}
        </div>
      </div>
      {tracking.responseState === "en_retard" && (
        <p className="text-xs text-destructive">Aucune réponse depuis plus de {RESPONSE_TARGET_HOURS} h.</p>
      )}

      <div>
        <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
          <History className="h-3 w-3" /> Historique
        </p>
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
        ) : !events?.length ? (
          <p className="text-xs text-muted-foreground">Aucun événement enregistré.</p>
        ) : (
          <ol className="relative border-l border-border ml-2 space-y-3">
            {events.map((e) => {
              const Icon = EVENT_ICONS[e.event_type] || History;
              return (
                <li key={e.id} className="ml-4">
                  <span className="absolute -left-[9px] flex h-[18px] w-[18px] items-center justify-center rounded-full bg-background border border-border">
                    <Icon className="h-2.5 w-2.5 text-primary" />
                  </span>
                  <p className="text-sm">{describe(e)}</p>
                  {e.event_type === "reponse" && e.from_value !== "note" && e.to_value && (
                    <p className="text-xs text-muted-foreground line-clamp-2">« {e.to_value} »</p>
                  )}
                  <p className="text-[11px] text-muted-foreground">
                    {formatTicketDate(e.created_at)}
                    {who(e.actor_id) ? ` · ${who(e.actor_id)}` : ""}
                  </p>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}
