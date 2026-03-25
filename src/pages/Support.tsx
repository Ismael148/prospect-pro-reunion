import { useState, useMemo, useEffect } from "react";
import { useSupportTickets, useUpdateTicket } from "@/hooks/use-support";
import { useClients } from "@/hooks/use-clients";
import { useAuth } from "@/contexts/AuthContext";
import { PUBLISHED_URL } from "@/lib/constants";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Loader2, Search, LifeBuoy, Clock, CheckCircle, AlertCircle, XCircle,
  MessageSquare, ExternalLink, Copy, UserPlus,
} from "lucide-react";
import { motion } from "framer-motion";

const CATEGORY_LABELS: Record<string, string> = {
  modification_site: "Site Internet",
  modification_carte_nfc: "Carte NFC",
  fiche_google: "Fiche Google",
  reseaux_sociaux: "Réseaux sociaux",
  bug_technique: "Bug technique",
  question: "Question",
  autre: "Autre",
};

const STATUS_LABELS: Record<string, string> = {
  ouvert: "Ouvert",
  en_cours: "En cours",
  resolu: "Résolu",
  ferme: "Fermé",
};

const STATUS_COLORS: Record<string, string> = {
  ouvert: "bg-warning/10 text-warning border-warning/20",
  en_cours: "bg-primary/10 text-primary border-primary/20",
  resolu: "bg-success/10 text-success border-success/20",
  ferme: "bg-muted text-muted-foreground border-border",
};

const STATUS_ICONS: Record<string, typeof Clock> = {
  ouvert: AlertCircle,
  en_cours: Clock,
  resolu: CheckCircle,
  ferme: XCircle,
};

