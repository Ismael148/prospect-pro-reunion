import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CHECKLIST_CATEGORY_LABELS } from "@/lib/constants";
import { CheckCircle2, Circle, Clock, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import type { Tables } from "@/integrations/supabase/types";

type ProjectTask = Tables<"project_tasks">;

interface Props {
  tasks: ProjectTask[];
  startDate?: string | null;
}

export default function ProjectTimeline({ tasks, startDate }: Props) {
  const start = startDate ? new Date(startDate) : null;
  const now = new Date();

  // Group tasks by day offset (using description pattern "Jour X")
  const dayGroups = useMemo(() => {
    const groups: Record<number, ProjectTask[]> = {};
    tasks.forEach((task) => {
      // Extract day from sort_order or default to 0
      const day = Math.floor((task.sort_order || 0) / 100);
      if (!groups[day]) groups[day] = [];
      groups[day].push(task);
    });
    return Object.entries(groups)
      .map(([day, items]) => ({ day: Number(day), items }))
      .sort((a, b) => a.day - b.day);
  }, [tasks]);

  const currentDay = start
    ? Math.floor((now.getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24))
    : -1;

  if (!dayGroups.length) return null;

  return (
    <Card className="border-0 shadow-md shadow-primary/5">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="w-5 h-5" /> Timeline — Création en 3 jours
        </CardTitle>
        {start && (
          <p className="text-sm text-muted-foreground">
            Jour actuel : <span className="font-semibold text-primary">J{currentDay >= 0 ? currentDay : 0}</span>
            {" "}— Début : {new Date(start).toLocaleDateString("fr-FR")}
          </p>
        )}
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />

          <div className="space-y-6">
            {dayGroups.map(({ day, items }, gi) => {
              const doneCount = items.filter((t) => t.status === "termine").length;
              const allDone = doneCount === items.length;
              const isCurrentDay = currentDay === day;
              const isPast = currentDay > day;
              const dayDate = start
                ? new Date(new Date(start).getTime() + day * 86400000).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })
                : null;

              return (
                <motion.div
                  key={day}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: gi * 0.1 }}
                  className="relative pl-10"
                >
                  {/* Timeline dot */}
                  <div className={`absolute left-2 top-1 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    allDone
                      ? "bg-success border-success text-success-foreground"
                      : isCurrentDay
                        ? "bg-primary border-primary text-primary-foreground animate-pulse"
                        : isPast
                          ? "bg-warning border-warning text-warning-foreground"
                          : "bg-muted border-border text-muted-foreground"
                  }`}>
                    {allDone ? (
                      <CheckCircle2 className="w-3 h-3" />
                    ) : isPast && !allDone ? (
                      <AlertTriangle className="w-3 h-3" />
                    ) : (
                      <Circle className="w-3 h-3" />
                    )}
                  </div>

                  {/* Day header */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-sm font-bold ${isCurrentDay ? "text-primary" : ""}`}>
                      Jour {day}
                    </span>
                    {dayDate && <span className="text-xs text-muted-foreground">({dayDate})</span>}
                    <Badge variant="outline" className={`text-xs ${allDone ? "bg-success/10 text-success border-success/20" : ""}`}>
                      {doneCount}/{items.length}
                    </Badge>
                    {isPast && !allDone && (
                      <Badge variant="outline" className="text-xs bg-warning/10 text-warning border-warning/20">
                        En retard
                      </Badge>
                    )}
                  </div>

                  {/* Tasks in this day */}
                  <div className="space-y-1">
                    {items.map((task) => {
                      // Extract category from description if present
                      const category = task.description?.match(/\[(.*?)\]/)?.[1] || "";
                      const categoryLabel = CHECKLIST_CATEGORY_LABELS[category] || "";

                      return (
                        <div
                          key={task.id}
                          className={`flex items-center gap-2 py-1 px-2 rounded text-sm transition-colors ${
                            task.status === "termine"
                              ? "text-muted-foreground line-through opacity-60"
                              : "hover:bg-muted/50"
                          }`}
                        >
                          {task.status === "termine" ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" />
                          ) : task.status === "en_cours" ? (
                            <Clock className="w-3.5 h-3.5 text-primary shrink-0" />
                          ) : (
                            <Circle className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          )}
                          <span className="flex-1">{task.title}</span>
                          {categoryLabel && (
                            <span className="text-xs text-muted-foreground">{categoryLabel}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
