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

  const filtered = projects?.filter((p: any) => {
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.clients?.company_name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || p.status === filterStatus;
    return matchSearch && matchStatus;
  });

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

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-10" placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            {Object.entries(PROJECT_STATUS_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
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
    </motion.div>
  );
}
