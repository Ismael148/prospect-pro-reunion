import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  useProject, useProjectTasks, useDeliverables,
  useUpdateProject, useCreateTask, useUpdateTask,
  useCreateDeliverable, useUpdateDeliverable,
} from "@/hooks/use-projects";
import {
  PROJECT_STATUS_LABELS, PACK_LABELS,
  PACK_DELIVERABLES, PACK_CHECKLISTS,
} from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Building2, Calendar } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";
import ProjectTimeline from "@/components/projects/ProjectTimeline";
import ProjectTaskList from "@/components/projects/ProjectTaskList";
import ProjectDeliverables from "@/components/projects/ProjectDeliverables";

type ProjectStatus = Database["public"]["Enums"]["project_status"];
type TaskStatus = Database["public"]["Enums"]["task_status"];
type DeliverableStatus = Database["public"]["Enums"]["deliverable_status"];

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: project, isLoading } = useProject(id!);
  const { data: tasks } = useProjectTasks(id!);
  const { data: deliverables } = useDeliverables(id!);
  const updateProject = useUpdateProject();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const createDeliverable = useCreateDeliverable();
  const updateDeliverable = useUpdateDeliverable();

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

  const handleAutoGenerateChecklist = async () => {
    if (!project) return;
    const checklist = PACK_CHECKLISTS[project.pack_type] || [];
    if (!checklist.length) { toast.error("Pas de checklist pour ce pack"); return; }
    try {
      for (let i = 0; i < checklist.length; i++) {
        const item = checklist[i];
        const dueDate = project.start_date
          ? new Date(new Date(project.start_date).getTime() + item.dayOffset * 86400000).toISOString().split("T")[0]
          : null;
        await createTask.mutateAsync({
          project_id: id!,
          title: item.title,
          description: `[${item.category}] ${item.description || ""}`.trim(),
          priority: item.priority,
          due_date: dueDate,
          sort_order: item.dayOffset * 100 + i,
        });
      }
      toast.success(`${checklist.length} tâches webmaster créées`);
    } catch { toast.error("Erreur lors de la génération"); }
  };

  const handleAddTask = async (task: Parameters<typeof createTask.mutateAsync>[0]) => {
    try {
      await createTask.mutateAsync(task);
      toast.success("Tâche ajoutée");
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
    const packDeliverables = PACK_DELIVERABLES[project.pack_type] || [];
    if (!packDeliverables.length) { toast.error("Pas de livrables prédéfinis"); return; }
    try {
      for (const name of packDeliverables) {
        await createDeliverable.mutateAsync({ project_id: id!, name });
      }
      toast.success(`${packDeliverables.length} livrables créés`);
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

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!project) return <p className="text-muted-foreground">Projet introuvable</p>;

  const tasksByStatus = {
    a_faire: tasks?.filter((t) => t.status === "a_faire") || [],
    en_cours: tasks?.filter((t) => t.status === "en_cours") || [],
    en_revision: tasks?.filter((t) => t.status === "en_revision") || [],
    termine: tasks?.filter((t) => t.status === "termine") || [],
  };

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

      {/* Progress + Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-0 shadow-md shadow-primary/5">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-4xl font-bold text-primary">{project.progress || 0}%</p>
              <p className="text-sm text-muted-foreground mt-1">Progression</p>
              <Progress value={project.progress || 0} className="mt-3 h-2" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md shadow-primary/5">
          <CardContent className="pt-6 space-y-2 text-sm">
            {project.start_date && (
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span>Début : {new Date(project.start_date).toLocaleDateString("fr-FR")}</span>
              </div>
            )}
            {project.due_date && (
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span>Échéance : {new Date(project.due_date).toLocaleDateString("fr-FR")}</span>
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
              <p className="text-2xl font-bold">{tasksByStatus.termine.length}</p>
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
      </div>

      {/* Timeline */}
      {tasks && tasks.length > 0 && (
        <ProjectTimeline tasks={tasks} startDate={project.start_date} />
      )}

      {/* Tasks */}
      <ProjectTaskList
        projectId={id!}
        packType={project.pack_type}
        startDate={project.start_date}
        tasks={tasks}
        onAddTask={handleAddTask}
        onTaskStatusChange={handleTaskStatusChange}
        onAutoGenerate={handleAutoGenerateChecklist}
        isCreating={createTask.isPending}
      />

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
