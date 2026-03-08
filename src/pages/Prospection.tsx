import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  useProspects,
  useSearchProspects,
  useCreateProspects,
  useUpdateProspect,
  useConvertProspect,
} from "@/hooks/use-prospects";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Search,
  MapPin,
  Phone,
  Globe,
  Star,
  Loader2,
  UserPlus,
  CheckCircle2,
  XCircle,
  Building2,
  Radar,
} from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type ProspectStatus = Database["public"]["Enums"]["prospect_status"];

const REUNION_CITIES = [
  "Saint-Denis",
  "Saint-Paul",
  "Saint-Pierre",
  "Le Tampon",
  "Saint-André",
  "Saint-Louis",
  "Le Port",
  "Saint-Benoît",
  "Saint-Joseph",
  "Sainte-Marie",
  "Sainte-Suzanne",
  "Saint-Leu",
  "La Possession",
  "L'Étang-Salé",
  "Petite-Île",
  "Bras-Panon",
  "Entre-Deux",
  "Les Avirons",
  "Cilaos",
  "Salazie",
  "Plaine des Palmistes",
  "Sainte-Rose",
  "Les Trois-Bassins",
  "Saint-Philippe",
];

const STATUS_LABELS: Record<ProspectStatus, string> = {
  nouveau: "Nouveau",
  a_contacter: "À contacter",
  contacte: "Contacté",
  qualifie: "Qualifié",
  non_interesse: "Non intéressé",
  converti: "Converti",
};

const STATUS_COLORS: Record<ProspectStatus, string> = {
  nouveau: "bg-info/10 text-info border-info/20",
  a_contacter: "bg-warning/10 text-warning border-warning/20",
  contacte: "bg-primary/10 text-primary border-primary/20",
  qualifie: "bg-success/10 text-success border-success/20",
  non_interesse: "bg-destructive/10 text-destructive border-destructive/20",
  converti: "bg-success/10 text-success border-success/20",
};

const SECTORS = [
  "Restaurant",
  "Boulangerie",
  "Coiffeur",
  "Garage automobile",
  "Agence immobilière",
  "Commerce alimentaire",
  "Boutique vêtements",
  "Pharmacie",
  "Cabinet médical",
  "Artisan",
  "Hôtel",
  "Bar",
  "Fleuriste",
  "Boucherie",
  "Électricien",
  "Plombier",
];

