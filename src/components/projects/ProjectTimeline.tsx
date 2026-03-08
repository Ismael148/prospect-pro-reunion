import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  CHECKLIST_CATEGORY_LABELS, CHECKLIST_CATEGORY_ORDER,
} from "@/lib/constants";
import { CheckCircle2, Circle, Clock, ChevronDown, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { Tables } from "@/integrations/supabase/types";

type ProjectTask = Tables<"project_tasks">;

interface Props {
  tasks: ProjectTask[];
  startDate?: string | null;
}

function extractCategory(description: string | null): string {
  return description?.match(/\[(.*?)\]/)?.[1] || "admin";
}

export default function ProjectTimeline({ tasks, startDate }: Props) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const moduleGroups = useMemo(() => {
    const groups: Record<string, ProjectTask[]> = {};
    tasks.forEach((task) => {
      const cat = extractCategory(task.description);
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(task);
    });
    return CHECKLIST_CATEGORY_ORDER
      .filter((cat) => groups[cat]?.length)
      .map((cat) => ({
        category: cat,
        label: CHECKLIST_CATEGORY_LABELS[cat] || cat,
        items: groups[cat],
        done: groups[cat].filter((t) => t.status === "termine").length,
        total: groups[cat].length,
      }));
  }, [tasks]);

  const totalDone = tasks.filter((t) => t.status === "termine").length;
  const totalProgress = tasks.length > 0 ? Math.round((totalDone / tasks.length) * 100) : 0;

  if (!moduleGroups.length) return null;

  const toggle = (cat: string) =>
    setCollapsed((prev) => ({ ...prev, [cat]: !prev[cat] }));

  return (
    <Card className="border-0 shadow-md shadow-primary/5">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="w-5 h-5" /> Modules du projet
          </CardTitle>
          <Badge variant="outline" className="text-sm">
            {totalDone}/{tasks.length} tâches — {totalProgress}%
          </Badge>
        </div>
        <Progress value={totalProgress} className="mt-2 h-2" />
      </CardHeader>
      <CardContent className="space-y-3">
        {moduleGroups.map(({ category, label, items, done, total }, gi) => {
          const isCollapsed = collapsed[category];
          const allDone = done === total;
          const progress = total > 0 ? Math.round((done / total) * 100) : 0;

          return (
            <motion.div
              key={category}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: gi * 0.03 }}
              className="rounded-lg border bg-card"
            >
              {/* Module header */}
              <button
                onClick={() => toggle(category)}
                className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors rounded-lg"
              >
                {isCollapsed ? (
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                )}
                <span className="text-sm font-medium flex-1 text-left">{label}</span>
                <div className="flex items-center gap-2">
                  <Progress value={progress} className="w-20 h-1.5" />
                  <Badge
                    variant="outline"
                    className={`text-xs ${
                      allDone
                        ? "bg-success/10 text-success border-success/20"
                        : progress > 0
                          ? "bg-primary/10 text-primary border-primary/20"
                          : ""
                    }`}
                  >
                    {done}/{total}
                  </Badge>
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
                    <div className="px-3 pb-3 space-y-0.5">
                      {items.map((task) => {
                        const cleanDesc = task.description?.replace(/\[.*?\]\s*/, "").trim() || "";
                        return (
                          <div
                            key={task.id}
                            className={`flex items-center gap-2 py-1.5 px-2 rounded text-sm transition-colors ${
                              task.status === "termine"
                                ? "text-muted-foreground line-through opacity-60"
                                : "hover:bg-muted/30"
                            }`}
                          >
                            {task.status === "termine" ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" />
                            ) : task.status === "en_cours" ? (
                              <Clock className="w-3.5 h-3.5 text-primary shrink-0 animate-pulse" />
                            ) : (
                              <Circle className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <span>{task.title}</span>
                              {cleanDesc && (
                                <p className="text-xs text-muted-foreground mt-0.5">{cleanDesc}</p>
                              )}
                            </div>
                            {task.due_date && (
                              <span className="text-xs text-muted-foreground shrink-0">
                                J{Math.floor((task.sort_order || 0) / 100)}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </CardContent>
    </Card>
  );
}
