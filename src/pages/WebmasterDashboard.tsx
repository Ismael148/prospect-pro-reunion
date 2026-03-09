import { useProjects } from "@/hooks/use-projects";
import { useProjectTasks } from "@/hooks/use-projects";
import { PROJECT_STATUS_LABELS, PROJECT_STATUS_COLORS, PACK_LABELS } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Briefcase, Clock, AlertTriangle, CheckCircle2, Calendar,
  Building2, ArrowRight, Loader2, TrendingUp,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
  const diff = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
  return diff;
}

function DeadlineBadge({ dueDate }: { dueDate: string | null }) {
  const days = daysUntil(dueDate);
  if (days === null) return <span className="text-xs text-muted-foreground">Pas de deadline</span>;
  if (days < 0)
    return (
      <Badge variant="destructive" className="text-xs gap-1">
        <AlertTriangle className="w-3 h-3" />
        En retard de {Math.abs(days)}j
      </Badge>
    );
  if (days <= 3)
    return (
      <Badge className="text-xs bg-warning/10 text-warning border-warning/20 gap-1" variant="outline">
        <Clock className="w-3 h-3" />
        {days}j restants
      </Badge>
    );
  return (
    <span className="text-xs text-muted-foreground flex items-center gap-1">
      <Calendar className="w-3 h-3" />
      {days}j restants
    </span>
  );
}

export default function WebmasterDashboard() {
  const navigate = useNavigate();
  const { data: projects, isLoading } = useProjects();

  // Fetch all tasks for progress summary
  const { data: allTasks } = useQuery({
    queryKey: ["all_project_tasks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_tasks")
        .select("project_id, status")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const activeProjects = projects?.filter((p: any) => p.status === "en_cours" || p.status === "en_revision") || [];
  const pendingProjects = projects?.filter((p: any) => p.status === "en_attente") || [];
  const completedProjects = projects?.filter((p: any) => p.status === "termine") || [];

  const overdueProjects = activeProjects.filter((p: any) => {
    const days = daysUntil(p.due_date);
    return days !== null && days < 0;
  });

  const urgentProjects = activeProjects.filter((p: any) => {
    const days = daysUntil(p.due_date);
    return days !== null && days >= 0 && days <= 3;
  });

  // Task stats per project
  const tasksByProject = (projectId: string) => {
    const tasks = allTasks?.filter((t) => t.project_id === projectId) || [];
    const done = tasks.filter((t) => t.status === "termine").length;
    return { total: tasks.length, done };
  };

  const stats = [
    { title: "Projets actifs", value: activeProjects.length, icon: Briefcase, gradient: "from-primary to-primary/70" },
    { title: "En retard", value: overdueProjects.length, icon: AlertTriangle, gradient: "from-destructive to-destructive/70" },
    { title: "Urgents (≤3j)", value: urgentProjects.length, icon: Clock, gradient: "from-warning to-warning/70" },
    { title: "Terminés", value: completedProjects.length, icon: CheckCircle2, gradient: "from-success to-success/70" },
  ];

  // Sort: overdue first, then by days remaining
  const sortedActive = [...activeProjects].sort((a: any, b: any) => {
    const dA = daysUntil(a.due_date) ?? 999;
    const dB = daysUntil(b.due_date) ?? 999;
    return dA - dB;
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <motion.div className="space-y-8" variants={container} initial="hidden" animate="show">
      <motion.div variants={item}>
        <h1 className="text-3xl font-bold tracking-tight">Tableau de bord Webmaster</h1>
        <p className="text-muted-foreground mt-1 text-sm">Vue d'ensemble de tous les projets et deadlines</p>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <motion.div key={stat.title} variants={item}>
            <Card className="border-0 shadow-soft">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{stat.title}</span>
                  <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center`}>
                    <stat.icon className="w-4 h-4 text-white" />
                  </div>
                </div>
                <p className="text-3xl font-bold tracking-tight">{stat.value}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

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
                <div
                  key={p.id}
                  className="flex items-center justify-between cursor-pointer hover:bg-destructive/5 rounded-lg p-2 transition-colors"
                  onClick={() => navigate(`/projets/${p.id}`)}
                >
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

      {/* Active projects table */}
      <motion.div variants={item}>
        <Card className="border-0 shadow-soft">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">
                Projets en cours ({activeProjects.length})
              </CardTitle>
              <button
                onClick={() => navigate("/projets")}
                className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
              >
                Tous les projets <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </CardHeader>
          <CardContent>
            {sortedActive.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">Aucun projet en cours</p>
            ) : (
              <div className="space-y-3">
                {sortedActive.map((project: any) => {
                  const { total, done } = tasksByProject(project.id);
                  const pct = total > 0 ? Math.round((done / total) * 100) : (project.progress || 0);
                  return (
                    <div
                      key={project.id}
                      className="flex items-center gap-4 cursor-pointer hover:bg-muted/60 rounded-xl p-3 -mx-1 transition-colors"
                      onClick={() => navigate(`/projets/${project.id}`)}
                    >
                      <div className="w-10 h-10 rounded-xl bg-primary/8 flex items-center justify-center shrink-0">
                        <Building2 className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium truncate">{project.name}</p>
                          <Badge
                            className={`text-[11px] border shrink-0 ${PROJECT_STATUS_COLORS[project.status as keyof typeof PROJECT_STATUS_COLORS]}`}
                            variant="outline"
                          >
                            {PROJECT_STATUS_LABELS[project.status as keyof typeof PROJECT_STATUS_LABELS]}
                          </Badge>
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
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Pending projects */}
      {pendingProjects.length > 0 && (
        <motion.div variants={item}>
          <Card className="border-0 shadow-soft">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold">
                En attente ({pendingProjects.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {pendingProjects.map((p: any) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between cursor-pointer hover:bg-muted/60 rounded-lg p-2.5 transition-colors"
                  onClick={() => navigate(`/projets/${p.id}`)}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.clients?.company_name}</p>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {PACK_LABELS[p.pack_type as keyof typeof PACK_LABELS]}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
}
