import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { format, differenceInDays, addYears, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Globe, Plus, Download, Search, Filter, AlertTriangle, CheckCircle2,
  Clock, Send, History, Trash2, Edit, Mail, Calendar, X
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useClients } from "@/hooks/use-clients";
import {
  useDomainRenewals, useCreateDomainRenewal, useUpdateDomainRenewal,
  useDeleteDomainRenewal, useDomainRenewalReminders, useLogRenewalReminder,
  type DomainRenewal,
} from "@/hooks/use-domain-renewals";
import { supabase } from "@/integrations/supabase/client";
import { useEmailBranding } from "@/hooks/use-email-branding";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  a_renouveler: { label: "À renouveler", color: "bg-amber-500/15 text-amber-600 border-amber-500/30", icon: Clock },
  facture_envoyee: { label: "Facture envoyée", color: "bg-blue-500/15 text-blue-600 border-blue-500/30", icon: Send },
  paye: { label: "Payé", color: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30", icon: CheckCircle2 },
  en_retard: { label: "En retard", color: "bg-red-500/15 text-red-600 border-red-500/30", icon: AlertTriangle },
  annule: { label: "Annulé", color: "bg-muted text-muted-foreground border-muted", icon: X },
};

function getDaysUntilRenewal(date: string) {
  return differenceInDays(parseISO(date), new Date());
}

function getUrgencyClass(days: number, status: string) {
  if (status === "paye" || status === "annule") return "";
  if (days < 0) return "text-red-600 font-bold";
  if (days <= 15) return "text-amber-600 font-semibold";
  if (days <= 30) return "text-amber-500";
  return "";
}

