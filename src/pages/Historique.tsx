import { useMemo, useState } from "react";
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
import { History, RefreshCw, Search, CalendarRange, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useGlobalHistory,
  HISTORY_CATEGORIES,
  type HistoryCategory,
  type HistoryEntry,
} from "@/hooks/use-global-history";

type Preset = "this_week" | "last_week" | "this_month" | "last_month" | "custom";

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

export default function Historique() {
  const [preset, setPreset] = useState<Preset>("this_week");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [search, setSearch] = useState("");

  const { start, end } = useMemo(
    () => presetRange(preset, customFrom, customTo),
    [preset, customFrom, customTo]
  );

  const { data: entries = [], isLoading, isFetching, refetch } = useGlobalHistory({
    from: start.toISOString(),
    to: end.toISOString(),
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return entries.filter((e) => {
      if (category !== "all" && e.category !== category) return false;
      if (!q) return true;
      return `${e.title} ${e.detail ?? ""} ${e.actor ?? ""}`.toLowerCase().includes(q);
    });
  }, [entries, category, search]);

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
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
          Actualiser
        </Button>
      </header>

      {/* Filters */}
      <Card className="glass-card">
        <CardContent className="p-4 grid gap-4 md:grid-cols-4">
          <div>
            <Label className="text-xs">Période</Label>
            <Select value={preset} onValueChange={(v) => setPreset(v as Preset)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="this_week">Cette semaine</SelectItem>
                <SelectItem value="last_week">Semaine dernière</SelectItem>
                <SelectItem value="this_month">Ce mois-ci</SelectItem>
                <SelectItem value="last_month">Mois dernier</SelectItem>
                <SelectItem value="custom">Dates personnalisées</SelectItem>
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
          <div className="md:col-span-4 relative">
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
                            <li key={item.id} className="flex items-start gap-2 text-sm">
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
    </main>
  );
}
