import { useMemo } from "react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useGlobalStats } from "@/hooks/use-global-stats";
import { useTeamMembers, ROLE_LABELS } from "@/hooks/use-team-comments";
import { computeAgentStats } from "@/lib/agent-tracking";
import { reunionToday } from "@/lib/task-tracking";

/** One row per team member: tasks they own, tickets assigned to them, comments they wrote. */
export function AgentTrackingTable() {
  const { data, isLoading } = useGlobalStats();
  const { data: members } = useTeamMembers();
  const today = reunionToday();

  const rows = useMemo(() => {
    if (!data || !members) return [];
    const team = members.filter((m) => m.roles.length > 0);
    return computeAgentStats(team.map((m) => m.user_id), data, today)
      .map((s) => ({ ...s, member: team.find((m) => m.user_id === s.user_id)! }))
      .filter((s) => s.tasksTotal || s.ticketsAssigned || s.commentsTotal)
      .sort((a, b) => b.tasksOverdue - a.tasksOverdue || b.tasksTotal - a.tasksTotal);
  }, [data, members, today]);

  return (
    <Card className="border-0 shadow-md shadow-primary/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg"><Users className="h-5 w-5" /> Suivi par agent</CardTitle>
        <p className="text-sm text-muted-foreground">Tâches dont chaque membre est responsable, tickets qui lui sont assignés et commentaires écrits sur les fiches clients.</p>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        {isLoading ? <Skeleton className="h-40 w-full" /> : (
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2 pr-3">Membre</th>
                <th className="py-2 pr-3">Tâches terminées</th>
                <th className="py-2 pr-3 text-center">En retard</th>
                <th className="py-2 pr-3 text-center">Tickets assignés</th>
                <th className="py-2 pr-3 text-center">Sans réponse</th>
                <th className="py-2 pr-3 text-center">Commentaires</th>
                <th className="py-2">Dernière relance</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.user_id} className="border-b border-border/60 align-middle">
                  <td className="py-3 pr-3">
                    <p className="font-medium">{r.member.full_name || "Membre"}</p>
                    <p className="text-xs text-muted-foreground">{r.member.roles.map((x) => ROLE_LABELS[x] || x).join(", ")}</p>
                  </td>
                  <td className="w-56 py-3 pr-3">
                    {r.tasksTotal ? (
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs"><span>{r.tasksDone}/{r.tasksTotal}</span><span className="font-semibold">{r.completionRate}%</span></div>
                        <Progress value={r.completionRate ?? 0} className="h-1.5" />
                      </div>
                    ) : <span className="text-xs text-muted-foreground">Aucune tâche</span>}
                  </td>
                  <td className="py-3 pr-3 text-center">
                    {r.tasksOverdue ? <Badge variant="destructive">{r.tasksOverdue}</Badge> : <span className="text-muted-foreground">0</span>}
                  </td>
                  <td className="py-3 pr-3 text-center">
                    <span className="font-medium">{r.ticketsAssigned}</span>
                    {r.ticketsActive > 0 && <span className="block text-[11px] text-muted-foreground">{r.ticketsActive} en cours</span>}
                  </td>
                  <td className="py-3 pr-3 text-center">
                    {r.ticketsUnanswered ? <Badge variant="destructive">{r.ticketsUnanswered}</Badge> : <span className="text-muted-foreground">0</span>}
                  </td>
                  <td className="py-3 pr-3 text-center">
                    <span className="font-medium">{r.commentsTotal}</span>
                    <span className="block text-[11px] text-muted-foreground">{r.comments30d} sur 30 j</span>
                  </td>
                  <td className="py-3 text-xs">
                    {r.lastReminderAt ? (
                      <>
                        <span>{formatDistanceToNow(new Date(r.lastReminderAt), { addSuffix: true, locale: fr })}</span>
                        <span className={`block ${r.lastReminderOpened ? "text-success" : "text-muted-foreground"}`}>{r.lastReminderOpened ? "Mail ouvert" : "Pas encore ouvert"}</span>
                      </>
                    ) : <span className="text-muted-foreground">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}
