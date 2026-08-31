import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useClients, useCreateClient } from "@/hooks/use-clients";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { PACK_LABELS, PACK_PRICES, PACK_RENEWAL_PRICES, PACK_RENEWAL_NOTE } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  Plus, Search, Loader2, Sparkles, ExternalLink, Building2, MapPin, FileDown, FileText, Link2,
} from "lucide-react";
import { exportClientsCSV, exportClientsPDF } from "@/lib/export-clients-list";

const TUNING_PACK = "star_bizness_tuning";
const TUNING_WEBSITE_ADDON_PRICE = 990;

export default function ClientsTuning() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: clients, isLoading } = useClients();
  const createClient = useCreateClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    company_name: "", manager_name: "", phone: "", email: "", address: "", city: "",
    postal_code: "", sector: "", website: "", notes: "", pack_amount: String(PACK_PRICES[TUNING_PACK]),
    signature_date: "", conversion_page_url: "", tuning_website_addon: false,
  });

  const tuningClients = useMemo(() => {
    const s = search.toLowerCase();
    return (clients || [])
      .filter((c: any) => c.pack_type === TUNING_PACK)
      .filter((c: any) => !s || c.company_name?.toLowerCase().includes(s) ||
        c.city?.toLowerCase().includes(s) || c.manager_name?.toLowerCase().includes(s) ||
        c.email?.toLowerCase().includes(s) || c.phone?.toLowerCase().includes(s))
      .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [clients, search]);

  const handleCreate = async () => {
    if (!form.company_name.trim()) { toast.error("Le nom de l'entreprise est requis"); return; }
    const basePrice = PACK_PRICES[TUNING_PACK];
    const totalPrice = basePrice + (form.tuning_website_addon ? TUNING_WEBSITE_ADDON_PRICE : 0);
    try {
      await createClient.mutateAsync({
        company_name: form.company_name.trim(),
        manager_name: form.manager_name.trim() || null,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        address: form.address.trim() || null,
        city: form.city.trim() || null,
        postal_code: form.postal_code.trim() || null,
        sector: form.sector.trim() || null,
        website: form.website.trim() || null,
        notes: form.notes.trim() || null,
        conversion_page_url: form.conversion_page_url.trim() || null,
        pack_type: TUNING_PACK,
        pack_amount: totalPrice,
        tuning_website_addon: form.tuning_website_addon,
        signature_date: form.signature_date || null,
        assigned_to: user!.id,
        created_by: user!.id,
      } as any);
      toast.success("Client Tuning créé");
      setOpen(false);
      setForm({
        company_name: "", manager_name: "", phone: "", email: "", address: "", city: "",
        postal_code: "", sector: "", website: "", notes: "", pack_amount: String(PACK_PRICES[TUNING_PACK]),
        signature_date: "", conversion_page_url: "", tuning_website_addon: false,
      });
    } catch (e: any) { toast.error("Erreur : " + (e?.message || "création impossible")); }
  };

  const updateClient = async (id: string, patch: Record<string, unknown>) => {
    setSavingId(id);
    const { error } = await supabase.from("clients").update(patch as any).eq("id", id);
    setSavingId(null);
    if (error) { toast.error("Erreur : " + error.message); return; }
    queryClient.invalidateQueries({ queryKey: ["clients"] });
    toast.success("Mis à jour");
  };

  const created = tuningClients.filter((c: any) => c.conversion_page_created).length;

  return (
    <motion.div className="space-y-6" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Sparkles className="w-7 h-7 text-primary" /> Clients Tuning
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {PACK_LABELS[TUNING_PACK]} — {tuningClients.length} client{tuningClients.length > 1 ? "s" : ""} · {created} page{created > 1 ? "s" : ""} de conversion créée{created > 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2" disabled={!tuningClients.length}
            onClick={() => { exportClientsCSV(tuningClients as any, "2.0"); toast.success("Export CSV généré"); }}>
            <FileDown className="w-4 h-4" /> CSV
          </Button>
          <Button variant="outline" className="gap-2" disabled={!tuningClients.length}
            onClick={() => { exportClientsPDF(tuningClients as any, "2.0", "Clients Tuning"); toast.success("Export PDF généré"); }}>
            <FileText className="w-4 h-4" /> PDF
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 shadow-soft"><Plus className="w-4 h-4" /> Nouveau client Tuning</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Nouveau client — {PACK_LABELS[TUNING_PACK]}</DialogTitle></DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label>Nom de l'entreprise *</Label>
                  <Input value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} placeholder="Ex: Garage du Sud" />
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
                  <div className="space-y-2"><Label>Secteur</Label><Input value={form.sector} onChange={(e) => setForm({ ...form, sector: e.target.value })} placeholder="Ex: Automobile" /></div>
                  <div className="space-y-2"><Label>Site web</Label><Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://..." /></div>
                </div>
                <div className="space-y-2"><Label>Adresse</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="12 rue des Fleurs" /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Ville</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Saint-Denis" /></div>
                  <div className="space-y-2"><Label>Code postal</Label><Input value={form.postal_code} onChange={(e) => setForm({ ...form, postal_code: e.target.value })} placeholder="97400" /></div>
                </div>
                <div className="space-y-3 rounded-lg border border-border/60 bg-muted/20 p-4">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="tuning-website-addon"
                      checked={form.tuning_website_addon}
                      onCheckedChange={(checked) => setForm({
                        ...form,
                        tuning_website_addon: checked === true,
                        pack_amount: String(PACK_PRICES[TUNING_PACK] + (checked === true ? TUNING_WEBSITE_ADDON_PRICE : 0)),
                      })}
                    />
                    <div className="space-y-1">
                      <Label htmlFor="tuning-website-addon" className="cursor-pointer">+ Création de site internet</Label>
                      <p className="text-xs text-muted-foreground">Supplément de {TUNING_WEBSITE_ADDON_PRICE} € et ajout du module site au projet.</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between border-t border-border/60 pt-3 text-sm">
                    <span className="text-muted-foreground">Total de la prestation</span>
                    <span className="font-semibold text-primary">{Number(form.pack_amount).toFixed(2)} €</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Date de signature</Label><Input type="date" value={form.signature_date} onChange={(e) => setForm({ ...form, signature_date: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Pack de base</Label><Input value={`${PACK_PRICES[TUNING_PACK].toFixed(2)} €`} readOnly /></div>
                </div>
                <div className="space-y-2">
                  <Label>Lien de la page de conversion</Label>
                  <Input value={form.conversion_page_url} onChange={(e) => setForm({ ...form, conversion_page_url: e.target.value })} placeholder="https://..." />
                </div>
                <div className="space-y-2"><Label>Notes</Label><Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Informations supplémentaires..." /></div>
                <p className="text-xs text-muted-foreground bg-muted/40 rounded-lg p-3">{PACK_RENEWAL_NOTE}</p>
                <Button onClick={handleCreate} disabled={createClient.isPending}>
                  {createClient.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Créer le client Tuning
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input className="pl-10" placeholder="Rechercher un client Tuning..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <Card className="border-0 shadow-md shadow-primary/5">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : tuningClients.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">Aucun client Tuning pour le moment.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead className="w-[130px]">Page de conv.</TableHead>
                  <TableHead>Lien page de conversion</TableHead>
                  <TableHead className="w-[110px] text-right">Montant</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tuningClients.map((c: any) => (
                  <TableRow key={c.id} className="align-top">
                    <TableCell>
                      <button className="text-left" onClick={() => navigate(`/clients/${c.id}`)}>
                        <span className="font-medium flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-muted-foreground" /> {c.company_name}
                          <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px]">TUNING</Badge>
                        </span>
                        {c.city && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                            <MapPin className="w-3 h-3" /> {c.city}
                          </span>
                        )}
                      </button>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {c.manager_name && <div>{c.manager_name}</div>}
                      {c.phone && <div>{c.phone}</div>}
                      {c.email && <div>{c.email}</div>}
                    </TableCell>
                    <TableCell>
                      <label className="flex items-center gap-2 text-xs cursor-pointer">
                        <Checkbox
                          checked={!!c.conversion_page_created}
                          disabled={savingId === c.id}
                          onCheckedChange={(v) => updateClient(c.id, {
                            conversion_page_created: !!v,
                            conversion_page_created_at: v ? new Date().toISOString() : null,
                          })}
                        />
                        {c.conversion_page_created ? "Créée" : "À créer"}
                      </label>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Link2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <Input
                          className="h-8 text-xs"
                          defaultValue={c.conversion_page_url || ""}
                          placeholder="https://..."
                          onBlur={(e) => {
                            const v = e.target.value.trim();
                            if (v !== (c.conversion_page_url || "")) updateClient(c.id, { conversion_page_url: v || null });
                          }}
                        />
                        {c.conversion_page_url && (
                          <a href={c.conversion_page_url} target="_blank" rel="noreferrer" className="text-primary shrink-0">
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {Number(c.pack_amount || PACK_PRICES[TUNING_PACK]).toFixed(2)} €
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Abonnement 2ᵉ année : {PACK_RENEWAL_PRICES[TUNING_PACK]} € / an, sans engagement.
      </p>
    </motion.div>
  );
}
