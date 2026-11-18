import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { BellRing, Loader2, MailCheck, MailX, RefreshCw, Send } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useTeamMembers } from "@/hooks/use-team-comments";
import { invokeTaskReminders, useSyncReminderOpens, useTaskReminderLog } from "@/hooks/use-task-reminders";
import { MorningRemindersCard } from "@/components/support/MorningRemindersCard";

const fmt = (d: string) => new Date(d).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Indian/Reunion" });
const fmtDay = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString("fr-FR");

/** "Relances tâches" tab of the Support page: every individual overdue-task reminder email. */
export function TaskRemindersPanel() {
  const { hasRole } = useAuth();
  const isAdmin = hasRole("admin");
  const qc = useQueryClient();
  const { data: members } = useTeamMembers();
  const [agent, setAgent] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sendTarget, setSendTarget] = useState("all");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { data: rows, isLoading } = useTaskReminderLog();
  const sync = useSyncReminderOpens();

  const run = useMutation({
    mutationFn: () => invokeTaskReminders({ action: "run", ...(sendTarget !== "all" ? { assignee_id: sendTarget } : {}) }),
    onSuccess: (d: any) => {
      toast.success(`${d.sent} mail(s) de relance envoyé(s)${d.failed ? `, ${d.failed} en échec` : ""}${d.no_email ? `, ${d.no_email} membre(s) sans adresse de réception` : ""}`);
      qc.invalidateQueries({ queryKey: ["task-reminders"] });
    },
    onError: (e: any) => toast.error(e.message || "Envoi impossible"),
  });

  const nameOf = (id: string) => members?.find((m) => m.user_id === id)?.full_name || "Membre";
  const list = useMemo(() => (rows || []).filter((r) =>
    (agent === "all" || r.assignee_id === agent) &&
    (statusFilter === "all" || (statusFilter === "opened" ? r.status === "sent" && r.opened_at : statusFilter === "unopened" ? r.status === "sent" && !r.opened_at : r.status !== "sent")),
  ), [rows, agent, statusFilter]);
  const agents = useMemo(() => Array.from(new Set((rows || []).map((r) => r.assignee_id))), [rows]);
  const assignable = (members || []).filter((m) => m.roles.length);

  return (
    <div className="space-y-4">
      <MorningRemindersCard />

      <Card className="border-0 shadow-md shadow-primary/5">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0">
          <CardTitle className="flex items-center gap-2 text-lg"><BellRing className="h-5 w-5" /> Historique des relances</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={agent} onValueChange={setAgent}>
              <SelectTrigger className="h-9 w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les membres</SelectItem>
                {agents.map((id) => <SelectItem key={id} value={id}>{nameOf(id)}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="opened">Ouverts</SelectItem>
                <SelectItem value="unopened">Pas encore ouverts</SelectItem>
                <SelectItem value="problem">Échecs / sans adresse</SelectItem>
              </SelectContent>
            </Select>
            {sync.canSync && (
              <Button size="sm" variant="outline" onClick={() => sync.mutate()} disabled={sync.isPending}>
                {sync.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-1 h-4 w-4" />} Actualiser
              </Button>
            )}
            {isAdmin && (
              <>
                <Select value={sendTarget} onValueChange={setSendTarget}>
                  <SelectTrigger className="h-9 w-44"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toute l'équipe</SelectItem>
                    {assignable.map((m) => <SelectItem key={m.user_id} value={m.user_id}>{m.full_name || "Membre"}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button size="sm" onClick={() => setConfirmOpen(true)} disabled={run.isPending}>
                  {run.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Send className="mr-1 h-4 w-4" />} Relancer maintenant
                </Button>
              </>
            )}
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {isLoading ? <Skeleton className="h-32 w-full" /> : list.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Aucune relance pour le moment.</p>
          ) : (
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pr-3">Date d'envoi</th><th className="py-2 pr-3">Membre</th><th className="py-2 pr-3">Tâche relancée</th>
                  <th className="py-2 pr-3">Type</th><th className="py-2 pr-3">Statut</th><th className="py-2">Ouverture</th>
                </tr>
              </thead>
              <tbody>
                {list.map((r) => (
                  <tr key={r.id} className="border-b border-border/60 align-top">
                    <td className="py-2.5 pr-3 whitespace-nowrap">{fmt(r.created_at)}</td>
                    <td className="py-2.5 pr-3"><span className="font-medium">{r.recipient_name || nameOf(r.assignee_id)}</span>{r.recipient_email && <span className="block text-xs text-muted-foreground">{r.recipient_email}</span>}</td>
                    <td className="py-2.5 pr-3">
                      {r.task_title ? (
                        <>
                          <span className="font-medium">{r.task_title}</span>
                          <span className="block text-xs text-muted-foreground">
                            {r.project_id ? <Link to={`/projets/${r.project_id}`} className="hover:underline">{r.project_name || "Projet"}</Link> : r.project_name}
                            {r.client_name ? ` · ${r.client_name}` : ""}{r.task_due_date ? ` · échéance ${fmtDay(r.task_due_date)}` : ""}
                          </span>
                        </>
                      ) : r.status === "no_email" ? (
                        <span className="text-xs text-muted-foreground">{r.task_count} tâche(s) en retard non relancée(s)</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Ancien récapitulatif · {r.task_count} tâches{r.oldest_due_date ? ` (plus ancienne ${fmtDay(r.oldest_due_date)})` : ""}</span>
                      )}
                    </td>
                    <td className="py-2.5 pr-3"><Badge variant="outline">{r.trigger === "auto" ? "Matinale" : "Manuelle"}</Badge></td>
                    <td className="py-2.5 pr-3">
                      {r.status === "sent" ? <Badge variant="secondary">Envoyé</Badge> : (
                        <>
                          <Badge variant="destructive" title={r.error_message || ""}>{r.status === "no_email" ? "Adresse à renseigner" : "Échec"}</Badge>
                          {r.status === "no_email" && <Link to="/performance?vue=attributions" className="mt-1 block text-[11px] text-primary hover:underline">Renseigner l'adresse</Link>}
                        </>
                      )}
                    </td>
                    <td className="py-2.5 text-xs">
                      {r.status !== "sent" ? "—" : r.opened_at
                        ? <span className="flex items-center gap-1 text-success"><MailCheck className="h-4 w-4" /> Ouvert le {fmt(r.opened_at)}</span>
                        : <span className="flex items-center gap-1 text-muted-foreground"><MailX className="h-4 w-4" /> Pas encore ouvert</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Envoyer la relance maintenant ?</AlertDialogTitle>
            <AlertDialogDescription>
              {sendTarget === "all"
                ? "Chaque membre ayant des tâches en retard recevra tout de suite jusqu'à 10 mails, un par tâche, à son adresse de réception."
                : `${nameOf(sendTarget)} recevra tout de suite jusqu'à 10 mails, un par tâche en retard, à son adresse de réception.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => run.mutate()}>Envoyer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
