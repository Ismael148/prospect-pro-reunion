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
import { toast } from "sonner";
import {
  Loader2, Search, LifeBuoy, Clock, CheckCircle, AlertCircle, XCircle,
  MessageSquare, ExternalLink, Copy, UserPlus, Tag,
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

const WEBMASTER_TAGS = [
  { label: "À vérifier par admin", value: "#a_verifier_admin", color: "bg-amber-100 text-amber-700 border-amber-200" },
  { label: "Travail terminé", value: "#travail_termine", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  { label: "En attente info client", value: "#attente_client", color: "bg-blue-100 text-blue-700 border-blue-200" },
  { label: "Problème identifié", value: "#probleme_identifie", color: "bg-red-100 text-red-700 border-red-200" },
];

export default function Support() {
  const { user, hasRole } = useAuth();
  const isAdmin = hasRole("admin");
  const isWebmaster = hasRole("webmaster") || hasRole("designer");
  const isAgentSupport = hasRole("agent_support");
  const canManageTickets = isAdmin;
  const limitSupportToAssigned = !isAdmin && !isAgentSupport;
  const { data: tickets, isLoading } = useSupportTickets({
    userId: user?.id,
    limitToAssigned: limitSupportToAssigned,
  });
  const { data: clients } = useClients();
  const updateTicket = useUpdateTicket();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [teamMembers, setTeamMembers] = useState<{ user_id: string; full_name: string; role: string }[]>([]);

  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      const { data: roles } = await supabase.from("user_roles").select("user_id, role");
      if (!roles?.length) return;
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name");
      const members = roles.map((r) => ({
        user_id: r.user_id,
        full_name: profiles?.find((p) => p.user_id === r.user_id)?.full_name || r.user_id,
        role: r.role,
      }));
      const unique = Array.from(new Map(members.map((m) => [m.user_id, m])).values());
      setTeamMembers(unique);
    })();
  }, [isAdmin]);

  const getAssigneeName = (userId: string | null) => {
    if (!userId) return null;
    return teamMembers.find((m) => m.user_id === userId)?.full_name || "—";
  };

  const handleAssignTicket = async (ticketId: string, assignedTo: string | null) => {
    try {
      await updateTicket.mutateAsync({ id: ticketId, assigned_to: assignedTo } as any);
      if (assignedTo) {
        const memberName = getAssigneeName(assignedTo);
        await supabase.from("notifications").insert({
          user_id: assignedTo,
          title: "Ticket support assigné",
          message: `Le ticket "${selectedTicket?.subject}" vous a été assigné.`,
          type: "support",
          link: "/support",
        });
        toast.success(`Ticket assigné à ${memberName}`);
        setSelectedTicket((prev: any) => prev ? { ...prev, assigned_to: assignedTo } : null);
      } else {
        toast.success("Assignation retirée");
        setSelectedTicket((prev: any) => prev ? { ...prev, assigned_to: null } : null);
      }
    } catch {
      toast.error("Erreur d'assignation");
    }
  };

  const getClientName = (clientId: string) =>
    clients?.find((c) => c.id === clientId)?.company_name || "—";

  const getClientSupportLink = (clientId: string) => {
    const client = clients?.find((c) => c.id === clientId);
    if (!client || !(client as any).support_token) return null;
    return `${PUBLISHED_URL}/s/${(client as any).support_token}`;
  };

  const visibleTickets = useMemo(() => {
    if (!tickets) return [];
    if (!limitSupportToAssigned) return tickets;
    return tickets.filter((t) => t.assigned_to === user?.id);
  }, [tickets, limitSupportToAssigned, user?.id]);

  const filtered = useMemo(() => {
    return visibleTickets.filter((t) => {
      const matchSearch =
        t.subject.toLowerCase().includes(search.toLowerCase()) ||
        t.ticket_number.toLowerCase().includes(search.toLowerCase()) ||
        getClientName(t.client_id).toLowerCase().includes(search.toLowerCase());
      const matchStatus = filterStatus === "all" || t.status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [visibleTickets, search, filterStatus, clients]);

  const stats = useMemo(() => {
    if (!visibleTickets.length) return { ouvert: 0, en_cours: 0, resolu: 0, ferme: 0 };
    return {
      ouvert: visibleTickets.filter((t) => t.status === "ouvert").length,
      en_cours: visibleTickets.filter((t) => t.status === "en_cours").length,
      resolu: visibleTickets.filter((t) => t.status === "resolu").length,
      ferme: visibleTickets.filter((t) => t.status === "ferme").length,
    };
  }, [visibleTickets]);

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

      // Notify assigned user (agent/webmaster) if current user is not the assignee
      const notificationsToInsert: Array<{
        user_id: string;
        title: string;
        message: string;
        type: string;
        link: string;
      }> = [];

      if (selectedTicket.assigned_to && selectedTicket.assigned_to !== user?.id) {
        notificationsToInsert.push({
          user_id: selectedTicket.assigned_to,
          title: "📝 Note ajoutée sur votre ticket",
          message: `Une note a été ajoutée sur le ticket "${selectedTicket.ticket_number}" — "${selectedTicket.subject}".`,
          type: "support",
          link: "/support",
        });
      }

      // Notify all admins (except current user) so admin is aware of notes from agents
      const { data: adminRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");
      if (adminRoles?.length) {
        for (const r of adminRoles) {
          if (r.user_id !== user?.id && r.user_id !== selectedTicket.assigned_to) {
            notificationsToInsert.push({
              user_id: r.user_id,
              title: "📝 Note ajoutée sur un ticket",
              message: `Note mise à jour sur le ticket "${selectedTicket.ticket_number}" — "${selectedTicket.subject}".`,
              type: "support",
              link: "/support",
            });
          }
        }
      }

      if (notificationsToInsert.length) {
        await supabase.from("notifications").insert(notificationsToInsert);
      }
    } catch {
      toast.error("Erreur");
    }
  };

  const handleAddTag = async (tag: typeof WEBMASTER_TAGS[0]) => {
    if (!selectedTicket) return;
    const currentNotes = selectedTicket.admin_notes || "";
    // Don't add duplicate tags
    if (currentNotes.includes(tag.value)) {
      toast.info("Tag déjà ajouté");
      return;
    }
    const newNotes = currentNotes ? `${currentNotes}\n${tag.value}` : tag.value;
    try {
      await updateTicket.mutateAsync({ id: selectedTicket.id, admin_notes: newNotes });
      setAdminNotes(newNotes);
      setSelectedTicket({ ...selectedTicket, admin_notes: newNotes });
      toast.success(`Tag "${tag.label}" ajouté`);

      // Notify assigned user about the new tag
      if (selectedTicket.assigned_to && selectedTicket.assigned_to !== user?.id) {
        await supabase.from("notifications").insert({
          user_id: selectedTicket.assigned_to,
          title: "🏷️ Tag ajouté sur votre ticket",
          message: `Tag "${tag.label}" ajouté sur le ticket "${selectedTicket.ticket_number}" — "${selectedTicket.subject}".`,
          type: "support",
          link: "/support",
        });
      }

      // If tag is "à vérifier par admin", notify all admins
      if (tag.value === "#a_verifier_admin") {
        const { data: adminRoles } = await supabase
          .from("user_roles")
          .select("user_id")
          .eq("role", "admin");
        if (adminRoles?.length) {
          const notifications = adminRoles
            .filter((r) => r.user_id !== user?.id)
            .map((r) => ({
              user_id: r.user_id,
              title: "🏷️ Ticket à vérifier",
              message: `Le ticket "${selectedTicket.ticket_number}" — "${selectedTicket.subject}" nécessite votre vérification.`,
              type: "support",
              link: "/support",
            }));
          if (notifications.length) {
            await supabase.from("notifications").insert(notifications);
          }
        }
      }
    } catch {
      toast.error("Erreur");
    }
  };

  const copyLink = (link: string) => {
    navigator.clipboard.writeText(link);
    toast.success("Lien copié !");
  };

  // Extract tags from admin_notes for display
  const getNoteTags = (notes: string | null) => {
    if (!notes) return [];
    return WEBMASTER_TAGS.filter((t) => notes.includes(t.value));
  };

  return (
    <motion.div className="space-y-6" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Support Client</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {visibleTickets.length} ticket{visibleTickets.length > 1 ? "s" : ""}
            {!isAdmin && (isWebmaster) && " assigné(s)"}
          </p>
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

      {/* Client Support Links — admin only */}
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
            <p className="text-muted-foreground text-sm">
              {search || filterStatus !== "all" ? "Aucun résultat" : isWebmaster ? "Aucun ticket assigné" : "Aucun ticket de support"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-2">
          {filtered.map((ticket, i) => {
            const Icon = STATUS_ICONS[ticket.status] || AlertCircle;
            const tags = getNoteTags(ticket.admin_notes);
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
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-mono text-muted-foreground">{ticket.ticket_number}</span>
                        <Badge variant="outline" className="text-[10px]">
                          {CATEGORY_LABELS[ticket.category] || ticket.category}
                        </Badge>
                        {ticket.priority === "urgente" && (
                          <Badge variant="destructive" className="text-[10px]">🔴 Urgent</Badge>
                        )}
                        {ticket.priority === "haute" && (
                          <Badge className="text-[10px] bg-orange-100 text-orange-700 border-orange-200">🟠 Haute</Badge>
                        )}
                        {tags.map((tag) => (
                          <Badge key={tag.value} className={`text-[10px] ${tag.color}`}>
                            <Tag className="w-2.5 h-2.5 mr-0.5" />{tag.label}
                          </Badge>
                        ))}
                      </div>
                      <p className="font-medium text-sm truncate mt-0.5">{ticket.subject}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {getClientName(ticket.client_id)} • {new Date(ticket.created_at).toLocaleDateString("fr-FR", { timeZone: "Indian/Reunion", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                        {ticket.assigned_to && ` • 👤 ${getAssigneeName(ticket.assigned_to)}`}
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
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Priorité</p>
                    {isAdmin ? (
                      <Select
                        value={selectedTicket.priority || "normale"}
                        onValueChange={async (v) => {
                          try {
                            await updateTicket.mutateAsync({ id: selectedTicket.id, priority: v } as any);
                            setSelectedTicket({ ...selectedTicket, priority: v });
                            toast.success(`Priorité → ${v}`);
                          } catch { toast.error("Erreur"); }
                        }}
                      >
                        <SelectTrigger className="w-full h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="normale">🟢 Normale</SelectItem>
                          <SelectItem value="haute">🟠 Haute</SelectItem>
                          <SelectItem value="urgente">🔴 Urgente</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant={selectedTicket.priority === "urgente" ? "destructive" : selectedTicket.priority === "haute" ? "default" : "secondary"} className="text-[10px]">
                        {selectedTicket.priority === "urgente" ? "🔴 Urgente" : selectedTicket.priority === "haute" ? "🟠 Haute" : "🟢 Normale"}
                      </Badge>
                    )}
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

                {/* Attachments */}
                {selectedTicket.attachments?.length > 0 && (
                  <div>
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Pièces jointes</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedTicket.attachments.map((url: string, idx: number) => (
                        <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline">
                          Fichier {idx + 1}
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Date</p>
                  <p className="text-sm">
                    {new Date(selectedTicket.created_at).toLocaleDateString("fr-FR", { timeZone: "Indian/Reunion",
                      day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
                    })}
                  </p>
                </div>

                {/* Assigned to */}
                {selectedTicket.assigned_to && (
                  <div>
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Assigné à</p>
                    <Badge variant="secondary" className="mt-1 gap-1">
                      <UserPlus className="h-3 w-3" />
                      {getAssigneeName(selectedTicket.assigned_to)}
                    </Badge>
                  </div>
                )}

                {/* Tags display */}
                {getNoteTags(selectedTicket.admin_notes).length > 0 && (
                  <div>
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Tags</p>
                    <div className="flex flex-wrap gap-1.5">
                      {getNoteTags(selectedTicket.admin_notes).map((tag) => (
                        <Badge key={tag.value} className={`text-[10px] ${tag.color}`}>
                          <Tag className="w-2.5 h-2.5 mr-0.5" />{tag.label}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Webmaster/Designer tag section */}
                {(isWebmaster || isAdmin) && selectedTicket.status !== "resolu" && selectedTicket.status !== "ferme" && (
                  <div className="border-t pt-4 space-y-3">
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                      <Tag className="h-3 w-3" /> Ajouter un tag
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {WEBMASTER_TAGS.map((tag) => {
                        const alreadyAdded = selectedTicket.admin_notes?.includes(tag.value);
                        return (
                          <Button
                            key={tag.value}
                            variant="outline"
                            size="sm"
                            disabled={alreadyAdded}
                            className={`text-xs ${alreadyAdded ? "opacity-50" : ""}`}
                            onClick={() => handleAddTag(tag)}
                          >
                            <Tag className="w-3 h-3 mr-1" />
                            {tag.label}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Webmaster notes (read-only for non-admin, with note input) */}
                {(isWebmaster && !isAdmin) && (
                  <div className="border-t pt-4 space-y-3">
                    <div className="space-y-2">
                      <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Note technique</p>
                      <Textarea
                        value={adminNotes}
                        onChange={(e) => setAdminNotes(e.target.value)}
                        placeholder="Ajoutez vos observations techniques..."
                        rows={3}
                      />
                      <Button size="sm" onClick={handleSaveNotes}>
                        <MessageSquare className="w-4 h-4 mr-1" /> Enregistrer
                      </Button>
                    </div>
                    {selectedTicket.admin_notes && (
                      <div>
                        <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Notes existantes</p>
                        <p className="text-sm whitespace-pre-wrap bg-muted/30 p-3 rounded-lg">{selectedTicket.admin_notes}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Admin section — full controls */}
                {isAdmin && (
                  <>
                    <div className="border-t pt-4 space-y-3">
                      {/* Assignment */}
                      <div className="space-y-2">
                        <p className="text-[11px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                          <UserPlus className="h-3 w-3" /> Assigner à un membre
                        </p>
                        <Select
                          value={selectedTicket.assigned_to || "none"}
                          onValueChange={(v) => handleAssignTicket(selectedTicket.id, v === "none" ? null : v)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Non assigné" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">— Non assigné —</SelectItem>
                            {teamMembers.map((m) => (
                              <SelectItem key={m.user_id} value={m.user_id}>
                                {m.full_name} ({m.role})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Status — admin only can resolve */}
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
                          placeholder="Notes internes, mentionnez @membre..."
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
