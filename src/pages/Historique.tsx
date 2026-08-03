import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subWeeks,
  subMonths,
  parseISO,
  isSameDay,
} from "date-fns";
import { fr } from "date-fns/locale";
import {
  History,
  RefreshCw,
  Search,
  CalendarRange,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  Star,
  StarOff,
  Trash2,
  User,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  useGlobalHistory,
  HISTORY_CATEGORIES,
  type HistoryCategory,
  type HistoryEntry,
} from "@/hooks/use-global-history";
import { exportHistoryCsv, exportHistoryPdf } from "@/lib/export-history";

type Preset = "this_week" | "last_week" | "this_month" | "last_month" | "custom";

type SavedFilter = {
  id: string;
  name: string;
  preset: Preset;
  customFrom: string;
  customTo: string;
  category: string;
  actor: string;
  search: string;
};

const FAVORITES_KEY = "historique_favorites_v1";

const PRESET_LABELS: Record<Preset, string> = {
  this_week: "Cette semaine",
  last_week: "Semaine dernière",
  this_month: "Ce mois-ci",
  last_month: "Mois dernier",
  custom: "Dates personnalisées",
};

function presetRange(preset: Preset, customFrom: string, customTo: string) {
  const now = new Date();
  switch (preset) {
    case "this_week":
      return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
    case "last_week": {
      const d = subWeeks(now, 1);
      return { start: startOfWeek(d, { weekStartsOn: 1 }), end: endOfWeek(d, { weekStartsOn: 1 }) };
    }
    case "this_month":
      return { start: startOfMonth(now), end: endOfMonth(now) };
    case "last_month": {
      const d = subMonths(now, 1);
      return { start: startOfMonth(d), end: endOfMonth(d) };
    }
    default: {
      const start = customFrom ? new Date(`${customFrom}T00:00:00`) : startOfWeek(now, { weekStartsOn: 1 });
      const end = customTo ? new Date(`${customTo}T23:59:59`) : endOfWeek(now, { weekStartsOn: 1 });
      return { start, end };
    }
  }
}

const FIELD_LABELS: Record<string, string> = {
  id: "Identifiant",
  client_id: "Client (ID)",
  client: "Client",
  project_id: "Projet (ID)",
  module_id: "Module (ID)",
  ticket_id: "Ticket (ID)",
  company_name: "Société",
  ndi: "NDI",
  email: "Email",
  phone: "Téléphone",
  pack_type: "Pack",
  status: "Statut",
  priority: "Priorité",
  category: "Catégorie",
  subject: "Sujet",
  description: "Description",
  content: "Contenu",
  title: "Titre",
  name: "Nom",
  ticket_number: "N° ticket",
  invoice_number: "N° facture",
  total_amount: "Montant total",
  recipient_email: "Destinataire",
  platform: "Plateforme",
  type: "Type",
  month_year: "Mois",
  business_name: "Établissement",
  city: "Ville",
  event_type: "Type d'événement",
  action_type: "Action",
  action: "Action",
  resource_type: "Ressource",
  resource_label: "Élément",
  actor_email: "Utilisateur",
  start_at: "Début",
  created_at: "Créé le",
  performed_at: "Effectué le",
};

const HIDDEN_FIELDS = new Set(["created_by", "assigned_to", "user_id", "performed_by"]);

