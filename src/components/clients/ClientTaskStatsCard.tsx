import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ListChecks, AlertTriangle, CalendarCheck, ChevronDown, ChevronRight, CheckCircle2, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useClientTasks, type AgendaTask } from "@/hooks/use-tasks-agenda";
import { getClientTaskStats, isTaskDone, isTaskOverdue, reunionToday } from "@/lib/task-tracking";
import { PROJECT_STATUS_LABELS } from "@/lib/constants";

const fmt = (d: string) => new Date(`${d.slice(0, 10)}T00:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });

type Project = { id: string; name: string; status: string; due_date: string | null; updated_at: string; created_at: string };

export default function ClientTaskStatsCard({ clientId, companyName }: { clientId: string; companyName?: string | null }) {
  const { data: tasks, isLoading } = useClientTasks(clientId);
  const { data: projects } = useQuery({
    queryKey: ["client-projects", clientId],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("*").eq("client_id", clientId).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const today = reunionToday();
  const stats = useMemo(() => getClientTaskStats(tasks || [], today), [tasks, today]);
  const agendaLink = `/agenda${companyName ? `?q=${encodeURIComponent(companyName)}` : ""}`;

  const perProject = useMemo(() => {
    const byProject = new Map<string, AgendaTask[]>();
    (tasks || []).forEach((t) => byProject.set(t.project_id, [...(byProject.get(t.project_id) || []), t]));
    return ((projects || []) as Project[]).filter((p) => p.status !== "annule").map((p) => {
      const list = (byProject.get(p.id) || []).sort((a, b) => (a.due_date || "9999").localeCompare(b.due_date || "9999"));
      return { project: p, tasks: list, stats: getClientTaskStats(list, today) };
    });
  }, [tasks, projects, today]);

  const active = perProject.filter((p) => p.project.status !== "termine");
  const finished = perProject.filter((p) => p.project.status === "termine");

  if (isLoading || (!tasks?.length && !projects?.length)) return null;

  return (
    <Card className="border-0 shadow-md shadow-primary/5">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="flex items-center gap-2 text-lg"><ListChecks className="h-5 w-5" /> Suivi des tâches</CardTitle>
        <Button asChild size="sm" variant="outline">
          <Link to={agendaLink}><CalendarCheck className="mr-1 h-4 w-4" /> Voir dans l'Agenda</Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-5">
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

        {active.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-semibold">Tâches par projet</p>
            {active.map(({ project, tasks: list, stats: s }) => {
              const isOpen = open[project.id] ?? active.length === 1;
              const remaining = list.filter((t) => !isTaskDone(t));
              return (
                <div key={project.id} className="rounded-lg border border-border">
                  <button className="flex w-full items-center gap-3 px-3 py-2.5 text-left" onClick={() => setOpen((o) => ({ ...o, [project.id]: !isOpen }))} aria-expanded={isOpen}>
                    {isOpen ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">{project.name}</span>
                    <Badge variant="outline" className="shrink-0 text-[10px]">{(PROJECT_STATUS_LABELS as any)[project.status] || project.status}</Badge>
                    {s.overdue > 0 && <Badge variant="destructive" className="shrink-0 text-[10px]">{s.overdue} en retard</Badge>}
                    <span className="w-24 shrink-0 text-right text-xs text-muted-foreground">{s.done}/{s.total} · {s.completionRate ?? 0}%</span>
                  </button>
                  <div className="px-3 pb-2"><Progress value={s.completionRate ?? 0} className="h-1" /></div>
                  {isOpen && (
                    <ul className="divide-y divide-border border-t border-border text-sm">
                      {remaining.length === 0 && <li className="px-3 py-2 text-xs text-muted-foreground">Toutes les tâches de ce projet sont terminées.</li>}
                      {remaining.slice(0, 15).map((t) => {
                        const late = isTaskOverdue(t, today);
                        return (
                          <li key={t.id} className="flex items-center justify-between gap-2 px-3 py-2">
                            <span className="min-w-0 truncate">{t.title}</span>
                            <span className={`shrink-0 text-xs ${late ? "font-semibold text-destructive" : "text-muted-foreground"}`}>{t.due_date ? fmt(t.due_date) : "Sans date"}</span>
                          </li>
                        );
                      })}
                      {remaining.length > 15 && (
                        <li className="px-3 py-2 text-xs"><Link to={agendaLink} className="text-primary hover:underline">Voir les {remaining.length} tâches restantes dans l'Agenda</Link></li>
                      )}
                      <li className="px-3 py-2 text-xs"><Link to={`/projets/${project.id}`} className="text-primary hover:underline">Ouvrir le projet</Link></li>
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="space-y-2">
          <p className="flex items-center gap-2 text-sm font-semibold"><Trophy className="h-4 w-4 text-primary" /> Projets terminés ({finished.length})</p>
          {finished.length === 0 ? (
            <p className="text-xs text-muted-foreground">Aucun projet terminé pour ce client pour le moment.</p>
          ) : (
            <ul className="divide-y divide-border rounded-lg border border-border text-sm">
              {finished.map(({ project, stats: s }) => (
                <li key={project.id} className="flex items-center justify-between gap-2 px-3 py-2">
                  <Link to={`/projets/${project.id}`} className="flex min-w-0 items-center gap-2 hover:text-primary">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-success" /><span className="truncate">{project.name}</span>
                  </Link>
                  <span className="shrink-0 text-xs text-muted-foreground">Terminé le {fmt(project.updated_at)} · {s.done}/{s.total} tâches</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
