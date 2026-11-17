import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Building2, ExternalLink, FileDown, FileText, FolderKanban, ListChecks, Loader2, Mail, MapPin, Plus, Rocket, Search, Ticket,
} from "lucide-react";
import { useClients, useCreateClient } from "@/hooks/use-clients";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { DECOLLAGE_MODULES, PACK_LABELS, PACK_PRICES, PROJECT_STATUS_LABELS } from "@/lib/constants";
import { DECOLLAGE_EMAIL_TRIGGER, DECOLLAGE_PACK, DECOLLAGE_SITE_URL } from "@/lib/decollage-email";
import { ensureProjectWithTasks } from "@/lib/auto-project";
import { exportClientsCSV, exportClientsPDF } from "@/lib/export-clients-list";
import DecollageEmailDialog, { type DecollageClient } from "@/components/decollage/DecollageEmailDialog";
import DecollageSupportDialog from "@/components/decollage/DecollageSupportDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const EMPTY_FORM = {
  company_name: "", manager_name: "", phone: "", email: "", address: "", city: "", postal_code: "",
  sector: "Agence de voyage", website: "", conversion_page_url: "", signature_date: "", notes: "", withProject: true,
};
const TOTAL_TASKS = DECOLLAGE_MODULES.reduce((n, m) => n + m.tasks.length, 0);
const nullable = (s: string) => s.trim() || null;

