import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Activity, Trash2 } from "lucide-react";
import { useRealtimeEvents } from "@/hooks/use-global-realtime";
import { RealtimeBadge } from "@/components/RealtimeBadge";

const typeColor: Record<string, string> = {
  INSERT: "bg-success/15 text-success border-success/30",
  UPDATE: "bg-primary/15 text-primary border-primary/30",
  DELETE: "bg-destructive/15 text-destructive border-destructive/30",
};

export default function DebugRealtime() {
  const events = useRealtimeEvents();
  const [filter, setFilter] = useState("");

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return events;
    return events.filter(
      (e) =>
        e.table.toLowerCase().includes(q) ||
        e.type.toLowerCase().includes(q) ||
        (e.row_id || "").toLowerCase().includes(q)
    );
  }, [events, filter]);

  const stats = useMemo(() => {
    const byTable = new Map<string, number>();
    events.forEach((e) => byTable.set(e.table, (byTable.get(e.table) || 0) + 1));
    return Array.from(byTable.entries()).sort((a, b) => b[1] - a[1]);
  }, [events]);

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="w-6 h-6 text-primary" /> Debug temps réel
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Derniers événements reçus via Supabase Realtime (max 200, RAM uniquement).
          </p>
        </div>
        <RealtimeBadge />
      </div>

      <Card className="border-0 shadow-md shadow-primary/5">
        <CardHeader>
          <CardTitle className="text-sm">Activité par table</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun événement reçu pour le moment.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {stats.map(([table, count]) => (
                <Badge key={table} variant="outline" className="gap-1">
                  <span className="font-mono">{table}</span>
                  <span className="text-muted-foreground">·</span>
                  <span className="font-semibold">{count}</span>
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-0 shadow-md shadow-primary/5">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-sm">Flux d'événements ({filtered.length})</CardTitle>
          <div className="flex items-center gap-2">
            <Input
              placeholder="Filtrer (table, type, id…)"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="h-8 w-56"
            />
            <Button size="sm" variant="ghost" onClick={() => window.location.reload()}>
              <Trash2 className="w-3 h-3 mr-1" /> Vider
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              {events.length === 0
                ? "Aucun événement encore. Modifie un client ou un projet dans un autre onglet pour voir l'activité ici."
                : "Aucun événement ne correspond au filtre."}
            </p>
          ) : (
            <div className="divide-y divide-border max-h-[60vh] overflow-auto -mx-6">
              {filtered.map((e) => (
                <div key={e.id} className="flex items-center gap-3 px-6 py-2 text-sm hover:bg-muted/30">
                  <span className="text-xs font-mono text-muted-foreground w-20 shrink-0">
                    {new Date(e.at).toLocaleTimeString("fr-FR")}
                  </span>
                  <Badge variant="outline" className={`${typeColor[e.type] || ""} text-[10px] w-16 justify-center`}>
                    {e.type}
                  </Badge>
                  <span className="font-mono text-xs font-semibold">{e.table}</span>
                  {e.row_id && (
                    <span className="font-mono text-[11px] text-muted-foreground truncate">
                      #{e.row_id}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
