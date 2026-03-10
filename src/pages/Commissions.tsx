import { useState, useMemo } from "react";
import { useCommissions, useUpdateCommissionStatus } from "@/hooks/use-commissions";
import { useSalesTeam } from "@/hooks/use-commercials";
import { useClients } from "@/hooks/use-clients";
import { useAuth } from "@/contexts/AuthContext";
import { PACK_LABELS } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  DollarSign, TrendingUp, Users, CreditCard, Loader2, CheckCircle, Clock, UserCheck,
} from "lucide-react";
import { motion } from "framer-motion";

const STATUS_LABELS: Record<string, string> = {
  en_attente: "En attente",
  valide: "Validé",
  paye: "Payé",
};

const STATUS_COLORS: Record<string, string> = {
  en_attente: "bg-warning/10 text-warning border-warning/20",
  valide: "bg-primary/10 text-primary border-primary/20",
  paye: "bg-success/10 text-success border-success/20",
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

export default function Commissions() {
  const { hasRole } = useAuth();
  const isAdmin = hasRole("admin");
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const monthOptions = getMonthOptions();

  const { data: commissions, isLoading } = useCommissions(selectedMonth);
  const { data: salesTeam } = useSalesTeam();
  const { data: clients } = useClients();
  const updateStatus = useUpdateCommissionStatus();

  const getUserName = (userId: string) => {
    const all = [...(salesTeam?.agents || []), ...(salesTeam?.commercials || [])];
    return all.find((u) => u.user_id === userId)?.full_name || "Inconnu";
  };

  const getClientName = (clientId: string) => {
    return clients?.find((c) => c.id === clientId)?.company_name || "—";
  };

  // Split commissions by role
  const agentCommissions = useMemo(
    () => commissions?.filter((c) => c.role === "agent_telephonique") || [],
    [commissions]
  );
  const commercialCommissions = useMemo(
    () => commissions?.filter((c) => c.role === "commercial_terrain") || [],
    [commissions]
  );

  // Summaries
  const totalAgent = agentCommissions.reduce((s, c) => s + Number(c.total_amount), 0);
  const totalCommercial = commercialCommissions.reduce((s, c) => s + Number(c.total_amount), 0);
  const totalAll = totalAgent + totalCommercial;
  const totalPaid = (commissions || []).filter((c) => c.status === "paye").reduce((s, c) => s + Number(c.total_amount), 0);
  const totalPending = totalAll - totalPaid;

  // Group by user for summary cards
  const commercialSummary = useMemo(() => {
    const map = new Map<string, { name: string; sites: number; nfc: number; total: number }>();
    commercialCommissions.forEach((c) => {
      const existing = map.get(c.user_id) || { name: getUserName(c.user_id), sites: 0, nfc: 0, total: 0 };
      if (c.pack_type === "star_bizness_nfc") {
        existing.nfc++;
      } else {
        existing.sites++;
      }
      existing.total += Number(c.total_amount);
      map.set(c.user_id, existing);
    });
    return Array.from(map.entries());
  }, [commercialCommissions, salesTeam]);

  const agentSummary = useMemo(() => {
    const map = new Map<string, { name: string; count: number; total: number }>();
    agentCommissions.forEach((c) => {
      const existing = map.get(c.user_id) || { name: getUserName(c.user_id), count: 0, total: 0 };
      existing.count++;
      existing.total += Number(c.total_amount);
      map.set(c.user_id, existing);
    });
    return Array.from(map.entries());
  }, [agentCommissions, salesTeam]);

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await updateStatus.mutateAsync({ id, status });
      toast.success(`Commission ${STATUS_LABELS[status].toLowerCase()}`);
    } catch {
      toast.error("Erreur");
    }
  };

  const CommissionTable = ({ data, showRole = false }: { data: typeof commissions; showRole?: boolean }) => (
    <Table>
      <TableHeader>
        <TableRow>
          {showRole && <TableHead>Rôle</TableHead>}
          <TableHead>Membre</TableHead>
          <TableHead>Client</TableHead>
          <TableHead>Pack</TableHead>
          <TableHead className="text-right">Base</TableHead>
          <TableHead className="text-right">Bonus</TableHead>
          <TableHead className="text-right">Total</TableHead>
          <TableHead>Statut</TableHead>
          {isAdmin && <TableHead>Actions</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {!data?.length ? (
          <TableRow>
            <TableCell colSpan={isAdmin ? 9 : 8} className="text-center text-muted-foreground py-8">
              Aucune commission pour cette période
            </TableCell>
          </TableRow>
        ) : (
          data.map((c) => (
            <TableRow key={c.id}>
              {showRole && (
                <TableCell>
                  <Badge variant="outline" className="text-[10px]">
                    {c.role === "agent_telephonique" ? "Agent" : "Commercial"}
                  </Badge>
                </TableCell>
              )}
              <TableCell className="font-medium text-sm">{getUserName(c.user_id)}</TableCell>
              <TableCell className="text-sm">{getClientName(c.client_id)}</TableCell>
              <TableCell>
                <Badge variant="secondary" className="text-[10px]">
                  {PACK_LABELS[c.pack_type as keyof typeof PACK_LABELS] || c.pack_type}
                </Badge>
              </TableCell>
              <TableCell className="text-right font-mono text-sm">{Number(c.base_amount).toFixed(2)} €</TableCell>
              <TableCell className="text-right font-mono text-sm">
                {Number(c.bonus_amount) > 0 ? `+${Number(c.bonus_amount).toFixed(2)} €` : "—"}
              </TableCell>
              <TableCell className="text-right font-mono text-sm font-semibold">{Number(c.total_amount).toFixed(2)} €</TableCell>
              <TableCell>
                <Badge variant="outline" className={`text-[10px] ${STATUS_COLORS[c.status]}`}>
                  {STATUS_LABELS[c.status] || c.status}
                </Badge>
              </TableCell>
              {isAdmin && (
                <TableCell>
                  <Select value={c.status} onValueChange={(v) => handleStatusChange(c.id, v)}>
                    <SelectTrigger className="w-28 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en_attente">En attente</SelectItem>
                      <SelectItem value="valide">Validé</SelectItem>
                      <SelectItem value="paye">Payé</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
              )}
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );

  return (
    <motion.div className="space-y-6" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Commissions</h1>
          <p className="text-muted-foreground text-sm mt-1">Suivi des commissions agents et commerciaux</p>
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

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-soft">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10">
                <DollarSign className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Total mois</p>
                <p className="text-xl font-bold">{totalAll.toFixed(2)} €</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-soft">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-success/10">
                <CheckCircle className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Payé</p>
                <p className="text-xl font-bold">{totalPaid.toFixed(2)} €</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-soft">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-warning/10">
                <Clock className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider">En attente</p>
                <p className="text-xl font-bold">{totalPending.toFixed(2)} €</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-soft">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-accent/10">
                <Users className="w-5 h-5 text-accent-foreground" />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Bénéficiaires</p>
                <p className="text-xl font-bold">
                  {new Set((commissions || []).map((c) => c.user_id)).size}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : (
        <>
          {/* Summary per person */}
          {(commercialSummary.length > 0 || agentSummary.length > 0) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {commercialSummary.length > 0 && (
                <Card className="border-0 shadow-soft">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <UserCheck className="w-4 h-4" /> Commerciaux terrain
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {commercialSummary.map(([userId, data]) => (
                      <div key={userId} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                        <div>
                          <p className="font-medium text-sm">{data.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {data.sites > 0 && `${data.sites} site${data.sites > 1 ? "s" : ""}`}
                            {data.sites > 0 && data.nfc > 0 && " • "}
                            {data.nfc > 0 && `${data.nfc} NFC`}
                          </p>
                        </div>
                        <p className="font-bold text-sm font-mono">{data.total.toFixed(2)} €</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
              {agentSummary.length > 0 && (
                <Card className="border-0 shadow-soft">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Users className="w-4 h-4" /> Agents téléphoniques
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {agentSummary.map(([userId, data]) => (
                      <div key={userId} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                        <div>
                          <p className="font-medium text-sm">{data.name}</p>
                          <p className="text-xs text-muted-foreground">{data.count} contrat{data.count > 1 ? "s" : ""} signé{data.count > 1 ? "s" : ""}</p>
                        </div>
                        <p className="font-bold text-sm font-mono">{data.total.toFixed(2)} €</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Detail tables */}
          <Tabs defaultValue="all">
            <TabsList>
              <TabsTrigger value="all">Toutes ({commissions?.length || 0})</TabsTrigger>
              <TabsTrigger value="commercials">Commerciaux ({commercialCommissions.length})</TabsTrigger>
              <TabsTrigger value="agents">Agents ({agentCommissions.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="all">
              <Card className="border-0 shadow-soft">
                <CardContent className="p-0">
                  <CommissionTable data={commissions} showRole />
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="commercials">
              <Card className="border-0 shadow-soft">
                <CardContent className="p-0">
                  <CommissionTable data={commercialCommissions} />
                </CardContent>
              </Card>

              {/* Barème reference */}
              <Card className="border-0 shadow-soft mt-4">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Barème mensuel — Sites Internet</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-sm">
                    {[
                      { label: "1 site", amount: "250 €" },
                      { label: "2 sites", amount: "300 €/site" },
                      { label: "3 sites", amount: "350 €/site" },
                      { label: "4 sites", amount: "400 €/site" },
                      { label: "5+ sites", amount: "400 € + 100 €" },
                    ].map((item) => (
                      <div key={item.label} className="p-3 rounded-lg bg-muted/30">
                        <p className="text-xs text-muted-foreground">{item.label}</p>
                        <p className="font-semibold mt-1">{item.amount}</p>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">
                    Carte NFC : 79,90 € fixe par pack • Agent tél. : 50 € fixe par contrat signé
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="agents">
              <Card className="border-0 shadow-soft">
                <CardContent className="p-0">
                  <CommissionTable data={agentCommissions} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </motion.div>
  );
}