export default function Support() {
  const { user, hasRole } = useAuth();
  const isAdmin = hasRole("admin");
  const { data: tickets, isLoading } = useSupportTickets();
  const { data: clients } = useClients();
  const updateTicket = useUpdateTicket();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [adminNotes, setAdminNotes] = useState("");

  const getClientName = (clientId: string) =>
    clients?.find((c) => c.id === clientId)?.company_name || "—";

  const getClientSupportLink = (clientId: string) => {
    const client = clients?.find((c) => c.id === clientId);
    if (!client || !(client as any).support_token) return null;
    return `${PUBLISHED_URL}/s/${(client as any).support_token}`;
  };

  const filtered = useMemo(() => {
    return tickets?.filter((t) => {
      const matchSearch =
        t.subject.toLowerCase().includes(search.toLowerCase()) ||
        t.ticket_number.toLowerCase().includes(search.toLowerCase()) ||
        getClientName(t.client_id).toLowerCase().includes(search.toLowerCase());
      const matchStatus = filterStatus === "all" || t.status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [tickets, search, filterStatus, clients]);

  const stats = useMemo(() => {
    if (!tickets) return { ouvert: 0, en_cours: 0, resolu: 0, ferme: 0 };
    return {
      ouvert: tickets.filter((t) => t.status === "ouvert").length,
      en_cours: tickets.filter((t) => t.status === "en_cours").length,
      resolu: tickets.filter((t) => t.status === "resolu").length,
      ferme: tickets.filter((t) => t.status === "ferme").length,
    };
  }, [tickets]);

  const handleStatusChange = async (id: string, status: string) => {
    try {
      const updates: any = { id, status };
      if (status === "resolu") {
        updates.resolved_at = new Date().toISOString();
        updates.resolved_by = user!.id;
      }
      await updateTicket.mutateAsync(updates);
      toast.success(`Ticket ${STATUS_LABELS[status].toLowerCase()}`);
    } catch {
      toast.error("Erreur");
    }
  };

  const handleSaveNotes = async () => {
    if (!selectedTicket) return;
    try {
      await updateTicket.mutateAsync({ id: selectedTicket.id, admin_notes: adminNotes });
      toast.success("Notes enregistrées");
      setSelectedTicket({ ...selectedTicket, admin_notes: adminNotes });
    } catch {
      toast.error("Erreur");
    }
  };

  const copyLink = (link: string) => {
    navigator.clipboard.writeText(link);
    toast.success("Lien copié !");
  };

  return (
    <motion.div className="space-y-6" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Support Client</h1>
          <p className="text-muted-foreground text-sm mt-1">{tickets?.length || 0} ticket{(tickets?.length || 0) > 1 ? "s" : ""}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {(["ouvert", "en_cours", "resolu", "ferme"] as const).map((status) => {
          const Icon = STATUS_ICONS[status];
          return (
            <Card key={status} className="border-0 shadow-soft cursor-pointer" onClick={() => setFilterStatus(status)}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl ${STATUS_COLORS[status].split(" ")[0]}`}>
                    <Icon className={`w-5 h-5 ${STATUS_COLORS[status].split(" ")[1]}`} />
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider">{STATUS_LABELS[status]}</p>
                    <p className="text-xl font-bold">{stats[status]}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Client Support Links */}
      {isAdmin && clients && clients.length > 0 && (
        <Card className="border-0 shadow-soft">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ExternalLink className="w-4 h-4" /> Liens support par client
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 max-h-48 overflow-y-auto">
              {clients.filter((c) => c.pipeline_status === "contrat_signe").slice(0, 10).map((c) => {
                const link = getClientSupportLink(c.id);
                if (!link) return null;
                return (
                  <div key={c.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 text-sm">
                    <span className="font-medium truncate flex-1">{c.company_name}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <code className="text-xs text-muted-foreground truncate max-w-60 hidden sm:block">{link}</code>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copyLink(link)}>
                        <Copy className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-10" placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Statut" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tickets List */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : !filtered?.length ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <LifeBuoy className="w-10 h-10 text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground text-sm">{search || filterStatus !== "all" ? "Aucun résultat" : "Aucun ticket de support"}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-2">
          {filtered.map((ticket, i) => {
            const Icon = STATUS_ICONS[ticket.status] || AlertCircle;
            return (
              <motion.div key={ticket.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                <Card
                  className="border-0 shadow-soft hover:shadow-medium transition-all cursor-pointer"
                  onClick={() => { setSelectedTicket(ticket); setAdminNotes(ticket.admin_notes || ""); }}
                >
                  <CardContent className="flex items-center gap-4 py-3.5 px-4">
                    <div className={`p-2 rounded-lg ${STATUS_COLORS[ticket.status].split(" ")[0]}`}>
                      <Icon className={`w-4 h-4 ${STATUS_COLORS[ticket.status].split(" ")[1]}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-muted-foreground">{ticket.ticket_number}</span>
                        <Badge variant="outline" className="text-[10px]">
                          {CATEGORY_LABELS[ticket.category] || ticket.category}
                        </Badge>
                        {ticket.priority === "urgente" && (
                          <Badge variant="destructive" className="text-[10px]">Urgent</Badge>
                        )}
                      </div>
                      <p className="font-medium text-sm truncate mt-0.5">{ticket.subject}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {getClientName(ticket.client_id)} • {new Date(ticket.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    <Badge variant="outline" className={`text-[10px] shrink-0 ${STATUS_COLORS[ticket.status]}`}>
                      {STATUS_LABELS[ticket.status]}
                    </Badge>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Ticket Detail Dialog */}
      <Dialog open={!!selectedTicket} onOpenChange={(open) => !open && setSelectedTicket(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          {selectedTicket && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span className="font-mono text-sm text-muted-foreground">{selectedTicket.ticket_number}</span>
                  <Badge variant="outline" className={`text-[10px] ${STATUS_COLORS[selectedTicket.status]}`}>
                    {STATUS_LABELS[selectedTicket.status]}
                  </Badge>
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Client</p>
                  <p className="font-medium text-sm">{getClientName(selectedTicket.client_id)}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Catégorie</p>
                    <p className="text-sm">{CATEGORY_LABELS[selectedTicket.category] || selectedTicket.category}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Priorité</p>
                    <Badge variant={selectedTicket.priority === "urgente" ? "destructive" : "secondary"} className="text-[10px]">
                      {selectedTicket.priority === "urgente" ? "Urgente" : "Normale"}
                    </Badge>
                  </div>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Objet</p>
                  <p className="font-medium text-sm">{selectedTicket.subject}</p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Message</p>
                  <p className="text-sm whitespace-pre-wrap bg-muted/30 p-3 rounded-lg">{selectedTicket.message}</p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Date</p>
                  <p className="text-sm">
                    {new Date(selectedTicket.created_at).toLocaleDateString("fr-FR", {
                      day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
                    })}
                  </p>
                </div>

                {isAdmin && (
                  <>
                    <div className="border-t pt-4 space-y-3">
                      <div className="space-y-2">
                        <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Changer le statut</p>
                        <Select value={selectedTicket.status} onValueChange={(v) => handleStatusChange(selectedTicket.id, v)}>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(STATUS_LABELS).map(([k, v]) => (
                              <SelectItem key={k} value={k}>{v}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Notes admin</p>
                        <Textarea
                          value={adminNotes}
                          onChange={(e) => setAdminNotes(e.target.value)}
                          placeholder="Notes internes..."
                          rows={3}
                        />
                        <Button size="sm" onClick={handleSaveNotes}>
                          <MessageSquare className="w-4 h-4 mr-1" /> Enregistrer les notes
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
