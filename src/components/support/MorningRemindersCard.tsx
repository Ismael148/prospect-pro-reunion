import { useMemo } from "react";
import { Link } from "react-router-dom";
import { AlarmClock, MailCheck, MailX } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useTaskReminderLog } from "@/hooks/use-task-reminders";
import { useTeamMembers } from "@/hooks/use-team-comments";
import {
  latestReminderDay, MEMBER_DAY_STATUS_LABELS, nextMorningRun, reminderOpenStats, summarizeReminderDay,
} from "@/lib/reminder-tracking";

const fmtTime = (d: string) => new Date(d).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "Indian/Reunion" });
const fmtDayLong = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });

/** Status of the latest morning reminder run, per member: status, send time, opens. */
export function MorningRemindersCard({ showLink = false }: { showLink?: boolean }) {
  const { data: rows, isLoading } = useTaskReminderLog();
  const { data: members } = useTeamMembers();
  const list = rows || [];
  const autoDay = latestReminderDay(list, "auto");
  const day = autoDay ?? latestReminderDay(list);
  const summary = useMemo(() => (day ? summarizeReminderDay(list, day, autoDay ? "auto" : undefined) : null), [list, day, autoDay]);
  const stats30 = useMemo(() => reminderOpenStats(list), [list]);
  const next = nextMorningRun();
  const nameOf = (id: string, fallback: string | null) => members?.find((m) => m.user_id === id)?.full_name || fallback || "Membre";

  return (
    <Card className="border-0 shadow-md shadow-primary/5">
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg"><AlarmClock className="h-5 w-5 text-primary" /> Relances matinales</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Un mail par tâche en retard (10 max. par membre), chaque jour ouvré à 8 h.
            Prochaine : <span className="font-medium text-foreground">{next.toLocaleString("fr-FR", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Indian/Reunion" })}</span>
          </p>
        </div>
        <div className="flex gap-4 text-right">
          <div><p className="text-2xl font-bold">{stats30.sent}</p><p className="text-xs text-muted-foreground">mails sur 30 j</p></div>
          <div><p className="text-2xl font-bold">{stats30.openRate ?? 0}%</p><p className="text-xs text-muted-foreground">ouverts ({stats30.opened})</p></div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? <Skeleton className="h-24 w-full" /> : !summary ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Aucune relance envoyée pour l'instant.</p>
        ) : (
          <>
            <p className="mb-3 text-sm">
              <span className="font-semibold capitalize">{fmtDayLong(summary.day)}</span>
              <span className="text-muted-foreground"> · {autoDay ? "relance automatique" : "envoi manuel (pas encore de relance automatique)"} · {summary.sent} mail{summary.sent > 1 ? "s" : ""} envoyé{summary.sent > 1 ? "s" : ""}{summary.failed ? `, ${summary.failed} en échec` : ""}</span>
            </p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="py-2 pr-3">Membre</th><th className="py-2 pr-3">Statut</th><th className="py-2 pr-3">Date d'envoi</th><th className="py-2">Ouverture</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.members.map((m) => (
                    <tr key={m.assignee_id} className="border-b border-border/60">
                      <td className="py-2.5 pr-3 font-medium">{nameOf(m.assignee_id, m.name)}</td>
                      <td className="py-2.5 pr-3">
                        <Badge variant={m.status === "envoye" ? "secondary" : "destructive"}>{MEMBER_DAY_STATUS_LABELS[m.status]}</Badge>
                        {m.sent > 0 && <span className="ml-2 text-xs text-muted-foreground">{m.sent} mail{m.sent > 1 ? "s" : ""}</span>}
                      </td>
                      <td className="py-2.5 pr-3 whitespace-nowrap text-xs">{m.firstSentAt ? fmtTime(m.firstSentAt) : "—"}</td>
                      <td className="w-48 py-2.5 text-xs">
                        {m.sent === 0 ? "—" : (
                          <div className="space-y-1">
                            <span className={`flex items-center gap-1 ${m.opened ? "text-success" : "text-muted-foreground"}`}>
                              {m.opened ? <MailCheck className="h-4 w-4" /> : <MailX className="h-4 w-4" />} {m.opened}/{m.sent} ouvert{m.opened > 1 ? "s" : ""}
                            </span>
                            <Progress value={(m.opened / m.sent) * 100} className="h-1" />
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
        {showLink && <Link to="/support?vue=relances" className="mt-3 inline-block text-xs font-medium text-primary hover:underline">Voir le détail dans Support →</Link>}
      </CardContent>
    </Card>
  );
}
