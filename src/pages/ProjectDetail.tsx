import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  useProject, useProjectTasks, useDeliverables,
  useUpdateProject, useCreateTask, useUpdateTask,
  useCreateDeliverable, useUpdateDeliverable, useDeleteProjectTasks,
} from "@/hooks/use-projects";
import {
  PROJECT_STATUS_LABELS, PACK_LABELS,
  PACK_MODULES, PACK_DEADLINE_DAYS,
} from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Building2, Calendar, Sparkles, Clock, AlertTriangle, RefreshCw } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";
import ProjectModules from "@/components/projects/ProjectModules";
import ProjectDeliverables from "@/components/projects/ProjectDeliverables";

type ProjectStatus = Database["public"]["Enums"]["project_status"];
type TaskStatus = Database["public"]["Enums"]["task_status"];
type DeliverableStatus = Database["public"]["Enums"]["deliverable_status"];

function daysUntil(dateStr: string | null) {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, hasRole } = useAuth();
  const { data: project, isLoading } = useProject(id!);
  const { data: tasks } = useProjectTasks(id!);
  const { data: deliverables } = useDeliverables(id!);
  const { data: teamMembers } = useQuery({
    queryKey: ["team-members"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("user_id, full_name");
      return data || [];
    },
  });
  const updateProject = useUpdateProject();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const createDeliverable = useCreateDeliverable();
  const updateDeliverable = useUpdateDeliverable();
  const deleteProjectTasks = useDeleteProjectTasks();
  const [isRegenerating, setIsRegenerating] = useState(false);
  const isAdmin = hasRole("admin");

  const handleStatusChange = async (status: ProjectStatus) => {
    if (!project) return;
    try {
      await updateProject.mutateAsync({ id: project.id, status });
      toast.success("Statut mis à jour");
    } catch { toast.error("Erreur"); }
  };

  const handleTaskStatusChange = async (taskId: string, status: TaskStatus) => {
    try {
      await updateTask.mutateAsync({ id: taskId, status });
      const updatedTasks = tasks?.map((t) => t.id === taskId ? { ...t, status } : t) || [];
      const done = updatedTasks.filter((t) => t.status === "termine").length;
      const progress = updatedTasks.length > 0 ? Math.round((done / updatedTasks.length) * 100) : 0;
      await updateProject.mutateAsync({ id: id!, progress });
    } catch { toast.error("Erreur"); }
  };

  const handleAutoGenerateModules = async () => {
    if (!project) return;
    const modules = PACK_MODULES[project.pack_type] || [];
    if (!modules.length) { toast.error("Pas de modules pour ce pack"); return; }
    try {
      let sortIndex = 0;
      for (const mod of modules) {
        for (const task of mod.tasks) {
          const dueDate = project.start_date
            ? new Date(new Date(project.start_date).getTime() + mod.deadlineDays * 86400000).toISOString().split("T")[0]
            : null;
          await createTask.mutateAsync({
            project_id: id!,
            title: task.title,
            description: `[${mod.id}] ${task.description || ""}`.trim(),
            priority: task.priority,
            due_date: dueDate,
            sort_order: sortIndex++,
          });
        }
      }
      const totalTasks = modules.reduce((sum, m) => sum + m.tasks.length, 0);
      toast.success(`${totalTasks} tâches créées dans ${modules.length} modules`);
    } catch { toast.error("Erreur lors de la génération"); }
  };

  const handleRegenerateModules = async () => {
    if (!project || !id) return;
    const modules = PACK_MODULES[project.pack_type] || [];
    if (!modules.length) { toast.error("Pas de modules pour ce pack"); return; }
    setIsRegenerating(true);
    try {
      // Delete all existing tasks
      await deleteProjectTasks.mutateAsync(id);
      // Recreate all tasks
      let sortIndex = 0;
      for (const mod of modules) {
        for (const task of mod.tasks) {
          const dueDate = project.start_date
            ? new Date(new Date(project.start_date).getTime() + mod.deadlineDays * 86400000).toISOString().split("T")[0]
            : null;
          await createTask.mutateAsync({
            project_id: id,
            title: task.title,
            description: `[${mod.id}] ${task.description || ""}`.trim(),
            priority: task.priority,
            due_date: dueDate,
            sort_order: sortIndex++,
          });
        }
      }
      // Reset progress
      await updateProject.mutateAsync({ id, progress: 0 });
      const totalTasks = modules.reduce((sum, m) => sum + m.tasks.length, 0);
      toast.success(`${totalTasks} tâches regénérées dans ${modules.length} modules`);
    } catch { toast.error("Erreur lors de la regénération"); }
    setIsRegenerating(false);
  };

  const handleAddTask = async (task: Parameters<typeof createTask.mutateAsync>[0]) => {
    try {
      await createTask.mutateAsync(task);
      toast.success("Tâche ajoutée");
    } catch { toast.error("Erreur lors de l'ajout"); }
  };

  const handleAssignModule = async (moduleId: string, userId: string | null) => {
    if (!tasks) return;
    try {
      const moduleTasks = tasks.filter(t => t.description?.match(/\[(.*?)\]/)?.[1] === moduleId);
      for (const task of moduleTasks) {
        await updateTask.mutateAsync({ id: task.id, assigned_to: userId });
      }
      toast.success(userId ? "Module assigné" : "Assignation retirée");
    } catch { toast.error("Erreur"); }
  };

  const handleDeliverableStatusChange = async (deliverableId: string, status: DeliverableStatus) => {
    try {
      const updates: any = { id: deliverableId, status };
      if (status === "soumis") updates.submitted_at = new Date().toISOString();
      if (status === "approuve") updates.approved_at = new Date().toISOString();
      await updateDeliverable.mutateAsync(updates);
      toast.success("Livrable mis à jour");
    } catch { toast.error("Erreur"); }
  };

  const handleAddDeliverable = async (d: Parameters<typeof createDeliverable.mutateAsync>[0]) => {
    try {
      await createDeliverable.mutateAsync(d);
      toast.success("Livrable ajouté");
    } catch { toast.error("Erreur"); }
  };

  const handleAutoCreateDeliverables = async () => {
    if (!project) return;
    const modules = PACK_MODULES[project.pack_type] || [];
    const names = modules.map((m) => m.name);
    if (!names.length) { toast.error("Pas de livrables prédéfinis"); return; }
    try {
      for (const name of names) {
        await createDeliverable.mutateAsync({ project_id: id!, name });
      }
      toast.success(`${names.length} livrables créés`);
    } catch { toast.error("Erreur"); }
  };

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!project) return <p className="text-muted-foreground">Projet introuvable</p>;

  const hasTasks = tasks && tasks.length > 0;
  const hasModules = (PACK_MODULES[project.pack_type] || []).length > 0;
  const daysLeft = daysUntil(project.due_date);
  const isOverdue = daysLeft !== null && daysLeft < 0;
  const isUrgent = daysLeft !== null && daysLeft >= 0 && daysLeft <= 3;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/projets")}><ArrowLeft className="w-5 h-5" /></Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
            <Building2 className="w-3.5 h-3.5" />
            {(project as any).clients?.company_name}
            <span>•</span>
            <Badge variant="secondary" className="text-xs">{PACK_LABELS[project.pack_type]}</Badge>
          </div>
        </div>
        <Select value={project.status} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(PROJECT_STATUS_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-0 shadow-md shadow-primary/5">
          <CardContent className="pt-6 space-y-2 text-sm">
            {project.start_date && (
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span>Signature : {new Date(project.start_date).toLocaleDateString("fr-FR")}</span>
              </div>
            )}
            {project.due_date && (
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span>Deadline : {new Date(project.due_date).toLocaleDateString("fr-FR")}</span>
              </div>
            )}
            {/* Deadline status with colors */}
            {daysLeft !== null && (
              <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${
                isOverdue 
                  ? "bg-destructive/10 text-destructive" 
                  : isUrgent 
                    ? "bg-warning/10 text-warning"
                    : "bg-success/10 text-success"
              }`}>
                {isOverdue ? (
                  <><AlertTriangle className="w-4 h-4" /> En retard de {Math.abs(daysLeft)} jour{Math.abs(daysLeft) > 1 ? "s" : ""}</>
                ) : daysLeft === 0 ? (
                  <><Clock className="w-4 h-4" /> Deadline aujourd'hui</>
                ) : (
                  <><Clock className="w-4 h-4" /> {daysLeft} jour{daysLeft > 1 ? "s" : ""} restant{daysLeft > 1 ? "s" : ""}</>
                )}
              </div>
            )}
            {project.description && <p className="text-muted-foreground">{project.description}</p>}
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md shadow-primary/5">
          <CardContent className="pt-6 grid grid-cols-2 gap-3 text-center">
            <div>
              <p className="text-2xl font-bold">{tasks?.length || 0}</p>
              <p className="text-xs text-muted-foreground">Tâches</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{tasks?.filter((t) => t.status === "termine").length || 0}</p>
              <p className="text-xs text-muted-foreground">Terminées</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{deliverables?.length || 0}</p>
              <p className="text-xs text-muted-foreground">Livrables</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{deliverables?.filter((d) => d.status === "approuve").length || 0}</p>
              <p className="text-xs text-muted-foreground">Approuvés</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md shadow-primary/5">
          <CardContent className="pt-6 flex flex-col items-center justify-center gap-3">
            {!hasTasks && hasModules ? (
              <Button onClick={handleAutoGenerateModules} disabled={createTask.isPending} className="w-full">
                {createTask.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                Générer les modules du pack
              </Button>
            ) : (
              <>
                <div className="text-center">
                  <p className="text-4xl font-bold text-primary">{project.progress || 0}%</p>
                  <p className="text-sm text-muted-foreground mt-1">Progression</p>
                </div>
                {hasModules && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRegenerateModules}
                    disabled={isRegenerating}
                    className="w-full gap-2 text-xs"
                  >
                    {isRegenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                    Regénérer les modules
                  </Button>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modules with checkable tasks */}
      {hasTasks && (
        <ProjectModules
          packType={project.pack_type}
          tasks={tasks}
          startDate={project.start_date}
          isAdmin={isAdmin}
          teamMembers={teamMembers || []}
          onTaskStatusChange={handleTaskStatusChange}
          onAddTask={handleAddTask}
          onAssignModule={handleAssignModule}
        />
      )}

      {/* Deliverables */}
      <ProjectDeliverables
        projectId={id!}
        packType={project.pack_type}
        deliverables={deliverables}
        onAdd={handleAddDeliverable}
        onStatusChange={handleDeliverableStatusChange}
        onAutoCreate={handleAutoCreateDeliverables}
        isCreating={createDeliverable.isPending}
      />
    </div>
  );
}
