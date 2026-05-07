import { useMemo, useState, useEffect } from "react";
import { useProjects } from "@/hooks/use-projects";
import { useAuth } from "@/contexts/AuthContext";
import { PROJECT_STATUS_LABELS, PROJECT_STATUS_COLORS, PACK_LABELS } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Briefcase, Clock, AlertTriangle, CheckCircle2, Calendar,
  Building2, Loader2, TrendingUp, Globe, CreditCard, UserCircle, ListTodo,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0, 0, 0.2, 1] as const } },
};

function daysUntil(dateStr: string | null) {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

function DeadlineBadge({ dueDate }: { dueDate: string | null }) {
  const days = daysUntil(dueDate);
  if (days === null) return <span className="text-xs text-muted-foreground">—</span>;
  if (days < 0)
    return (
      <Badge variant="destructive" className="text-[10px] gap-1">
        <AlertTriangle className="w-3 h-3" />
        {Math.abs(days)}j retard
      </Badge>
    );
  if (days <= 3)
    return (
      <Badge className="text-[10px] bg-warning/10 text-warning border-warning/20 gap-1" variant="outline">
        <Clock className="w-3 h-3" />
        {days}j
      </Badge>
    );
  return (
    <span className="text-[10px] text-success flex items-center gap-1">
      <Calendar className="w-3 h-3" /> {days}j
    </span>
  );
}

function ProjectRow({ project, tasks, navigate }: { project: any; tasks: any[]; navigate: any }) {
  const projectTasks = tasks.filter((t) => t.project_id === project.id);
  const done = projectTasks.filter((t) => t.status === "termine").length;
  const total = projectTasks.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : (project.progress || 0);

  return (
    <div
      className="flex items-center gap-4 cursor-pointer hover:bg-muted/60 rounded-xl p-3 -mx-1 transition-colors"
      onClick={() => navigate(`/projets/${project.id}`)}
    >
      <div className="w-10 h-10 rounded-xl bg-primary/8 flex items-center justify-center shrink-0">
        <Building2 className="w-4 h-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium truncate">{project.name}</p>
          <div className="flex items-center gap-1.5 shrink-0">
            {project.status === "en_attente" && (
              <Badge className="text-[10px] font-bold bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-0 animate-pulse shadow-lg shadow-emerald-500/30">
                ✨ NOUVEAU
              </Badge>
            )}
            <Badge className={`text-[11px] border ${PROJECT_STATUS_COLORS[project.status as keyof typeof PROJECT_STATUS_COLORS]}`} variant="outline">
              {PROJECT_STATUS_LABELS[project.status as keyof typeof PROJECT_STATUS_LABELS]}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>{project.clients?.company_name}</span>
          <span>•</span>
          <span>{PACK_LABELS[project.pack_type as keyof typeof PACK_LABELS]}</span>
          <span>•</span>
          <span>{done}/{total} tâches</span>
        </div>
        <div className="flex items-center gap-3">
          <Progress value={pct} className="h-1.5 flex-1" />
          <span className="text-xs font-semibold tabular-nums w-8 text-right">{pct}%</span>
          <DeadlineBadge dueDate={project.due_date} />
        </div>
      </div>
    </div>
  );
}

// ===== Team Member Card =====
interface MemberStats {
  userId: string;
  name: string;
  totalTasks: number;
  doneTasks: number;
  overdueTasks: number;
  inProgressTasks: number;
  projects: { id: string; name: string; client: string; progress: number; dueDate: string | null; status: string }[];
}

function TeamMemberCard({ member, navigate }: { member: MemberStats; navigate: any }) {
  const pct = member.totalTasks > 0 ? Math.round((member.doneTasks / member.totalTasks) * 100) : 0;
  const initials = member.name ? member.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) : "?";

  return (
    <Card className="border-border/40 shadow-soft hover:shadow-medium transition-all">
      <CardContent className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <Avatar className="w-10 h-10">
            <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">{member.name || "Sans nom"}</p>
            <p className="text-[11px] text-muted-foreground">{member.projects.length} projet{member.projects.length > 1 ? "s" : ""}</p>
          </div>
          <span className="text-2xl font-bold text-primary tabular-nums">{pct}%</span>
        </div>

        {/* Progress bar */}
        <Progress value={pct} className="h-2 mb-3" />

        {/* Task summary */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <p className="text-lg font-bold tabular-nums">{member.totalTasks}</p>
            <p className="text-[10px] text-muted-foreground">Total</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-success/5">
            <p className="text-lg font-bold text-success tabular-nums">{member.doneTasks}</p>
            <p className="text-[10px] text-muted-foreground">Fait</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-primary/5">
            <p className="text-lg font-bold text-primary tabular-nums">{member.inProgressTasks}</p>
            <p className="text-[10px] text-muted-foreground">En cours</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-destructive/5">
            <p className="text-lg font-bold text-destructive tabular-nums">{member.overdueTasks}</p>
            <p className="text-[10px] text-muted-foreground">Retard</p>
          </div>
        </div>

        {/* Projects list */}
        {member.projects.length > 0 && (
          <div className="space-y-2 border-t border-border/50 pt-3">
            {member.projects.slice(0, 4).map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-2 text-xs cursor-pointer hover:bg-muted/40 rounded-lg p-1.5 -mx-1 transition-colors"
                onClick={() => navigate(`/projets/${p.id}`)}
              >
                <div className="flex-1 min-w-0 truncate font-medium">{p.client}</div>
                <Progress value={p.progress} className="w-16 h-1" />
                <DeadlineBadge dueDate={p.dueDate} />
              </div>
            ))}
            {member.projects.length > 4 && (
              <p className="text-[10px] text-muted-foreground text-center">+{member.projects.length - 4} autres</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function WebmasterDashboard() {
  const navigate = useNavigate();
  const { data: projects, isLoading } = useProjects();
  const { user, hasRole } = useAuth();
  const isAdmin = hasRole("admin");
  const [filterUser, setFilterUser] = useState<string>("__pending__");
  const [activeTab, setActiveTab] = useState("team");

  // Auto-set filter: non-admins see only their own projects by default
  useEffect(() => {
    if (filterUser === "__pending__") {
      setFilterUser(isAdmin ? "all" : (user?.id || "all"));
    }
  }, [isAdmin, user, filterUser]);

  const { data: teamMembers } = useQuery({
    queryKey: ["all_profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("user_id, full_name");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: allTasks } = useQuery({
    queryKey: ["all_project_tasks_full"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_tasks")
        .select("project_id, status, created_at, updated_at, assigned_to, due_date, title")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const filteredProjects = useMemo(() => {
    if (!projects) return [];
    if (filterUser === "all") return projects;
    return projects.filter((p: any) => p.assigned_to === filterUser || p.created_by === filterUser);
  }, [projects, filterUser]);

  const filteredTasks = useMemo(() => {
    if (!allTasks) return [];
    if (filterUser === "all") return allTasks;
    const userProjectIds = new Set(filteredProjects.map((p: any) => p.id));
    return allTasks.filter((t) => t.assigned_to === filterUser || userProjectIds.has(t.project_id));
  }, [allTasks, filterUser, filteredProjects]);

  const activeMembers = useMemo(() => {
    if (!teamMembers || !projects) return [];
    const userIds = new Set<string>();
    projects.forEach((p: any) => {
      if (p.assigned_to) userIds.add(p.assigned_to);
      if (p.created_by) userIds.add(p.created_by);
    });
    // Also include users who have tasks assigned
    allTasks?.forEach((t) => {
      if (t.assigned_to) userIds.add(t.assigned_to);
    });
    return teamMembers.filter((m) => userIds.has(m.user_id));
  }, [teamMembers, projects, allTasks]);

  // Build per-member stats
  const memberStats = useMemo<MemberStats[]>(() => {
    if (!teamMembers || !projects || !allTasks) return [];
    const now = new Date();

    return activeMembers.map((m) => {
      const memberTasks = allTasks.filter((t) => t.assigned_to === m.user_id);
      const memberProjectIds = new Set([
        ...memberTasks.map((t) => t.project_id),
        ...projects.filter((p: any) => p.assigned_to === m.user_id).map((p: any) => p.id),
      ]);

      const memberProjects = projects
        .filter((p: any) => memberProjectIds.has(p.id))
        .filter((p: any) => p.status !== "annule" && p.status !== "termine" && (p.progress || 0) < 90)
        .map((p: any) => {
          const pTasks = allTasks.filter((t) => t.project_id === p.id);
          const done = pTasks.filter((t) => t.status === "termine").length;
          const total = pTasks.length;
          return {
            id: p.id,
            name: p.name,
            client: p.clients?.company_name || "—",
            progress: total > 0 ? Math.round((done / total) * 100) : 0,
            dueDate: p.due_date,
            status: p.status,
          };
        })
        .sort((a, b) => (daysUntil(a.dueDate) ?? 999) - (daysUntil(b.dueDate) ?? 999));

      return {
        userId: m.user_id,
        name: m.full_name || "Sans nom",
        totalTasks: memberTasks.length,
        doneTasks: memberTasks.filter((t) => t.status === "termine").length,
        inProgressTasks: memberTasks.filter((t) => t.status === "en_cours").length,
        overdueTasks: memberTasks.filter((t) => {
          if (t.status === "termine") return false;
          const proj: any = projects.find((p: any) => p.id === t.project_id);
          if (!proj || ["termine", "annule"].includes(proj.status) || (proj.progress || 0) >= 90) return false;
          const d = t.due_date ? Math.ceil((new Date(t.due_date).getTime() - now.getTime()) / 86400000) : null;
          return d !== null && d < 0;
        }).length,
        projects: memberProjects,
      };
    }).filter((m) => m.totalTasks > 0 || m.projects.length > 0)
      .sort((a, b) => b.totalTasks - a.totalTasks);
  }, [activeMembers, projects, allTasks, teamMembers]);

  // Split projects by type
  const webProjects = useMemo(() =>
    filteredProjects.filter((p: any) => p.pack_type === "star_bizness_numerik" || p.pack_type === "autre"),
  [filteredProjects]);

  const nfcProjects = useMemo(() =>
    filteredProjects.filter((p: any) => p.pack_type === "star_bizness_nfc"),
  [filteredProjects]);

  const getActiveForList = (list: any[]) => list.filter((p: any) => p.status === "en_cours" || p.status === "en_revision");
  const getOverdue = (list: any[]) => list.filter((p: any) => {
    const d = daysUntil(p.due_date);
    return d !== null && d < 0 && p.status !== "termine" && p.status !== "annule" && (p.progress || 0) < 90;
  });

  const weeklyData = useMemo(() => {
    if (!filteredTasks.length) return [];
    const now = new Date();
    const weeks: { label: string; start: Date; end: Date }[] = [];
    for (let i = 7; i >= 0; i--) {
      const end = new Date(now.getTime() - i * 7 * 86400000);
      const start = new Date(end.getTime() - 7 * 86400000);
      const label = `${start.getDate().toString().padStart(2, "0")}/${(start.getMonth() + 1).toString().padStart(2, "0")}`;
      weeks.push({ label, start, end });
    }
    return weeks.map((w) => ({
      semaine: w.label,
      créées: filteredTasks.filter((t) => { const d = new Date(t.created_at); return d >= w.start && d < w.end; }).length,
      terminées: filteredTasks.filter((t) => { if (t.status !== "termine") return false; const d = new Date(t.updated_at); return d >= w.start && d < w.end; }).length,
    }));
  }, [filteredTasks]);

  const statusDistribution = useMemo(() => {
    if (!filteredTasks.length) return [];
    const counts: Record<string, number> = {};
    filteredTasks.forEach((t) => { counts[t.status] = (counts[t.status] || 0) + 1; });
    const statusLabels: Record<string, string> = { a_faire: "À faire", en_cours: "En cours", en_revision: "En révision", termine: "Terminé" };
    return Object.entries(counts).map(([status, count]) => ({ name: statusLabels[status] || status, value: count }));
  }, [filteredTasks]);

  const PIE_COLORS = ["hsl(var(--muted-foreground))", "hsl(var(--primary))", "hsl(var(--warning))", "hsl(var(--success))"];

  const activeProjects = filteredProjects.filter((p: any) => p.status === "en_cours" || p.status === "en_revision");
  const overdueProjects = getOverdue(filteredProjects);
  const urgentProjects = activeProjects.filter((p: any) => { const d = daysUntil(p.due_date); return d !== null && d >= 0 && d <= 3; });
  const completedProjects = filteredProjects.filter((p: any) => p.status === "termine");

  const stats = [
    { title: "Projets actifs", value: activeProjects.length, icon: Briefcase, gradient: "from-primary to-primary/70" },
    { title: "En retard", value: overdueProjects.length, icon: AlertTriangle, gradient: "from-destructive to-destructive/70" },
    { title: "Urgents (≤3j)", value: urgentProjects.length, icon: Clock, gradient: "from-warning to-warning/70" },
    { title: "Terminés", value: completedProjects.length, icon: CheckCircle2, gradient: "from-success to-success/70" },
  ];

  const sortByDeadline = (list: any[]) => [...list].sort((a: any, b: any) => (daysUntil(a.due_date) ?? 999) - (daysUntil(b.due_date) ?? 999));

  const renderProjectList = (projectList: any[], label: string) => {
    const active = sortByDeadline(getActiveForList(projectList));
    return (
      <Card className="border-0 shadow-soft">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold">{label} ({active.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {active.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">Aucun projet en cours</p>
          ) : (
            <div className="space-y-3">
              {active.map((project: any) => (
                <ProjectRow key={project.id} project={project} tasks={filteredTasks} navigate={navigate} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <motion.div className="space-y-8" variants={container} initial="hidden" animate="show">
      <motion.div variants={item} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tableau de bord Webmaster</h1>
          <p className="text-muted-foreground mt-1 text-sm">Vue d'ensemble des projets, tâches et équipes</p>
        </div>
        <Select value={filterUser} onValueChange={setFilterUser}>
          <SelectTrigger className="w-[220px]"><SelectValue placeholder="Filtrer par membre" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les membres</SelectItem>
            {activeMembers.map((m) => (
              <SelectItem key={m.user_id} value={m.user_id}>{m.full_name || "Sans nom"}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <motion.div key={stat.title} variants={item}>
            <Card className="border-border/40 shadow-soft">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{stat.title}</span>
                  <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center`}>
                    <stat.icon className="w-4 h-4 text-primary-foreground" />
                  </div>
                </div>
                <p className="text-3xl font-bold tracking-tight">{stat.value}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Main content tabs */}
      <motion.div variants={item}>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="team" className="gap-2"><UserCircle className="w-4 h-4" /> Suivi équipe</TabsTrigger>
            <TabsTrigger value="all" className="gap-2"><Briefcase className="w-4 h-4" /> Tous les projets</TabsTrigger>
            <TabsTrigger value="web" className="gap-2"><Globe className="w-4 h-4" /> Web</TabsTrigger>
            <TabsTrigger value="nfc" className="gap-2"><CreditCard className="w-4 h-4" /> NFC</TabsTrigger>
            <TabsTrigger value="charts" className="gap-2"><TrendingUp className="w-4 h-4" /> Statistiques</TabsTrigger>
          </TabsList>

          {/* Team tab */}
          <AnimatePresence mode="wait">
            <TabsContent value="team" className="mt-0">
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25 }}
              >
                {memberStats.length === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="py-16 text-center">
                      <UserCircle className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">Aucune tâche assignée pour le moment</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {memberStats.map((member, idx) => (
                      <motion.div
                        key={member.userId}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.06 }}
                      >
                        <TeamMemberCard member={member} navigate={navigate} />
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            </TabsContent>

            <TabsContent value="all">
              {renderProjectList(filteredProjects, "Tous les projets en cours")}
            </TabsContent>
            <TabsContent value="web">
              {renderProjectList(webProjects, "Projets Web (Site Internet)")}
            </TabsContent>
            <TabsContent value="nfc">
              {renderProjectList(nfcProjects, "Projets Carte BIZNESS NFC")}
            </TabsContent>

            {/* Charts tab */}
            <TabsContent value="charts">
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className="space-y-6"
              >
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <Card className="border-border/40 shadow-soft lg:col-span-2">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-primary" />
                        Activité hebdomadaire (8 semaines)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[260px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={weeklyData} barGap={4}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis dataKey="semaine" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                            <Bar dataKey="créées" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="terminées" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="flex items-center justify-center gap-6 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-primary" /> Créées</span>
                        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-success" /> Terminées</span>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-border/40 shadow-soft h-full">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base font-semibold">Répartition tâches</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[260px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={statusDistribution} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                              {statusDistribution.map((_, i) => (<Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />))}
                            </Pie>
                            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </motion.div>
            </TabsContent>
          </AnimatePresence>
        </Tabs>
      </motion.div>

      {/* Overdue alert */}
      {overdueProjects.length > 0 && (
        <motion.div variants={item}>
          <Card className="border-destructive/30 bg-destructive/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-destructive flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Projets en retard ({overdueProjects.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {overdueProjects.map((p: any) => (
                <div key={p.id} className="flex items-center justify-between cursor-pointer hover:bg-destructive/5 rounded-lg p-2 transition-colors" onClick={() => navigate(`/projets/${p.id}`)}>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.clients?.company_name}</p>
                  </div>
                  <DeadlineBadge dueDate={p.due_date} />
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Pending projects */}
      {filteredProjects.filter((p: any) => p.status === "en_attente").length > 0 && (
        <motion.div variants={item}>
          <Card className="border-0 shadow-soft">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold text-muted-foreground">
                En attente ({filteredProjects.filter((p: any) => p.status === "en_attente").length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {filteredProjects.filter((p: any) => p.status === "en_attente").map((project: any) => (
                  <ProjectRow key={project.id} project={project} tasks={filteredTasks} navigate={navigate} />
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
}
