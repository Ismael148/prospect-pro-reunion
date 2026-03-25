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
import { triggerN8nWebhook } from "@/lib/n8n-webhook";
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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  Search, MapPin, Phone, Globe, Star, Loader2, UserPlus,
  CheckCircle2, Building2, Radar, CalendarIcon, Clock,
  Users, ArrowRight, PhoneCall, Mail, Plus, StickyNote, Pencil,
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
  // Restauration & Alimentation
  "Restaurant", "Boulangerie", "Pâtisserie", "Boucherie", "Charcuterie",
  "Poissonnerie", "Traiteur", "Pizzeria", "Snack / Fast-food", "Bar",
  "Café", "Salon de thé", "Glacier", "Cave à vins", "Épicerie fine",
  "Commerce alimentaire", "Food truck", "Rôtisserie",
  // Santé & Bien-être
  "Pharmacie", "Cabinet médical", "Dentiste", "Kinésithérapeute",
  "Ostéopathe", "Opticien", "Laboratoire d'analyses", "Infirmier libéral",
  "Podologue", "Psychologue", "Orthophoniste", "Sage-femme",
  "Vétérinaire", "Naturopathe", "Diététicien", "Chiropracteur",
  // Beauté & Soins
  "Coiffeur", "Barbier", "Institut de beauté", "Salon d'esthétique",
  "Onglerie / Nail bar", "Spa / Hammam", "Tatoueur", "Prothésiste ongulaire",
  // BTP & Artisanat
  "Électricien", "Plombier", "Maçon", "Peintre en bâtiment", "Carreleur",
  "Menuisier", "Charpentier", "Couvreur", "Serrurier", "Climaticien",
  "Pisciniste", "Terrassement", "Paysagiste", "Jardinier",
  "Métallier / Ferronnier", "Vitrier", "Isolation / Étanchéité",
  "Béton / Coffrage", "Démolition", "Rénovation générale",
  // Automobile & Transport
  "Garage automobile", "Carrosserie", "Auto-école", "Location de véhicules",
  "Lavage auto", "Contrôle technique", "Moto / Scooter", "Taxi / VTC",
  "Transporteur", "Déménagement", "Dépannage auto",
  // Commerce & Retail
  "Boutique vêtements", "Bijouterie", "Fleuriste", "Librairie / Papeterie",
  "Magasin de sport", "Quincaillerie", "Bricolage", "Décoration d'intérieur",
  "Magasin de meubles", "Électroménager", "High-tech / Informatique",
  "Magasin bio", "Animalerie", "Jouets", "Cadeaux / Souvenirs",
  // Immobilier & Habitat
  "Agence immobilière", "Syndic de copropriété", "Promoteur immobilier",
  "Diagnostiqueur immobilier", "Architecte", "Architecte d'intérieur",
  "Bureau d'études", "Géomètre",
  // Services aux entreprises
  "Expert-comptable", "Avocat", "Notaire", "Huissier",
  "Cabinet de conseil", "Agence de communication", "Agence web",
  "Imprimerie", "Formation professionnelle", "Courtier en assurances",
  "Courtier en crédit", "Nettoyage / Entretien", "Sécurité / Gardiennage",
  "Traduction / Interprétariat",
  // Hôtellerie & Tourisme
  "Hôtel", "Gîte / Chambre d'hôtes", "Camping", "Agence de voyage",
  "Guide touristique", "Location saisonnière", "Activités de loisirs",
  // Éducation & Garde
  "Crèche / Garderie", "Soutien scolaire", "École de musique",
  "École de danse", "Centre de formation", "Coach sportif",
  // Services à la personne
  "Aide à domicile", "Garde d'enfants", "Ménage / Repassage",
  "Assistance informatique", "Cours particuliers", "Pompes funèbres",
  // Sport & Loisirs
  "Salle de sport / Fitness", "Club de yoga / Pilates", "Arts martiaux",
  "Centre équestre", "Bowling / Laser game", "Escape game",
  "Location de matériel sportif",
  // Événementiel
  "DJ / Animateur", "Photographe", "Vidéaste", "Organisateur d'événements",
  "Location de salle", "Décorateur événementiel", "Fleuriste événementiel",
  // Artisanat d'art
  "Ébéniste", "Tapissier", "Céramiste", "Couturier / Retoucheur",
  "Cordonnier", "Graveur", "Encadreur",
  // Autres
  "Artisan", "Pressing / Blanchisserie", "Réparation de téléphones",
  "Photocopie / Impression", "Conciergerie", "Autre",
].sort((a, b) => a.localeCompare(b, 'fr'));

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
  const [selectedSearchResult, setSelectedSearchResult] = useState<number | null>(null);
  const [prospectDetail, setProspectDetail] = useState<any | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({ business_name: "", phone: "", email: "", address: "", city: "", sector: "", website: "", notes: "" });
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const [editingProspect, setEditingProspect] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({ business_name: "", phone: "", email: "", address: "", city: "", postal_code: "", sector: "", website: "", notes: "" });
  const handleSearch = async () => {
    const query = searchQuery || customQuery;
    if (!query || !searchZone) {
      toast.error("Sélectionnez un secteur et une zone");
      return;
    }
    try {
      const results = await searchProspects.mutateAsync({ query, zone: searchZone });
      
      // Dédoublonner les résultats par nom normalisé
      const seen = new Set<string>();
      const uniqueResults = results.filter((r) => {
        const key = r.business_name.toLowerCase().replace(/[^a-zà-ÿ0-9]/g, "");
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      // Filtrer les prospects déjà existants en base
      const existingNames = new Set(
        (prospects || []).map((p) => p.business_name.toLowerCase().replace(/[^a-zà-ÿ0-9]/g, ""))
      );
      const newResults = uniqueResults.filter((r) => {
        const key = r.business_name.toLowerCase().replace(/[^a-zà-ÿ0-9]/g, "");
        return !existingNames.has(key);
      });

      setSearchResults(newResults);
      setShowResults(true);
      const filtered = uniqueResults.length - newResults.length;
      toast.success(
        `${newResults.length} nouveau(x) prospect(s) trouvé(s)` +
        (filtered > 0 ? ` (${filtered} déjà en base ignoré(s))` : "")
      );
    } catch (error: any) {
      toast.error(error.message || "Erreur de recherche");
    }
  };

  const handleImportAll = async () => {
    if (!searchResults.length || !user) return;
    try {
      const query = searchQuery || customQuery;
      
      // Statuts déjà traités qu'on ne doit pas ré-importer
      const treatedStatuses = new Set(["contacte", "qualifie", "rdv_planifie", "converti", "non_interesse", "a_rappeler"]);
      const existingMap = new Map(
        (prospects || []).map((p) => [
          p.business_name.toLowerCase().replace(/[^a-zà-ÿ0-9]/g, ""),
          p.status,
        ])
      );

      const toImport = searchResults.filter((r) => {
        const key = r.business_name.toLowerCase().replace(/[^a-zà-ÿ0-9]/g, "");
        const existingStatus = existingMap.get(key);
        // Skip si déjà en base (tout statut)
        if (existingStatus) return false;
        return true;
      });

      if (!toImport.length) {
        toast.info("Tous les prospects sont déjà en base ou traités");
        return;
      }

      await createProspects.mutateAsync(
        toImport.map((r) => ({
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
      const skipped = searchResults.length - toImport.length;
      toast.success(
        `${toImport.length} prospect(s) importé(s)` +
        (skipped > 0 ? ` (${skipped} déjà existant(s) ignoré(s))` : "")
      );
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
      const rdvDate = format(appointmentDate, "yyyy-MM-dd");
      await updateProspect.mutateAsync({
        id: selectedProspect.id,
        status: "rdv_planifie" as ProspectStatus,
        appointment_date: rdvDate,
        appointment_time: appointmentTime,
      });

      // Trouver le nom de l'agent assigné
      const agentName = agents?.find(a => a.user_id === selectedProspect.assigned_to)?.full_name || "Non assigné";

      // Envoyer le webhook n8n pour notification Discord
      triggerN8nWebhook("prospect.rdv_planifie", {
        business_name: selectedProspect.business_name,
        address: selectedProspect.address || "Non renseignée",
        city: selectedProspect.city || "Non renseignée",
        phone: selectedProspect.phone || "Non renseigné",
        sector: selectedProspect.sector || "Non renseigné",
        appointment_date: format(appointmentDate, "dd/MM/yyyy"),
        appointment_time: appointmentTime,
        notes: selectedProspect.notes || "",
        agent_name: agentName,
        google_maps_url: selectedProspect.google_maps_url || "",
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

  const handleAddProspect = async () => {
    if (!addForm.business_name.trim() || !user) {
      toast.error("Le nom de l'entreprise est requis");
      return;
    }
    try {
      await createProspects.mutateAsync([{
        business_name: addForm.business_name.trim(),
        phone: addForm.phone || null,
        email: addForm.email || null,
        address: addForm.address || null,
        city: addForm.city || null,
        sector: addForm.sector || null,
        website: addForm.website || null,
        notes: addForm.notes || null,
        created_by: user.id,
        status: "nouveau" as const,
        source: "manual",
      }]);
      toast.success("Prospect ajouté !");
      setShowAddForm(false);
      setAddForm({ business_name: "", phone: "", email: "", address: "", city: "", sector: "", website: "", notes: "" });
    } catch {
      toast.error("Erreur lors de l'ajout");
    }
  };

  const handleSaveNotes = async (prospectId: string) => {
    try {
      await updateProspect.mutateAsync({ id: prospectId, notes: noteText || null });
      toast.success("Notes enregistrées");
      setEditingNotes(null);
      setNoteText("");
    } catch {
      toast.error("Erreur");
    }
  };

  const handleEditProspect = (prospect: any) => {
    setEditForm({
      business_name: prospect.business_name || "",
      phone: prospect.phone || "",
      email: prospect.email || "",
      address: prospect.address || "",
      city: prospect.city || "",
      postal_code: prospect.postal_code || "",
      sector: prospect.sector || "",
      website: prospect.website || "",
      notes: prospect.notes || "",
    });
    setEditingProspect(prospect);
  };

  const handleSaveEdit = async () => {
    if (!editingProspect) return;
    try {
      await updateProspect.mutateAsync({
        id: editingProspect.id,
        ...editForm,
        phone: editForm.phone || null,
        email: editForm.email || null,
        address: editForm.address || null,
        city: editForm.city || null,
        postal_code: editForm.postal_code || null,
        sector: editForm.sector || null,
        website: editForm.website || null,
        notes: editForm.notes || null,
      });
      toast.success("Prospect mis à jour");
      setEditingProspect(null);
    } catch {
      toast.error("Erreur de mise à jour");
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
        <div className="flex items-center gap-2">
          {isAdmin && unassignedCount > 0 && (
            <>
              <Badge variant="secondary" className="text-xs">
                {unassignedCount} non assigné{unassignedCount > 1 ? "s" : ""}
              </Badge>
              <Button size="sm" onClick={handleAutoDispatch} className="gap-2">
                <Users className="w-3.5 h-3.5" />
                Auto-dispatcher
              </Button>
            </>
          )}
          <Button size="sm" onClick={() => setShowAddForm(true)} className="gap-2">
            <Plus className="w-3.5 h-3.5" />
            Ajouter un prospect
          </Button>
        </div>
      </div>

      {/* Search Section - Admin only */}
      {isAdmin && (
        <Card className="border border-border/50 hover:border-primary/20 transition-all duration-200">
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

      {/* Search Results Dialog - with detail view */}
      <Dialog open={showResults} onOpenChange={setShowResults}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between gap-2">
              <span>{searchResults.length} résultat(s)</span>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-[10px]">
                  {searchResults.filter((r) => !r.has_website && !r.website).length} sans site
                </Badge>
                <Button size="sm" onClick={handleImportAll} disabled={createProspects.isPending} className="gap-2">
                  {createProspects.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                  Tout importer
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 mt-3">
            {searchResults.map((result, i) => (
              <Card
                key={i}
                className={cn(
                  "border shadow-soft cursor-pointer hover:shadow-medium transition-all",
                  !result.website && !result.has_website && "border-l-4 border-l-success"
                )}
                onClick={() => setSelectedSearchResult(selectedSearchResult === i ? null : i)}
              >
                <CardContent className="p-3.5">
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
                      !result.website ? "bg-success/10 text-success" : "bg-primary/8 text-primary"
                    )}>
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm">{result.business_name}</p>
                        {!result.website && !result.has_website && (
                          <Badge className="text-[9px] bg-success/10 text-success border-success/20" variant="outline">
                            Sans site web
                          </Badge>
                        )}
                        {result.website && (
                          <Badge className="text-[9px] bg-muted text-muted-foreground" variant="outline">
                            A un site
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-[11px] text-muted-foreground">
                        {result.address && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{result.address}</span>}
                        {result.city && !result.address && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{result.city}</span>}
                        {result.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{result.phone}</span>}
                      </div>

                      {/* Expanded detail */}
                      {selectedSearchResult === i && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          className="mt-3 pt-3 border-t border-border space-y-2"
                        >
                          {result.email && (
                            <div className="flex items-center gap-2 text-sm">
                              <Mail className="w-4 h-4 text-muted-foreground" />
                              <span>{result.email}</span>
                            </div>
                          )}
                          {result.website && (
                            <div className="flex items-center gap-2 text-sm">
                              <Globe className="w-4 h-4 text-muted-foreground" />
                              <a href={result.website} target="_blank" rel="noopener noreferrer" className="text-primary underline" onClick={(e) => e.stopPropagation()}>
                                {result.website}
                              </a>
                            </div>
                          )}
                          {result.rating && (
                            <div className="flex items-center gap-2 text-sm">
                              <Star className="w-4 h-4 fill-warning text-warning" />
                              <span>{result.rating}/5{result.reviews_count ? ` (${result.reviews_count} avis)` : ""}</span>
                            </div>
                          )}
                          {result.google_maps_url && (
                            <div className="flex items-center gap-2 text-sm">
                              <MapPin className="w-4 h-4 text-muted-foreground" />
                              <a href={result.google_maps_url} target="_blank" rel="noopener noreferrer" className="text-primary underline text-xs" onClick={(e) => e.stopPropagation()}>
                                Voir sur Google Maps
                              </a>
                            </div>
                          )}
                        </motion.div>
                      )}
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

      {/* Add Prospect Dialog */}
      <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" /> Ajouter un prospect
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="space-y-2">
              <Label className="text-xs">Nom de l'entreprise *</Label>
              <Input value={addForm.business_name} onChange={(e) => setAddForm({ ...addForm, business_name: e.target.value })} placeholder="Ex: Boulangerie du Port" className="h-9 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs">Téléphone</Label>
                <Input value={addForm.phone} onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })} placeholder="0262..." className="h-9 text-sm" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Email</Label>
                <Input value={addForm.email} onChange={(e) => setAddForm({ ...addForm, email: e.target.value })} placeholder="contact@..." className="h-9 text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs">Ville</Label>
                <Select value={addForm.city} onValueChange={(v) => setAddForm({ ...addForm, city: v })}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Choisir" /></SelectTrigger>
                  <SelectContent>
                    {REUNION_CITIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Secteur</Label>
                <Select value={addForm.sector} onValueChange={(v) => setAddForm({ ...addForm, sector: v })}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Choisir" /></SelectTrigger>
                  <SelectContent>
                    {SECTORS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Adresse</Label>
              <Input value={addForm.address} onChange={(e) => setAddForm({ ...addForm, address: e.target.value })} placeholder="12 rue des Lilas..." className="h-9 text-sm" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Site web</Label>
              <Input value={addForm.website} onChange={(e) => setAddForm({ ...addForm, website: e.target.value })} placeholder="https://..." className="h-9 text-sm" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Notes</Label>
              <Textarea value={addForm.notes} onChange={(e) => setAddForm({ ...addForm, notes: e.target.value })} placeholder="Informations supplémentaires..." className="text-sm min-h-[60px]" />
            </div>
            <Button onClick={handleAddProspect} disabled={createProspects.isPending} className="w-full gap-2">
              {createProspects.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Ajouter
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Notes Dialog */}
      <Dialog open={!!editingNotes} onOpenChange={(open) => { if (!open) { setEditingNotes(null); setNoteText(""); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <StickyNote className="w-5 h-5" /> Notes
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <Textarea value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Ajoutez vos notes ici..." className="min-h-[100px] text-sm" />
            <Button onClick={() => editingNotes && handleSaveNotes(editingNotes)} className="w-full gap-2">
              <CheckCircle2 className="w-4 h-4" /> Enregistrer
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Prospect Dialog */}
      <Dialog open={!!editingProspect} onOpenChange={(open) => { if (!open) setEditingProspect(null); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-5 h-5" /> Modifier le prospect
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-4">
            <div className="space-y-1.5">
              <Label>Nom entreprise</Label>
              <Input value={editForm.business_name} onChange={(e) => setEditForm({ ...editForm, business_name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Téléphone</Label>
                <Input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Adresse</Label>
              <Input value={editForm.address} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Ville</Label>
                <Input value={editForm.city} onChange={(e) => setEditForm({ ...editForm, city: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Code postal</Label>
                <Input value={editForm.postal_code} onChange={(e) => setEditForm({ ...editForm, postal_code: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Secteur</Label>
                <Input value={editForm.sector} onChange={(e) => setEditForm({ ...editForm, sector: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Site web</Label>
              <Input value={editForm.website} onChange={(e) => setEditForm({ ...editForm, website: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} rows={3} />
            </div>
            <Button onClick={handleSaveEdit} disabled={updateProspect.isPending} className="w-full gap-2">
              {updateProspect.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              <CheckCircle2 className="w-4 h-4" /> Enregistrer
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
              <Card key={agent.user_id} className="border border-border/50 hover:border-primary/20 transition-all duration-200">
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
              <Card className="border border-border/50 hover:border-primary/20 shadow-soft hover:shadow-medium transition-all duration-200 cursor-pointer"
                onClick={() => setProspectDetail(prospectDetail?.id === prospect.id ? null : prospect)}>
                <CardContent className="flex items-center gap-4 py-3 px-4">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                    !prospect.website ? "bg-success/10 text-success" : "bg-primary/8 text-primary"
                  )}>
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm truncate">{prospect.business_name}</p>
                      {!prospect.website && (
                        <Badge className="text-[9px] bg-success/10 text-success border-success/20 shrink-0" variant="outline">
                          Sans site
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11px] text-muted-foreground mt-0.5">
                      {prospect.address && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{prospect.address}</span>}
                      {!prospect.address && prospect.city && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{prospect.city}</span>}
                      {prospect.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{prospect.phone}</span>}
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

                    {/* Expanded detail panel */}
                    {prospectDetail?.id === prospect.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="mt-3 pt-3 border-t border-border"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                          {prospect.email && (
                            <div className="flex items-center gap-2">
                              <Mail className="w-4 h-4 text-muted-foreground" />
                              <span>{prospect.email}</span>
                            </div>
                          )}
                          {prospect.website && (
                            <div className="flex items-center gap-2">
                              <Globe className="w-4 h-4 text-muted-foreground" />
                              <a href={prospect.website.startsWith("http") ? prospect.website : `https://${prospect.website}`} target="_blank" rel="noopener noreferrer" className="text-primary underline text-xs">
                                {prospect.website}
                              </a>
                            </div>
                          )}
                          {prospect.sector && (
                            <div className="flex items-center gap-2">
                              <Building2 className="w-4 h-4 text-muted-foreground" />
                              <span>{prospect.sector}</span>
                            </div>
                          )}
                          {prospect.google_maps_url && (
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-muted-foreground" />
                              <a href={prospect.google_maps_url} target="_blank" rel="noopener noreferrer" className="text-primary underline text-xs">
                                Google Maps
                              </a>
                            </div>
                          )}
                          {prospect.notes && (
                            <div className="col-span-full text-xs text-muted-foreground">
                              <p className="font-medium text-foreground mb-1">Notes :</p>
                              <p>{prospect.notes}</p>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end" onClick={(e) => e.stopPropagation()}>
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

                    {/* Edit button */}
                    <Button size="sm" variant="ghost" onClick={() => handleEditProspect(prospect)} className="h-7 w-7 p-0" title="Modifier">
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>

                    {/* Notes button */}
                    <Button size="sm" variant="ghost" onClick={() => { setEditingNotes(prospect.id); setNoteText(prospect.notes || ""); }} className="h-7 w-7 p-0" title="Notes">
                      <StickyNote className="w-3.5 h-3.5" />
                    </Button>

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
