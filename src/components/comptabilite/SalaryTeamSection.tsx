import { useMemo, useState } from "react";
import { useExpenses, useCreateExpense, useUpdateExpense, useDeleteExpense, getMonthlyAmount, type Expense } from "@/hooks/use-expenses";
import {
  useSalaryAdvances,
  useCreateSalaryAdvance,
  useUpdateSalaryAdvance,
  useDeleteSalaryAdvance,
  type SalaryAdvance,
} from "@/hooks/use-salary-advances";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  Users, Plus, ChevronDown, ChevronRight, Trash2, Pencil, Wallet, HandCoins, Loader2,
} from "lucide-react";

interface Props {
  selectedMonth: string;
}

export function SalaryTeamSection({ selectedMonth }: Props) {
  const { user, hasRole } = useAuth();
  const isAdmin = hasRole("admin");

  const { data: expenses, isLoading } = useExpenses();
  const { data: allAdvances } = useSalaryAdvances();
  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();
  const deleteExpense = useDeleteExpense();

  const [groupOpen, setGroupOpen] = useState(false);
  const [groupName, setGroupName] = useState("");

  // Build groups: parent expenses with is_group=true, then their children
  const groups = useMemo(() => {
    if (!expenses) return [];
    const parents = expenses.filter((e) => e.is_group);
    return parents.map((parent) => {
      const children = expenses.filter((e) => e.parent_id === parent.id);
      const childrenTotal = children.reduce((sum, c) => sum + getMonthlyAmount(c, selectedMonth), 0);
      const groupAdvances = (allAdvances || []).filter((a) => children.some((c) => c.id === a.expense_id));
      const pendingAdvances = groupAdvances
        .filter((a) => a.status === "en_cours")
        .reduce((sum, a) => sum + Number(a.amount), 0);
      return { parent, children, childrenTotal, pendingAdvances, netTotal: childrenTotal - pendingAdvances };
    });
  }, [expenses, allAdvances, selectedMonth]);

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      toast.error("Nom requis");
      return;
    }
    try {
      await createExpense.mutateAsync({
        name: groupName,
        description: null,
        category: "salaire",
        amount: 0,
        frequency: "mensuel",
        month_year: null,
        start_date: null,
        end_date: null,
        is_active: true,
        created_by: user!.id,
        is_group: true,
        parent_id: null,
        employee_name: null,
        employee_role: null,
      } as any);
      toast.success("Module créé");
      setGroupOpen(false);
      setGroupName("");
    } catch {
      toast.error("Erreur création module");
    }
  };

  const handleDeleteGroup = async (id: string) => {
    try {
      await deleteExpense.mutateAsync(id);
      toast.success("Module supprimé");
    } catch {
      toast.error("Erreur suppression");
    }
  };

  if (!isAdmin) return null;
  if (isLoading) {
    return (
      <Card className="border-0 shadow-soft">
        <CardContent className="p-6 flex justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  const grandTotal = groups.reduce((s, g) => s + g.netTotal, 0);

  return (
    <Card className="border-0 shadow-soft">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            Modules Salaires Team
            <Badge variant="outline" className="ml-2 text-[10px]">
              Total : {grandTotal.toFixed(2)} €
            </Badge>
          </CardTitle>
          <Dialog open={groupOpen} onOpenChange={setGroupOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="gap-2">
                <Plus className="w-4 h-4" /> Nouveau module
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nouveau module salaire</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-2">
                <div className="space-y-2">
                  <Label>Nom du module *</Label>
                  <Input
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="Ex: Salaires Team Tech"
                  />
                </div>
                <Button onClick={handleCreateGroup} disabled={createExpense.isPending}>
                  {createExpense.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Créer
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {groups.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            Aucun module créé. Cliquez sur "Nouveau module" pour grouper les salaires de votre équipe.
          </p>
        ) : (
          groups.map((g) => (
            <SalaryGroupCard
              key={g.parent.id}
              group={g}
              selectedMonth={selectedMonth}
              currentUserId={user!.id}
              onDeleteGroup={handleDeleteGroup}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}

function SalaryGroupCard({
  group,
  selectedMonth,
  currentUserId,
  onDeleteGroup,
}: {
  group: { parent: Expense; children: Expense[]; childrenTotal: number; pendingAdvances: number; netTotal: number };
  selectedMonth: string;
  currentUserId: string;
  onDeleteGroup: (id: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [empForm, setEmpForm] = useState({ employee_name: "", employee_role: "", amount: "" });

  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();
  const deleteExpense = useDeleteExpense();

  const handleAddEmployee = async () => {
    if (!empForm.employee_name.trim() || !empForm.amount) {
      toast.error("Nom et montant requis");
      return;
    }
    const amount = parseFloat(empForm.amount);
    if (isNaN(amount)) {
      toast.error("Montant invalide");
      return;
    }
    try {
      await createExpense.mutateAsync({
        name: empForm.employee_name,
        description: empForm.employee_role || null,
        category: "salaire",
        amount,
        frequency: "mensuel",
        month_year: null,
        start_date: null,
        end_date: null,
        is_active: true,
        created_by: currentUserId,
        is_group: false,
        parent_id: group.parent.id,
        employee_name: empForm.employee_name,
        employee_role: empForm.employee_role || null,
      } as any);
      toast.success("Salarié ajouté");
      setAddOpen(false);
      setEmpForm({ employee_name: "", employee_role: "", amount: "" });
    } catch {
      toast.error("Erreur ajout salarié");
    }
  };

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="border border-border rounded-xl bg-muted/20 overflow-hidden">
        <div className="flex items-center justify-between p-3 gap-3 flex-wrap">
          <CollapsibleTrigger asChild>
            <button className="flex items-center gap-2 flex-1 min-w-0 hover:opacity-80 transition-opacity text-left">
              {open ? <ChevronDown className="w-4 h-4 shrink-0" /> : <ChevronRight className="w-4 h-4 shrink-0" />}
              <Wallet className="w-4 h-4 text-primary shrink-0" />
              <span className="font-semibold text-sm truncate">{group.parent.name}</span>
              <Badge variant="outline" className="text-[10px] shrink-0">
                {group.children.length} salarié{group.children.length > 1 ? "s" : ""}
              </Badge>
            </button>
          </CollapsibleTrigger>
          <div className="flex items-center gap-2 shrink-0">
            <div className="text-right">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total net</p>
              <p className="font-mono font-bold text-primary">{group.netTotal.toFixed(2)} €</p>
              {group.pendingAdvances > 0 && (
                <p className="text-[10px] text-warning">
                  Brut {group.childrenTotal.toFixed(2)} € − avances {group.pendingAdvances.toFixed(2)} €
                </p>
              )}
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive">
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Supprimer ce module ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tous les salariés et avances rattachés seront définitivement supprimés.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction onClick={() => onDeleteGroup(group.parent.id)}>Supprimer</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        <CollapsibleContent>
          <div className="border-t border-border p-3 space-y-2 bg-background/40">
            {group.children.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-3">Aucun salarié dans ce module</p>
            ) : (
              group.children.map((child) => (
                <EmployeeRow
                  key={child.id}
                  employee={child}
                  selectedMonth={selectedMonth}
                  currentUserId={currentUserId}
                  onUpdate={(updates) => updateExpense.mutateAsync({ id: child.id, ...updates })}
                  onDelete={() => deleteExpense.mutateAsync(child.id)}
                />
              ))
            )}

            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="w-full gap-2 mt-2">
                  <Plus className="w-3.5 h-3.5" /> Ajouter un salarié
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Ajouter un salarié</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-2">
                  <div className="space-y-2">
                    <Label>Nom du salarié *</Label>
                    <Input value={empForm.employee_name} onChange={(e) => setEmpForm({ ...empForm, employee_name: e.target.value })} placeholder="Ex: Jean Dupont" />
                  </div>
                  <div className="space-y-2">
                    <Label>Poste</Label>
                    <Input value={empForm.employee_role} onChange={(e) => setEmpForm({ ...empForm, employee_role: e.target.value })} placeholder="Ex: Webmaster" />
                  </div>
                  <div className="space-y-2">
                    <Label>Salaire mensuel (€) *</Label>
                    <Input type="number" step="0.01" value={empForm.amount} onChange={(e) => setEmpForm({ ...empForm, amount: e.target.value })} placeholder="0.00" />
                  </div>
                  <Button onClick={handleAddEmployee} disabled={createExpense.isPending}>
                    {createExpense.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Ajouter
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

function EmployeeRow({
  employee,
  selectedMonth,
  currentUserId,
  onUpdate,
  onDelete,
}: {
  employee: Expense;
  selectedMonth: string;
  currentUserId: string;
  onUpdate: (updates: Partial<Expense>) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [showAdvances, setShowAdvances] = useState(false);
  const [form, setForm] = useState({
    name: employee.name,
    employee_role: (employee as any).employee_role || "",
    amount: String(employee.amount),
  });

  const { data: advances } = useSalaryAdvances(employee.id);
  const createAdvance = useCreateSalaryAdvance();
  const updateAdvance = useUpdateSalaryAdvance();
  const deleteAdvance = useDeleteSalaryAdvance();

  const monthAmount = getMonthlyAmount(employee, selectedMonth);
  const pendingAmount = (advances || [])
    .filter((a) => a.status === "en_cours")
    .reduce((s, a) => s + Number(a.amount), 0);
  const netSalary = monthAmount - pendingAmount;

  const [advanceOpen, setAdvanceOpen] = useState(false);
  const [advForm, setAdvForm] = useState({ amount: "", reason: "", request_date: new Date().toISOString().slice(0, 10) });

  const handleSave = async () => {
    if (!form.name.trim() || !form.amount) {
      toast.error("Nom et montant requis");
      return;
    }
    const amt = parseFloat(form.amount);
    if (isNaN(amt)) {
      toast.error("Montant invalide");
      return;
    }
    try {
      await onUpdate({
        name: form.name,
        amount: amt,
        description: form.employee_role || null,
        ...({ employee_name: form.name, employee_role: form.employee_role || null } as any),
      });
      toast.success("Mis à jour");
      setEditing(false);
    } catch {
      toast.error("Erreur mise à jour");
    }
  };

  const handleAddAdvance = async () => {
    if (!advForm.amount) {
      toast.error("Montant requis");
      return;
    }
    const amt = parseFloat(advForm.amount);
    if (isNaN(amt) || amt <= 0) {
      toast.error("Montant invalide");
      return;
    }
    try {
      await createAdvance.mutateAsync({
        expense_id: employee.id,
        employee_name: employee.name,
        amount: amt,
        reason: advForm.reason || null,
        request_date: advForm.request_date,
        status: "en_cours",
        reimbursed_at: null,
        notes: null,
        created_by: currentUserId,
      });
      toast.success("Avance enregistrée");
      setAdvanceOpen(false);
      setAdvForm({ amount: "", reason: "", request_date: new Date().toISOString().slice(0, 10) });
    } catch {
      toast.error("Erreur");
    }
  };

  const toggleAdvanceStatus = async (a: SalaryAdvance) => {
    try {
      await updateAdvance.mutateAsync({
        id: a.id,
        status: a.status === "en_cours" ? "rembourse" : "en_cours",
        reimbursed_at: a.status === "en_cours" ? new Date().toISOString() : null,
      });
    } catch {
      toast.error("Erreur");
    }
  };

  return (
    <div className="rounded-lg border border-border/60 bg-card p-3 space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{employee.name}</p>
          {(employee as any).employee_role && (
            <p className="text-[11px] text-muted-foreground truncate">{(employee as any).employee_role}</p>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <p className="font-mono text-sm font-semibold">{netSalary.toFixed(2)} €</p>
            {pendingAmount > 0 && (
              <p className="text-[10px] text-warning">
                {monthAmount.toFixed(2)} − {pendingAmount.toFixed(2)} avance
              </p>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowAdvances((v) => !v)} title="Avances">
              <HandCoins className="w-3.5 h-3.5" />
              {(advances?.length ?? 0) > 0 && (
                <span className="ml-0.5 text-[10px]">{advances?.length}</span>
              )}
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditing((v) => !v)}>
              <Pencil className="w-3.5 h-3.5" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive">
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Supprimer ce salarié ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    L'entrée et toutes ses avances seront supprimées.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction onClick={() => onDelete()}>Supprimer</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>

      {editing && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-2 border-t border-border/60">
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nom" className="h-8 text-xs" />
          <Input value={form.employee_role} onChange={(e) => setForm({ ...form, employee_role: e.target.value })} placeholder="Poste" className="h-8 text-xs" />
          <div className="flex gap-1">
            <Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="h-8 text-xs" />
            <Button size="sm" className="h-8" onClick={handleSave}>OK</Button>
          </div>
        </div>
      )}

      {showAdvances && (
        <div className="pt-2 border-t border-border/60 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Avances</p>
            <Dialog open={advanceOpen} onOpenChange={setAdvanceOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="h-7 gap-1 text-xs">
                  <Plus className="w-3 h-3" /> Avance
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nouvelle avance — {employee.name}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-3 py-2">
                  <div className="space-y-2">
                    <Label>Montant (€) *</Label>
                    <Input type="number" step="0.01" value={advForm.amount} onChange={(e) => setAdvForm({ ...advForm, amount: e.target.value })} placeholder="0.00" />
                  </div>
                  <div className="space-y-2">
                    <Label>Date de demande</Label>
                    <Input type="date" value={advForm.request_date} onChange={(e) => setAdvForm({ ...advForm, request_date: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Motif</Label>
                    <Textarea rows={2} value={advForm.reason} onChange={(e) => setAdvForm({ ...advForm, reason: e.target.value })} placeholder="Ex: imprévu personnel" />
                  </div>
                  <Button onClick={handleAddAdvance} disabled={createAdvance.isPending}>
                    {createAdvance.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Enregistrer
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {(advances?.length ?? 0) === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-2">Aucune avance</p>
          ) : (
            <div className="space-y-1">
              {advances!.map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-2 p-2 rounded bg-muted/40 text-xs">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold">{Number(a.amount).toFixed(2)} €</span>
                      <Badge variant="outline" className={`text-[9px] ${a.status === "en_cours" ? "bg-warning/10 text-warning border-warning/30" : "bg-success/10 text-success border-success/30"}`}>
                        {a.status === "en_cours" ? "En cours" : "Remboursée"}
                      </Badge>
                      <span className="text-muted-foreground text-[10px]">
                        {new Date(a.request_date).toLocaleDateString("fr-FR")}
                      </span>
                    </div>
                    {a.reason && <p className="text-muted-foreground text-[10px] truncate mt-0.5">{a.reason}</p>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px]" onClick={() => toggleAdvanceStatus(a)}>
                      {a.status === "en_cours" ? "Marquer remboursée" : "Réactiver"}
                    </Button>
                    <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => deleteAdvance.mutateAsync(a.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
