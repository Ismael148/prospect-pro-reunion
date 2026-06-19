import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useClients, useCreateClient } from "@/hooks/use-clients";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAllCommercials } from "@/hooks/use-commercials";
import { useAgents } from "@/hooks/use-agents";
import { PIPELINE_LABELS, PIPELINE_COLORS, PACK_LABELS, PACK_PRICES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Search, Building2, MapPin, Loader2, Filter, X, Mail } from "lucide-react";
import { motion } from "framer-motion";
import type { Database } from "@/integrations/supabase/types";

type PackType = Database["public"]["Enums"]["pack_type"];

export default function Clients() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: clients, isLoading } = useClients();
  const createClient = useCreateClient();
  const { data: allCommercials } = useAllCommercials();
  const { data: agents } = useAgents();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPack, setFilterPack] = useState<string>("all");
  const [filterCity, setFilterCity] = useState<string>("all");
  const [filterAgent, setFilterAgent] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);

  const [form, setForm] = useState({
    company_name: "", manager_name: "", phone: "", email: "", address: "", city: "",
    postal_code: "", sector: "", website: "", notes: "",
    pack_type: "" as PackType | "", payment_method: "", signature_date: "",
    signed_by_commercial: "", assigned_to: "",
  });

  const packAmount = form.pack_type ? PACK_PRICES[form.pack_type] || 0 : 0;

  const cities = useMemo(() => {
    if (!clients) return [];
    const set = new Set(clients.map(c => c.city).filter(Boolean) as string[]);
    return Array.from(set).sort();
  }, [clients]);

  const teamMembers = useMemo(() => {
    const map = new Map<string, string>();
    agents?.forEach(a => map.set(a.user_id, a.full_name || "Sans nom"));
    allCommercials?.internal?.forEach(c => map.set(c.user_id, c.full_name || "Sans nom"));
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [agents, allCommercials]);

  const activeFilterCount = [filterStatus, filterPack, filterCity, filterAgent].filter(f => f !== "all").length;

  // Fetch emails sent per client email
  const { data: emailLogs } = useQuery({
    queryKey: ["client-email-logs-summary"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_send_log")
        .select("recipient_email");
      if (error) throw error;
      const counts = new Map<string, number>();
      data?.forEach((log) => {
        const email = log.recipient_email?.toLowerCase();
        if (email) counts.set(email, (counts.get(email) || 0) + 1);
      });
      return counts;
    },
  });

  const getEmailCount = (clientEmail: string | null) => {
    if (!clientEmail || !emailLogs) return 0;
    return emailLogs.get(clientEmail.toLowerCase()) || 0;
  };

  const handleCreate = async () => {
    if (!form.company_name.trim()) { toast.error("Le nom de l'entreprise est requis"); return; }
    try {
      await createClient.mutateAsync({
        company_name: form.company_name.trim(),
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        address: form.address.trim() || null,
        city: form.city.trim() || null,
        postal_code: form.postal_code.trim() || null,
        sector: form.sector.trim() || null,
        website: form.website.trim() || null,
        notes: form.notes.trim() || null,
        pack_type: form.pack_type || null,
        pack_amount: packAmount || null,
        payment_method: form.payment_method || null,
        signature_date: form.signature_date || null,
        signed_by_commercial: null,
        signed_by: form.signed_by_commercial || null,
        assigned_to: form.assigned_to || user!.id,
        created_by: user!.id,
      } as any);
      toast.success("Client créé");
      setOpen(false);
      setForm({ company_name: "", phone: "", email: "", address: "", city: "", postal_code: "", sector: "", website: "", notes: "", pack_type: "", payment_method: "", signature_date: "", signed_by_commercial: "", assigned_to: "" });
    } catch { toast.error("Erreur"); }
  };

  const resetFilters = () => {
    setFilterStatus("all"); setFilterPack("all"); setFilterCity("all"); setFilterAgent("all");
  };

  const filtered = clients?.filter((c) => {
    // Exclude NFC-only clients from this page
    if (c.pack_type === "star_bizness_nfc") return false;
    const s = search.toLowerCase();
    const matchSearch = !s || c.company_name.toLowerCase().includes(s) ||
      c.city?.toLowerCase().includes(s) || c.sector?.toLowerCase().includes(s) ||
      c.phone?.toLowerCase().includes(s) || c.email?.toLowerCase().includes(s) ||
      c.manager_name?.toLowerCase().includes(s);
    const matchStatus = filterStatus === "all" || c.pipeline_status === filterStatus;
    const matchPack = filterPack === "all" || c.pack_type === filterPack;
    const matchCity = filterCity === "all" || c.city === filterCity;
    const matchAgent = filterAgent === "all" || c.assigned_to === filterAgent || (c as any).signed_by_commercial === filterAgent;
    return matchSearch && matchStatus && matchPack && matchCity && matchAgent;
  });

  return (
    <motion.div className="space-y-6" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clients</h1>
          <p className="text-muted-foreground text-sm mt-1">{filtered?.length || 0} / {clients?.length || 0} client{(clients?.length || 0) > 1 ? "s" : ""}</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 shadow-soft"><Plus className="w-4 h-4" /> Nouveau</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Nouveau client</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Nom de l'entreprise *</Label>
                <Input value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} placeholder="Ex: Boulangerie du Port" />
              </div>
              <div className="space-y-2">
                <Label>Nom du gérant</Label>
                <Input value={form.manager_name} onChange={(e) => setForm({ ...form, manager_name: e.target.value })} placeholder="Ex: Jean Dupont" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Téléphone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="0692 00 00 00" /></div>
                <div className="space-y-2"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="contact@exemple.com" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Secteur</Label><Input value={form.sector} onChange={(e) => setForm({ ...form, sector: e.target.value })} placeholder="Ex: Restauration" /></div>
                <div className="space-y-2"><Label>Site web</Label><Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://..." /></div>
              </div>
              <div className="space-y-2"><Label>Adresse</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="12 rue des Lilas" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Ville</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Saint-Denis" /></div>
                <div className="space-y-2"><Label>Code postal</Label><Input value={form.postal_code} onChange={(e) => setForm({ ...form, postal_code: e.target.value })} placeholder="97400" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Pack</Label>
                  <Select value={form.pack_type} onValueChange={(v) => setForm({ ...form, pack_type: v as PackType })}>
                    <SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="star_bizness_numerik">STAR BIZNESS NUMERIK</SelectItem>
                      <SelectItem value="star_bizness_nfc">STAR BIZNESS NFC</SelectItem>
                      <SelectItem value="autre">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Montant du pack</Label><Input value={packAmount ? `${packAmount.toFixed(2)} €` : ""} readOnly className="bg-muted/50" placeholder="Sélectionnez un pack" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Mode de règlement</Label>
                  <Select value={form.payment_method} onValueChange={(v) => setForm({ ...form, payment_method: v })}>
                    <SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="especes">Espèces</SelectItem>
                      <SelectItem value="virement">Virement bancaire</SelectItem>
                      <SelectItem value="cheque">Chèque</SelectItem>
                      <SelectItem value="cb">Carte bancaire</SelectItem>
                      <SelectItem value="prelevement">Prélèvement</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Date de signature</Label><Input type="date" value={form.signature_date} onChange={(e) => setForm({ ...form, signature_date: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Commercial signataire</Label>
                  <Select value={form.signed_by_commercial} onValueChange={(v) => setForm({ ...form, signed_by_commercial: v })}>
                    <SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger>
                    <SelectContent>
                      {allCommercials?.internal?.map((c) => (<SelectItem key={c.user_id} value={c.user_id}>{c.full_name || "Sans nom"}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Agent téléphonique</Label>
                  <Select value={form.assigned_to} onValueChange={(v) => setForm({ ...form, assigned_to: v })}>
                    <SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger>
                    <SelectContent>{agents?.map((a) => (<SelectItem key={a.user_id} value={a.user_id}>{a.full_name || "Sans nom"}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2"><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Informations supplémentaires..." rows={3} /></div>
              <Button onClick={handleCreate} disabled={createClient.isPending}>
                {createClient.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Créer le client
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search + Filter toggle */}
      <div className="flex gap-3 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-10" placeholder="Rechercher par nom, gérant, ville, tél, email..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Button variant={showFilters ? "default" : "outline"} size="sm" className="gap-2" onClick={() => setShowFilters(!showFilters)}>
          <Filter className="w-4 h-4" /> Filtres
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-[10px]">{activeFilterCount}</Badge>
          )}
        </Button>
        {activeFilterCount > 0 && (
          <Button variant="ghost" size="sm" onClick={resetFilters} className="gap-1 text-muted-foreground"><X className="w-3.5 h-3.5" /> Réinitialiser</Button>
        )}
      </div>

      {/* Advanced filters */}
      {showFilters && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Statut" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              {Object.entries(PIPELINE_LABELS).map(([key, label]) => (<SelectItem key={key} value={key}>{label}</SelectItem>))}
            </SelectContent>
          </Select>
          <Select value={filterPack} onValueChange={setFilterPack}>
            <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Pack" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les packs</SelectItem>
              {Object.entries(PACK_LABELS).map(([key, label]) => (<SelectItem key={key} value={key}>{label}</SelectItem>))}
            </SelectContent>
          </Select>
          <Select value={filterCity} onValueChange={setFilterCity}>
            <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Ville" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les villes</SelectItem>
              {cities.map((city) => (<SelectItem key={city} value={city}>{city}</SelectItem>))}
            </SelectContent>
          </Select>
          <Select value={filterAgent} onValueChange={setFilterAgent}>
            <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Agent / Commercial" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les membres</SelectItem>
              {teamMembers.map(([id, name]) => (<SelectItem key={id} value={id}>{name}</SelectItem>))}
            </SelectContent>
          </Select>
        </motion.div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : filtered?.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Building2 className="w-10 h-10 text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground text-sm">{search || activeFilterCount > 0 ? "Aucun résultat" : "Aucun client"}</p>
            {!search && activeFilterCount === 0 && (
              <Button variant="outline" size="sm" className="mt-4" onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-2" /> Ajouter</Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-2">
          {filtered?.map((client, i) => (
            <motion.div key={client.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03, duration: 0.25 }}>
              <Card className="border border-border/50 hover:border-primary/20 shadow-soft hover:shadow-medium transition-all duration-200 cursor-pointer group" onClick={() => navigate(`/clients/${client.id}`)}>
                <CardContent className="flex items-center gap-4 py-3.5 px-4">
                  <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/8 text-primary shrink-0 group-hover:bg-primary/12 transition-colors">
                    <Building2 className="w-4.5 h-4.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{client.company_name}</p>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                      {client.city && (<span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{client.city}</span>)}
                      {client.sector && <span>• {client.sector}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {getEmailCount(client.email) > 0 && (
                      <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700 text-[10px] gap-1" variant="outline">
                        <Mail className="w-3 h-3" /> {getEmailCount(client.email)}
                      </Badge>
                    )}
                    {client.pack_type && (<Badge variant="secondary" className="text-[10px] font-medium">{PACK_LABELS[client.pack_type]}</Badge>)}
                    <Badge className={`text-[10px] border ${PIPELINE_COLORS[client.pipeline_status]}`} variant="outline">{PIPELINE_LABELS[client.pipeline_status]}</Badge>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}