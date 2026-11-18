import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ListChecks, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useClientTasks } from "@/hooks/use-tasks-agenda";
import { getClientTaskStats, isTaskOverdue, reunionToday } from "@/lib/task-tracking";

const fmt = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });

export default function ClientTaskStatsCard({ clientId }: { clientId: string }) {
  const { data: tasks, isLoading } = useClientTasks(clientId);
  const today = reunionToday();
  const stats = useMemo(() => getClientTaskStats(tasks || [], today), [tasks, today]);
  const overdueTasks = useMemo(() => (tasks || []).filter((t) => isTaskOverdue(t, today)), [tasks, today]);

  if (isLoading || !tasks?.length) return null;

  return (
    <Card className="border-0 shadow-md shadow-primary/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <ListChecks className="h-5 w-5" /> Suivi des tâches
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="mb-1 flex items-baseline justify-between">
            <span className="text-sm text-muted-foreground">Tâches terminées</span>
            <span className="text-2xl font-bold">{stats.completionRate ?? 0}%</span>
          </div>
          <Progress value={stats.completionRate ?? 0} />
        </div>
        <div className="grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
          <div className="rounded-lg bg-muted/40 p-2"><p className="text-lg font-bold">{stats.done}/{stats.total}</p><p className="text-[11px] text-muted-foreground">Terminées</p></div>
          <div className="rounded-lg bg-muted/40 p-2"><p className="text-lg font-bold">{stats.open}</p><p className="text-[11px] text-muted-foreground">Restantes</p></div>
          <div className={`rounded-lg p-2 ${stats.overdue ? "bg-destructive/10 text-destructive" : "bg-muted/40"}`}><p className="text-lg font-bold">{stats.overdue}</p><p className="text-[11px]">En retard</p></div>
          <div className="rounded-lg bg-muted/40 p-2"><p className="text-sm font-bold leading-7">{stats.nextDue ? fmt(stats.nextDue) : "—"}</p><p className="text-[11px] text-muted-foreground">Prochaine échéance</p></div>
        </div>
        {overdueTasks.length > 0 && (
          <div className="space-y-1">
            <p className="flex items-center gap-1 text-sm font-medium text-destructive"><AlertTriangle className="h-4 w-4" /> Tâches en retard</p>
            <ul className="divide-y divide-border rounded-lg border border-border text-sm">
              {overdueTasks.slice(0, 5).map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-2 px-3 py-2">
                  <Link to={`/projets/${t.project_id}`} className="min-w-0 truncate hover:text-primary">{t.title}</Link>
                  <span className="shrink-0 text-xs text-destructive">{fmt(t.due_date!)}</span>
                </li>
              ))}
            </ul>
            {overdueTasks.length > 5 && (
              <Link to="/agenda" className="text-xs text-primary hover:underline">Voir les {overdueTasks.length} tâches en retard dans l'Agenda</Link>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