export default function DomainRenewals() {
  const { user } = useAuth();
  const { data: clients = [] } = useClients();
  const { data: renewals = [], isLoading } = useDomainRenewals();
  const { data: branding } = useEmailBranding();
  const createRenewal = useCreateDomainRenewal();
  const updateRenewal = useUpdateDomainRenewal();
  const deleteRenewal = useDeleteDomainRenewal();
  const logReminder = useLogRenewalReminder();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [urgencyFilter, setUrgencyFilter] = useState<string>("all");
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<DomainRenewal | null>(null);
  const [historyRenewal, setHistoryRenewal] = useState<DomainRenewal | null>(null);
  const [reminderRenewal, setReminderRenewal] = useState<DomainRenewal | null>(null);

  const [form, setForm] = useState({
    client_id: "",
    domain_name: "",
    amount: "15",
    registered_date: "",
    renewal_date: "",
    status: "a_renouveler",
    payment_method: "",
    paid_date: "",
    notes: "",
  });

  const resetForm = () => {
    setForm({
      client_id: "", domain_name: "", amount: "15", registered_date: "",
      renewal_date: "", status: "a_renouveler", payment_method: "", paid_date: "", notes: "",
    });
    setEditing(null);
  };

  const openEdit = (r: DomainRenewal) => {
    setEditing(r);
    setForm({
      client_id: r.client_id,
      domain_name: r.domain_name,
      amount: String(r.amount),
      registered_date: r.registered_date || "",
      renewal_date: r.renewal_date,
      status: r.status,
      payment_method: r.payment_method || "",
      paid_date: r.paid_date || "",
      notes: r.notes || "",
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!form.client_id || !form.domain_name || !form.renewal_date) {
      toast.error("Client, domaine et date de renouvellement obligatoires");
      return;
    }
    const next = addYears(parseISO(form.renewal_date), 1);
    const payload = {
      client_id: form.client_id,
      domain_name: form.domain_name.trim().toLowerCase(),
      amount: Number(form.amount) || 0,
      registered_date: form.registered_date || null,
      renewal_date: form.renewal_date,
      next_renewal_date: format(next, "yyyy-MM-dd"),
      status: form.status,
      payment_method: form.payment_method || null,
      paid_date: form.paid_date || null,
      notes: form.notes || null,
    };

    try {
      if (editing) {
        await updateRenewal.mutateAsync({ id: editing.id, ...payload });
        toast.success("Renouvellement mis à jour");
      } else {
        await createRenewal.mutateAsync({ ...payload, created_by: user!.id });
        toast.success("Renouvellement ajouté");
      }
      setShowDialog(false);
      resetForm();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleMarkPaid = async (r: DomainRenewal) => {
    try {
      await updateRenewal.mutateAsync({
        id: r.id,
        status: "paye",
        paid_date: format(new Date(), "yyyy-MM-dd"),
      });
      toast.success("Marqué comme payé");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleSendReminder = async () => {
    if (!reminderRenewal) return;
    const client = clients.find((c) => c.id === reminderRenewal.client_id);
    if (!client?.email) {
      toast.error("Le client n'a pas d'email");
      return;
    }
    const subject = `Rappel renouvellement de votre nom de domaine ${reminderRenewal.domain_name}`;
    const message = `
      <p>Bonjour ${client.manager_name || client.company_name},</p>
      <p>Nous vous rappelons que le renouvellement de votre nom de domaine <strong>${reminderRenewal.domain_name}</strong> arrive à échéance le <strong>${format(parseISO(reminderRenewal.renewal_date), "dd/MM/yyyy")}</strong>.</p>
      <p>Montant à régler : <strong>${reminderRenewal.amount.toFixed(2)} €</strong></p>
      <p>Merci de procéder au règlement afin d'éviter toute interruption de service.</p>
      <p>Pour toute question, ouvrez un ticket support depuis votre espace.</p>
    `;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke("send-brevo-campaign", {
        body: {
          action: "send_client_email",
          recipientEmail: client.email,
          recipientName: client.manager_name || client.company_name,
          subject,
          htmlContent: message,
          trigger: "domain_renewal_reminder",
          client_id: client.id,
        },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (res.error) throw res.error;

      await logReminder.mutateAsync({
        renewal_id: reminderRenewal.id,
        client_id: reminderRenewal.client_id,
        reminder_type: "email",
        subject,
        message,
        recipient_email: client.email,
        sent_by: user!.id,
        status: "sent",
      });

      toast.success(`Relance envoyée à ${client.email}`);
      setReminderRenewal(null);
    } catch (e: any) {
      toast.error(`Erreur: ${e.message}`);
    }
  };

  const enriched = useMemo(() => {
    return renewals.map((r) => {
      const client = clients.find((c) => c.id === r.client_id);
      const days = getDaysUntilRenewal(r.renewal_date);
      const isOverdue = days < 0 && !["paye", "annule"].includes(r.status);
      return { ...r, client, days, isOverdue };
    });
  }, [renewals, clients]);

  const filtered = useMemo(() => {
    return enriched.filter((r) => {
      const matchSearch = !search ||
        r.domain_name.toLowerCase().includes(search.toLowerCase()) ||
        r.client?.company_name.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "all" || r.status === statusFilter;
      const matchUrgency =
        urgencyFilter === "all" ||
        (urgencyFilter === "overdue" && r.isOverdue) ||
        (urgencyFilter === "soon" && r.days >= 0 && r.days <= 30 && !["paye", "annule"].includes(r.status)) ||
        (urgencyFilter === "year" && r.days > 30 && r.days <= 365);
      return matchSearch && matchStatus && matchUrgency;
    });
  }, [enriched, search, statusFilter, urgencyFilter]);

  const stats = useMemo(() => ({
    total: renewals.length,
    paid: renewals.filter((r) => r.status === "paye").length,
    pending: renewals.filter((r) => ["a_renouveler", "facture_envoyee"].includes(r.status)).length,
    overdue: enriched.filter((r) => r.isOverdue).length,
    revenue: renewals.filter((r) => r.status === "paye").reduce((s, r) => s + Number(r.amount), 0),
  }), [renewals, enriched]);

  const exportCSV = () => {
    const headers = ["Société", "Domaine", "Montant (€)", "Date enregistrement", "Date renouvellement", "Prochain renouv.", "Statut", "Date paiement", "Méthode", "Relances", "Notes"];
    const rows = filtered.map((r) => [
      r.client?.company_name || "",
      r.domain_name,
      r.amount.toFixed(2),
      r.registered_date || "",
      r.renewal_date,
      r.next_renewal_date || "",
      STATUS_CONFIG[r.status]?.label || r.status,
      r.paid_date || "",
      r.payment_method || "",
      r.reminder_count,
      (r.notes || "").replace(/[\n\r]/g, " "),
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `renouvellements_ndd_${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Export CSV téléchargé");
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 font-[Space_Grotesk]">
            <Globe className="w-6 h-6 text-primary" /> Renouvellements NDD
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Suivi annuel des renouvellements de noms de domaine</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCSV}>
            <Download className="w-4 h-4 mr-2" /> Exporter CSV
          </Button>
          <Button onClick={() => { resetForm(); setShowDialog(true); }}>
            <Plus className="w-4 h-4 mr-2" /> Nouveau
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total</p><p className="text-2xl font-bold">{stats.total}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Payés</p><p className="text-2xl font-bold text-emerald-600">{stats.paid}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">À traiter</p><p className="text-2xl font-bold text-amber-600">{stats.pending}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">En retard</p><p className="text-2xl font-bold text-red-600">{stats.overdue}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Revenus encaissés</p><p className="text-2xl font-bold">{stats.revenue.toFixed(2)} €</p></CardContent></Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Rechercher société ou domaine..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous statuts</SelectItem>
              {Object.entries(STATUS_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes échéances</SelectItem>
              <SelectItem value="overdue">En retard</SelectItem>
              <SelectItem value="soon">≤ 30 jours</SelectItem>
              <SelectItem value="year">31-365 jours</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 text-center text-muted-foreground">Chargement...</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <Globe className="w-12 h-12 mx-auto mb-3 opacity-30" />
              Aucun renouvellement enregistré
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Société</TableHead>
                    <TableHead>Domaine</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead>Renouvellement</TableHead>
                    <TableHead>Échéance</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Relances</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r) => {
                    const cfg = STATUS_CONFIG[r.status] || STATUS_CONFIG.a_renouveler;
                    const Icon = cfg.icon;
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.client?.company_name || "—"}</TableCell>
                        <TableCell className="font-mono text-xs">{r.domain_name}</TableCell>
                        <TableCell>{Number(r.amount).toFixed(2)} €</TableCell>
                        <TableCell>{format(parseISO(r.renewal_date), "dd/MM/yyyy", { locale: fr })}</TableCell>
                        <TableCell className={getUrgencyClass(r.days, r.status)}>
                          {r.status === "paye" ? "—" : r.days < 0 ? `Retard ${Math.abs(r.days)}j` : `${r.days}j`}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cfg.color}>
                            <Icon className="w-3 h-3 mr-1" />{cfg.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <button
                            onClick={() => setHistoryRenewal(r)}
                            className="text-xs hover:underline flex items-center gap-1"
                          >
                            <History className="w-3 h-3" />{r.reminder_count}
                          </button>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {r.status !== "paye" && (
                              <>
                                <Button size="sm" variant="ghost" title="Envoyer relance" onClick={() => setReminderRenewal(r)}>
                                  <Mail className="w-3.5 h-3.5" />
                                </Button>
                                <Button size="sm" variant="ghost" title="Marquer payé" onClick={() => handleMarkPaid(r)}>
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                </Button>
                              </>
                            )}
                            <Button size="sm" variant="ghost" onClick={() => openEdit(r)}>
                              <Edit className="w-3.5 h-3.5" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => {
                              if (confirm("Supprimer ce renouvellement ?")) deleteRenewal.mutate(r.id);
                            }}>
                              <Trash2 className="w-3.5 h-3.5 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={(o) => { setShowDialog(o); if (!o) resetForm(); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Modifier" : "Nouveau"} renouvellement NDD</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label>Client *</Label>
              <Select value={form.client_id} onValueChange={(v) => setForm({ ...form, client_id: v })}>
                <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                <SelectContent>
                  {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Nom de domaine *</Label>
              <Input value={form.domain_name} onChange={(e) => setForm({ ...form, domain_name: e.target.value })} placeholder="exemple.com" />
            </div>
            <div>
              <Label>Montant (€)</Label>
              <Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </div>
            <div>
              <Label>Date d'enregistrement</Label>
              <Input type="date" value={form.registered_date} onChange={(e) => setForm({ ...form, registered_date: e.target.value })} />
            </div>
            <div>
              <Label>Date de renouvellement *</Label>
              <Input type="date" value={form.renewal_date} onChange={(e) => setForm({ ...form, renewal_date: e.target.value })} />
            </div>
            <div>
              <Label>Statut</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Méthode de paiement</Label>
              <Input value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })} placeholder="Virement, CB..." />
            </div>
            {form.status === "paye" && (
              <div className="col-span-2">
                <Label>Date de paiement</Label>
                <Input type="date" value={form.paid_date} onChange={(e) => setForm({ ...form, paid_date: e.target.value })} />
              </div>
            )}
            <div className="col-span-2">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Annuler</Button>
            <Button onClick={handleSave}>{editing ? "Mettre à jour" : "Créer"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={!!historyRenewal} onOpenChange={(o) => !o && setHistoryRenewal(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5" /> Historique des relances — {historyRenewal?.domain_name}
            </DialogTitle>
          </DialogHeader>
          {historyRenewal && <ReminderHistory renewalId={historyRenewal.id} />}
        </DialogContent>
      </Dialog>

      {/* Send Reminder Dialog */}
      <Dialog open={!!reminderRenewal} onOpenChange={(o) => !o && setReminderRenewal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Envoyer une relance — {reminderRenewal?.domain_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p>Un email de relance sera envoyé à <strong>{clients.find((c) => c.id === reminderRenewal?.client_id)?.email || "—"}</strong></p>
            <p>Domaine: <strong>{reminderRenewal?.domain_name}</strong></p>
            <p>Échéance: <strong>{reminderRenewal && format(parseISO(reminderRenewal.renewal_date), "dd/MM/yyyy")}</strong></p>
            <p>Montant: <strong>{reminderRenewal?.amount.toFixed(2)} €</strong></p>
            <p className="text-muted-foreground text-xs">Relances déjà envoyées: {reminderRenewal?.reminder_count}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReminderRenewal(null)}>Annuler</Button>
            <Button onClick={handleSendReminder}>
              <Send className="w-4 h-4 mr-2" /> Envoyer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

function ReminderHistory({ renewalId }: { renewalId: string }) {
  const { data: reminders = [], isLoading } = useDomainRenewalReminders(renewalId);
  if (isLoading) return <p className="text-center py-6 text-muted-foreground">Chargement...</p>;
  if (reminders.length === 0) return <p className="text-center py-6 text-muted-foreground">Aucune relance envoyée</p>;
  return (
    <div className="space-y-3 max-h-[400px] overflow-y-auto">
      {reminders.map((r) => (
        <div key={r.id} className="border rounded-lg p-3 text-sm">
          <div className="flex items-center justify-between mb-1">
            <Badge variant="outline" className="text-xs">{r.reminder_type}</Badge>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {format(parseISO(r.sent_at), "dd/MM/yyyy HH:mm", { locale: fr })}
            </span>
          </div>
          <p className="font-medium">{r.subject || "Relance"}</p>
          <p className="text-xs text-muted-foreground">→ {r.recipient_email}</p>
          <Badge variant="outline" className="mt-1 text-xs bg-emerald-500/10 text-emerald-600">{r.status}</Badge>
        </div>
      ))}
    </div>
  );
}
