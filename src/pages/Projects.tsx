import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useMyProjects, useCreateProject } from "@/hooks/use-projects";
import { useClients } from "@/hooks/use-clients";
import { PACK_LABELS, PACK_MODULES, PACK_DEADLINE_DAYS } from "@/lib/constants";
import { PROJECT_STATUS_LABELS, PROJECT_STATUS_COLORS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import LogoDashboard from "@/components/projects/LogoDashboard";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { toast } from "sonner";
import { Plus, Search, FolderKanban, Loader2, Building2, Calendar, Check, ChevronsUpDown, Filter, X, SlidersHorizontal } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

type PackType = Database["public"]["Enums"]["pack_type"];

export default function Projects() {
  const navigate = useNavigate();
  const { user, hasRole } = useAuth();
  const isAdmin = hasRole("admin");
  const isAgentSupport = hasRole("agent_support");
  const { data: projects, isLoading } = useMyProjects(user?.id, isAdmin, isAgentSupport);
  const { data: clients } = useClients();
  const createProject = useCreateProject();
  const [open, setOpen] = useState(false);
  const [clientPopoverOpen, setClientPopoverOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPack, setFilterPack] = useState<string>("all");
  const [filterDeadline, setFilterDeadline] = useState<string>("all");
  const [filterProgress, setFilterProgress] = useState<string>("all");
  const [filterClientType, setFilterClientType] = useState<string>("all");
  const [filterAssigned, setFilterAssigned] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("recent");
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const [form, setForm] = useState({
    client_id: "",
    name: "",
    description: "",
    pack_type: "" as PackType | "",
    start_date: "",
    due_date: "",
  });

  const eligibleClients = clients?.filter((c) => c.pipeline_status === "contrat_signe") || [];

  const handleCreate = async () => {
    if (!form.client_id || !form.name.trim() || !form.pack_type) {
      toast.error("Client, nom et pack sont requis");
      return;
    }
    const startDate = form.start_date || new Date().toISOString().split("T")[0];
    const deadlineDays = PACK_DEADLINE_DAYS[form.pack_type] || 15;
    const autoDeadline = new Date(new Date(startDate).getTime() + deadlineDays * 86400000).toISOString().split("T")[0];
    try {
      await createProject.mutateAsync({
        client_id: form.client_id,
        name: form.name,
        description: form.description || null,
        pack_type: form.pack_type as PackType,
        start_date: startDate,
        due_date: form.due_date || autoDeadline,
        created_by: user!.id,
        assigned_to: user!.id,
      });
      toast.success("Projet créé avec succès");
      setOpen(false);
      setForm({ client_id: "", name: "", description: "", pack_type: "", start_date: "", due_date: "" });
    } catch {
      toast.error("Erreur lors de la création");
    }
  };

  const filtered = useMemo(() => {
    if (!projects) return [];
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    let result = projects.filter((p: any) => {
      // Search
      const q = search.toLowerCase();
      const matchSearch = !q ||
        p.name?.toLowerCase().includes(q) ||
        p.clients?.company_name?.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q);

      // Status
      const matchStatus = filterStatus === "all" || p.status === filterStatus;

      // Pack
      const matchPack = filterPack === "all" || p.pack_type === filterPack;

      // Deadline
      let matchDeadline = true;
      if (filterDeadline !== "all") {
        const due = p.due_date ? new Date(p.due_date) : null;
        const isClosed = p.status === "termine" || p.status === "annule";
        if (filterDeadline === "overdue") {
          matchDeadline = !!due && due < now && !isClosed;
        } else if (filterDeadline === "week") {
          matchDeadline = !!due && due >= now && due <= endOfWeek;
        } else if (filterDeadline === "month") {
          matchDeadline = !!due && due >= now && due <= endOfMonth;
        } else if (filterDeadline === "none") {
          matchDeadline = !due;
        }
      }

      // Progress
      let matchProgress = true;
      const progress = p.progress || 0;
      if (filterProgress === "not_started") matchProgress = progress === 0;
      else if (filterProgress === "in_progress") matchProgress = progress > 0 && progress < 100;
      else if (filterProgress === "almost_done") matchProgress = progress >= 75 && progress < 100;
      else if (filterProgress === "done") matchProgress = progress === 100;

      // Client type (nouveau = status en_attente / en cours = en_cours)
      let matchClientType = true;
      if (filterClientType === "nouveau") matchClientType = p.status === "en_attente";
      else if (filterClientType === "en_cours") matchClientType = p.status === "en_cours";
      else if (filterClientType === "termine") matchClientType = p.status === "termine";

      // Assigned
      let matchAssigned = true;
      if (filterAssigned === "me") matchAssigned = p.assigned_to === user?.id;
      else if (filterAssigned === "unassigned") matchAssigned = !p.assigned_to;

      return matchSearch && matchStatus && matchPack && matchDeadline && matchProgress && matchClientType && matchAssigned;
    });

    // Sort
    result = [...result].sort((a: any, b: any) => {
      if (sortBy === "recent") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortBy === "oldest") return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (sortBy === "deadline_asc") {
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      }
      if (sortBy === "progress_desc") return (b.progress || 0) - (a.progress || 0);
      if (sortBy === "progress_asc") return (a.progress || 0) - (b.progress || 0);
      if (sortBy === "name") return (a.name || "").localeCompare(b.name || "");
      return 0;
    });

    return result;
  }, [projects, search, filterStatus, filterPack, filterDeadline, filterProgress, filterClientType, filterAssigned, sortBy, user?.id]);

  const activeFiltersCount = [filterStatus, filterPack, filterDeadline, filterProgress, filterClientType, filterAssigned].filter(f => f !== "all").length;

  const resetFilters = () => {
    setFilterStatus("all");
    setFilterPack("all");
    setFilterDeadline("all");
    setFilterProgress("all");
    setFilterClientType("all");
    setFilterAssigned("all");
    setSortBy("recent");
  };

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projets</h1>
          <p className="text-muted-foreground mt-1">
            {projects?.length || 0} projet{(projects?.length || 0) > 1 ? "s" : ""}
            {!isAdmin && !isAgentSupport && " assigné(s)"}
          </p>
        </div>
        {isAdmin && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-2" />Nouveau projet</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Nouveau projet</DialogTitle></DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label>Client (contrat signé) *</Label>
                  <Popover open={clientPopoverOpen} onOpenChange={setClientPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" role="combobox" aria-expanded={clientPopoverOpen} className="w-full justify-between font-normal">
                        {form.client_id
                          ? eligibleClients.find((c) => c.id === form.client_id)?.company_name
                          : "Rechercher un client..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Rechercher un client..." />
                        <CommandList>
                          <CommandEmpty>Aucun client trouvé</CommandEmpty>
                          <CommandGroup>
                            {eligibleClients.map((c) => (
                              <CommandItem
                                key={c.id}
                                value={c.company_name}
                                onSelect={() => {
                                  setForm({ ...form, client_id: c.id });
                                  setClientPopoverOpen(false);
                                }}
                              >
                                <Check className={cn("mr-2 h-4 w-4", form.client_id === c.id ? "opacity-100" : "opacity-0")} />
                                <div className="flex flex-col">
                                  <span>{c.company_name}</span>
                                  {c.city && <span className="text-xs text-muted-foreground">{c.city}</span>}
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label>Nom du projet *</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Pack Numérique - Boulangerie du Port" />
                </div>
                <div className="space-y-2">
                  <Label>Pack *</Label>
                  <Select value={form.pack_type} onValueChange={(v) => setForm({ ...form, pack_type: v as PackType })}>
                    <SelectTrigger><SelectValue placeholder="Choisir le pack" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="star_bizness_numerik">STAR BIZNESS NUMERIK</SelectItem>
                      <SelectItem value="star_bizness_nfc">STAR BIZNESS NFC</SelectItem>
                      <SelectItem value="autre">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Date de signature (début)</Label>
                  <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
                  {form.pack_type && (
                    <p className="text-xs text-muted-foreground">
                      Deadline auto : {PACK_DEADLINE_DAYS[form.pack_type] || 15} jours
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
                </div>
                {form.pack_type && PACK_MODULES[form.pack_type]?.length > 0 && (
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Modules inclus dans ce pack :</p>
                    <ul className="text-sm space-y-1">
                      {PACK_MODULES[form.pack_type].map((m, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <span>{m.icon}</span>
                          <span>{m.name}</span>
                          <span className="text-xs text-muted-foreground ml-auto">{m.tasks.length} tâches • {m.deadlineDays}j</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <Button onClick={handleCreate} disabled={createProject.isPending}>
                  {createProject.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Créer le projet
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      
      <Tabs defaultValue="projects" className="space-y-4">
        <TabsList>
          <TabsTrigger value="projects">📁 Projets</TabsTrigger>
          <TabsTrigger value="logos">🎨 Suivi logos</TabsTrigger>
        </TabsList>

        <TabsContent value="logos">
          <LogoDashboard />
        </TabsContent>

        <TabsContent value="projects" className="space-y-3">
          <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input className="pl-10" placeholder="Rechercher nom, client, description..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Statut" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              {Object.entries(PROJECT_STATUS_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Trier" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Plus récents</SelectItem>
              <SelectItem value="oldest">Plus anciens</SelectItem>
              <SelectItem value="deadline_asc">Échéance proche</SelectItem>
              <SelectItem value="progress_desc">Progression ↓</SelectItem>
              <SelectItem value="progress_asc">Progression ↑</SelectItem>
              <SelectItem value="name">Nom (A-Z)</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant={advancedOpen ? "default" : "outline"}
            onClick={() => setAdvancedOpen(!advancedOpen)}
            className="gap-2"
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filtres avancés
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1.5">{activeFiltersCount}</Badge>
            )}
          </Button>
          {activeFiltersCount > 0 && (
            <Button variant="ghost" size="sm" onClick={resetFilters} className="gap-1 text-muted-foreground">
              <X className="w-3.5 h-3.5" /> Réinitialiser
            </Button>
          )}
        </div>

        {advancedOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-lg border border-border/50 bg-muted/30 p-4"
          >
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1"><Filter className="w-3 h-3" />Type de client</Label>
                <Select value={filterClientType} onValueChange={setFilterClientType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    <SelectItem value="nouveau">✨ Nouveaux clients (en attente)</SelectItem>
                    <SelectItem value="en_cours">🚀 Clients en cours</SelectItem>
                    <SelectItem value="termine">✅ Clients terminés</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1"><Filter className="w-3 h-3" />Pack</Label>
                <Select value={filterPack} onValueChange={setFilterPack}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les packs</SelectItem>
                    <SelectItem value="star_bizness_numerik">STAR BIZNESS NUMERIK</SelectItem>
                    <SelectItem value="star_bizness_nfc">STAR BIZNESS NFC</SelectItem>
                    <SelectItem value="autre">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1"><Calendar className="w-3 h-3" />Échéance</Label>
                <Select value={filterDeadline} onValueChange={setFilterDeadline}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes</SelectItem>
                    <SelectItem value="overdue">⚠️ En retard</SelectItem>
                    <SelectItem value="week">Cette semaine</SelectItem>
                    <SelectItem value="month">Ce mois-ci</SelectItem>
                    <SelectItem value="none">Sans échéance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1"><Filter className="w-3 h-3" />Progression</Label>
                <Select value={filterProgress} onValueChange={setFilterProgress}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes</SelectItem>
                    <SelectItem value="not_started">Non démarré (0%)</SelectItem>
                    <SelectItem value="in_progress">En cours (1-99%)</SelectItem>
                    <SelectItem value="almost_done">Presque fini (≥75%)</SelectItem>
                    <SelectItem value="done">Terminé (100%)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1"><Filter className="w-3 h-3" />Assignation</Label>
                <Select value={filterAssigned} onValueChange={setFilterAssigned}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    <SelectItem value="me">👤 Assignés à moi</SelectItem>
                    <SelectItem value="unassigned">Non assignés</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </motion.div>
        )}

        <p className="text-xs text-muted-foreground">
          {filtered?.length || 0} résultat{(filtered?.length || 0) > 1 ? "s" : ""} affiché{(filtered?.length || 0) > 1 ? "s" : ""}
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : !filtered?.length ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FolderKanban className="w-12 h-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground text-center">
              {search ? "Aucun projet trouvé" : "Aucun projet. Créez-en un après signature d'un contrat."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((project: any, i: number) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
            >
              <Card
                className="border border-border/50 hover:border-primary/20 shadow-soft hover:shadow-medium cursor-pointer hover:-translate-y-0.5 transition-all duration-200"
                onClick={() => navigate(`/projets/${project.id}`)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-base truncate">{project.name}</CardTitle>
                      <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                        <Building2 className="w-3.5 h-3.5" />
                        {project.clients?.company_name}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {project.status === "en_attente" && (
                        <Badge className="text-[10px] font-bold bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-0 animate-pulse shadow-lg shadow-emerald-500/30">
                          ✨ NOUVEAU
                        </Badge>
                      )}
                      <Badge className={`text-xs border ${PROJECT_STATUS_COLORS[project.status as keyof typeof PROJECT_STATUS_COLORS]}`} variant="outline">
                        {PROJECT_STATUS_LABELS[project.status as keyof typeof PROJECT_STATUS_LABELS]}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Badge variant="secondary" className="text-xs">
                    {PACK_LABELS[project.pack_type as keyof typeof PACK_LABELS]}
                  </Badge>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Progression</span>
                      <span>{project.progress || 0}%</span>
                    </div>
                    <Progress value={project.progress || 0} className="h-1.5" />
                  </div>
                  {project.due_date && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Échéance : {new Date(project.due_date).toLocaleDateString("fr-FR")}
                    </p>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
