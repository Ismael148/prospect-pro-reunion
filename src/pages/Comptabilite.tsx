import { useState, useMemo } from "react";
import { useExpenses, useCreateExpense, useUpdateExpense, useDeleteExpense, getMonthlyAmount } from "@/hooks/use-expenses";
import { useCommissions } from "@/hooks/use-commissions";
import { useClients } from "@/hooks/use-clients";
import { useAuth } from "@/contexts/AuthContext";
import { PACK_PRICES } from "@/lib/constants";
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
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  TrendingUp, TrendingDown, DollarSign, Loader2, Plus, Trash2,
  BarChart3, CreditCard, Building, Calculator, Repeat, Pencil,
} from "lucide-react";
import { motion } from "framer-motion";

const CATEGORY_LABELS: Record<string, string> = {
  charges_sociales: "Charges sociales",
  abonnement_plateforme: "Abonnement plateforme",
  salaire: "Salaire",
  loyer: "Loyer",
  marketing: "Marketing",
  materiel: "Matériel",
  autre: "Autre",
};

const CATEGORY_ICONS: Record<string, typeof Building> = {
  charges_sociales: Building,
  abonnement_plateforme: CreditCard,
  salaire: DollarSign,
  loyer: Building,
  marketing: BarChart3,
  materiel: CreditCard,
  autre: Calculator,
};

const FREQUENCY_LABELS: Record<string, string> = {
  ponctuel: "Ponctuel",
  mensuel: "Mensuel",
  trimestriel: "Trimestriel",
  annuel: "Annuel",
};

function getMonthOptions() {
  const options: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
    options.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) });
  }
  return options;
}

