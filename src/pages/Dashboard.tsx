import { useAuth } from "@/contexts/AuthContext";
import { useClients } from "@/hooks/use-clients";
import { useProspects } from "@/hooks/use-prospects";
import { useProjects } from "@/hooks/use-projects";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, TrendingUp, Radar, Briefcase, ArrowRight, AlertTriangle, Clock, AlertCircle } from "lucide-react";
import { PIPELINE_LABELS, PIPELINE_COLORS, PIPELINE_ORDER, PROJECT_STATUS_LABELS } from "@/lib/constants";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] as const } },
};

function useOverdueProjects() {
  const { data: projects } = useProjects();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (projects || [])
    .filter((p: any) => !["termine", "annule"].includes(p.status))
    .map((p: any) => {
      const createdAt = new Date(p.created_at);
      const maxDeadline = new Date(createdAt);
      maxDeadline.setDate(maxDeadline.getDate() + 15);
      const effectiveDeadline = p.due_date
        ? new Date(Math.min(new Date(p.due_date).getTime(), maxDeadline.getTime()))
        : maxDeadline;
      const daysRemaining = Math.floor(
        (effectiveDeadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );
      let urgency: "overdue" | "critical" | "warning" | "ok" = "ok";
      if (daysRemaining < 0) urgency = "overdue";
      else if (daysRemaining <= 2) urgency = "critical";
      else if (daysRemaining <= 5) urgency = "warning";
      return { ...p, effectiveDeadline, daysRemaining, urgency };
    })
    .filter((p) => p.urgency !== "ok")
    .sort((a, b) => a.daysRemaining - b.daysRemaining);
}

function useOverdueTasks() {
  return useQuery({
    queryKey: ["overdue-tasks-dashboard"],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("project_tasks")
        .select("id, title, due_date, status, project_id")
        .lt("due_date", today)
        .not("status", "eq", "termine");
      if (error) throw error;
      return data || [];
    },
  });
}

const URGENCY_STYLES = {
  overdue: {
    border: "border-l-4 border-l-destructive",
    badge: "bg-destructive/10 text-destructive border-destructive/20",
    icon: AlertCircle,
  },
  critical: {
    border: "border-l-4 border-l-primary",
    badge: "bg-primary/10 text-primary border-primary/20",
    icon: AlertTriangle,
  },
  warning: {
    border: "border-l-4 border-l-warning",
    badge: "bg-warning/10 text-warning border-warning/20",
    icon: Clock,
  },
};

