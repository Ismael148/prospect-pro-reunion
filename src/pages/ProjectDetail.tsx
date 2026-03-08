import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  useProject, useProjectTasks, useDeliverables,
  useUpdateProject, useCreateTask, useUpdateTask,
  useCreateDeliverable, useUpdateDeliverable,
} from "@/hooks/use-projects";
import {
  PROJECT_STATUS_LABELS, PROJECT_STATUS_COLORS,
  TASK_STATUS_LABELS, TASK_STATUS_COLORS,
  TASK_PRIORITY_LABELS, TASK_PRIORITY_COLORS,
  DELIVERABLE_STATUS_LABELS, DELIVERABLE_STATUS_COLORS,
  PACK_DELIVERABLES,
} from "@/lib/constants";
import { PACK_LABELS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  ArrowLeft, Plus, Loader2, Building2, Calendar,
  ListTodo, Package, CheckCircle2, Circle, Clock, AlertTriangle,
} from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type ProjectStatus = Database["public"]["Enums"]["project_status"];
type TaskStatus = Database["public"]["Enums"]["task_status"];
type TaskPriority = Database["public"]["Enums"]["task_priority"];
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

  const [taskOpen, setTaskOpen] = useState(false);
  const [deliverableOpen, setDeliverableOpen] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: "", description: "", priority: "moyenne" as TaskPriority, due_date: "" });
  const [deliverableForm, setDeliverableForm] = useState({ name: "", description: "" });

  const handleStatusChange = async (status: ProjectStatus) => {
    if (!project) return;
    try {
      await updateProject.mutateAsync({ id: project.id, status });
      toast.success("Statut mis à jour");
    } catch { toast.error("Erreur"); }
  };

  const handleAddTask = async () => {
    if (!taskForm.title.trim()) { toast.error("Titre requis"); return; }
    try {
      await createTask.mutateAsync({
        project_id: id!,
        title: taskForm.title,
        description: taskForm.description || null,
        priority: taskForm.priority,
        due_date: taskForm.due_date || null,
        sort_order: (tasks?.length || 0) + 1,
      });
      toast.success("Tâche ajoutée");
      setTaskOpen(false);
      setTaskForm({ title: "", description: "", priority: "moyenne", due_date: "" });
    } catch { toast.error("Erreur"); }
  };

  const handleTaskStatusChange = async (taskId: string, status: TaskStatus) => {
    try {
      await updateTask.mutateAsync({ id: taskId, status });
      // Recalculate progress
      const updatedTasks = tasks?.map((t) => t.id === taskId ? { ...t, status } : t) || [];
      const done = updatedTasks.filter((t) => t.status === "termine").length;
      const progress = updatedTasks.length > 0 ? Math.round((done / updatedTasks.length) * 100) : 0;
      await updateProject.mutateAsync({ id: id!, progress });
    } catch { toast.error("Erreur"); }
  };

  const handleAddDeliverable = async () => {
    if (!deliverableForm.name.trim()) { toast.error("Nom requis"); return; }
    try {
      await createDeliverable.mutateAsync({
        project_id: id!,
        name: deliverableForm.name,
        description: deliverableForm.description || null,
      });
      toast.success("Livrable ajouté");
      setDeliverableOpen(false);
      setDeliverableForm({ name: "", description: "" });
    } catch { toast.error("Erreur"); }
  };

  const handleAutoCreateDeliverables = async () => {
    if (!project) return;
    const packDeliverables = PACK_DELIVERABLES[project.pack_type] || [];
    if (!packDeliverables.length) { toast.error("Pas de livrables prédéfinis pour ce pack"); return; }
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

      {/* Tasks */}
      <Card className="border-0 shadow-md shadow-primary/5">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2"><ListTodo className="w-5 h-5" /> Tâches</CardTitle>
          <Dialog open={taskOpen} onOpenChange={setTaskOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1" />Ajouter</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nouvelle tâche</DialogTitle></DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label>Titre *</Label>
                  <Input value={taskForm.title} onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input value={taskForm.description} onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Priorité</Label>
                    <Select value={taskForm.priority} onValueChange={(v) => setTaskForm({ ...taskForm, priority: v as TaskPriority })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(TASK_PRIORITY_LABELS).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Échéance</Label>
                    <Input type="date" value={taskForm.due_date} onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })} />
                  </div>
                </div>
                <Button onClick={handleAddTask} disabled={createTask.isPending}>
                  {createTask.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Ajouter
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {!tasks?.length ? (
            <p className="text-muted-foreground text-sm text-center py-4">Aucune tâche</p>
          ) : (
            <div className="space-y-2">
              {tasks.map((task) => {
                const PriorityIcon = task.priority === "urgente" ? AlertTriangle : task.priority === "haute" ? AlertTriangle : Clock;
                return (
                  <div key={task.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                    <Checkbox
                      checked={task.status === "termine"}
                      onCheckedChange={(checked) =>
                        handleTaskStatusChange(task.id, checked ? "termine" : "a_faire")
                      }
                    />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${task.status === "termine" ? "line-through text-muted-foreground" : ""}`}>
                        {task.title}
                      </p>
                      {task.description && <p className="text-xs text-muted-foreground">{task.description}</p>}
                    </div>
                    <PriorityIcon className={`w-4 h-4 shrink-0 ${TASK_PRIORITY_COLORS[task.priority]}`} />
                    <Select value={task.status} onValueChange={(v) => handleTaskStatusChange(task.id, v as TaskStatus)}>
                      <SelectTrigger className="w-28 h-7 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(TASK_STATUS_LABELS).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Deliverables */}
      <Card className="border-0 shadow-md shadow-primary/5">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2"><Package className="w-5 h-5" /> Livrables</CardTitle>
          <div className="flex gap-2">
            {!deliverables?.length && PACK_DELIVERABLES[project.pack_type]?.length > 0 && (
              <Button size="sm" variant="outline" onClick={handleAutoCreateDeliverables}>
                Générer depuis le pack
              </Button>
            )}
            <Dialog open={deliverableOpen} onOpenChange={setDeliverableOpen}>
              <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1" />Ajouter</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Nouveau livrable</DialogTitle></DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label>Nom *</Label>
                    <Input value={deliverableForm.name} onChange={(e) => setDeliverableForm({ ...deliverableForm, name: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Input value={deliverableForm.description} onChange={(e) => setDeliverableForm({ ...deliverableForm, description: e.target.value })} />
                  </div>
                  <Button onClick={handleAddDeliverable} disabled={createDeliverable.isPending}>
                    {createDeliverable.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Ajouter
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {!deliverables?.length ? (
            <p className="text-muted-foreground text-sm text-center py-4">Aucun livrable</p>
          ) : (
            <div className="space-y-2">
              {deliverables.map((d) => {
                const StatusIcon = d.status === "approuve" ? CheckCircle2 : d.status === "rejete" ? AlertTriangle : Circle;
                return (
                  <div key={d.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                    <StatusIcon className={`w-5 h-5 shrink-0 ${
                      d.status === "approuve" ? "text-success" : d.status === "rejete" ? "text-destructive" : "text-muted-foreground"
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{d.name}</p>
                      {d.description && <p className="text-xs text-muted-foreground">{d.description}</p>}
                    </div>
                    <Select value={d.status} onValueChange={(v) => handleDeliverableStatusChange(d.id, v as DeliverableStatus)}>
                      <SelectTrigger className="w-32 h-7 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(DELIVERABLE_STATUS_LABELS).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
