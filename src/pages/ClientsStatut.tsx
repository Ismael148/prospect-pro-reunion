import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { AlertTriangle, CalendarClock, LifeBuoy, MessageSquare, Search, LayoutGrid } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { useOpenTasks } from "@/hooks/use-tasks-agenda";
import { useTeamComments, useTeamMembers } from "@/hooks/use-team-comments";
import { addDays, isTaskOverdue, reunionToday } from "@/lib/task-tracking";
import { getTicketTracking } from "@/lib/support-tracking";
import { isUnreadTeamNote } from "@/lib/team-comments";

type Row = {
  id: string;
  name: string;
  ndi: string | null;
  overdue: number;
  oldestOverdue: string | null;
  upcoming: number;
  nextDue: string | null;
  tickets: { id: string; number: string; subject: string; created_at: string; late: boolean }[];
  comments: { id: string; author: string; text: string; at: string }[];
};

type View = "all" | "retard" | "bientot" | "tickets" | "commentaires";

const fmt = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
const ago = (d: string) => formatDistanceToNow(new Date(d), { addSuffix: true, locale: fr });

export default function ClientsStatut() {
  const { user } = useAuth();
  const today = reunionToday();
  const in7 = addDays(today, 7);
  const [view, setView] = useState<View>("all");
  const [search, setSearch] = useState("");

  const tasksQ = useOpenTasks();
  const commentsQ = useTeamComments();
  const { data: members } = useTeamMembers();
  const ticketsQ = useQuery({
    queryKey: ["clients-status", "tickets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_tickets")
        .select("id, ticket_number, subject, status, created_at, first_response_at, resolved_at, client_id, clients(company_name, ndi)")
        .in("status", ["ouvert", "en_cours"])
        .is("first_response_at", null)
        .not("client_id", "is", null)
        .order("created_at", { ascending: true })
        .limit(1000);
      if (error) throw error;
      return data || [];
    },
  });

  const rows = useMemo(() => {
    const map = new Map<string, Row>();
    const get = (id: string, name?: string | null, ndi?: string | null) => {
      let r = map.get(id);
      if (!r) {
        r = { id, name: name || "Client", ndi: ndi || null, overdue: 0, oldestOverdue: null, upcoming: 0, nextDue: null, tickets: [], comments: [] };
        map.set(id, r);
      }
      return r;
    };
    for (const t of tasksQ.data || []) {
      if (!t.client_id || !t.due_date) continue;
      if (isTaskOverdue(t, today)) {
        const r = get(t.client_id, t.client_name, t.client_ndi);
        r.overdue++;
        if (!r.oldestOverdue || t.due_date < r.oldestOverdue) r.oldestOverdue = t.due_date;
      } else if (t.due_date >= today && t.due_date <= in7) {
        const r = get(t.client_id, t.client_name, t.client_ndi);
        r.upcoming++;
        if (!r.nextDue || t.due_date < r.nextDue) r.nextDue = t.due_date;
      }
    }
    for (const t of ticketsQ.data || []) {
      const tr = getTicketTracking(t as any);
      if (tr.responseState !== "en_attente" && tr.responseState !== "en_retard") continue;
      const r = get(t.client_id!, (t as any).clients?.company_name, (t as any).clients?.ndi);
      r.tickets.push({ id: t.id, number: t.ticket_number, subject: t.subject, created_at: t.created_at, late: tr.responseState === "en_retard" });
    }
    for (const n of commentsQ.data || []) {
      if (!isUnreadTeamNote(n, user?.id)) continue;
      const r = get(n.client_id, n.client?.company_name, n.client?.ndi);
      r.comments.push({
        id: n.id,
        author: members?.find((m) => m.user_id === n.user_id)?.full_name || "Un membre",
        text: (n.description || "").replace(/@\[([^\]]+)\]/g, "@$1"),
        at: n.created_at,
      });
    }
    return Array.from(map.values());
  }, [tasksQ.data, ticketsQ.data, commentsQ.data, members, user?.id, today, in7]);

  const counts = {
    retard: rows.filter((r) => r.overdue).length,
    bientot: rows.filter((r) => r.upcoming).length,
    tickets: rows.filter((r) => r.tickets.length).length,
    commentaires: rows.filter((r) => r.comments.length).length,
  };

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = rows.filter((r) => {
      if (view === "retard" && !r.overdue) return false;
      if (view === "bientot" && !r.upcoming) return false;
      if (view === "tickets" && !r.tickets.length) return false;
      if (view === "commentaires" && !r.comments.length) return false;
      if (q && !`${r.name} ${r.ndi || ""}`.toLowerCase().includes(q)) return false;
      return true;
    });
    const sorters: Record<View, (a: Row, b: Row) => number> = {
      all: (a, b) => (b.comments.length * 3 + b.tickets.length * 3 + b.overdue) - (a.comments.length * 3 + a.tickets.length * 3 + a.overdue),
      retard: (a, b) => (a.oldestOverdue || "").localeCompare(b.oldestOverdue || ""),
      bientot: (a, b) => (a.nextDue || "").localeCompare(b.nextDue || ""),
      tickets: (a, b) => a.tickets[0].created_at.localeCompare(b.tickets[0].created_at),
      commentaires: (a, b) => b.comments[0].at.localeCompare(a.comments[0].at),
    };
    list = list.sort(sorters[view]);
    return list;
  }, [rows, view, search]);

  const loading = tasksQ.isLoading || ticketsQ.isLoading || commentsQ.isLoading;

  const tiles: { id: View; label: string; icon: any; count: number; tone: string }[] = [
    { id: "all", label: "Vue d'ensemble", icon: LayoutGrid, count: rows.length, tone: "" },
    { id: "retard", label: "Tâches en retard", icon: AlertTriangle, count: counts.retard, tone: "text-destructive" },
    { id: "bientot", label: "Échéance sous 7 jours", icon: CalendarClock, count: counts.bientot, tone: "text-primary" },
    { id: "tickets", label: "Tickets sans réponse", icon: LifeBuoy, count: counts.tickets, tone: "text-destructive" },
    { id: "commentaires", label: "Commentaires non lus", icon: MessageSquare, count: counts.commentaires, tone: "text-primary" },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Clients par statut</h1>
        <p className="text-sm text-muted-foreground">Les clients qui demandent votre attention : tâches à échéance, tickets sans réponse et commentaires de l'équipe non lus.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {tiles.map((t) => (
          <button key={t.id} onClick={() => setView(t.id)}
            className={`rounded-xl border p-3 text-left transition-colors ${view === t.id ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/40"}`}>
            <t.icon className={`mb-1 h-4 w-4 ${t.tone || "text-muted-foreground"}`} />
            <p className="text-2xl font-bold">{loading ? "…" : t.count}</p>
            <p className="text-xs text-muted-foreground">{t.label}</p>
          </button>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un client ou un numéro CLI…" className="pl-9" />
      </div>

      {loading ? (
        <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
      ) : visible.length === 0 ? (
        <Card className="border-dashed"><CardContent className="py-12 text-center text-sm text-muted-foreground">Aucun client dans cette catégorie 🎉</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {visible.slice(0, 200).map((r) => (
            <Link key={r.id} to={`/clients/${r.id}`} className="block">
              <Card className="shadow-sm transition-colors hover:border-primary/40">
                <CardContent className="space-y-2 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{r.name}</span>
                    {r.ndi && <span className="text-xs text-muted-foreground">{r.ndi}</span>}
                    <div className="ml-auto flex flex-wrap gap-1.5">
                      {r.comments.length > 0 && <Badge className="gap-1"><MessageSquare className="h-3 w-3" />{r.comments.length} non lu{r.comments.length > 1 ? "s" : ""}</Badge>}
                      {r.tickets.length > 0 && <Badge variant="destructive" className="gap-1"><LifeBuoy className="h-3 w-3" />{r.tickets.length} ticket{r.tickets.length > 1 ? "s" : ""} sans réponse</Badge>}
                      {r.overdue > 0 && <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />{r.overdue} en retard</Badge>}
                      {r.upcoming > 0 && <Badge variant="secondary" className="gap-1"><CalendarClock className="h-3 w-3" />{r.upcoming} sous 7 j</Badge>}
                    </div>
                  </div>
                  <div className="grid gap-1 text-xs text-muted-foreground">
                    {r.comments[0] && (view === "all" || view === "commentaires") && (
                      <p className="truncate"><span className="font-medium text-foreground">💬 {r.comments[0].author}</span> · {ago(r.comments[0].at)} — {r.comments[0].text}</p>
                    )}
                    {r.tickets[0] && (view === "all" || view === "tickets") && (
                      <p className="truncate">🎫 {r.tickets[0].number} · ouvert {ago(r.tickets[0].created_at)} — {r.tickets[0].subject}</p>
                    )}
                    {r.oldestOverdue && (view === "all" || view === "retard") && <p>⏰ Plus ancienne échéance dépassée : {fmt(r.oldestOverdue)}</p>}
                    {r.nextDue && (view === "all" || view === "bientot") && <p>📅 Prochaine échéance : {fmt(r.nextDue)}</p>}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
          {visible.length > 200 && <p className="text-center text-xs text-muted-foreground">200 premiers clients affichés sur {visible.length} — affinez avec la recherche.</p>}
        </div>
      )}
    </div>
  );
}