export default function Dashboard() {
  const { profile, roles } = useAuth();
  const { data: clients } = useClients();
  const { data: prospects } = useProspects();
  const { data: projects } = useProjects();
  const navigate = useNavigate();
  const overdueProjects = useOverdueProjects();
  const { data: overdueTasks } = useOverdueTasks();

  const totalClients = clients?.length || 0;
  const totalProspects = prospects?.length || 0;
  const activeProjects = projects?.filter((p: any) => p.status === "en_cours").length || 0;
  const signedContracts = clients?.filter((c) => c.pipeline_status === "contrat_signe").length || 0;
  const conversionRate = totalClients > 0 ? Math.round((signedContracts / totalClients) * 100) : 0;

  const roleLabel = roles.includes("admin")
    ? "Administrateur"
    : roles.includes("commercial_terrain")
    ? "Commercial terrain"
    : roles.includes("agent_telephonique")
    ? "Agent téléphonique"
    : "Utilisateur";

  const stats = [
    { title: "Clients", value: totalClients, icon: Users, color: "text-primary bg-primary/10", path: "/clients" },
    { title: "Prospects", value: totalProspects, icon: Radar, color: "text-info bg-info/10", path: "/prospection" },
    { title: "Projets actifs", value: activeProjects, icon: Briefcase, color: "text-success bg-success/10", path: "/projets" },
    { title: "Conversion", value: `${conversionRate}%`, icon: TrendingUp, color: "text-warning bg-warning/10", path: "/pipeline" },
  ];

  const pipelineSummary = PIPELINE_ORDER.map((status) => ({
    status,
    label: PIPELINE_LABELS[status],
    count: clients?.filter((c) => c.pipeline_status === status).length || 0,
    colors: PIPELINE_COLORS[status],
  }));

  const overdueCount = overdueProjects.filter((p) => p.urgency === "overdue").length;
  const criticalCount = overdueProjects.filter((p) => p.urgency === "critical").length;
  const warningCount = overdueProjects.filter((p) => p.urgency === "warning").length;

  return (
    <motion.div className="space-y-6 max-w-6xl" variants={container} initial="hidden" animate="show">
      <motion.div variants={item}>
        <h1 className="text-2xl font-bold tracking-tight">
          Bonjour, {profile?.full_name?.split(" ")[0] || "là"} 👋
        </h1>
        <p className="text-muted-foreground text-sm">{roleLabel} — Vue d'ensemble</p>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((stat) => (
          <motion.div key={stat.title} variants={item}>
            <Card
              className="border border-border hover:border-primary/30 cursor-pointer transition-all duration-200 group"
              onClick={() => navigate(stat.path)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{stat.title}</span>
                  <div className={`w-8 h-8 rounded-lg ${stat.color} flex items-center justify-center`}>
                    <stat.icon className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-2xl font-bold tracking-tight">{stat.value}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Overdue Projects Alert */}
      {overdueProjects.length > 0 && (
        <motion.div variants={item}>
          <Card className="border border-border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-destructive" />
                  <CardTitle className="text-sm font-semibold">Projets en alerte</CardTitle>
                </div>
                <div className="flex items-center gap-1.5">
                  {overdueCount > 0 && (
                    <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 text-[10px]">
                      {overdueCount} en retard
                    </Badge>
                  )}
                  {criticalCount > 0 && (
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px]">
                      {criticalCount} critique{criticalCount > 1 ? "s" : ""}
                    </Badge>
                  )}
                  {warningCount > 0 && (
                    <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20 text-[10px]">
                      {warningCount} attention
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {overdueProjects.map((project) => {
                const style = URGENCY_STYLES[project.urgency as keyof typeof URGENCY_STYLES];
                const Icon = style.icon;
                const daysText = project.daysRemaining < 0
                  ? `${Math.abs(project.daysRemaining)}j de retard`
                  : project.daysRemaining === 0
                  ? "Deadline aujourd'hui"
                  : `${project.daysRemaining}j restant${project.daysRemaining > 1 ? "s" : ""}`;

                return (
                  <div
                    key={project.id}
                    className={`${style.border} rounded-lg p-3 bg-muted/40 hover:bg-muted/60 cursor-pointer transition-colors`}
                    onClick={() => navigate(`/projets/${project.id}`)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Icon className="w-3.5 h-3.5 shrink-0" />
                        <span className="font-medium text-[13px] truncate">{project.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Badge variant="outline" className={`text-[10px] ${style.badge}`}>
                          {daysText}
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">
                          {PROJECT_STATUS_LABELS[project.status as keyof typeof PROJECT_STATUS_LABELS] || project.status}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Progress value={project.progress || 0} className="flex-1 h-1" />
                      <span className="text-[10px] text-muted-foreground font-medium tabular-nums">{project.progress || 0}%</span>
                    </div>
                  </div>
                );
              })}

              {(overdueTasks?.length || 0) > 0 && (
                <div className="pt-2 border-t border-border mt-3">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span className="font-semibold text-destructive">{overdueTasks?.length}</span> tâche{(overdueTasks?.length || 0) > 1 ? "s" : ""} en retard
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Pipeline + Latest Clients */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <motion.div variants={item}>
          <Card className="border border-border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">Pipeline</CardTitle>
                <button onClick={() => navigate("/pipeline")} className="text-[11px] text-primary hover:text-primary/80 flex items-center gap-1 font-medium transition-colors">
                  Voir tout <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {pipelineSummary.map((p) => (
                <div key={p.status} className="flex items-center gap-3">
                  <div className={`px-2 py-0.5 rounded text-[10px] border font-medium min-w-[120px] ${p.colors}`}>
                    {p.label}
                  </div>
                  <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary/40 transition-all duration-500"
                      style={{ width: totalClients > 0 ? `${(p.count / totalClients) * 100}%` : "0%" }}
                    />
                  </div>
                  <span className="text-[11px] font-bold w-5 text-right tabular-nums">{p.count}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="border border-border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">Derniers clients</CardTitle>
                <button onClick={() => navigate("/clients")} className="text-[11px] text-primary hover:text-primary/80 flex items-center gap-1 font-medium transition-colors">
                  Voir tout <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </CardHeader>
            <CardContent>
              {!clients?.length ? (
                <p className="text-muted-foreground text-sm py-4 text-center">Aucun client</p>
              ) : (
                <div className="space-y-0.5">
                  {clients.slice(0, 5).map((client) => (
                    <div
                      key={client.id}
                      className="flex items-center gap-3 cursor-pointer hover:bg-muted/50 rounded-lg p-2 -mx-1 transition-colors duration-150"
                      onClick={() => navigate(`/clients/${client.id}`)}
                    >
                      <div className="w-8 h-8 rounded-lg bg-primary/8 flex items-center justify-center text-primary text-[11px] font-bold">
                        {client.company_name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium truncate">{client.company_name}</p>
                        <p className="text-[10px] text-muted-foreground">{client.city}</p>
                      </div>
                      <span className={`text-[10px] border px-1.5 py-0.5 rounded ${PIPELINE_COLORS[client.pipeline_status]}`}>
                        {PIPELINE_LABELS[client.pipeline_status]}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
