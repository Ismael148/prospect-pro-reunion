import { useState, useMemo } from "react";
import { useInvoices, useCreateInvoice, useUpdateInvoice, useDeleteInvoice, type InvoiceItem } from "@/hooks/use-invoices";
import { useClients } from "@/hooks/use-clients";
import { useAuth } from "@/contexts/AuthContext";
import { exportInvoicePDF } from "@/lib/export-invoice-pdf";
import { PACK_LABELS, PACK_PRICES } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  FileText, Plus, Trash2, Download, Loader2, Search, Eye, CheckCircle,
} from "lucide-react";
import { motion } from "framer-motion";

const STATUS_LABELS: Record<string, string> = {
  brouillon: "Brouillon",
  envoyee: "Envoyée",
  payee: "Payée",
  annulee: "Annulée",
};

const STATUS_COLORS: Record<string, string> = {
  brouillon: "bg-muted text-muted-foreground",
  envoyee: "bg-primary/10 text-primary",
  payee: "bg-success/10 text-success",
  annulee: "bg-destructive/10 text-destructive",
};

export default function Invoices() {
  const { user, hasRole } = useAuth();
  const isAdmin = hasRole("admin");
  const { data: invoices, isLoading } = useInvoices();
  const { data: clients } = useClients();
  const createInvoice = useCreateInvoice();
  const updateInvoice = useUpdateInvoice();
  const deleteInvoice = useDeleteInvoice();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [taxRate, setTaxRate] = useState("0");
  const [notes, setNotes] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [items, setItems] = useState<InvoiceItem[]>([
    { description: "", quantity: 1, unit_price: 0, total: 0 },
  ]);

  const clientMap = useMemo(() => {
    const map = new Map<string, any>();
    (clients || []).forEach((c) => map.set(c.id, c));
    return map;
  }, [clients]);

  const filteredInvoices = useMemo(() => {
    if (!invoices) return [];
    return invoices.filter((inv) => {
      const client = clientMap.get(inv.client_id);
      const matchSearch = !search || 
        inv.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
        (client?.company_name || "").toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "all" || inv.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [invoices, search, statusFilter, clientMap]);

  const updateItemRow = (index: number, field: keyof InvoiceItem, value: any) => {
    const updated = [...items];
    (updated[index] as any)[field] = value;
    updated[index].total = updated[index].quantity * updated[index].unit_price;
    setItems(updated);
  };

  const addItem = () => setItems([...items, { description: "", quantity: 1, unit_price: 0, total: 0 }]);
  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i));

  const subtotal = items.reduce((s, item) => s + item.total, 0);
  const tax = subtotal * (parseFloat(taxRate) || 0) / 100;
  const total = subtotal + tax;

  // Auto-fill items from client pack
  const handleClientChange = (clientId: string) => {
    setSelectedClientId(clientId);
    const client = clientMap.get(clientId);
    if (client?.pack_type && PACK_PRICES[client.pack_type]) {
      const packLabel = PACK_LABELS[client.pack_type as keyof typeof PACK_LABELS] || client.pack_type;
      const price = client.pack_amount || PACK_PRICES[client.pack_type];
      setItems([{ description: `Pack ${packLabel}`, quantity: 1, unit_price: price, total: price }]);
      if (client.nfc_quantity > 1) {
        setItems((prev) => [
          ...prev,
          { description: `Cartes NFC supplémentaires (x${client.nfc_quantity - 1})`, quantity: client.nfc_quantity - 1, unit_price: 15, total: (client.nfc_quantity - 1) * 15 },
        ]);
      }
    }
  };

  const handleCreate = async () => {
    if (!selectedClientId) { toast.error("Sélectionnez un client"); return; }
    if (items.some((i) => !i.description.trim())) { toast.error("Remplissez toutes les descriptions"); return; }
    try {
      await createInvoice.mutateAsync({
        client_id: selectedClientId,
        amount: subtotal,
        tax_rate: parseFloat(taxRate) || 0,
        tax_amount: tax,
        total_amount: total,
        items: items as any,
        notes: notes || null,
        due_date: dueDate || null,
        created_by: user!.id,
        status: "brouillon",
      } as any);
      toast.success("Facture créée");
      setDialogOpen(false);
      resetForm();
    } catch { toast.error("Erreur lors de la création"); }
  };

  const resetForm = () => {
    setSelectedClientId("");
    setTaxRate("0");
    setNotes("");
    setDueDate("");
    setItems([{ description: "", quantity: 1, unit_price: 0, total: 0 }]);
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await updateInvoice.mutateAsync({
        id,
        status,
        ...(status === "payee" ? { paid_date: new Date().toISOString().slice(0, 10) } : {}),
      } as any);
      toast.success(`Facture marquée comme ${STATUS_LABELS[status]}`);
    } catch { toast.error("Erreur"); }
  };

  const handleDownload = (inv: any) => {
    const client = clientMap.get(inv.client_id);
    if (!client) return;
    exportInvoicePDF({
      ...inv,
      client: {
        company_name: client.company_name,
        address: client.address,
        postal_code: client.postal_code,
        city: client.city,
        email: client.email,
        phone: client.phone,
        siret: client.siret,
      },
    });
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteInvoice.mutateAsync(id);
      toast.success("Facture supprimée");
    } catch { toast.error("Erreur"); }
  };

  // Stats
  const stats = useMemo(() => {
    if (!invoices) return { total: 0, paid: 0, pending: 0, draft: 0 };
    return {
      total: invoices.reduce((s, i) => s + Number(i.total_amount), 0),
      paid: invoices.filter((i) => i.status === "payee").reduce((s, i) => s + Number(i.total_amount), 0),
      pending: invoices.filter((i) => i.status === "envoyee").reduce((s, i) => s + Number(i.total_amount), 0),
      draft: invoices.filter((i) => i.status === "brouillon").length,
    };
  }, [invoices]);

  const signedClients = useMemo(() => {
    return (clients || []).filter((c) => c.pipeline_status === "contrat_signe");
  }, [clients]);

  return (
    <motion.div className="space-y-6" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Facturation</h1>
          <p className="text-muted-foreground text-sm mt-1">{invoices?.length || 0} facture(s)</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setDialogOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Nouvelle facture
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-soft">
          <CardContent className="p-4">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Total facturé</p>
            <p className="text-xl font-bold">{stats.total.toFixed(2)} €</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-soft">
          <CardContent className="p-4">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Encaissé</p>
            <p className="text-xl font-bold text-success">{stats.paid.toFixed(2)} €</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-soft">
          <CardContent className="p-4">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider">En attente</p>
            <p className="text-xl font-bold text-warning">{stats.pending.toFixed(2)} €</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-soft">
          <CardContent className="p-4">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Brouillons</p>
            <p className="text-xl font-bold">{stats.draft}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Rechercher une facture..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Statut" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : filteredInvoices.length === 0 ? (
        <Card className="border-0 shadow-soft">
          <CardContent className="py-12 text-center">
            <FileText className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">Aucune facture trouvée</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-0 shadow-soft">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>N° Facture</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Montant TTC</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvoices.map((inv) => {
                const client = clientMap.get(inv.client_id);
                return (
                  <TableRow key={inv.id}>
                    <TableCell className="font-mono font-medium">{inv.invoice_number}</TableCell>
                    <TableCell>{client?.company_name || "—"}</TableCell>
                    <TableCell>{new Date(inv.issued_date).toLocaleDateString("fr-FR")}</TableCell>
                    <TableCell className="font-mono font-medium">{Number(inv.total_amount).toFixed(2)} €</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={STATUS_COLORS[inv.status] || ""}>
                        {STATUS_LABELS[inv.status] || inv.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => handleDownload(inv)} title="Télécharger PDF">
                          <Download className="w-4 h-4" />
                        </Button>
                        {isAdmin && inv.status === "brouillon" && (
                          <Button size="icon" variant="ghost" onClick={() => handleStatusChange(inv.id, "envoyee")} title="Marquer comme envoyée">
                            <Eye className="w-4 h-4" />
                          </Button>
                        )}
                        {isAdmin && inv.status === "envoyee" && (
                          <Button size="icon" variant="ghost" onClick={() => handleStatusChange(inv.id, "payee")} title="Marquer comme payée">
                            <CheckCircle className="w-4 h-4 text-success" />
                          </Button>
                        )}
                        {isAdmin && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="icon" variant="ghost"><Trash2 className="w-4 h-4 text-destructive" /></Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Supprimer cette facture ?</AlertDialogTitle>
                                <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Annuler</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(inv.id)}>Supprimer</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Create Invoice Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nouvelle facture</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Client *</Label>
              <Select value={selectedClientId} onValueChange={handleClientChange}>
                <SelectTrigger><SelectValue placeholder="Sélectionner un client" /></SelectTrigger>
                <SelectContent>
                  {signedClients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Taux TVA (%)</Label>
                <Input type="number" min="0" max="100" step="0.1" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Date d'échéance</Label>
                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
            </div>

            {/* Line items */}
            <div className="space-y-2">
              <Label>Lignes de facturation</Label>
              <div className="space-y-2">
                {items.map((item, i) => (
                  <div key={i} className="flex gap-2 items-start">
                    <Input
                      placeholder="Description"
                      className="flex-1"
                      value={item.description}
                      onChange={(e) => updateItemRow(i, "description", e.target.value)}
                    />
                    <Input
                      type="number"
                      className="w-16"
                      placeholder="Qté"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateItemRow(i, "quantity", parseInt(e.target.value) || 1)}
                    />
                    <Input
                      type="number"
                      className="w-28"
                      placeholder="Prix unit."
                      step="0.01"
                      value={item.unit_price || ""}
                      onChange={(e) => updateItemRow(i, "unit_price", parseFloat(e.target.value) || 0)}
                    />
                    <span className="text-sm font-mono whitespace-nowrap pt-2 w-20 text-right">
                      {item.total.toFixed(2)} €
                    </span>
                    {items.length > 1 && (
                      <Button size="icon" variant="ghost" onClick={() => removeItem(i)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <Button variant="outline" size="sm" onClick={addItem} className="gap-2">
                <Plus className="w-3 h-3" /> Ajouter une ligne
              </Button>
            </div>

            {/* Totals */}
            <Card className="bg-muted/30">
              <CardContent className="p-4 space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Sous-total HT</span>
                  <span className="font-mono">{subtotal.toFixed(2)} €</span>
                </div>
                {parseFloat(taxRate) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>TVA ({taxRate}%)</span>
                    <span className="font-mono">{tax.toFixed(2)} €</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold border-t pt-2">
                  <span>Total TTC</span>
                  <span className="font-mono">{total.toFixed(2)} €</span>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea placeholder="Conditions de paiement, mentions..." value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>

            <Button onClick={handleCreate} disabled={createInvoice.isPending} className="w-full">
              {createInvoice.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <FileText className="w-4 h-4 mr-2" />}
              Créer la facture
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
