import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Activity, Award, CheckCircle2, Download, Gauge, LifeBuoy, Loader2,
  MessageSquare, Search, Target, TrendingUp, Users,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  agent_master: "Agent Master",
  agent_telephonique: "Agent tél.",
  agent_support: "Agent Support",
  commercial_terrain: "Commercial",
  webmaster: "Webmaster",
  designer: "Designer",
};

const PERIODS = [
  { value: "7", label: "7 derniers jours" },
  { value: "30", label: "30 derniers jours" },
  { value: "90", label: "3 derniers mois" },
  { value: "365", label: "12 derniers mois" },
  { value: "all", label: "Depuis le début" },
];

type MemberStats = {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  roles: string[];
  tasksDone: number;
  tasksOpen: number;
  tasksLate: number;
  projects: number;
  projectsDone: number;
  activities: number;
  notes: number;
  tickets: number;
  ticketsResolved: number;
  prospects: number;
  prospectsConverted: number;
  clientsCreated: number;
  gmbActions: number;
  lastActivityAt: number | null;
  score: number;
};

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } };

export default function Performance() {
  const { hasRole } = useAuth();
  const isAllowed = hasRole("admin") || hasRole("agent_master");
  const [period, setPeriod] = useState("30");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [sortBy, setSortBy] = useState<keyof MemberStats>("score");

  const since = useMemo(() => {
    if (period === "all") return null;
    const d = new Date();
    d.setDate(d.getDate() - Number(period));
    return d.toISOString();
  }, [period]);

  const { data, isLoading } = useQuery({
    queryKey: ["team-performance", period],
    queryFn: async () => {
      const range = <T,>(q: any): Promise<T[]> => q.then((r: any) => (r.data || []) as T[]);
      const gte = (q: any, col: string) => (since ? q.gte(col, since) : q);

      const [profiles, roles, tasks, projects, activities, notes, tickets, prospects, clients, gmb] =
        await Promise.all([
          range<any>(supabase.from("profiles").select("user_id, full_name, avatar_url")),
          range<any>(supabase.from("user_roles").select("user_id, role")),
          range<any>(
            gte(supabase.from("project_tasks").select("assigned_to, status, due_date, updated_at"), "updated_at")
          ),
          range<any>(gte(supabase.from("projects").select("assigned_to, status, updated_at"), "updated_at")),
          range<any>(
            gte(supabase.from("client_activities").select("user_id, created_at"), "created_at")
          ),
          range<any>(gte(supabase.from("module_notes").select("user_id, created_at"), "created_at")),
          range<any>(
            gte(
              supabase.from("support_tickets").select("assigned_to, resolved_by, status, created_at, updated_at"),
              "updated_at"
            )
          ),
          range<any>(gte(supabase.from("prospects").select("assigned_to, status, updated_at"), "updated_at")),
          range<any>(gte(supabase.from("clients").select("created_by, created_at"), "created_at")),
          range<any>(
            gte(supabase.from("gmb_activities").select("performed_by, performed_at"), "performed_at")
          ),
        ]);

      const rolesByUser = new Map<string, string[]>();
      roles.forEach((r) => {
        rolesByUser.set(r.user_id, [...(rolesByUser.get(r.user_id) || []), r.role]);
      });

      const members: MemberStats[] = profiles
        .filter((p) => rolesByUser.has(p.user_id))
        .map((p) => {
          const uid = p.user_id;
          const myTasks = tasks.filter((t) => t.assigned_to === uid);
          const tasksDone = myTasks.filter((t) => t.status === "termine").length;
          const tasksOpen = myTasks.filter((t) => t.status !== "termine").length;
          const tasksLate = myTasks.filter(
            (t) => t.status !== "termine" && t.due_date && new Date(t.due_date) < new Date()
          ).length;
          const myProjects = projects.filter((pr) => pr.assigned_to === uid);
          const myActivities = activities.filter((a) => a.user_id === uid);
          const myNotes = notes.filter((n) => n.user_id === uid);
          const myTickets = tickets.filter((t) => t.assigned_to === uid || t.resolved_by === uid);
          const myProspects = prospects.filter((pr) => pr.assigned_to === uid);
          const myClients = clients.filter((c) => c.created_by === uid);
          const myGmb = gmb.filter((g) => g.performed_by === uid);

          const timestamps = [
            ...myActivities.map((a) => new Date(a.created_at).getTime()),
            ...myNotes.map((n) => new Date(n.created_at).getTime()),
            ...myTasks.map((t) => new Date(t.updated_at).getTime()),
            ...myGmb.map((g) => new Date(g.performed_at).getTime()),
          ];

          const score =
            tasksDone * 4 +
            myProjects.filter((pr) => pr.status === "termine").length * 8 +
            myActivities.length * 1 +
            myNotes.length * 1 +
            myTickets.filter((t) => t.status === "resolu" || t.status === "ferme").length * 3 +
            myProspects.filter((pr) => pr.status === "converti").length * 6 +
            myClients.length * 5 +
            myGmb.length * 2 -
            tasksLate * 2;

          return {
            user_id: uid,
            full_name: p.full_name || "Sans nom",
            avatar_url: p.avatar_url ?? null,
            roles: rolesByUser.get(uid) || [],
            tasksDone,
            tasksOpen,
            tasksLate,
            projects: myProjects.length,
            projectsDone: myProjects.filter((pr) => pr.status === "termine").length,
            activities: myActivities.length,
            notes: myNotes.length,
            tickets: myTickets.length,
            ticketsResolved: myTickets.filter((t) => t.status === "resolu" || t.status === "ferme").length,
            prospects: myProspects.length,
            prospectsConverted: myProspects.filter((pr) => pr.status === "converti").length,
            clientsCreated: myClients.length,
            gmbActions: myGmb.length,
            lastActivityAt: timestamps.length ? Math.max(...timestamps) : null,
            score: Math.max(0, score),
          };
        });

      return members;
    },
    enabled: isAllowed,
  });

  const members = useMemo(() => {
    let list = data || [];
    if (roleFilter !== "all") list = list.filter((m) => m.roles.includes(roleFilter));
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((m) => m.full_name.toLowerCase().includes(q));
    }
    return [...list].sort((a, b) => Number(b[sortBy] ?? 0) - Number(a[sortBy] ?? 0));
  }, [data, roleFilter, search, sortBy]);

  const maxScore = Math.max(1, ...members.map((m) => m.score));

  const totals = useMemo(
    () =>
      members.reduce(
        (acc, m) => ({
          tasksDone: acc.tasksDone + m.tasksDone,
          tasksLate: acc.tasksLate + m.tasksLate,
          activities: acc.activities + m.activities,
          ticketsResolved: acc.ticketsResolved + m.ticketsResolved,
          converted: acc.converted + m.prospectsConverted,
        }),
        { tasksDone: 0, tasksLate: 0, activities: 0, ticketsResolved: 0, converted: 0 }
      ),
    [members]
  );

  const exportCSV = () => {
    const headers = [
      "Membre", "Rôles", "Score", "Tâches terminées", "Tâches en cours", "Tâches en retard",
      "Projets", "Projets terminés", "Activités", "Notes", "Tickets", "Tickets résolus",
      "Prospects", "Prospects convertis", "Clients créés", "Actions GMB",
    ];
    const rows = members.map((m) => [
      m.full_name, m.roles.map((r) => ROLE_LABELS[r] || r).join(" / "), m.score,
      m.tasksDone, m.tasksOpen, m.tasksLate, m.projects, m.projectsDone, m.activities,
      m.notes, m.tickets, m.ticketsResolved, m.prospects, m.prospectsConverted,
      m.clientsCreated, m.gmbActions,
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";"))
      .join("\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `performance-equipe-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isAllowed) return <Navigate to="/" replace />;

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item} className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Gauge className="w-8 h-8 text-primary" />
            Suivi de l'équipe
          </h1>
          <p className="text-muted-foreground mt-1">
            Progression, charge de travail et productivité de chaque membre
          </p>
        </div>
        <Button variant="outline" onClick={exportCSV} className="gap-2">
          <Download className="w-4 h-4" /> Exporter CSV
        </Button>
      </motion.div>

      {/* Filters */}
      <motion.div variants={item} className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un membre..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[190px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {PERIODS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[170px]"><SelectValue placeholder="Rôle" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les rôles</SelectItem>
            {Object.entries(ROLE_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as keyof MemberStats)}>
          <SelectTrigger className="w-[190px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="score">Trier par score</SelectItem>
            <SelectItem value="tasksDone">Tâches terminées</SelectItem>
            <SelectItem value="tasksLate">Tâches en retard</SelectItem>
            <SelectItem value="activities">Activités</SelectItem>
            <SelectItem value="ticketsResolved">Tickets résolus</SelectItem>
            <SelectItem value="prospectsConverted">Prospects convertis</SelectItem>
          </SelectContent>
        </Select>
      </motion.div>

      {/* KPIs */}
      <motion.div variants={item} className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: "Membres suivis", value: members.length, icon: Users, color: "text-violet-600" },
          { label: "Tâches terminées", value: totals.tasksDone, icon: CheckCircle2, color: "text-emerald-600" },
          { label: "Tâches en retard", value: totals.tasksLate, icon: Target, color: "text-rose-600" },
          { label: "Actions/activités", value: totals.activities, icon: Activity, color: "text-blue-600" },
          { label: "Tickets résolus", value: totals.ticketsResolved, icon: LifeBuoy, color: "text-amber-600" },
        ].map((kpi) => (
          <Card key={kpi.label} className="border-0 shadow-md shadow-primary/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
                <span className="text-2xl font-bold">{kpi.value}</span>
              </div>
              <p className="text-xs text-muted-foreground">{kpi.label}</p>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-7 h-7 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Ranking cards */}
          <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {members.slice(0, 6).map((m, idx) => (
              <Card key={m.user_id} className="border-0 shadow-md shadow-primary/5">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Avatar className="w-11 h-11">
                          <AvatarImage src={m.avatar_url || undefined} />
                          <AvatarFallback>{m.full_name.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        {idx === 0 && sortBy === "score" && (
                          <Award className="w-4 h-4 text-amber-500 absolute -top-1 -right-1" />
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{m.full_name}</p>
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {m.roles.map((r) => (
                            <Badge key={r} variant="outline" className="text-[10px]">
                              {ROLE_LABELS[r] || r}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-primary">{m.score}</p>
                      <p className="text-[10px] text-muted-foreground">score</p>
                    </div>
                  </div>

                  <Progress value={(m.score / maxScore) * 100} className="h-2" />

                  <div className="grid grid-cols-4 gap-2 text-center">
                    {[
                      { v: m.tasksDone, l: "Tâches OK", c: "text-emerald-600" },
                      { v: m.tasksOpen, l: "En cours", c: "text-blue-600" },
                      { v: m.tasksLate, l: "Retard", c: "text-rose-600" },
                      { v: m.activities + m.notes, l: "Échanges", c: "text-violet-600" },
                    ].map((s) => (
                      <div key={s.l} className="p-2 rounded-lg bg-muted/30">
                        <p className={`text-base font-bold ${s.c}`}>{s.v}</p>
                        <p className="text-[10px] text-muted-foreground">{s.l}</p>
                      </div>
                    ))}
                  </div>

                  <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                    <MessageSquare className="w-3 h-3" />
                    {m.lastActivityAt
                      ? `Dernière action ${formatDistanceToNow(new Date(m.lastActivityAt), { addSuffix: true, locale: fr })}`
                      : "Aucune action sur la période"}
                  </p>
                </CardContent>
              </Card>
            ))}
          </motion.div>

          {/* Detailed table */}
          <motion.div variants={item}>
            <Card className="border-0 shadow-md shadow-primary/5">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  Détail par membre
                </CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Membre</TableHead>
                      <TableHead className="text-center">Score</TableHead>
                      <TableHead className="text-center">Tâches OK</TableHead>
                      <TableHead className="text-center">En cours</TableHead>
                      <TableHead className="text-center">Retard</TableHead>
                      <TableHead className="text-center">Projets</TableHead>
                      <TableHead className="text-center">Activités</TableHead>
                      <TableHead className="text-center">Notes</TableHead>
                      <TableHead className="text-center">Tickets résolus</TableHead>
                      <TableHead className="text-center">Prospects conv.</TableHead>
                      <TableHead className="text-center">Clients créés</TableHead>
                      <TableHead className="text-center">GMB</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {members.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={12} className="text-center text-muted-foreground py-8">
                          Aucun membre trouvé
                        </TableCell>
                      </TableRow>
                    ) : (
                      members.map((m) => (
                        <TableRow key={m.user_id}>
                          <TableCell className="font-medium whitespace-nowrap">{m.full_name}</TableCell>
                          <TableCell className="text-center font-bold text-primary">{m.score}</TableCell>
                          <TableCell className="text-center">{m.tasksDone}</TableCell>
                          <TableCell className="text-center">{m.tasksOpen}</TableCell>
                          <TableCell className="text-center">
                            {m.tasksLate > 0 ? (
                              <Badge className="bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">
                                {m.tasksLate}
                              </Badge>
                            ) : (
                              0
                            )}
                          </TableCell>
                          <TableCell className="text-center">{m.projectsDone}/{m.projects}</TableCell>
                          <TableCell className="text-center">{m.activities}</TableCell>
                          <TableCell className="text-center">{m.notes}</TableCell>
                          <TableCell className="text-center">{m.ticketsResolved}/{m.tickets}</TableCell>
                          <TableCell className="text-center">{m.prospectsConverted}/{m.prospects}</TableCell>
                          <TableCell className="text-center">{m.clientsCreated}</TableCell>
                          <TableCell className="text-center">{m.gmbActions}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </motion.div>
        </>
      )}
    </motion.div>
  );
}
