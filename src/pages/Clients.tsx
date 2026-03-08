import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useClients, useCreateClient } from "@/hooks/use-clients";
import { useAuth } from "@/contexts/AuthContext";
import { PIPELINE_LABELS, PIPELINE_COLORS, PACK_LABELS } from "@/lib/constants";
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
import { Plus, Search, Building2, MapPin, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import type { Database } from "@/integrations/supabase/types";

type PackType = Database["public"]["Enums"]["pack_type"];

export default function Clients() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: clients, isLoading } = useClients();
  const createClient = useCreateClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const [form, setForm] = useState({
    company_name: "", siret: "", address: "", city: "",
    postal_code: "", sector: "", website: "", notes: "", pack_type: "" as PackType | "",
  });

  const handleCreate = async () => {
    if (!form.company_name.trim()) { toast.error("Le nom de l'entreprise est requis"); return; }
    try {
      await createClient.mutateAsync({
        ...form, pack_type: form.pack_type || null,
        created_by: user!.id, assigned_to: user!.id,
      });
      toast.success("Client créé");
      setOpen(false);
      setForm({ company_name: "", siret: "", address: "", city: "", postal_code: "", sector: "", website: "", notes: "", pack_type: "" });
    } catch { toast.error("Erreur"); }
  };

  const filtered = clients?.filter((c) => {
    const matchSearch = c.company_name.toLowerCase().includes(search.toLowerCase()) ||
      c.city?.toLowerCase().includes(search.toLowerCase()) ||
      c.sector?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || c.pipeline_status === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <motion.div className="space-y-6" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clients</h1>
          <p className="text-muted-foreground text-sm mt-1">{clients?.length || 0} client{(clients?.length || 0) > 1 ? "s" : ""}</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 shadow-soft">
              <Plus className="w-4 h-4" /> Nouveau
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nouveau client</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Nom de l'entreprise *</Label>
                <Input value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} placeholder="Ex: Boulangerie du Port" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>SIRET</Label>
                  <Input value={form.siret} onChange={(e) => setForm({ ...form, siret: e.target.value })} placeholder="123 456 789 00012" />
                </div>
                <div className="space-y-2">
                  <Label>Secteur</Label>
                  <Input value={form.sector} onChange={(e) => setForm({ ...form, sector: e.target.value })} placeholder="Ex: Restauration" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Adresse</Label>
                <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="12 rue des Lilas" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Ville</Label>
                  <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Saint-Denis" />
                </div>
                <div className="space-y-2">
                  <Label>Code postal</Label>
                  <Input value={form.postal_code} onChange={(e) => setForm({ ...form, postal_code: e.target.value })} placeholder="97400" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Site web</Label>
                  <Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://..." />
                </div>
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
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Informations supplémentaires..." rows={3} />
              </div>
              <Button onClick={handleCreate} disabled={createClient.isPending}>
                {createClient.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Créer le client
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-10" placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            {Object.entries(PIPELINE_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : filtered?.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Building2 className="w-10 h-10 text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground text-sm">{search ? "Aucun résultat" : "Aucun client"}</p>
            {!search && (
              <Button variant="outline" size="sm" className="mt-4" onClick={() => setOpen(true)}>
                <Plus className="w-4 h-4 mr-2" /> Ajouter
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-2">
          {filtered?.map((client, i) => (
            <motion.div
              key={client.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03, duration: 0.25 }}
            >
              <Card
                className="border-0 shadow-soft hover:shadow-medium transition-all duration-200 cursor-pointer group"
                onClick={() => navigate(`/clients/${client.id}`)}
              >
                <CardContent className="flex items-center gap-4 py-3.5 px-4">
                  <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/8 text-primary shrink-0 group-hover:bg-primary/12 transition-colors">
                    <Building2 className="w-4.5 h-4.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{client.company_name}</p>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                      {client.city && (
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{client.city}</span>
                      )}
                      {client.sector && <span>• {client.sector}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {client.pack_type && (
                      <Badge variant="secondary" className="text-[10px] font-medium">{PACK_LABELS[client.pack_type]}</Badge>
                    )}
                    <Badge className={`text-[10px] border ${PIPELINE_COLORS[client.pipeline_status]}`} variant="outline">
                      {PIPELINE_LABELS[client.pipeline_status]}
                    </Badge>
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
