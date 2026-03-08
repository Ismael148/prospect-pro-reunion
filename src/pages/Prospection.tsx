import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  useProspects,
  useSearchProspects,
  useCreateProspects,
  useUpdateProspect,
  useConvertProspect,
} from "@/hooks/use-prospects";
import { useAgents } from "@/hooks/use-agents";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  Search, MapPin, Phone, Globe, Star, Loader2, UserPlus,
  CheckCircle2, Building2, Radar, CalendarIcon, Clock,
  Users, ArrowRight, PhoneCall, Mail,
} from "lucide-react";
import { motion } from "framer-motion";
import type { Database } from "@/integrations/supabase/types";

type ProspectStatus = Database["public"]["Enums"]["prospect_status"];

const REUNION_CITIES = [
  "Saint-Denis", "Saint-Paul", "Saint-Pierre", "Le Tampon", "Saint-André",
  "Saint-Louis", "Le Port", "Saint-Benoît", "Saint-Joseph", "Sainte-Marie",
  "Sainte-Suzanne", "Saint-Leu", "La Possession", "L'Étang-Salé", "Petite-Île",
  "Bras-Panon", "Entre-Deux", "Les Avirons", "Cilaos", "Salazie",
  "Plaine des Palmistes", "Sainte-Rose", "Les Trois-Bassins", "Saint-Philippe",
];

const STATUS_LABELS: Record<ProspectStatus, string> = {
  nouveau: "Nouveau",
  a_contacter: "À contacter",
  contacte: "Contacté",
  qualifie: "Qualifié",
  rdv_planifie: "RDV planifié",
  a_rappeler: "À rappeler",
  non_interesse: "Non intéressé",
  converti: "Converti",
};

const STATUS_COLORS: Record<ProspectStatus, string> = {
  nouveau: "bg-muted text-muted-foreground border-border",
  a_contacter: "bg-warning/10 text-warning border-warning/20",
  contacte: "bg-info/10 text-info border-info/20",
  qualifie: "bg-primary/10 text-primary border-primary/20",
  rdv_planifie: "bg-success/10 text-success border-success/20",
  a_rappeler: "bg-warning/10 text-warning border-warning/20",
  non_interesse: "bg-destructive/10 text-destructive border-destructive/20",
  converti: "bg-accent/10 text-accent border-accent/20",
};

const SECTORS = [
  "Restaurant", "Boulangerie", "Coiffeur", "Garage automobile",
  "Agence immobilière", "Commerce alimentaire", "Boutique vêtements",
  "Pharmacie", "Cabinet médical", "Artisan", "Hôtel", "Bar",
  "Fleuriste", "Boucherie", "Électricien", "Plombier",
];