export default function Comptabilite() {
  const { user, hasRole } = useAuth();
  const isAdmin = hasRole("admin");
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const monthOptions = getMonthOptions();

  const { data: expenses, isLoading: loadingExpenses } = useExpenses();
  const { data: commissions, isLoading: loadingCommissions } = useCommissions(selectedMonth);
  const { data: clients } = useClients();
  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();
  const deleteExpense = useDeleteExpense();

  const [expenseOpen, setExpenseOpen] = useState(false);
  const [form, setForm] = useState({
    name: "", description: "", category: "autre",
    amount: "", frequency: "mensuel", start_date: "", end_date: "",
  });

  // Revenue: sum of pack_amount for clients signed in selected month
  const monthlyRevenue = useMemo(() => {
    if (!clients) return 0;
    return clients
      .filter((c) => {
        if (!c.signature_date) return false;
        const sigDate = c.signature_date.substring(0, 7); // YYYY-MM
        return sigDate === selectedMonth;
      })
      .reduce((sum, c) => sum + (Number(c.pack_amount) || 0), 0);
  }, [clients, selectedMonth]);

  // Total commissions for selected month
  const totalCommissions = useMemo(() => {
    return (commissions || []).reduce((s, c) => s + Number(c.total_amount), 0);
  }, [commissions]);

  // Monthly expenses
  const monthlyExpenses = useMemo(() => {
    if (!expenses) return [];
    return expenses
      .map((e) => ({ ...e, monthAmount: getMonthlyAmount(e, selectedMonth) }))
      .filter((e) => e.monthAmount > 0);
  }, [expenses, selectedMonth]);

  const totalExpenses = monthlyExpenses.reduce((s, e) => s + e.monthAmount, 0);

  // Expenses by category
  const expensesByCategory = useMemo(() => {
    const map = new Map<string, number>();
    monthlyExpenses.forEach((e) => {
      map.set(e.category, (map.get(e.category) || 0) + e.monthAmount);
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [monthlyExpenses]);

  // Net profit
  const netProfit = monthlyRevenue - totalCommissions - totalExpenses;

  const handleCreateExpense = async () => {
    if (!form.name.trim() || !form.amount) {
      toast.error("Nom et montant requis");
      return;
    }
    try {
      await createExpense.mutateAsync({
        name: form.name,
        description: form.description || null,
        category: form.category,
        amount: parseFloat(form.amount),
        frequency: form.frequency,
        month_year: form.frequency === "ponctuel" ? selectedMonth : null,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        is_active: true,
        created_by: user!.id,
      } as any);
      toast.success("Charge ajoutée");
      setExpenseOpen(false);
      setForm({ name: "", description: "", category: "autre", amount: "", frequency: "mensuel", start_date: "", end_date: "" });
    } catch {
      toast.error("Erreur");
    }
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    try {
      await updateExpense.mutateAsync({ id, is_active: !currentActive });
      toast.success(currentActive ? "Charge désactivée" : "Charge réactivée");
    } catch {
      toast.error("Erreur");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteExpense.mutateAsync(id);
      toast.success("Charge supprimée");
    } catch {
      toast.error("Erreur");
    }
  };

  const isLoading = loadingExpenses || loadingCommissions;

  // Signed clients count this month
  const signedCount = useMemo(() => {
    if (!clients) return 0;
    return clients.filter((c) => c.signature_date?.substring(0, 7) === selectedMonth).length;
  }, [clients, selectedMonth]);

  return (
    <motion.div className="space-y-6" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Comptabilité</h1>
          <p className="text-muted-foreground text-sm mt-1">Chiffre d'affaires, charges et bénéfice net</p>
        </div>
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {monthOptions.map((m) => (
              <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-0 shadow-soft">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-success/10">
                    <TrendingUp className="w-5 h-5 text-success" />
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Chiffre d'affaires</p>
                    <p className="text-xl font-bold">{monthlyRevenue.toFixed(2)} €</p>
                    <p className="text-[10px] text-muted-foreground">{signedCount} contrat{signedCount > 1 ? "s" : ""}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-soft">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-warning/10">
                    <DollarSign className="w-5 h-5 text-warning" />
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Commissions</p>
                    <p className="text-xl font-bold">-{totalCommissions.toFixed(2)} €</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-soft">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-destructive/10">
                    <TrendingDown className="w-5 h-5 text-destructive" />
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Charges totales</p>
                    <p className="text-xl font-bold">-{totalExpenses.toFixed(2)} €</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className={`border-0 shadow-soft ${netProfit >= 0 ? "" : "ring-1 ring-destructive/20"}`}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl ${netProfit >= 0 ? "bg-success/10" : "bg-destructive/10"}`}>
                    <Calculator className={`w-5 h-5 ${netProfit >= 0 ? "text-success" : "text-destructive"}`} />
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Bénéfice net</p>
                    <p className={`text-xl font-bold ${netProfit >= 0 ? "text-success" : "text-destructive"}`}>
                      {netProfit >= 0 ? "" : ""}{netProfit.toFixed(2)} €
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Profit Breakdown */}
          <Card className="border-0 shadow-soft">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Détail du résultat</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-success/5">
                  <span className="text-sm font-medium">Chiffre d'affaires</span>
                  <span className="font-bold font-mono text-success">+{monthlyRevenue.toFixed(2)} €</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-warning/5">
                  <span className="text-sm font-medium">Commissions versées</span>
                  <span className="font-bold font-mono text-warning">-{totalCommissions.toFixed(2)} €</span>
                </div>
                {expensesByCategory.map(([cat, amount]) => (
                  <div key={cat} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <span className="text-sm">{CATEGORY_LABELS[cat] || cat}</span>
                    <span className="font-mono text-sm">-{amount.toFixed(2)} €</span>
                  </div>
                ))}
                <div className="border-t pt-3 flex items-center justify-between">
                  <span className="text-sm font-bold">Bénéfice net</span>
                  <span className={`text-lg font-bold font-mono ${netProfit >= 0 ? "text-success" : "text-destructive"}`}>
                    {netProfit.toFixed(2)} €
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Expenses Management */}
          <Tabs defaultValue="active">
            <div className="flex items-center justify-between mb-2">
              <TabsList>
                <TabsTrigger value="active">Charges actives</TabsTrigger>
                <TabsTrigger value="all">Toutes les charges</TabsTrigger>
              </TabsList>
              {isAdmin && (
                <Dialog open={expenseOpen} onOpenChange={setExpenseOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="gap-2"><Plus className="w-4 h-4" /> Ajouter une charge</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Nouvelle charge</DialogTitle></DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="space-y-2">
                        <Label>Nom *</Label>
                        <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Hébergement LWS" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Catégorie</Label>
                          <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                                <SelectItem key={k} value={k}>{v}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Montant (€) *</Label>
                          <Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0.00" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Fréquence</Label>
                        <Select value={form.frequency} onValueChange={(v) => setForm({ ...form, frequency: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {Object.entries(FREQUENCY_LABELS).map(([k, v]) => (
                              <SelectItem key={k} value={k}>{v}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {form.frequency !== "ponctuel" && (
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Date de début</Label>
                            <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
                          </div>
                          <div className="space-y-2">
                            <Label>Date de fin (optionnel)</Label>
                            <Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
                          </div>
                        </div>
                      )}
                      <div className="space-y-2">
                        <Label>Description</Label>
                        <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Détails..." rows={2} />
                      </div>
                      <Button onClick={handleCreateExpense} disabled={createExpense.isPending}>
                        {createExpense.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Ajouter
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>

            <TabsContent value="active">
              <Card className="border-0 shadow-soft">
                <CardContent className="p-0">
                  <ExpenseTable
                    expenses={expenses?.filter((e) => e.is_active) || []}
                    selectedMonth={selectedMonth}
                    isAdmin={isAdmin}
                    onToggle={handleToggleActive}
                    onDelete={handleDelete}
                  />
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="all">
              <Card className="border-0 shadow-soft">
                <CardContent className="p-0">
                  <ExpenseTable
                    expenses={expenses || []}
                    selectedMonth={selectedMonth}
                    isAdmin={isAdmin}
                    onToggle={handleToggleActive}
                    onDelete={handleDelete}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </motion.div>
  );
}

function ExpenseTable({
  expenses,
  selectedMonth,
  isAdmin,
  onToggle,
  onDelete,
}: {
  expenses: any[];
  selectedMonth: string;
  isAdmin: boolean;
  onToggle: (id: string, active: boolean) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Charge</TableHead>
          <TableHead>Catégorie</TableHead>
          <TableHead>Fréquence</TableHead>
          <TableHead className="text-right">Montant</TableHead>
          <TableHead className="text-right">Ce mois</TableHead>
          <TableHead>Statut</TableHead>
          {isAdmin && <TableHead>Actions</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {!expenses.length ? (
          <TableRow>
            <TableCell colSpan={isAdmin ? 7 : 6} className="text-center text-muted-foreground py-8">
              Aucune charge enregistrée
            </TableCell>
          </TableRow>
        ) : (
          expenses.map((e) => {
            const monthAmount = getMonthlyAmount(e, selectedMonth);
            const Icon = CATEGORY_ICONS[e.category] || Calculator;
            return (
              <TableRow key={e.id} className={!e.is_active ? "opacity-50" : ""}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">{e.name}</p>
                      {e.description && <p className="text-xs text-muted-foreground truncate max-w-48">{e.description}</p>}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-[10px]">
                    {CATEGORY_LABELS[e.category] || e.category}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 text-sm">
                    {e.frequency !== "ponctuel" && <Repeat className="w-3 h-3 text-muted-foreground" />}
                    {FREQUENCY_LABELS[e.frequency] || e.frequency}
                  </div>
                </TableCell>
                <TableCell className="text-right font-mono text-sm">{Number(e.amount).toFixed(2)} €</TableCell>
                <TableCell className="text-right font-mono text-sm font-semibold">
                  {monthAmount > 0 ? `${monthAmount.toFixed(2)} €` : "—"}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={`text-[10px] ${e.is_active ? "bg-success/10 text-success border-success/20" : "bg-muted text-muted-foreground"}`}>
                    {e.is_active ? "Actif" : "Inactif"}
                  </Badge>
                </TableCell>
                {isAdmin && (
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => onToggle(e.id, e.is_active)}>
                        {e.is_active ? "Désactiver" : "Activer"}
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive">
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Supprimer cette charge ?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Cette action est irréversible. La charge "{e.name}" sera définitivement supprimée.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction onClick={() => onDelete(e.id)}>Supprimer</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            );
          })
        )}
      </TableBody>
    </Table>
  );
}