export default function Historique() {
  const [preset, setPreset] = useState<Preset>("this_week");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [actor, setActor] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<HistoryEntry | null>(null);
  const [favorites, setFavorites] = useState<SavedFilter[]>([]);
  const [saveOpen, setSaveOpen] = useState(false);
  const [favName, setFavName] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(FAVORITES_KEY);
      if (raw) setFavorites(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, []);

  const persist = (list: SavedFilter[]) => {
    setFavorites(list);
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(list));
  };

  const { start, end } = useMemo(
    () => presetRange(preset, customFrom, customTo),
    [preset, customFrom, customTo]
  );

  const { data: entries = [], isLoading, isFetching, refetch } = useGlobalHistory({
    from: start.toISOString(),
    to: end.toISOString(),
  });

  const actors = useMemo(() => {
    const map = new Map<string, string>();
    entries.forEach((e) => {
      if (e.actor) map.set(e.actor, e.actor);
    });
    return Array.from(map.keys()).sort((a, b) => a.localeCompare(b));
  }, [entries]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return entries.filter((e) => {
      if (category !== "all" && e.category !== category) return false;
      if (actor !== "all") {
        if (actor === "__none__") {
          if (e.actor) return false;
        } else if (e.actor !== actor) return false;
      }
      if (!q) return true;
      return `${e.title} ${e.detail ?? ""} ${e.actor ?? ""}`.toLowerCase().includes(q);
    });
  }, [entries, category, actor, search]);

  const countsByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    entries.forEach((e) => {
      map[e.category] = (map[e.category] || 0) + 1;
    });
    return map;
  }, [entries]);

  // Group: day -> category -> entries
  const grouped = useMemo(() => {
    const days: { key: string; date: Date; cats: { cat: HistoryCategory; items: HistoryEntry[] }[] }[] = [];
    filtered.forEach((e) => {
      const d = parseISO(e.at);
      let day = days.find((x) => isSameDay(x.date, d));
      if (!day) {
        day = { key: format(d, "yyyy-MM-dd"), date: d, cats: [] };
        days.push(day);
      }
      let cat = day.cats.find((c) => c.cat === e.category);
      if (!cat) {
        cat = { cat: e.category, items: [] };
        day.cats.push(cat);
      }
      cat.items.push(e);
    });
    days.forEach((d) => d.cats.sort((a, b) => b.items.length - a.items.length));
    return days;
  }, [filtered]);

  const periodLabel = `${format(start, "dd/MM/yyyy", { locale: fr })} → ${format(end, "dd/MM/yyyy", { locale: fr })}`;
  const exportLabel = `${format(start, "yyyy-MM-dd")}_${format(end, "yyyy-MM-dd")}`;

  const handleExport = (kind: "csv" | "pdf") => {
    if (filtered.length === 0) {
      toast.error("Aucune donnée à exporter sur cette période");
      return;
    }
    if (kind === "csv") exportHistoryCsv(filtered, exportLabel);
    else exportHistoryPdf(filtered, exportLabel, periodLabel);
    toast.success(`Export ${kind.toUpperCase()} généré (${filtered.length} événements)`);
  };

  const saveFavorite = () => {
    const name = favName.trim();
    if (!name) {
      toast.error("Donnez un nom à ce filtre");
      return;
    }
    const fav: SavedFilter = {
      id: crypto.randomUUID(),
      name,
      preset,
      customFrom,
      customTo,
      category,
      actor,
      search,
    };
    persist([...favorites, fav]);
    setFavName("");
    setSaveOpen(false);
    toast.success("Filtre enregistré dans vos favoris");
  };

  const applyFavorite = (f: SavedFilter) => {
    setPreset(f.preset);
    setCustomFrom(f.customFrom);
    setCustomTo(f.customTo);
    setCategory(f.category);
    setActor(f.actor || "all");
    setSearch(f.search);
    toast.success(`Filtre « ${f.name} » appliqué`);
  };

  const removeFavorite = (id: string) => persist(favorites.filter((f) => f.id !== id));

  return (
    <main className="p-4 md:p-6 space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
            <History className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-[Space_Grotesk] tracking-tight">Historique</h1>
            <p className="text-sm text-muted-foreground">
              Tout ce qui s'est passé sur la plateforme, regroupé par jour et par catégorie
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => handleExport("csv")}>
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport("pdf")}>
            <FileText className="w-4 h-4 mr-2" />
            PDF
          </Button>
          <Button variant="outline" size="sm" onClick={() => setSaveOpen(true)}>
            <Star className="w-4 h-4 mr-2" />
            Enregistrer le filtre
          </Button>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
            Actualiser
          </Button>
        </div>
      </header>

      {/* Favorites */}
      {favorites.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Star className="w-3.5 h-3.5" /> Filtres favoris :
          </span>
          {favorites.map((f) => (
            <Badge key={f.id} variant="outline" className="py-1.5 pl-3 pr-1.5 gap-1.5">
              <button className="text-xs font-medium" onClick={() => applyFavorite(f)}>
                {f.name}
              </button>
              <button
                className="text-muted-foreground hover:text-destructive"
                onClick={() => removeFavorite(f.id)}
                title="Supprimer ce favori"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Filters */}
      <Card className="glass-card">
        <CardContent className="p-4 grid gap-4 md:grid-cols-5">
          <div>
            <Label className="text-xs">Période</Label>
            <Select value={preset} onValueChange={(v) => setPreset(v as Preset)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PRESET_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Du</Label>
            <Input
              type="date"
              value={customFrom || format(start, "yyyy-MM-dd")}
              onChange={(e) => {
                setPreset("custom");
                setCustomFrom(e.target.value);
              }}
            />
          </div>
          <div>
            <Label className="text-xs">Au</Label>
            <Input
              type="date"
              value={customTo || format(end, "yyyy-MM-dd")}
              onChange={(e) => {
                setPreset("custom");
                setCustomTo(e.target.value);
              }}
            />
          </div>
          <div>
            <Label className="text-xs">Catégorie</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les catégories</SelectItem>
                {Object.entries(HISTORY_CATEGORIES).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v.emoji} {v.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Utilisateur / agent</Label>
            <Select value={actor} onValueChange={setActor}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tout le monde</SelectItem>
                {actors.map((a) => (
                  <SelectItem key={a} value={a}>
                    {a}
                  </SelectItem>
                ))}
                <SelectItem value="__none__">Sans utilisateur identifié</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-5 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Rechercher dans l'historique (client, sujet, commentaire…)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Category summary */}
      <div className="flex flex-wrap gap-2">
        <Badge
          variant="outline"
          className={`cursor-pointer py-1.5 px-3 ${category === "all" ? "border-primary text-primary" : ""}`}
          onClick={() => setCategory("all")}
        >
          <CalendarRange className="w-3.5 h-3.5 mr-1.5" />
          Tout · {entries.length}
        </Badge>
        {Object.entries(HISTORY_CATEGORIES).map(([k, v]) => (
          <Badge
            key={k}
            variant="outline"
            className={`cursor-pointer py-1.5 px-3 ${v.class} ${category === k ? "ring-1 ring-primary" : ""}`}
            onClick={() => setCategory(category === k ? "all" : k)}
          >
            {v.emoji} {v.label} · {countsByCategory[k] || 0}
          </Badge>
        ))}
      </div>

      {/* Timeline */}
      {isLoading ? (
        <Card className="glass-card">
          <CardContent className="p-10 text-center text-muted-foreground">Chargement de l'historique…</CardContent>
        </Card>
      ) : grouped.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="p-10 text-center text-muted-foreground">
            Aucune activité sur cette période.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {grouped.map((day) => (
            <section key={day.key} className="space-y-3">
              <div className="flex items-center gap-3">
                <h2 className="text-sm font-semibold capitalize">
                  {format(day.date, "EEEE d MMMM yyyy", { locale: fr })}
                </h2>
                <span className="text-xs text-muted-foreground">
                  {day.cats.reduce((s, c) => s + c.items.length, 0)} événement(s)
                </span>
                <div className="h-px flex-1 bg-border" />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {day.cats.map((c) => {
                  const meta = HISTORY_CATEGORIES[c.cat];
                  return (
                    <Card key={c.cat} className="glass-card">
                      <CardContent className="p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className={`text-xs ${meta.class}`}>
                            {meta.emoji} {meta.label}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{c.items.length}</span>
                        </div>
                        <ul className="space-y-2">
                          {c.items.map((item) => (
                            <li
                              key={item.id}
                              className="flex items-start gap-2 text-sm rounded-md p-1 -m-1 cursor-pointer hover:bg-muted/50 transition-colors"
                              onClick={() => setSelected(item)}
                            >
                              <span className="mt-0.5 shrink-0 text-[11px] font-mono text-muted-foreground">
                                {format(parseISO(item.at), "HH:mm")}
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="font-medium leading-snug break-words">{item.title}</p>
                                {item.detail && (
                                  <p className="text-xs text-muted-foreground break-words">{item.detail}</p>
                                )}
                                {item.actor && (
                                  <p className="text-[11px] text-muted-foreground">par {item.actor}</p>
                                )}
                              </div>
                              {item.link && (
                                <Link
                                  to={item.link}
                                  onClick={(e) => e.stopPropagation()}
                                  className="shrink-0 text-muted-foreground hover:text-primary"
                                  title="Ouvrir"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </Link>
                              )}
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <Badge
                  variant="outline"
                  className={`w-fit text-xs ${HISTORY_CATEGORIES[selected.category].class}`}
                >
                  {HISTORY_CATEGORIES[selected.category].emoji} {HISTORY_CATEGORIES[selected.category].label}
                </Badge>
                <DialogTitle className="text-left break-words">{selected.title}</DialogTitle>
                <DialogDescription className="text-left">
                  {format(parseISO(selected.at), "EEEE d MMMM yyyy 'à' HH:mm", { locale: fr })}
                  {selected.actor ? ` · par ${selected.actor}` : ""}
                </DialogDescription>
              </DialogHeader>

              {selected.detail && (
                <p className="text-sm whitespace-pre-wrap break-words">{selected.detail}</p>
              )}

              <Separator />

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase text-muted-foreground">Informations liées</p>
                <dl className="grid gap-x-4 gap-y-2 sm:grid-cols-2 text-sm">
                  {Object.entries(selected.raw || {})
                    .filter(([k, v]) => !HIDDEN_FIELDS.has(k) && v !== null && v !== undefined && v !== "")
                    .map(([k, v]) => (
                      <div key={k} className="min-w-0">
                        <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">
                          {FIELD_LABELS[k] || k}
                        </dt>
                        <dd className="break-words">
                          {typeof v === "object" ? JSON.stringify(v) : String(v)}
                        </dd>
                      </div>
                    ))}
                  {selected.actor && (
                    <div>
                      <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">Réalisé par</dt>
                      <dd className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-muted-foreground" />
                        {selected.actor}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>

              <DialogFooter className="gap-2 sm:justify-between">
                <span className="text-[11px] text-muted-foreground self-center">
                  Source : {selected.source}
                </span>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setSelected(null)}>
                    Fermer
                  </Button>
                  {selected.link && (
                    <Button asChild>
                      <Link to={selected.link}>
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Ouvrir la fiche
                      </Link>
                    </Button>
                  )}
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Save filter dialog */}
      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Enregistrer ce filtre</DialogTitle>
            <DialogDescription>
              {PRESET_LABELS[preset]} ·{" "}
              {category === "all" ? "Toutes catégories" : HISTORY_CATEGORIES[category as HistoryCategory]?.label} ·{" "}
              {actor === "all" ? "Tout le monde" : actor === "__none__" ? "Sans utilisateur" : actor}
              {search ? ` · « ${search} »` : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label className="text-xs">Nom du favori</Label>
            <Input
              placeholder="Ex : Support de la semaine"
              value={favName}
              onChange={(e) => setFavName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && saveFavorite()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveOpen(false)}>
              <StarOff className="w-4 h-4 mr-2" />
              Annuler
            </Button>
            <Button onClick={saveFavorite}>
              <Star className="w-4 h-4 mr-2" />
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
