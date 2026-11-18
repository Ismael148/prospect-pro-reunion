import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BellRing, Loader2, MailCheck, MailX, RefreshCw, Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
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

const fmt = (d: string) => new Date(d).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Indian/Reunion" });
const fmtDay = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString("fr-FR");

async function invoke(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("task-overdue-reminders", { body });
  if (error) {
    const ctx = (error as any).context;
    const detail = ctx instanceof Response ? await ctx.json().catch(() => null) : null;
    throw new Error(detail?.error || error.message);
  }
  if (!data?.success) throw new Error(data?.error || "Erreur");
  return data;
}

/** "Relances tâches" tab of the Support page: history of the overdue-task reminder emails. */
export function TaskRemindersPanel() {
  const { hasRole } = useAuth();
  const isAdmin = hasRole("admin");
  const canSync = isAdmin || hasRole("agent_master") || hasRole("agent_support");
  const qc = useQueryClient();
  const { data: members } = useTeamMembers();
  const [agent, setAgent] = useState("all");
  const [sendTarget, setSendTarget] = useState("all");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { data: rows, isLoading } = useQuery({
    queryKey: ["task-reminders"],
    queryFn: async () => {
      const { data, error } = await supabase.from("task_reminder_log").select("*").order("created_at", { ascending: false }).limit(300);
      if (error) throw error;
      return data || [];
    },
  });

  const sync = useMutation({
    mutationFn: () => invoke({ action: "sync" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["task-reminders"] }),
  });
  const synced = useRef(false);
  useEffect(() => {
    if (canSync && !synced.current) { synced.current = true; sync.mutate(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canSync]);

  const run = useMutation({
    mutationFn: () => invoke({ action: "run", ...(sendTarget !== "all" ? { assignee_id: sendTarget } : {}) }),
    onSuccess: (d: any) => {
      toast.success(`${d.sent} relance(s) envoyée(s)${d.failed ? `, ${d.failed} en échec` : ""}${d.no_email ? `, ${d.no_email} sans adresse` : ""}`);
      qc.invalidateQueries({ queryKey: ["task-reminders"] });
    },
    onError: (e: any) => toast.error(e.message || "Envoi impossible"),
  });

  const nameOf = (id: string) => members?.find((m) => m.user_id === id)?.full_name || "Membre";
  const list = useMemo(() => (rows || []).filter((r: any) => agent === "all" || r.assignee_id === agent), [rows, agent]);
  const agents = useMemo(() => Array.from(new Set((rows || []).map((r: any) => r.assignee_id))), [rows]);

  const since30 = Date.now() - 30 * 86_400_000;
  const recent = (rows || []).filter((r: any) => r.status === "sent" && Date.parse(r.created_at) >= since30);
  const opened = recent.filter((r: any) => r.opened_at).length;
  const lastAuto = (rows || []).find((r: any) => r.trigger === "auto");
  const assignable = (members || []).filter((m) => m.roles.length);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="border-0 shadow-md shadow-primary/5"><CardContent className="p-4">
          <p className="text-2xl font-bold">{recent.length}</p><p className="text-xs text-muted-foreground">Relances envoyées (30 j)</p>
        </CardContent></Card>
        <Card className="border-0 shadow-md shadow-primary/5"><CardContent className="p-4">
          <p className="text-2xl font-bold">{recent.length ? Math.round((opened / recent.length) * 100) : 0}%</p><p className="text-xs text-muted-foreground">Mails ouverts ({opened}/{recent.length})</p>
        </CardContent></Card>
        <Card className="border-0 shadow-md shadow-primary/5"><CardContent className="p-4">
          <p className="text-sm font-bold leading-8">{lastAuto ? fmt(lastAuto.created_at) : "Pas encore"}</p><p className="text-xs text-muted-foreground">Dernière relance automatique</p>
        </CardContent></Card>
        <Card className="border-0 shadow-md shadow-primary/5"><CardContent className="p-4">
          <p className="text-sm font-bold leading-8">Jours ouvrés à 8 h</p><p className="text-xs text-muted-foreground">Envoi automatique</p>
        </CardContent></Card>
      </div>

      <Card className="border-0 shadow-md shadow-primary/5">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0">
          <CardTitle className="flex items-center gap-2 text-lg"><BellRing className="h-5 w-5" /> Relances des tâches en retard</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={agent} onValueChange={setAgent}>
              <SelectTrigger className="h-9 w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les membres</SelectItem>
                {agents.map((id) => <SelectItem key={id} value={id}>{nameOf(id)}</SelectItem>)}
              </SelectContent>
            </Select>
            {canSync && (
              <Button size="sm" variant="outline" onClick={() => sync.mutate()} disabled={sync.isPending}>
                {sync.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-1 h-4 w-4" />} Actualiser
              </Button>
            )}
            {isAdmin && (
              <>
                <Select value={sendTarget} onValueChange={setSendTarget}>
                  <SelectTrigger className="h-9 w-48"><SelectValue /></SelectTrigger>
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
            <p className="py-8 text-center text-sm text-muted-foreground">Aucune relance pour le moment. La première partira le prochain jour ouvré à 8 h.</p>
          ) : (
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pr-3">Date</th><th className="py-2 pr-3">Membre</th><th className="py-2 pr-3">Tâches en retard</th>
                  <th className="py-2 pr-3">Type</th><th className="py-2 pr-3">Envoi</th><th className="py-2">Ouverture</th>
                </tr>
              </thead>
              <tbody>
                {list.map((r: any) => (
                  <tr key={r.id} className="border-b border-border/60">
                    <td className="py-2.5 pr-3 whitespace-nowrap">{fmt(r.created_at)}</td>
                    <td className="py-2.5 pr-3"><span className="font-medium">{r.recipient_name || nameOf(r.assignee_id)}</span>{r.recipient_email && <span className="block text-xs text-muted-foreground">{r.recipient_email}</span>}</td>
                    <td className="py-2.5 pr-3"><span className="font-semibold">{r.task_count}</span>{r.oldest_due_date && <span className="block text-xs text-muted-foreground">plus ancienne : {fmtDay(r.oldest_due_date)}</span>}</td>
                    <td className="py-2.5 pr-3"><Badge variant="outline">{r.trigger === "auto" ? "Automatique" : "Manuelle"}</Badge></td>
                    <td className="py-2.5 pr-3">
                      {r.status === "sent" ? <Badge variant="secondary">Envoyé</Badge> : <Badge variant="destructive" title={r.error_message || ""}>{r.status === "no_email" ? "Pas d'adresse" : "Échec"}</Badge>}
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
                ? "Chaque membre de l'équipe ayant des tâches en retard recevra tout de suite son mail récapitulatif."
                : `${nameOf(sendTarget)} recevra tout de suite son mail récapitulatif s'il a des tâches en retard.`}
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
