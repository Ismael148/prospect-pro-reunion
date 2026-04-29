import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, RefreshCw, Search } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

type Range = "24h" | "7d" | "30d" | "all";

const RANGES: Record<Range, number | null> = { "24h": 1, "7d": 7, "30d": 30, all: null };

function rangeToDate(r: Range): string | null {
  const days = RANGES[r];
  if (days == null) return null;
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

function statusBadge(s: string) {
  const map: Record<string, string> = {
    sent: "bg-emerald-100 text-emerald-700 border-emerald-300",
    delivered: "bg-emerald-100 text-emerald-700 border-emerald-300",
    opened: "bg-green-100 text-green-700 border-green-300",
    clicked: "bg-violet-100 text-violet-700 border-violet-300",
    pending: "bg-yellow-100 text-yellow-700 border-yellow-300",
    suppressed: "bg-orange-100 text-orange-700 border-orange-300",
    dlq: "bg-red-100 text-red-700 border-red-300",
    failed: "bg-red-100 text-red-700 border-red-300",
    bounced: "bg-red-100 text-red-700 border-red-300",
    spam: "bg-red-100 text-red-700 border-red-300",
    blocked: "bg-red-100 text-red-700 border-red-300",
  };
  return <Badge className={map[s] || "bg-muted text-muted-foreground"}>{s}</Badge>;
}

export default function EmailsLog() {
  const [range, setRange] = useState<Range>("7d");
  const [template, setTemplate] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [search, setSearch] = useState("");

  const since = useMemo(() => rangeToDate(range), [range]);

  const { data: rawLogs, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["emails-log", since],
    queryFn: async () => {
      let q = supabase
        .from("email_send_log")
        .select("id, message_id, recipient_email, recipient_name, subject, status, error_message, created_at, template_name, campaign_name")
        .order("created_at", { ascending: false })
        .limit(500);
      if (since) q = q.gte("created_at", since);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  // Dedup by message_id (latest first)
  const logs = useMemo(() => {
    if (!rawLogs) return [];
    const map = new Map<string, any>();
    for (const e of rawLogs) {
      const key = e.message_id || e.id;
      if (!map.has(key)) map.set(key, e);
    }
    return Array.from(map.values());
  }, [rawLogs]);

  const templates = useMemo(() => {
    const set = new Set<string>();
    logs.forEach((l) => l.template_name && set.add(l.template_name));
    return Array.from(set).sort();
  }, [logs]);

  const filtered = useMemo(() => {
    return logs.filter((l) => {
      if (template !== "all" && l.template_name !== template) return false;
      if (status !== "all" && l.status !== status) return false;
      if (search) {
        const s = search.toLowerCase();
        if (
          !l.recipient_email?.toLowerCase().includes(s) &&
          !l.subject?.toLowerCase().includes(s) &&
          !l.template_name?.toLowerCase().includes(s)
        ) return false;
      }
      return true;
    });
  }, [logs, template, status, search]);

  const stats = useMemo(() => {
    const s = { total: 0, sent: 0, failed: 0, suppressed: 0 };
    filtered.forEach((l) => {
      s.total++;
      if (["sent", "delivered", "opened", "clicked"].includes(l.status)) s.sent++;
      else if (["failed", "dlq", "bounced", "blocked", "spam"].includes(l.status)) s.failed++;
      else if (l.status === "suppressed") s.suppressed++;
    });
    return s;
  }, [filtered]);

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Mail className="w-7 h-7 text-primary" /> Notifications · Emails
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Historique centralisé de tous les emails envoyés (tutos GMB/FB, factures, support, campagnes).
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? "animate-spin" : ""}`} /> Rafraîchir
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Total</div><div className="text-2xl font-bold">{stats.total}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Envoyés</div><div className="text-2xl font-bold text-emerald-600">{stats.sent}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Échecs</div><div className="text-2xl font-bold text-red-600">{stats.failed}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Supprimés</div><div className="text-2xl font-bold text-orange-600">{stats.suppressed}</div></CardContent></Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Filtres</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Select value={range} onValueChange={(v) => setRange(v as Range)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Dernières 24h</SelectItem>
              <SelectItem value="7d">7 derniers jours</SelectItem>
              <SelectItem value="30d">30 derniers jours</SelectItem>
              <SelectItem value="all">Tout</SelectItem>
            </SelectContent>
          </Select>
          <Select value={template} onValueChange={setTemplate}>
            <SelectTrigger><SelectValue placeholder="Template" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les templates</SelectItem>
              {templates.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger><SelectValue placeholder="Statut" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="sent">Envoyé</SelectItem>
              <SelectItem value="delivered">Délivré</SelectItem>
              <SelectItem value="opened">Ouvert</SelectItem>
              <SelectItem value="clicked">Cliqué</SelectItem>
              <SelectItem value="failed">Échec</SelectItem>
              <SelectItem value="bounced">Bounce</SelectItem>
              <SelectItem value="suppressed">Supprimé</SelectItem>
            </SelectContent>
          </Select>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Rechercher email, sujet..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {/* Logs */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">{filtered.length} email(s)</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Chargement...</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Aucun email pour ces filtres.</p>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {filtered.map((l) => (
                <div key={l.id} className="p-3 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 transition-colors">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {l.template_name && <Badge variant="outline" className="text-[10px]">{l.template_name}</Badge>}
                        {statusBadge(l.status)}
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(l.created_at), { addSuffix: true, locale: fr })}
                        </span>
                      </div>
                      <p className="text-sm font-medium mt-1 truncate">{l.subject || "(sans objet)"}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        → <strong>{l.recipient_name || l.recipient_email}</strong>
                        {l.recipient_name && <span className="ml-1 opacity-70">&lt;{l.recipient_email}&gt;</span>}
                      </p>
                      {l.error_message && (
                        <p className="text-xs text-red-600 mt-1 bg-red-50 px-2 py-1 rounded">⚠ {l.error_message}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
