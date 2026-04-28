import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Palette, Search, Send, Loader2, Clock, CheckCircle2, MapPin, ExternalLink, History } from "lucide-react";
import { useLogoClients, useLogoReminders, useSendLogoReminder, type LogoClient } from "@/hooks/use-logo-tracking";
import { useAgents } from "@/hooks/use-agents";

const fmt = (d?: string | null) =>
  d ? new Date(d).toLocaleString("fr-FR", { timeZone: "Indian/Reunion", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString("fr-FR", { timeZone: "Indian/Reunion", day: "2-digit", month: "2-digit", year: "numeric" }) : "—";

const stepOf = (c: LogoClient): { key: string; label: string; color: string } => {
  if (c.logo_validated_by_client) return { key: "validated", label: "Validé client", color: "bg-success/15 text-success border-success/30" };
  if (c.logo_published_gmb) return { key: "published", label: "Publié GMB", color: "bg-blue-500/15 text-blue-600 border-blue-500/30" };
  if (c.logo_created) return { key: "created", label: "Créé", color: "bg-amber-500/15 text-amber-600 border-amber-500/30" };
  return { key: "todo", label: "À créer", color: "bg-muted text-muted-foreground" };
};

export default function LogoDashboard() {
  const navigate = useNavigate();
  const { data: clients = [], isLoading } = useLogoClients();
  const { data: reminders = [] } = useLogoReminders();
  const { data: agents = [] } = useAgents();
  const sendReminder = useSendLogoReminder();

  const [search, setSearch] = useState("");
  const [stepFilter, setStepFilter] = useState("pending"); // pending = not validated
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [reminderFilter, setReminderFilter] = useState("all");

  const profileMap = useMemo(() => {
    const m = new Map<string, any>();
    agents.forEach((a: any) => m.set(a.user_id, a));
    return m;
  }, [agents]);

  const filtered = useMemo(() => {
    const now = Date.now();
    return clients.filter((c) => {
      const s = stepOf(c).key;
      if (stepFilter === "pending" && c.logo_validated_by_client) return false;
      if (stepFilter !== "all" && stepFilter !== "pending" && stepFilter !== s) return false;
      if (assigneeFilter !== "all" && c.assigned_to !== assigneeFilter) return false;
      if (search && !c.company_name.toLowerCase().includes(search.toLowerCase()) && !(c.ndi || "").toLowerCase().includes(search.toLowerCase())) return false;
      if (reminderFilter !== "all") {
        const last = c.logo_reminder_last_sent ? new Date(c.logo_reminder_last_sent).getTime() : 0;
        const diffDays = last ? (now - last) / 86400000 : Infinity;
        if (reminderFilter === "never" && last) return false;
        if (reminderFilter === "due" && diffDays < 2) return false;
        if (reminderFilter === "recent" && diffDays >= 2) return false;
      }
      return true;
    });
  }, [clients, search, stepFilter, assigneeFilter, reminderFilter]);

  const stats = useMemo(() => {
    const pending = clients.filter((c) => !c.logo_validated_by_client);
    return {
      total: clients.length,
      pending: pending.length,
      todo: pending.filter((c) => !c.logo_created).length,
      created: pending.filter((c) => c.logo_created && !c.logo_published_gmb).length,
      published: pending.filter((c) => c.logo_published_gmb).length,
      validated: clients.filter((c) => c.logo_validated_by_client).length,
    };
  }, [clients]);

  const remindersByClient = useMemo(() => {
    const m = new Map<string, number>();
    reminders.forEach((r) => m.set(r.client_id, (m.get(r.client_id) || 0) + 1));
    return m;
  }, [reminders]);

  const clientName = (id: string) => clients.find((c) => c.id === id)?.company_name || "Client";

  return (
    <div className="space-y-4">
      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="Total" value={stats.total} icon={Palette} color="text-foreground" />
        <StatCard label="À créer" value={stats.todo} icon={Clock} color="text-muted-foreground" />
        <StatCard label="Créés" value={stats.created} icon={Palette} color="text-amber-600" />
        <StatCard label="Publiés" value={stats.published} icon={MapPin} color="text-blue-600" />
        <StatCard label="Validés" value={stats.validated} icon={CheckCircle2} color="text-success" />
      </div>

      <Tabs defaultValue="dashboard" className="space-y-4">
        <TabsList>
          <TabsTrigger value="dashboard"><Palette className="w-4 h-4 mr-2" />Suivi</TabsTrigger>
          <TabsTrigger value="history"><History className="w-4 h-4 mr-2" />Historique relances</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Recherche client/NDI..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
                </div>
                <Select value={stepFilter} onValueChange={setStepFilter}>
                  <SelectTrigger><SelectValue placeholder="Étape" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les étapes</SelectItem>
                    <SelectItem value="pending">En attente (non validés)</SelectItem>
                    <SelectItem value="todo">À créer</SelectItem>
                    <SelectItem value="created">Créé</SelectItem>
                    <SelectItem value="published">Publié GMB</SelectItem>
                    <SelectItem value="validated">Validé client</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
                  <SelectTrigger><SelectValue placeholder="Responsable" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous responsables</SelectItem>
                    {agents.map((a: any) => (
                      <SelectItem key={a.user_id} value={a.user_id}>{a.full_name || "—"}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={reminderFilter} onValueChange={setReminderFilter}>
                  <SelectTrigger><SelectValue placeholder="Relance" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes relances</SelectItem>
                    <SelectItem value="never">Jamais relancé</SelectItem>
                    <SelectItem value="due">Relance due (≥ 2j)</SelectItem>
                    <SelectItem value="recent">Récente ({"<"} 2j)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* List */}
          <Card>
            <CardHeader><CardTitle className="text-base">{filtered.length} client(s)</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {isLoading && <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>}
              {!isLoading && filtered.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Aucun client correspondant</p>}
              {filtered.map((c) => {
                const step = stepOf(c);
                const responsible = c.assigned_to ? profileMap.get(c.assigned_to) : null;
                const reminderCount = remindersByClient.get(c.id) || 0;
                return (
                  <div key={c.id} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                    <div className="flex-1 cursor-pointer" onClick={() => navigate(`/clients/${c.id}`)}>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm">{c.company_name}</p>
                        {c.ndi && <span className="text-[10px] text-muted-foreground">{c.ndi}</span>}
                        <Badge variant="outline" className={step.color}>{step.label}</Badge>
                        {c.logo_file_url && <Badge variant="outline" className="text-[10px]">📎 Fichier</Badge>}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground flex-wrap">
                        <span>Dernière relance : {fmt(c.logo_reminder_last_sent)}</span>
                        <span>· {reminderCount} relance(s)</span>
                        {responsible && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Avatar className="w-5 h-5 inline-block">
                                  <AvatarImage src={responsible.avatar_url} />
                                  <AvatarFallback className="text-[9px]">{(responsible.full_name || "?").charAt(0)}</AvatarFallback>
                                </Avatar>
                              </TooltipTrigger>
                              <TooltipContent>{responsible.full_name}</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    </div>
                    {!c.logo_validated_by_client && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={sendReminder.isPending}
                        onClick={() => sendReminder.mutate(c.id)}
                      >
                        {sendReminder.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                        <span className="ml-1 hidden sm:inline">Relancer</span>
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => navigate(`/clients/${c.id}`)}>
                      <ExternalLink className="w-3 h-3" />
                    </Button>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-2">
          <Card>
            <CardHeader><CardTitle className="text-base">Historique des relances ({reminders.length})</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {reminders.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Aucune relance envoyée pour le moment</p>}
              {reminders.map((r) => (
                <div key={r.id} className="p-3 rounded-lg border bg-muted/20">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant={r.trigger_type === "manual" ? "default" : "outline"}>
                        {r.trigger_type === "manual" ? "Manuelle" : "Auto J+2"}
                      </Badge>
                      <span className="font-medium text-sm cursor-pointer hover:underline" onClick={() => navigate(`/clients/${r.client_id}`)}>
                        {clientName(r.client_id)}
                      </span>
                      <span className="text-[11px] text-muted-foreground">étape : {r.step}</span>
                    </div>
                    <span className="text-[11px] text-muted-foreground">{fmt(r.sent_at)} · {r.recipients_count} dest.</span>
                  </div>
                  {r.message && <p className="text-xs text-muted-foreground mt-1">{r.message}</p>}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: any; color: string }) {
  return (
    <Card>
      <CardContent className="pt-6 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
          </div>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
      </CardContent>
    </Card>
  );
}
