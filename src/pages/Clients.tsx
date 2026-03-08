import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useClients, useCreateClient } from "@/hooks/use-clients";
import { useAuth } from "@/contexts/AuthContext";
import { PIPELINE_LABELS, PIPELINE_COLORS, PACK_LABELS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Search, Building2, MapPin, Loader2 } from "lucide-react";
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

  // Form state
  const [form, setForm] = useState({
    company_name: "",
    siret: "",
    address: "",
    city: "",
    postal_code: "",
    sector: "",
    website: "",
    notes: "",
    pack_type: "" as PackType | "",
  });

  const handleCreate = async () => {
    if (!form.company_name.trim()) {
      toast.error("Le nom de l'entreprise est requis");
      return;
    }
    try {
      await createClient.mutateAsync({
        ...form,
        pack_type: form.pack_type || null,
        created_by: user!.id,
        assigned_to: user!.id,
      });
      toast.success("Client créé avec succès");
      setOpen(false);
      setForm({
        company_name: "", siret: "", address: "", city: "",
        postal_code: "", sector: "", website: "", notes: "", pack_type: "",
      });
    } catch {
      toast.error("Erreur lors de la création du client");
    }
  };

  const filtered = clients?.filter((c) => {
    const matchSearch =
      c.company_name.toLowerCase().includes(search.toLowerCase()) ||
      c.city?.toLowerCase().includes(search.toLowerCase()) ||
      c.sector?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || c.pipeline_status === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clients</h1>
          <p className="text-muted-foreground mt-1">
            {clients?.length || 0} client{(clients?.length || 0) > 1 ? "s" : ""} au total
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nouveau client
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nouveau client</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Nom de l'entreprise *</Label>
                <Input
                  value={form.company_name}
                  onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                  placeholder="Ex: Boulangerie du Port"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>SIRET</Label>
                  <Input
                    value={form.siret}
                    onChange={(e) => setForm({ ...form, siret: e.target.value })}
                    placeholder="123 456 789 00012"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Secteur</Label>
                  <Input
                    value={form.sector}
                    onChange={(e) => setForm({ ...form, sector: e.target.value })}
                    placeholder="Ex: Restauration"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Adresse</Label>
                <Input
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="12 rue des Lilas"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Ville</Label>
                  <Input
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    placeholder="Saint-Denis"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Code postal</Label>
                  <Input
                    value={form.postal_code}
                    onChange={(e) => setForm({ ...form, postal_code: e.target.value })}
                    placeholder="97400"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Site web</Label>
                  <Input
                    value={form.website}
                    onChange={(e) => setForm({ ...form, website: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Pack</Label>
                  <Select
                    value={form.pack_type}
                    onValueChange={(v) => setForm({ ...form, pack_type: v as PackType })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choisir un pack" />
                    </SelectTrigger>
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
                <Textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Informations supplémentaires..."
                  rows={3}
                />
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
          <Input
            className="pl-10"
            placeholder="Rechercher un client..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            {Object.entries(PIPELINE_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : filtered?.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="w-12 h-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground text-center">
              {search ? "Aucun client trouvé" : "Aucun client pour le moment"}
            </p>
            {!search && (
              <Button variant="outline" className="mt-4" onClick={() => setOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Ajouter votre premier client
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filtered?.map((client) => (
            <Card
              key={client.id}
              className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => navigate(`/clients/${client.id}`)}
            >
              <CardContent className="flex items-center gap-4 py-4">
                <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-primary/10 text-primary shrink-0">
                  <Building2 className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{client.company_name}</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5">
                    {client.city && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {client.city}
                      </span>
                    )}
                    {client.sector && <span>• {client.sector}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {client.pack_type && (
                    <Badge variant="secondary" className="text-xs">
                      {PACK_LABELS[client.pack_type]}
                    </Badge>
                  )}
                  <Badge className={`text-xs border ${PIPELINE_COLORS[client.pipeline_status]}`} variant="outline">
                    {PIPELINE_LABELS[client.pipeline_status]}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