export default function Prospection() {
  const { user } = useAuth();
  const { data: prospects, isLoading } = useProspects();
  const searchProspects = useSearchProspects();
  const createProspects = useCreateProspects();
  const updateProspect = useUpdateProspect();
  const convertProspect = useConvertProspect();

  const [searchQuery, setSearchQuery] = useState("");
  const [searchZone, setSearchZone] = useState("");
  const [customQuery, setCustomQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchFilter, setSearchFilter] = useState("");

  const handleSearch = async () => {
    const query = searchQuery || customQuery;
    if (!query || !searchZone) {
      toast.error("Veuillez sélectionner un secteur et une zone");
      return;
    }
    try {
      const results = await searchProspects.mutateAsync({
        query,
        zone: searchZone,
      });
      setSearchResults(results);
      setShowResults(true);
      toast.success(`${results.length} prospect(s) trouvé(s)`);
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de la recherche");
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

  const handleStatusChange = async (id: string, status: ProspectStatus) => {
    try {
      await updateProspect.mutateAsync({ id, status });
      toast.success("Statut mis à jour");
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
      toast.error("Erreur lors de la conversion");
    }
  };

  const filteredProspects = prospects?.filter((p) => {
    const matchSearch =
      p.business_name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      p.city?.toLowerCase().includes(searchFilter.toLowerCase()) ||
      p.sector?.toLowerCase().includes(searchFilter.toLowerCase());
    const matchStatus = filterStatus === "all" || p.status === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Prospection</h1>
        <p className="text-muted-foreground mt-1">
          Recherche automatisée de prospects à La Réunion
        </p>
      </div>

      {/* Search Section */}
      <Card className="border-0 shadow-md shadow-primary/5">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Radar className="w-5 h-5 text-primary" />
            Rechercher des prospects
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Secteur d'activité</Label>
              <Select value={searchQuery} onValueChange={(v) => { setSearchQuery(v); setCustomQuery(""); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir un secteur" />
                </SelectTrigger>
                <SelectContent>
                  {SECTORS.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Ou saisir un secteur personnalisé..."
                value={customQuery}
                onChange={(e) => { setCustomQuery(e.target.value); setSearchQuery(""); }}
              />
            </div>
            <div className="space-y-2">
              <Label>Zone géographique</Label>
              <Select value={searchZone} onValueChange={setSearchZone}>
                <SelectTrigger>
                  <SelectValue placeholder="Ville à La Réunion" />
                </SelectTrigger>
                <SelectContent>
                  {REUNION_CITIES.map((city) => (
                    <SelectItem key={city} value={city}>{city}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                onClick={handleSearch}
                disabled={searchProspects.isPending}
                className="w-full"
              >
                {searchProspects.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Search className="w-4 h-4 mr-2" />
                )}
                Lancer la recherche
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search Results Dialog */}
      <Dialog open={showResults} onOpenChange={setShowResults}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{searchResults.length} résultat(s) trouvé(s)</span>
              <Button
                size="sm"
                onClick={handleImportAll}
                disabled={createProspects.isPending}
              >
                {createProspects.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <UserPlus className="w-4 h-4 mr-2" />
                )}
                Tout importer
              </Button>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-4">
            {searchResults.map((result, i) => (
              <Card key={i} className="border shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold">{result.business_name}</p>
                      <div className="flex flex-wrap gap-2 mt-1 text-xs text-muted-foreground">
                        {result.city && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />{result.city}
                          </span>
                        )}
                        {result.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />{result.phone}
                          </span>
                        )}
                        {result.website && (
                          <span className="flex items-center gap-1">
                            <Globe className="w-3 h-3" />{result.website}
                          </span>
                        )}
                        {result.rating && (
                          <span className="flex items-center gap-1">
                            <Star className="w-3 h-3 fill-warning text-warning" />
                            {result.rating}
                            {result.reviews_count && ` (${result.reviews_count} avis)`}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {searchResults.length === 0 && (
              <p className="text-muted-foreground text-center py-8">
                Aucun résultat trouvé. Essayez un autre secteur ou une autre zone.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Prospects List */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-10"
            placeholder="Filtrer les prospects..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            {Object.entries(STATUS_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : !filteredProspects?.length ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Radar className="w-12 h-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground text-center">
              {searchFilter ? "Aucun prospect trouvé" : "Lancez une recherche pour trouver des prospects"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filteredProspects.map((prospect) => (
            <Card key={prospect.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="flex items-center gap-4 py-4">
                <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-accent/10 text-accent-foreground shrink-0">
                  <Building2 className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{prospect.business_name}</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5">
                    {prospect.city && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />{prospect.city}
                      </span>
                    )}
                    {prospect.sector && <span>• {prospect.sector}</span>}
                    {prospect.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3" />{prospect.phone}
                      </span>
                    )}
                    {prospect.rating && (
                      <span className="flex items-center gap-1">
                        <Star className="w-3 h-3 fill-warning text-warning" />{prospect.rating}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {prospect.status !== "converti" && prospect.status !== "non_interesse" && (
                    <>
                      <Select
                        value={prospect.status}
                        onValueChange={(v) => handleStatusChange(prospect.id, v as ProspectStatus)}
                      >
                        <SelectTrigger className="w-36 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(STATUS_LABELS).map(([key, label]) => (
                            <SelectItem key={key} value={key}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {prospect.status === "qualifie" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleConvert(prospect)}
                          disabled={convertProspect.isPending}
                          className="text-xs"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                          Convertir
                        </Button>
                      )}
                    </>
                  )}
                  <Badge
                    className={`text-xs border ${STATUS_COLORS[prospect.status]}`}
                    variant="outline"
                  >
                    {STATUS_LABELS[prospect.status]}
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
