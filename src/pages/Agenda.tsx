import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CalendarCheck, CheckCircle2, Circle, Search, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { useOpenTasks, useSetTaskStatus, type AgendaTask } from "@/hooks/use-tasks-agenda";
import { useTeamMembers } from "@/hooks/use-team-comments";
import { AGENDA_BUCKETS, agendaBucket, reunionToday, type AgendaBucket } from "@/lib/task-tracking";

const STEP = 40;
const PRIORITY: Record<string, string> = { haute: "Haute", urgente: "Urgente", high: "Haute", urgent: "Urgente" };
const fmtDay = (d: string) =>
  new Date(`${d}T00:00:00`).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

export default function Agenda() {
  const { user, hasRole } = useAuth();
  const isManager = hasRole("admin") || hasRole("agent_master");
  const { data: tasks, isLoading } = useOpenTasks();
  const { data: members } = useTeamMembers();
  const setStatus = useSetTaskStatus();
  const [who, setWho] = useState<string>(isManager ? "all" : "me");
  // Roles may load after the first render: managers default to the whole team.
  const touched = useRef(false);
  useEffect(() => { if (!touched.current) setWho(isManager ? "all" : "me"); }, [isManager]);
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("q") || "");
  const [shown, setShown] = useState<Record<string, number>>({});
  const [pending, setPending] = useState<Set<string>>(new Set());
  const today = reunionToday();

  const nameOf = (id: string | null) => (id ? members?.find((m) => m.user_id === id)?.full_name || "Membre" : "Sans responsable");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (tasks || []).filter((t) => {
      if (who === "me" && t.assigned_to !== user?.id) return false;
      if (who === "none" && t.assigned_to) return false;
      if (!["all", "me", "none"].includes(who) && t.assigned_to !== who) return false;
      if (q && ![t.title, t.client_name, t.client_ndi, t.project_name].filter(Boolean).join(" ").toLowerCase().includes(q)) return false;
      return true;
    });
  }, [tasks, who, search, user?.id]);

  const buckets = useMemo(() => {
    const out = Object.fromEntries(AGENDA_BUCKETS.map((b) => [b.id, [] as AgendaTask[]])) as Record<AgendaBucket, AgendaTask[]>;
    filtered.forEach((t) => out[agendaBucket(t.due_date, today)].push(t));
    out.retard.sort((a, b) => (b.due_date || "").localeCompare(a.due_date || ""));
    return out;
  }, [filtered, today]);

  const assignees = useMemo(() => {
    const ids = new Set((tasks || []).map((t) => t.assigned_to).filter(Boolean) as string[]);
    return Array.from(ids).map((id) => ({ id, name: nameOf(id) })).sort((a, b) => a.name.localeCompare(b.name));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, members]);

  const complete = async (t: AgendaTask) => {
    setPending((p) => new Set(p).add(t.id));
    try {
      await setStatus.mutateAsync({ id: t.id, status: "termine" });
      toast.success(`« ${t.title} » terminée`, {
        action: {
          label: "Annuler",
          onClick: () => setStatus.mutate({ id: t.id, status: t.status }, { onError: () => toast.error("Impossible d'annuler") }),
        },
      });
    } catch (e: any) {
      toast.error(e?.message === "not-allowed" ? "Vous n'avez pas le droit de modifier cette tâche" : "Erreur lors de la mise à jour");
    } finally {
      setPending((p) => { const n = new Set(p); n.delete(t.id); return n; });
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <CalendarCheck className="h-6 w-6 text-primary" /> Agenda
        </h1>
        <p className="text-sm text-muted-foreground">Toutes les tâches à faire, classées par date. Cochez une tâche pour la marquer comme terminée.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {AGENDA_BUCKETS.map((b) => (
          <button key={b.id} onClick={() => document.getElementById(`agenda-${b.id}`)?.scrollIntoView({ behavior: "smooth" })}
            className={`rounded-xl border p-3 text-left transition-colors hover:border-primary/50 ${b.id === "retard" && buckets.retard.length ? "border-destructive/40 bg-destructive/5" : "border-border bg-card"}`}>
            <p className={`text-2xl font-bold ${b.id === "retard" && buckets.retard.length ? "text-destructive" : ""}`}>{buckets[b.id].length}</p>
            <p className="text-xs text-muted-foreground">{b.label}</p>
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3 md:flex-row">
        <Select value={who} onValueChange={(v) => { touched.current = true; setWho(v); }}>
          <SelectTrigger className="md:w-60"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="me">Mes tâches</SelectItem>
            <SelectItem value="all">Toute l'équipe</SelectItem>
            <SelectItem value="none">Sans responsable</SelectItem>
            {assignees.filter((a) => a.id !== user?.id).map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher une tâche, un client ou un projet…" className="pl-9" />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
      ) : (
        AGENDA_BUCKETS.filter((b) => buckets[b.id].length > 0).map((b) => {
          const list = buckets[b.id];
          const limit = shown[b.id] ?? STEP;
          let lastDay: string | null = "__";
          return (
            <Card key={b.id} id={`agenda-${b.id}`} className="scroll-mt-20 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className={`flex items-center gap-2 text-base ${b.id === "retard" ? "text-destructive" : ""}`}>
                  {b.label} <Badge variant={b.id === "retard" ? "destructive" : "secondary"}>{list.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {list.slice(0, limit).map((t) => {
                  const header = t.due_date !== lastDay;
                  lastDay = t.due_date;
                  const busy = pending.has(t.id);
                  return (
                    <div key={t.id}>
                      {header && b.id !== "aujourdhui" && b.id !== "demain" && (
                        <p className="pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground first:pt-0">
                          {t.due_date ? fmtDay(t.due_date) : "Sans date"}
                        </p>
                      )}
                      <div className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-muted/40">
                        <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" aria-label={`Marquer « ${t.title} » comme terminée`}
                          onClick={() => complete(t)} disabled={busy}>
                          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Circle className="h-5 w-5 text-muted-foreground" />}
                        </Button>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{t.title}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {t.client_id ? <Link to={`/clients/${t.client_id}`} className="hover:text-primary">{t.client_name || "Client"}</Link> : "Client"}
                            {" · "}
                            <Link to={`/projets/${t.project_id}`} className="hover:text-primary">{t.project_name || "Projet"}</Link>
                          </p>
                        </div>
                        {t.priority && PRIORITY[t.priority] && <Badge variant="outline" className="hidden shrink-0 sm:inline-flex">{PRIORITY[t.priority]}</Badge>}
                        <span className="hidden w-32 shrink-0 truncate text-right text-xs text-muted-foreground md:block">{nameOf(t.assigned_to)}</span>
                        <Button size="sm" variant="outline" className="shrink-0" onClick={() => complete(t)} disabled={busy}>
                          <CheckCircle2 className="mr-1 h-4 w-4" /> Terminée
                        </Button>
                      </div>
                    </div>
                  );
                })}
                {list.length > limit && (
                  <Button variant="ghost" className="w-full" onClick={() => setShown((s) => ({ ...s, [b.id]: limit + STEP * 2 }))}>
                    Afficher plus ({list.length - limit} restantes)
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })
      )}
      {!isLoading && filtered.length === 0 && (
        <Card className="border-dashed"><CardContent className="py-12 text-center text-sm text-muted-foreground">Aucune tâche à faire 🎉</CardContent></Card>
      )}
    </div>
  );
}