export default function ClientsDecollage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: clients, isLoading } = useClients();
  const createClient = useCreateClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [mailClient, setMailClient] = useState<DecollageClient | null>(null);
  const [supportClient, setSupportClient] = useState<DecollageClient | null>(null);
  const [creatingFor, setCreatingFor] = useState<string | null>(null);

  const all = useMemo(() => (clients || []).filter((c: any) => c.pack_type === DECOLLAGE_PACK), [clients]);
  const list = useMemo(() => {
    const s = search.toLowerCase().trim();
    return all
      .filter((c: any) => !s || [c.company_name, c.manager_name, c.city, c.email, c.phone].some((v) => v?.toLowerCase().includes(s)))
      .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [all, search]);
  const ids = all.map((c: any) => c.id as string);

  const { data: projects } = useQuery({
    queryKey: ["decollage-projects", ids.join(",")],
    enabled: ids.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("id, client_id, status, progress, due_date").in("client_id", ids);
      if (error) throw error;
      return data || [];
    },
  });
  // Only admins can read the email log; others simply see no date.
  const { data: lastMails } = useQuery({
    queryKey: ["decollage-emails"],
    queryFn: async () => {
      const { data } = await supabase.from("email_send_log").select("created_at, metadata, status")
        .eq("template_name", DECOLLAGE_EMAIL_TRIGGER).eq("status", "sent").order("created_at", { ascending: false }).limit(500);
      const map: Record<string, string> = {};
      (data || []).forEach((r: any) => { const id = r.metadata?.client_id; if (id && !map[id]) map[id] = r.created_at; });
      return map;
    },
  });
  const projectOf = (clientId: string) => (projects || []).find((p: any) => p.client_id === clientId);

  const createProject = async (client: any, silent = false) => {
    setCreatingFor(client.id);
    try {
      const projectId = await ensureProjectWithTasks(client);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["decollage-projects"] }),
        queryClient.invalidateQueries({ queryKey: ["projects"] }),
      ]);
      if (!silent) toast.success("Projet créé et tâches générées");
      return projectId;
    } catch (e: any) {
      toast.error("Projet : " + (e?.message || "création impossible"));
    } finally { setCreatingFor(null); }
  };

  const handleCreate = async () => {
    if (!form.company_name.trim()) { toast.error("Le nom de l'agence est requis"); return; }
    try {
      const created = await createClient.mutateAsync({
        company_name: form.company_name.trim(),
        manager_name: nullable(form.manager_name), phone: nullable(form.phone), email: nullable(form.email),
        address: nullable(form.address), city: nullable(form.city), postal_code: nullable(form.postal_code),
        sector: nullable(form.sector), website: nullable(form.website), notes: nullable(form.notes),
        conversion_page_url: nullable(form.conversion_page_url), signature_date: form.signature_date || null,
        pack_type: DECOLLAGE_PACK as any, pack_amount: PACK_PRICES[DECOLLAGE_PACK],
        assigned_to: user!.id, created_by: user!.id,
      } as any);
      if (form.withProject && created) {
        await createProject(created, true);
        toast.success(`Client créé, projet et ${TOTAL_TASKS} tâches générés`);
      } else toast.success("Client Décollage créé");
      setOpen(false);
      setForm(EMPTY_FORM);
    } catch (e: any) { toast.error("Erreur : " + (e?.message || "création impossible")); }
  };

  const withProject = list.filter((c: any) => projectOf(c.id)).length;
  const input = (label: string, key: keyof typeof EMPTY_FORM, placeholder = "", type = "text") => (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input type={type} value={form[key] as string} placeholder={placeholder} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
    </div>
  );

  return (
    <motion.div className="space-y-6" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight"><Rocket className="h-7 w-7 text-primary" /> Clients Décollage</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {PACK_LABELS[DECOLLAGE_PACK as keyof typeof PACK_LABELS]} · agences de voyage — {all.length} client{all.length > 1 ? "s" : ""} · {withProject} projet{withProject > 1 ? "s" : ""} lancé{withProject > 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" asChild><a href={DECOLLAGE_SITE_URL} target="_blank" rel="noreferrer"><ExternalLink className="mr-2 h-4 w-4" /> Voir la présentation</a></Button>
          <Button variant="outline" disabled={!list.length} onClick={() => { exportClientsCSV(list as any, "2.0"); toast.success("Export CSV généré"); }}><FileDown className="mr-2 h-4 w-4" /> CSV</Button>
          <Button variant="outline" disabled={!list.length} onClick={() => { exportClientsPDF(list as any, "2.0", "Clients Décollage"); toast.success("Export PDF généré"); }}><FileText className="mr-2 h-4 w-4" /> PDF</Button>
          <Button onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" /> Nouveau client Décollage</Button>
        </div>
      </div>

      <Card className="border-0 shadow-md shadow-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base"><ListChecks className="h-5 w-5 text-primary" /> Ce que génère le projet · {PACK_PRICES[DECOLLAGE_PACK].toLocaleString("fr-FR")} € TTC, 15 jours</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            {DECOLLAGE_MODULES.map((m) => (
              <div key={m.id} className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
                <p className="text-sm font-medium leading-snug">{m.icon} {m.name}</p>
                <p className="text-xs text-muted-foreground">{m.tasks.length} tâches · J+{m.deadlineDays}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">{TOTAL_TASKS} tâches au total, sans responsable : vous les attribuez dans le projet.</p>
        </CardContent>
      </Card>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-10" placeholder="Rechercher un client Décollage..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <Card className="border-0 shadow-md shadow-primary/5">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center p-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : list.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">{all.length ? "Aucun client ne correspond à la recherche." : "Aucun client Décollage pour le moment. Ajoutez votre première agence."}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agence</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead className="w-[230px]">Projet</TableHead>
                  <TableHead className="w-[290px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((c: any) => {
                  const p: any = projectOf(c.id);
                  const sent = lastMails?.[c.id];
                  const dc: DecollageClient = { id: c.id, company_name: c.company_name, manager_name: c.manager_name, email: c.email, support_token: c.support_token };
                  return (
                    <TableRow key={c.id} className="align-top">
                      <TableCell>
                        <button className="text-left" onClick={() => navigate(`/clients/${c.id}`)}>
                          <span className="flex items-center gap-2 font-medium"><Building2 className="h-4 w-4 text-muted-foreground" /> {c.company_name}
                            <Badge className="border-primary/20 bg-primary/10 text-[10px] text-primary">DÉCOLLAGE</Badge></span>
                          {c.city && <span className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" /> {c.city}</span>}
                        </button>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {c.manager_name && <div>{c.manager_name}</div>}
                        {c.phone && <div>{c.phone}</div>}
                        {c.email ? <div>{c.email}</div> : <div className="text-destructive">Pas d'email</div>}
                        {sent && <div className="mt-1 text-[11px] text-primary">Présentation envoyée le {new Date(sent).toLocaleDateString("fr-FR")}</div>}
                      </TableCell>
                      <TableCell>
                        {p ? (
                          <button className="w-full space-y-1.5 text-left" onClick={() => navigate(`/projets/${p.id}`)}>
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-medium">{PROJECT_STATUS_LABELS[p.status as keyof typeof PROJECT_STATUS_LABELS] || p.status}</span>
                              <span className="text-muted-foreground">{p.progress ?? 0} %</span>
                            </div>
                            <Progress value={p.progress ?? 0} className="h-1.5" />
                            <span className="text-[11px] text-primary">Ouvrir le projet →</span>
                          </button>
                        ) : (
                          <Button size="sm" variant="outline" disabled={creatingFor === c.id} onClick={async () => { const id = await createProject(c); if (id) navigate(`/projets/${id}`); }}>
                            {creatingFor === c.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FolderKanban className="mr-2 h-4 w-4" />} Créer le projet + tâches
                          </Button>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap justify-end gap-2">
                          <Button size="sm" onClick={() => setMailClient(dc)}><Mail className="mr-2 h-4 w-4" /> Présentation</Button>
                          <Button size="sm" variant="outline" disabled={!c.support_token} onClick={() => setSupportClient(dc)}><Ticket className="mr-2 h-4 w-4" /> Support</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader><DialogTitle>Nouveau client — Pack Décollage</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            {input("Nom de l'agence *", "company_name", "Ex. : Magella Voyages")}
            {input("Nom du gérant", "manager_name", "Ex. : Marie Payet")}
            <div className="grid grid-cols-2 gap-4">{input("Téléphone", "phone", "0692 00 00 00")}{input("Email", "email", "contact@agence.re", "email")}</div>
            <div className="grid grid-cols-2 gap-4">{input("Secteur", "sector")}{input("Site web", "website", "https://...")}</div>
            {input("Adresse", "address", "12 rue des Flamboyants")}
            <div className="grid grid-cols-2 gap-4">{input("Ville", "city", "Saint-Pierre")}{input("Code postal", "postal_code", "97410")}</div>
            <div className="grid grid-cols-2 gap-4">
              {input("Date de signature", "signature_date", "", "date")}
              <div className="space-y-2"><Label>Forfait</Label><Input readOnly value={`${PACK_PRICES[DECOLLAGE_PACK].toLocaleString("fr-FR")} € TTC`} /></div>
            </div>
            {input("Lien de la page de conversion", "conversion_page_url", "https://...")}
            <div className="space-y-2"><Label>Notes</Label><Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Destinations, clientèle, besoins…" /></div>
            <div className="flex items-start gap-3 rounded-lg border border-border/60 bg-muted/20 p-3">
              <Checkbox id="decollage-project" checked={form.withProject} onCheckedChange={(v) => setForm({ ...form, withProject: v === true })} />
              <div className="space-y-1">
                <Label htmlFor="decollage-project" className="cursor-pointer">Créer le projet et générer les {TOTAL_TASKS} tâches</Label>
                <p className="text-xs text-muted-foreground">Les tâches sont créées sans responsable.</p>
              </div>
            </div>
            <Button onClick={handleCreate} disabled={createClient.isPending || !!creatingFor}>
              {(createClient.isPending || creatingFor) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Créer le client Décollage
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <DecollageEmailDialog key={mailClient?.id || "none"} client={mailClient} open={!!mailClient} onOpenChange={(v) => { if (!v) setMailClient(null); }} />
      <DecollageSupportDialog key={supportClient?.id || "none"} client={supportClient} open={!!supportClient} onOpenChange={(v) => { if (!v) setSupportClient(null); }} />
    </motion.div>
  );
}
