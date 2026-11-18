import { useMemo } from "react";
import { Link } from "react-router-dom";
import { BarChart3, CheckCircle2, LifeBuoy, MessageSquare, MailOpen, RefreshCw, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { useGlobalStats, useSyncPresentationOpens } from "@/hooks/use-global-stats";
import { useUnreadTeamCommentsCount } from "@/hooks/use-team-comments";
import { AgentTrackingTable } from "@/components/team/AgentTrackingTable";
import { MorningRemindersCard } from "@/components/support/MorningRemindersCard";
import { useSyncReminderOpens } from "@/hooks/use-task-reminders";
import { computeGlobalTaskRate } from "@/lib/agent-tracking";
import { reunionToday } from "@/lib/task-tracking";
import { getTicketTracking, RESPONSE_TARGET_HOURS } from "@/lib/support-tracking";
import { summarizeTracking } from "@/lib/email-tracking";

export default function StatsGlobales() {
  const { hasRole } = useAuth();
  const isAdmin = hasRole("admin");
  const { data, isLoading } = useGlobalStats();
  const unreadComments = useUnreadTeamCommentsCount();
  const today = reunionToday();

  const tasks = useMemo(() => computeGlobalTaskRate(data?.tasks || [], today), [data, today]);
  const tickets = useMemo(() => {
    const states = (data?.tickets || []).map((t) => getTicketTracking(t).responseState);
    return { waiting: states.filter((s) => s === "en_attente").length, late: states.filter((s) => s === "en_retard").length };
  }, [data]);
  const presentations = useMemo(() => {
    const list = data?.presentations || [];
    return summarizeTracking(list.map((p) => p.tracking ?? { status: "sent", delivered_at: null, open_count: 0, click_count: 0 }));
  }, [data]);
  const clientIds = useMemo(
    () => Array.from(new Set((data?.presentations || []).map((p) => p.client_id).filter(Boolean) as string[])),
    [data],
  );
  const sync = useSyncPresentationOpens(clientIds);
  useSyncReminderOpens();
  const openedPct = presentations.sent ? Math.round((presentations.opened / presentations.sent) * 100) : 0;

  const tiles = [
    {
      icon: CheckCircle2, label: "Tâches terminées", value: `${tasks.completionRate ?? 0}%`,
      sub: `${tasks.done} sur ${tasks.total} · ${tasks.overdue} en retard`, progress: tasks.completionRate ?? 0, to: "/agenda", cta: "Ouvrir l'Agenda",
    },
    {
      icon: LifeBuoy, label: "Tickets sans réponse", value: String(tickets.waiting + tickets.late),
      sub: `${tickets.late} au-delà de ${RESPONSE_TARGET_HOURS} h`, to: "/support", cta: "Ouvrir Support", danger: tickets.late > 0,
    },
    ...(isAdmin ? [{
      icon: MessageSquare, label: "Commentaires non lus", value: String(unreadComments),
      sub: "Commentaires de l'équipe sur les fiches clients", to: "/commentaires-equipe", cta: "Lire les commentaires",
    }] : []),
    {
      icon: MailOpen, label: "Mails de présentation ouverts", value: `${presentations.opened}/${presentations.sent}`,
      sub: `${openedPct}% ouverts · ${presentations.clicked} avec clic`, progress: openedPct, to: "/clients-decollage", cta: "Voir Clients Décollage",
    },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight"><BarChart3 className="h-6 w-6 text-primary" /> Stats globales</h1>
          <p className="text-sm text-muted-foreground">Les chiffres clés de l'agence, mis à jour en direct.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => sync.mutate()} disabled={sync.isPending || !clientIds.length}>
          {sync.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-1 h-4 w-4" />} Actualiser les ouvertures
        </Button>
      </div>

      <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${isAdmin ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
        {tiles.map((t) => (
          <Card key={t.label} className="border-0 shadow-md shadow-primary/5">
            <CardContent className="flex h-full flex-col gap-2 p-5">
              <t.icon className={`h-5 w-5 ${t.danger ? "text-destructive" : "text-primary"}`} />
              {isLoading ? <Skeleton className="h-8 w-20" /> : <p className={`text-3xl font-bold ${t.danger ? "text-destructive" : ""}`}>{t.value}</p>}
              <p className="text-sm font-medium">{t.label}</p>
              <p className="text-xs text-muted-foreground">{t.sub}</p>
              {"progress" in t && t.progress !== undefined && <Progress value={t.progress} className="h-1.5" />}
              <Link to={t.to} className="mt-auto pt-2 text-xs font-medium text-primary hover:underline">{t.cta} →</Link>
            </CardContent>
          </Card>
        ))}
      </div>

      <MorningRemindersCard showLink />

      <AgentTrackingTable />
    </div>
  );
}
