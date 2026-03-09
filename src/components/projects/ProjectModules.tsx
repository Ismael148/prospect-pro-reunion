import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { PACK_MODULES, TASK_PRIORITY_LABELS } from "@/lib/constants";
import { ChevronDown, ChevronRight, Clock, AlertTriangle, Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";
import type { Database } from "@/integrations/supabase/types";

type ProjectTask = Tables<"project_tasks">;
type TaskStatus = Database["public"]["Enums"]["task_status"];
type TaskPriority = Database["public"]["Enums"]["task_priority"];

interface Props {
  packType: string;
  tasks: ProjectTask[];
  startDate?: string | null;
  isAdmin?: boolean;
  onTaskStatusChange: (taskId: string, status: TaskStatus) => Promise<void>;
  onAddTask?: (task: TablesInsert<"project_tasks">) => Promise<void>;
}

export default function ProjectModules({ packType, tasks, startDate, isAdmin, onTaskStatusChange, onAddTask }: Props) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [addDialogOpen, setAddDialogOpen] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<TaskPriority>("moyenne");
  const modules = PACK_MODULES[packType] || [];

  const handleAddTask = async (moduleId: string) => {
    if (!onAddTask || !newTaskTitle.trim()) return;
    const module = modules.find((m) => m.id === moduleId);
    const dueDate = startDate && module
      ? new Date(new Date(startDate).getTime() + module.deadlineDays * 86400000).toISOString().split("T")[0]
      : null;
    
    await onAddTask({
      title: newTaskTitle,
      description: `[${moduleId}] ${newTaskDescription}`.trim(),
      priority: newTaskPriority,
      due_date: dueDate,
      project_id: tasks[0]?.project_id || "",
      sort_order: (tasksByModule[moduleId]?.length || 0) + 1,
    });
    
    setNewTaskTitle("");
    setNewTaskDescription("");
    setNewTaskPriority("moyenne");
    setAddDialogOpen(null);
  };

  // Group tasks by module id (stored in description as [module_id])
  const tasksByModule = useMemo(() => {
    const map: Record<string, ProjectTask[]> = {};
    tasks.forEach((task) => {
      const moduleId = task.description?.match(/\[(.*?)\]/)?.[1] || "unknown";
      if (!map[moduleId]) map[moduleId] = [];
      map[moduleId].push(task);
    });
    return map;
  }, [tasks]);

  const totalDone = tasks.filter((t) => t.status === "termine").length;
  const totalProgress = tasks.length > 0 ? Math.round((totalDone / tasks.length) * 100) : 0;

  const toggle = (id: string) =>
    setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));

  if (!modules.length || !tasks.length) return null;

  return (
    <div className="space-y-4">
      {/* Global progress */}
      <Card className="border-0 shadow-md shadow-primary/5">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Progression globale</span>
            <span className="text-sm font-bold text-primary">{totalProgress}%</span>
          </div>
          <Progress value={totalProgress} className="h-2.5" />
          <p className="text-xs text-muted-foreground mt-2">
            {totalDone} / {tasks.length} tâches terminées
          </p>
        </CardContent>
      </Card>

      {/* Modules */}
      {modules.map((mod, gi) => {
        const moduleTasks = tasksByModule[mod.id] || [];
        const done = moduleTasks.filter((t) => t.status === "termine").length;
        const total = moduleTasks.length;
        const allDone = done === total && total > 0;
        const progress = total > 0 ? Math.round((done / total) * 100) : 0;
        const isCollapsed = collapsed[mod.id];

        // Calculate deadline
        const deadlineDate = startDate
          ? new Date(new Date(startDate).getTime() + mod.deadlineDays * 86400000)
          : null;
        const now = new Date();
        const isOverdue = deadlineDate && now > deadlineDate && !allDone;
        const daysLeft = deadlineDate
          ? Math.ceil((deadlineDate.getTime() - now.getTime()) / 86400000)
          : null;

        return (
          <motion.div
            key={mod.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: gi * 0.05 }}
          >
            <Card className={`border-0 shadow-md shadow-primary/5 overflow-hidden ${allDone ? "opacity-75" : ""}`}>
              {/* Module header - clickable */}
              <button
                onClick={() => toggle(mod.id)}
                className="w-full flex items-center gap-3 p-4 hover:bg-muted/30 transition-colors text-left"
              >
                {isCollapsed ? (
                  <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-muted-foreground shrink-0" />
                )}
                <span className="text-lg">{mod.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{mod.name}</span>
                    {allDone && (
                      <Badge className="bg-success/10 text-success border-success/20 text-xs" variant="outline">
                        ✅ Terminé
                      </Badge>
                    )}
                    {isOverdue && (
                      <Badge className="bg-destructive/10 text-destructive border-destructive/20 text-xs gap-1" variant="outline">
                        <AlertTriangle className="w-3 h-3" /> En retard
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <Progress value={progress} className="flex-1 h-1.5 max-w-[200px]" />
                    <span className="text-xs text-muted-foreground">{done}/{total}</span>
                    {deadlineDate && (
                      <span className={`text-xs flex items-center gap-1 ${isOverdue ? "text-destructive" : "text-muted-foreground"}`}>
                        <Clock className="w-3 h-3" />
                        {daysLeft !== null && daysLeft > 0
                          ? `${daysLeft}j restants`
                          : daysLeft === 0
                            ? "Aujourd'hui"
                            : `${Math.abs(daysLeft!)}j de retard`}
                      </span>
                    )}
                  </div>
                </div>
              </button>

              {/* Tasks */}
              <AnimatePresence>
                {!isCollapsed && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 space-y-1 border-t border-border/50 pt-3">
                      {moduleTasks.map((task) => {
                        const cleanDesc = task.description?.replace(/\[.*?\]\s*/, "").trim() || "";
                        return (
                          <label
                            key={task.id}
                            className={`flex items-start gap-3 py-2 px-3 rounded-lg cursor-pointer transition-colors ${
                              task.status === "termine"
                                ? "opacity-50"
                                : "hover:bg-muted/40"
                            }`}
                          >
                            <Checkbox
                              checked={task.status === "termine"}
                              onCheckedChange={(checked) =>
                                onTaskStatusChange(task.id, checked ? "termine" : "a_faire")
                              }
                              className="mt-0.5"
                            />
                            <div className="flex-1 min-w-0">
                              <span className={`text-sm ${task.status === "termine" ? "line-through text-muted-foreground" : ""}`}>
                                {task.title}
                              </span>
                              {cleanDesc && (
                                <p className="text-xs text-muted-foreground mt-0.5">{cleanDesc}</p>
                              )}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}