export default function Prospection() {
  const { user, hasRole } = useAuth();
  const { data: prospects, isLoading } = useProspects();
  const { data: agents } = useAgents();
  const searchProspects = useSearchProspects();
  const createProspects = useCreateProspects();
  const updateProspect = useUpdateProspect();
  const convertProspect = useConvertProspect();

  const isAdmin = hasRole("admin");
  const isAgent = hasRole("agent_telephonique");

  const [searchQuery, setSearchQuery] = useState("");
  const [searchZone, setSearchZone] = useState("");
  const [customQuery, setCustomQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterAgent, setFilterAgent] = useState<string>("all");
  const [searchFilter, setSearchFilter] = useState("");
  const [selectedProspect, setSelectedProspect] = useState<any | null>(null);
  const [appointmentDate, setAppointmentDate] = useState<Date | undefined>();
  const [appointmentTime, setAppointmentTime] = useState("09:00");
  const [callbackDate, setCallbackDate] = useState<Date | undefined>();
  const [callbackNotes, setCallbackNotes] = useState("");

  const handleSearch = async () => {
    const query = searchQuery || customQuery;
    if (!query || !searchZone) {
      toast.error("Sélectionnez un secteur et une zone");
      return;
    }
    try {
      const results = await searchProspects.mutateAsync({ query, zone: searchZone });
      setSearchResults(results);
      setShowResults(true);
      toast.success(`${results.length} prospect(s) trouvé(s)`);
    } catch (error: any) {
      toast.error(error.message || "Erreur de recherche");
    }
  };

  const handleImportAll = async () => {
    if (!searchResults.length || !user) return;
    try {
      const query = searchQuery || customQuery;
      await createProspects.mutateAsync(
        searchResults.map((r) => ({
          business_name: r.business_name,
          address: r.address || null,
          city: r.city || searchZone,
          phone: r.phone || null,
          email: r.email || null,
          website: r.website || null,
          sector: r.sector || query,
          rating: r.rating || null,
          reviews_count: r.reviews_count || null,
          google_maps_url: r.google_maps_url || null,
          search_query: query,
          search_zone: searchZone,
          created_by: user.id,
          status: "nouveau" as const,
        }))
      );
      toast.success(`${searchResults.length} prospect(s) importé(s)`);
      setShowResults(false);
      setSearchResults([]);
    } catch {
      toast.error("Erreur lors de l'import");
    }
  };

  const handleAssign = async (prospectId: string, agentId: string) => {
    try {
      await updateProspect.mutateAsync({
        id: prospectId,
        assigned_to: agentId,
        status: "a_contacter" as ProspectStatus,
      });
      toast.success("Prospect assigné");
    } catch {
      toast.error("Erreur");
    }
  };

  const handleBulkAssign = async (agentId: string) => {
    const unassigned = filteredProspects?.filter((p) => !p.assigned_to && p.status === "nouveau") || [];
    if (!unassigned.length) {
      toast.error("Aucun prospect non assigné");
      return;
    }
    // Distribute evenly among the agent
    try {
      for (const prospect of unassigned) {
        await updateProspect.mutateAsync({
          id: prospect.id,
          assigned_to: agentId,
          status: "a_contacter" as ProspectStatus,
        });
      }
      toast.success(`${unassigned.length} prospect(s) assigné(s)`);
    } catch {
      toast.error("Erreur");
    }
  };

  const handleAutoDispatch = async () => {
    if (!agents?.length) {
      toast.error("Aucun agent disponible");
      return;
    }
    const unassigned = prospects?.filter((p) => !p.assigned_to && p.status === "nouveau") || [];
    if (!unassigned.length) {
      toast.error("Aucun prospect non assigné");
      return;
    }
    try {
      for (let i = 0; i < unassigned.length; i++) {
        const agent = agents[i % agents.length];
        await updateProspect.mutateAsync({
          id: unassigned[i].id,
          assigned_to: agent.user_id,
          status: "a_contacter" as ProspectStatus,
        });
      }
      toast.success(`${unassigned.length} prospect(s) distribués à ${agents.length} agent(s)`);
    } catch {
      toast.error("Erreur lors de la distribution");
    }
  };

  const handleStatusChange = async (id: string, status: ProspectStatus) => {
    if (status === "rdv_planifie") {
      setSelectedProspect(prospects?.find((p) => p.id === id) || null);
      return;
    }
    if (status === "a_rappeler") {
      const prospect = prospects?.find((p) => p.id === id);
      setSelectedProspect(prospect || null);
      setCallbackDate(undefined);
      setCallbackNotes("");
      return;
    }
    try {
      await updateProspect.mutateAsync({ id, status });
      toast.success("Statut mis à jour");
    } catch {
      toast.error("Erreur");
    }
  };

  const handleScheduleAppointment = async () => {
    if (!selectedProspect || !appointmentDate || !appointmentTime) {
      toast.error("Veuillez renseigner la date et l'heure");
      return;
    }
    try {
      await updateProspect.mutateAsync({
        id: selectedProspect.id,
        status: "rdv_planifie" as ProspectStatus,
        appointment_date: format(appointmentDate, "yyyy-MM-dd"),
        appointment_time: appointmentTime,
      });
      toast.success("RDV planifié !");
      setSelectedProspect(null);
      setAppointmentDate(undefined);
      setAppointmentTime("09:00");
    } catch {
      toast.error("Erreur");
    }
  };

  const handleScheduleCallback = async () => {
    if (!selectedProspect || !callbackDate) {
      toast.error("Veuillez renseigner la date de rappel");
      return;
    }
    try {
      await updateProspect.mutateAsync({
        id: selectedProspect.id,
        status: "a_rappeler" as ProspectStatus,
        callback_date: format(callbackDate, "yyyy-MM-dd"),
        callback_notes: callbackNotes || null,
      });
      toast.success("Rappel planifié");
      setSelectedProspect(null);
      setCallbackDate(undefined);
      setCallbackNotes("");
    } catch {
      toast.error("Erreur");
    }
  };

  const handleConvert = async (prospect: any) => {
    if (!user) return;
    try {
      await convertProspect.mutateAsync({ prospect, userId: user.id });
      toast.success(`"${prospect.business_name}" converti en client !`);
    } catch {
      toast.error("Erreur");
    }
  };

  const filteredProspects = prospects?.filter((p) => {
    const matchSearch =
      p.business_name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      p.city?.toLowerCase().includes(searchFilter.toLowerCase()) ||
      p.sector?.toLowerCase().includes(searchFilter.toLowerCase());
    const matchStatus = filterStatus === "all" || p.status === filterStatus;
    const matchAgent = filterAgent === "all"
      ? true
      : filterAgent === "unassigned"
      ? !p.assigned_to
      : p.assigned_to === filterAgent;
    // Agents only see their own prospects
    if (isAgent && !isAdmin) {
      return matchSearch && matchStatus && p.assigned_to === user?.id;
    }
    return matchSearch && matchStatus && matchAgent;
  });

  const unassignedCount = prospects?.filter((p) => !p.assigned_to && p.status === "nouveau").length || 0;

  const getAgentName = (userId: string | null) => {
    if (!userId) return null;
    return agents?.find((a) => a.user_id === userId)?.full_name || "Agent";
  };

  const isAppointmentDialog = selectedProspect && !callbackDate && !callbackNotes;

  return (
    <motion.div className="space-y-6" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Prospection</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isAgent && !isAdmin ? "Vos prospects assignés" : "Recherche et dispatching de prospects"}
          </p>
        </div>
        {isAdmin && unassignedCount > 0 && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {unassignedCount} non assigné{unassignedCount > 1 ? "s" : ""}
            </Badge>
            <Button size="sm" onClick={handleAutoDispatch} className="gap-2">
              <Users className="w-3.5 h-3.5" />
              Auto-dispatcher
            </Button>
          </div>
        )}
      </div>

      {/* Search Section - Admin only */}
      {isAdmin && (
        <Card className="border-0 shadow-soft">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Radar className="w-4 h-4 text-primary" />
              Rechercher des prospects
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">Secteur d'activité</Label>
                <Select value={searchQuery} onValueChange={(v) => { setSearchQuery(v); setCustomQuery(""); }}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Choisir" /></SelectTrigger>
                  <SelectContent>
                    {SECTORS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input placeholder="Ou secteur personnalisé..." value={customQuery} onChange={(e) => { setCustomQuery(e.target.value); setSearchQuery(""); }} className="h-9 text-sm" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Zone</Label>
                <Select value={searchZone} onValueChange={setSearchZone}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Ville" /></SelectTrigger>
                  <SelectContent>
                    {REUNION_CITIES.map((city) => <SelectItem key={city} value={city}>{city}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button onClick={handleSearch} disabled={searchProspects.isPending} className="w-full h-9 gap-2">
                  {searchProspects.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  Rechercher
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search Results Dialog */}
      <Dialog open={showResults} onOpenChange={setShowResults}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{searchResults.length} résultat(s)</span>
              <Button size="sm" onClick={handleImportAll} disabled={createProspects.isPending} className="gap-2">
                {createProspects.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                Tout importer
              </Button>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 mt-3">
            {searchResults.map((result, i) => (
              <Card key={i} className="border shadow-soft">
                <CardContent className="p-3.5">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-primary/8 flex items-center justify-center text-primary shrink-0">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">{result.business_name}</p>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-[11px] text-muted-foreground">
                        {result.address && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{result.address}</span>}
                        {result.city && !result.address && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{result.city}</span>}
                        {result.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{result.phone}</span>}
                        {result.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{result.email}</span>}
                        {result.website && <span className="flex items-center gap-1"><Globe className="w-3 h-3" />{result.website}</span>}
                        {result.rating && <span className="flex items-center gap-1"><Star className="w-3 h-3 fill-warning text-warning" />{result.rating}{result.reviews_count && ` (${result.reviews_count})`}</span>}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {searchResults.length === 0 && <p className="text-muted-foreground text-center py-8 text-sm">Aucun résultat</p>}
          </div>
        </DialogContent>
      </Dialog>

      {/* Appointment Dialog */}
      <Dialog open={!!selectedProspect} onOpenChange={(open) => { if (!open) { setSelectedProspect(null); setCallbackNotes(""); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {selectedProspect?.status === "a_rappeler" || callbackNotes !== "" || callbackDate
                ? "Planifier un rappel"
                : "Planifier un RDV"}
            </DialogTitle>
          </DialogHeader>
          {selectedProspect && (
            <div className="space-y-4 mt-2">
              <p className="text-sm font-medium">{selectedProspect.business_name}</p>

              <Tabs defaultValue="rdv" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="rdv">RDV</TabsTrigger>
                  <TabsTrigger value="rappel">Rappel</TabsTrigger>
                </TabsList>

                <TabsContent value="rdv" className="space-y-3 mt-3">
                  <div className="space-y-2">
                    <Label className="text-xs">Date du RDV</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("w-full justify-start text-left font-normal h-9 text-sm", !appointmentDate && "text-muted-foreground")}>
                          <CalendarIcon className="w-4 h-4 mr-2" />
                          {appointmentDate ? format(appointmentDate, "PPP", { locale: fr }) : "Choisir"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={appointmentDate} onSelect={setAppointmentDate} initialFocus className="p-3 pointer-events-auto" />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Heure</Label>
                    <Select value={appointmentTime} onValueChange={setAppointmentTime}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 20 }, (_, i) => {
                          const h = Math.floor(i / 2) + 8;
                          const m = i % 2 === 0 ? "00" : "30";
                          const t = `${h.toString().padStart(2, "0")}:${m}`;
                          return <SelectItem key={t} value={t}>{t}</SelectItem>;
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleScheduleAppointment} className="w-full gap-2">
                    <CheckCircle2 className="w-4 h-4" /> Confirmer le RDV
                  </Button>
                </TabsContent>

                <TabsContent value="rappel" className="space-y-3 mt-3">
                  <div className="space-y-2">
                    <Label className="text-xs">Date de rappel</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("w-full justify-start text-left font-normal h-9 text-sm", !callbackDate && "text-muted-foreground")}>
                          <CalendarIcon className="w-4 h-4 mr-2" />
                          {callbackDate ? format(callbackDate, "PPP", { locale: fr }) : "Choisir"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={callbackDate} onSelect={setCallbackDate} initialFocus className="p-3 pointer-events-auto" />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Notes</Label>
                    <Input value={callbackNotes} onChange={(e) => setCallbackNotes(e.target.value)} placeholder="Raison du rappel..." className="h-9 text-sm" />
                  </div>
                  <Button onClick={handleScheduleCallback} className="w-full gap-2">
                    <PhoneCall className="w-4 h-4" /> Planifier le rappel
                  </Button>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-10 h-9" placeholder="Filtrer..." value={searchFilter} onChange={(e) => setSearchFilter(e.target.value)} />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous statuts</SelectItem>
            {Object.entries(STATUS_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isAdmin && (
          <Select value={filterAgent} onValueChange={setFilterAgent}>
            <SelectTrigger className="w-44 h-9"><SelectValue placeholder="Agent" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les agents</SelectItem>
              <SelectItem value="unassigned">Non assignés</SelectItem>
              {agents?.map((agent) => (
                <SelectItem key={agent.user_id} value={agent.user_id}>
                  {agent.full_name || "Agent"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Agent dispatch summary - Admin only */}
      {isAdmin && agents && agents.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {agents.map((agent) => {
            const agentProspects = prospects?.filter((p) => p.assigned_to === agent.user_id) || [];
            const rdvCount = agentProspects.filter((p) => p.status === "rdv_planifie").length;
            const contacteCount = agentProspects.filter((p) => p.status === "contacte" || p.status === "a_contacter").length;
            return (
              <Card key={agent.user_id} className="border-0 shadow-soft">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-primary/8 flex items-center justify-center text-primary text-xs font-bold">
                        {(agent.full_name || "?").slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{agent.full_name || "Agent"}</p>
                        <p className="text-[10px] text-muted-foreground">{agentProspects.length} prospect{agentProspects.length > 1 ? "s" : ""}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Badge variant="secondary" className="text-[10px]">{contacteCount} à traiter</Badge>
                    <Badge className="text-[10px] bg-success/10 text-success border-success/20" variant="outline">{rdvCount} RDV</Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Prospects List */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : !filteredProspects?.length ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Radar className="w-10 h-10 text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground text-sm">
              {searchFilter ? "Aucun résultat" : "Aucun prospect"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-2">
          {filteredProspects.map((prospect, i) => (
            <motion.div
              key={prospect.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02, duration: 0.2 }}
            >
              <Card className="border-0 shadow-soft hover:shadow-medium transition-all duration-200">
                <CardContent className="flex items-center gap-4 py-3 px-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/8 flex items-center justify-center text-primary shrink-0">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{prospect.business_name}</p>
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11px] text-muted-foreground mt-0.5">
                      {prospect.address && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{prospect.address}</span>}
                      {!prospect.address && prospect.city && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{prospect.city}</span>}
                      {prospect.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{prospect.phone}</span>}
                      {prospect.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{prospect.email}</span>}
                      {prospect.rating && <span className="flex items-center gap-1"><Star className="w-3 h-3 fill-warning text-warning" />{Number(prospect.rating).toFixed(1)}</span>}
                    </div>
                    {/* Appointment info */}
                    {prospect.status === "rdv_planifie" && prospect.appointment_date && (
                      <div className="flex items-center gap-1.5 mt-1 text-[11px] text-success font-medium">
                        <CalendarIcon className="w-3 h-3" />
                        {format(new Date(prospect.appointment_date), "dd MMM yyyy", { locale: fr })}
                        {prospect.appointment_time && (
                          <><Clock className="w-3 h-3 ml-1" />{prospect.appointment_time.slice(0, 5)}</>
                        )}
                      </div>
                    )}
                    {prospect.status === "a_rappeler" && prospect.callback_date && (
                      <div className="flex items-center gap-1.5 mt-1 text-[11px] text-warning font-medium">
                        <PhoneCall className="w-3 h-3" />
                        Rappel : {format(new Date(prospect.callback_date), "dd MMM yyyy", { locale: fr })}
                        {prospect.callback_notes && <span className="text-muted-foreground font-normal">— {prospect.callback_notes}</span>}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                    {/* Agent assignment - Admin only */}
                    {isAdmin && (
                      <Select
                        value={prospect.assigned_to || "none"}
                        onValueChange={(v) => handleAssign(prospect.id, v)}
                      >
                        <SelectTrigger className="w-32 h-7 text-[11px]">
                          <SelectValue placeholder="Assigner" />
                        </SelectTrigger>
                        <SelectContent>
                          {agents?.map((agent) => (
                            <SelectItem key={agent.user_id} value={agent.user_id}>
                              {agent.full_name || "Agent"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}

                    {/* Status change */}
                    {prospect.status !== "converti" && prospect.status !== "non_interesse" && (
                      <Select
                        value={prospect.status}
                        onValueChange={(v) => handleStatusChange(prospect.id, v as ProspectStatus)}
                      >
                        <SelectTrigger className="w-32 h-7 text-[11px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(STATUS_LABELS).map(([key, label]) => (
                            <SelectItem key={key} value={key}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}

                    {/* Convert button */}
                    {(prospect.status === "qualifie" || prospect.status === "rdv_planifie") && (
                      <Button size="sm" variant="outline" onClick={() => handleConvert(prospect)} disabled={convertProspect.isPending} className="h-7 text-[11px] gap-1">
                        <ArrowRight className="w-3 h-3" /> Convertir
                      </Button>
                    )}

                    <Badge className={`text-[10px] border ${STATUS_COLORS[prospect.status]}`} variant="outline">
                      {STATUS_LABELS[prospect.status]}
                    </Badge>

                    {/* Agent name badge */}
                    {prospect.assigned_to && (
                      <Badge variant="secondary" className="text-[10px]">
                        {getAgentName(prospect.assigned_to)}
                      </Badge>
                    )}
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
