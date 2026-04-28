import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Activity, Wifi } from "lucide-react";
import { useLastRealtimeAt } from "@/hooks/use-global-realtime";
import { cn } from "@/lib/utils";

/**
 * Small badge shown on key screens. Pulses briefly each time
 * a realtime event arrives, otherwise displays "Synchronisé".
 */
export function RealtimeBadge({ className }: { className?: string }) {
  const lastAt = useLastRealtimeAt();
  const [pulsing, setPulsing] = useState(false);

  useEffect(() => {
    if (!lastAt) return;
    setPulsing(true);
    const t = setTimeout(() => setPulsing(false), 1500);
    return () => clearTimeout(t);
  }, [lastAt]);

  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1.5 border-primary/30 bg-primary/5 text-xs font-medium transition-colors",
        pulsing && "border-primary bg-primary/15 text-primary",
        className
      )}
      title={lastAt ? `Dernier événement : ${new Date(lastAt).toLocaleTimeString("fr-FR")}` : "En attente d'événements"}
    >
      {pulsing ? (
        <>
          <Activity className="h-3 w-3 animate-pulse" />
          Mise à jour en live
        </>
      ) : (
        <>
          <Wifi className="h-3 w-3" />
          Synchronisé
        </>
      )}
    </Badge>
  );
}
