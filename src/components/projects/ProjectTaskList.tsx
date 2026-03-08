import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  TASK_STATUS_LABELS, TASK_PRIORITY_LABELS, TASK_PRIORITY_COLORS,
  PACK_CHECKLISTS, CHECKLIST_CATEGORY_LABELS,
} from "@/lib/constants";
import { Plus, Loader2, ListTodo, AlertTriangle, Clock, Sparkles } from "lucide-react";
import { toast } from "sonner";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";
import type { Database } from "@/integrations/supabase/types";

type TaskStatus = Database["public"]["Enums"]["task_status"];
type TaskPriority = Database["public"]["Enums"]["task_priority"];
type ProjectTask = Tables<"project_tasks">;

interface Props {
  projectId: string;
  packType: string;
  startDate?: string | null;
  tasks: ProjectTask[] | undefined;
  onAddTask: (task: TablesInsert<"project_tasks">) => Promise<void>;
  onTaskStatusChange: (taskId: string, status: TaskStatus) => Promise<void>;
  onAutoGenerate: () => Promise<void>;
  isCreating: boolean;
}

export default function ProjectTaskList({
  projectId, packType, startDate, tasks, onAddTask, onTaskStatusChange, onAutoGenerate, isCreating,
}: Props) {
  const [taskOpen, setTaskOpen] = useState(false);
  const [taskForm, setTaskForm] = useState({
    title: "", description: "", priority: "moyenne" as TaskPriority, due_date: "",
  });

  const handleAdd = async () => {
    if (!taskForm.title.trim()) { toast.error("Titre requis"); return; }
    await onAddTask({
      project_id: projectId,
      title: taskForm.title,
      description: taskForm.description || null,
      priority: taskForm.priority,
      due_date: taskForm.due_date || null,
      sort_order: (tasks?.length || 0) + 1,
    });
    setTaskOpen(false);
    setTaskForm({ title: "", description: "", priority: "moyenne", due_date: "" });
  };

  const hasChecklist = PACK_CHECKLISTS[packType]?.length > 0;
  const hasNoTasks = !tasks?.length;

  return (
    <Card className="border-0 shadow-md shadow-primary/5">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg flex items-center gap-2"><ListTodo className="w-5 h-5" /> Tâches</CardTitle>
        <div className="flex gap-2">
          {hasNoTasks && hasChecklist && (
            <Button size="sm" variant="outline" onClick={onAutoGenerate} disabled={isCreating}>
              {isCreating ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1" />}
              Générer checklist webmaster
            </Button>
          )}
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
                <Button onClick={handleAdd} disabled={isCreating}>
                  {isCreating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Ajouter
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {!tasks?.length ? (
          <p className="text-muted-foreground text-sm text-center py-4">Aucune tâche</p>
        ) : (
          <div className="space-y-2">
            {tasks.map((task) => {
              const PriorityIcon = task.priority === "urgente" || task.priority === "haute" ? AlertTriangle : Clock;
              const category = task.description?.match(/\[(.*?)\]/)?.[1] || "";
              const categoryLabel = CHECKLIST_CATEGORY_LABELS[category] || "";
              const cleanDesc = task.description?.replace(/\[.*?\]\s*/, "") || "";

              return (
                <div key={task.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                  <Checkbox
                    checked={task.status === "termine"}
                    onCheckedChange={(checked) =>
                      onTaskStatusChange(task.id, checked ? "termine" : "a_faire")
                    }
                  />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${task.status === "termine" ? "line-through text-muted-foreground" : ""}`}>
                      {task.title}
                    </p>
                    <div className="flex items-center gap-2">
                      {categoryLabel && <span className="text-xs text-muted-foreground">{categoryLabel}</span>}
                      {cleanDesc && <span className="text-xs text-muted-foreground">{cleanDesc}</span>}
                    </div>
                  </div>
                  <PriorityIcon className={`w-4 h-4 shrink-0 ${TASK_PRIORITY_COLORS[task.priority]}`} />
                  <Select value={task.status} onValueChange={(v) => onTaskStatusChange(task.id, v as TaskStatus)}>
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
  );
}
