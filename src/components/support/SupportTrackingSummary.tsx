import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity } from "lucide-react";
import { formatDuration, getSupportSummary, RESPONSE_TARGET_HOURS, type TrackableTicket } from "@/lib/support-tracking";

interface Props {
  tickets: TrackableTicket[];
  onShowLate?: () => void;
  onShowAwaiting?: () => void;
}

/** Indicateurs globaux : taux de réponse, délais moyens, tickets sans réponse. */
export function SupportTrackingSummary({ tickets, onShowLate, onShowAwaiting }: Props) {
  const s = useMemo(() => getSupportSummary(tickets), [tickets]);
  const items = [
    { label: "Taux de réponse", value: s.responseRate != null ? `${s.responseRate} %` : "—", hint: `${s.responded} / ${s.total} tickets` },
    { label: `Réponse sous ${RESPONSE_TARGET_HOURS} h`, value: s.withinTargetRate != null ? `${s.withinTargetRate} %` : "—", hint: "des tickets répondus" },
    { label: "1re réponse moyenne", value: formatDuration(s.avgResponseMs), hint: "après l'ouverture" },
    { label: "Résolution moyenne", value: formatDuration(s.avgResolutionMs), hint: `${s.resolved} ticket${s.resolved > 1 ? "s" : ""} résolu${s.resolved > 1 ? "s" : ""}` },
    { label: "Sans réponse", value: String(s.awaiting), hint: "tickets en attente", onClick: onShowAwaiting, tone: s.awaiting ? "text-warning" : "" },
    { label: "En retard", value: String(s.late), hint: `plus de ${RESPONSE_TARGET_HOURS} h sans réponse`, onClick: onShowLate, tone: s.late ? "text-destructive" : "" },
  ];
  return (
    <Card className="border-0 shadow-soft">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="w-4 h-4" /> Suivi des tickets
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {items.map((it) => (
            <button
              key={it.label}
              type="button"
              disabled={!it.onClick}
              onClick={it.onClick}
              className="text-left rounded-lg bg-muted/30 p-3 enabled:hover:bg-muted/60 transition-colors disabled:cursor-default"
            >
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider">{it.label}</p>
              <p className={`text-xl font-bold mt-0.5 ${it.tone || ""}`}>{it.value}</p>
              <p className="text-[11px] text-muted-foreground">{it.hint}</p>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
