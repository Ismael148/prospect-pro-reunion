import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { PACK_MODULES, TASK_PRIORITY_LABELS } from "@/lib/constants";
import { ChevronDown, ChevronRight, Clock, AlertTriangle, Plus, UserCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";
import type { Database } from "@/integrations/supabase/types";

type ProjectTask = Tables<"project_tasks">;
type TaskStatus = Database["public"]["Enums"]["task_status"];
type TaskPriority = Database["public"]["Enums"]["task_priority"];

export interface TeamMember {
  user_id: string;
  full_name: string | null;
}

interface Props {
  packType: string;
  tasks: ProjectTask[];
  startDate?: string | null;
  isAdmin?: boolean;
  teamMembers?: TeamMember[];
  onTaskStatusChange: (taskId: string, status: TaskStatus) => Promise<void>;
  onAddTask?: (task: TablesInsert<"project_tasks">) => Promise<void>;
  onAssignModule?: (moduleId: string, userId: string | null) => Promise<void>;
}

export default function ProjectModules({ packType, tasks, startDate, isAdmin, teamMembers = [], onTaskStatusChange, onAddTask, onAssignModule }: Props) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [addDialogOpen, setAddDialogOpen] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<TaskPriority>("moyenne");
  const modules = PACK_MODULES[packType] || [];

  // Group tasks by module id
  const tasksByModule = useMemo(() => {
    const map: Record<string, ProjectTask[]> = {};
    tasks.forEach((task) => {
      const moduleId = task.description?.match(/\[(.*?)\]/)?.[1] || "unknown";
      if (!map[moduleId]) map[moduleId] = [];
      map[moduleId].push(task);
    });
    return map;
  }, [tasks]);

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

  const totalDone = tasks.filter((t) => t.status === "termine").length;
  const totalProgress = tasks.length > 0 ? Math.round((totalDone / tasks.length) * 100) : 0;

  const toggle = (id: string) =>
    setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));

  const getAssignedMember = (moduleId: string) => {
    const moduleTasks = tasksByModule[moduleId] || [];
    const assignedId = moduleTasks.find(t => t.assigned_to)?.assigned_to;
    if (!assignedId) return null;
    return teamMembers.find(m => m.user_id === assignedId) || null;
  };

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
        const assignedMember = getAssignedMember(mod.id);

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
              {/* Module header */}
              <div className="flex items-center">
                <button
                  onClick={() => toggle(mod.id)}
                  className="flex-1 flex items-center gap-3 p-4 hover:bg-muted/30 transition-colors text-left"
                >
                  {isCollapsed ? (
                    <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-muted-foreground shrink-0" />
                  )}
                  <span className="text-lg">{mod.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm">{mod.name}</span>
                      {allDone && (
                        <Badge className="bg-success/10 text-success border-success/20 text-xs" variant="outline">
                          ✅ Terminé
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      <Progress value={progress} className="flex-1 h-1.5 max-w-[200px]" />
                      <span className="text-xs text-muted-foreground">{done}/{total}</span>
                      
                      {/* Deadline badge - more visible */}
                      {deadlineDate && (
                        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-md ${
                          isOverdue
                            ? "bg-destructive/15 text-destructive border border-destructive/30"
                            : allDone
                              ? "bg-success/15 text-success border border-success/30"
                              : daysLeft !== null && daysLeft <= 2
                                ? "bg-warning/15 text-warning border border-warning/30"
                                : "bg-success/15 text-success border border-success/30"
                        }`}>
                          {isOverdue ? (
                            <><AlertTriangle className="w-3 h-3" /> {Math.abs(daysLeft!)}j de retard</>
                          ) : allDone ? (
                            <>✓ Livré</>
                          ) : daysLeft === 0 ? (
                            <><Clock className="w-3 h-3" /> Aujourd'hui</>
                          ) : (
                            <><Clock className="w-3 h-3" /> {daysLeft}j restants</>
                          )}
                        </span>
                      )}

                      {/* Assigned member */}
                      {assignedMember && (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-md">
                          <UserCircle className="w-3 h-3" />
                          {assignedMember.full_name || "Membre"}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
                <div className="flex items-center gap-1 mr-2">
                  {/* Assign member */}
                  {isAdmin && onAssignModule && teamMembers.length > 0 && (
                    <Select
                      value={assignedMember?.user_id || "__none__"}
                      onValueChange={(v) => onAssignModule(mod.id, v === "__none__" ? null : v)}
                    >
                      <SelectTrigger className="h-8 w-8 p-0 border-0 bg-transparent [&>svg]:hidden">
                        <Avatar className="h-7 w-7">
                          <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                            {assignedMember ? (assignedMember.full_name || "?").slice(0, 2).toUpperCase() : <UserCircle className="w-4 h-4 text-muted-foreground" />}
                          </AvatarFallback>
                        </Avatar>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Non assigné</SelectItem>
                        {teamMembers.map((m) => (
                          <SelectItem key={m.user_id} value={m.user_id}>
                            {m.full_name || m.user_id.slice(0, 8)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {/* Add task */}
                  {isAdmin && onAddTask && (
                    <Dialog open={addDialogOpen === mod.id} onOpenChange={(open) => setAddDialogOpen(open ? mod.id : null)}>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="gap-1">
                          <Plus className="w-4 h-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Ajouter une tâche au module</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div>
                            <label className="text-sm font-medium mb-1.5 block">Titre *</label>
                            <Input placeholder="Titre de la tâche" value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} />
                          </div>
                          <div>
                            <label className="text-sm font-medium mb-1.5 block">Description</label>
                            <Textarea placeholder="Description (optionnelle)" value={newTaskDescription} onChange={(e) => setNewTaskDescription(e.target.value)} rows={3} />
                          </div>
                          <div>
                            <label className="text-sm font-medium mb-1.5 block">Priorité</label>
                            <Select value={newTaskPriority} onValueChange={(v) => setNewTaskPriority(v as TaskPriority)}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {Object.entries(TASK_PRIORITY_LABELS).map(([k, v]) => (
                                  <SelectItem key={k} value={k}>{v}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setAddDialogOpen(null)}>Annuler</Button>
                          <Button onClick={() => handleAddTask(mod.id)} disabled={!newTaskTitle.trim()}>Ajouter</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </div>

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
                              task.status === "termine" ? "opacity-50" : "hover:bg-muted/40"
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
