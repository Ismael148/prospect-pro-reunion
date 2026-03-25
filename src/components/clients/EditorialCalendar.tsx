import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, CalendarDays, Sparkles } from "lucide-react";

interface EditorialEvent {
  date: string; // MM-DD
  name: string;
  emoji: string;
  category: "fete" | "commercial" | "saisonnier" | "local" | "journee_mondiale";
  designIdeas: string[];
}

const CATEGORY_CONFIG: Record<string, { label: string; class: string }> = {
  fete: { label: "Fête", class: "bg-primary/10 text-primary border-primary/20" },
  commercial: { label: "Commercial", class: "bg-warning/10 text-warning border-warning/20" },
  saisonnier: { label: "Saisonnier", class: "bg-success/10 text-success border-success/20" },
  local: { label: "La Réunion", class: "bg-info/10 text-info border-info/20" },
  journee_mondiale: { label: "Journée mondiale", class: "bg-accent text-accent-foreground border-accent/20" },
};

// Comprehensive editorial calendar events
const EDITORIAL_EVENTS: EditorialEvent[] = [
  // Janvier
  { date: "01-01", name: "Jour de l'An", emoji: "🎆", category: "fete", designIdeas: ["Vœux", "Bonnes résolutions", "Récap de l'année"] },
  { date: "01-06", name: "Épiphanie / Galette des Rois", emoji: "👑", category: "fete", designIdeas: ["Galette", "Tradition", "Jeu concours"] },
  { date: "01-24", name: "Journée du compliment", emoji: "💬", category: "journee_mondiale", designIdeas: ["Engagement communauté", "Témoignages clients"] },
  // Février
  { date: "02-02", name: "Chandeleur", emoji: "🥞", category: "fete", designIdeas: ["Crêpes", "Tradition", "Recette locale"] },
  { date: "02-14", name: "Saint-Valentin", emoji: "❤️", category: "commercial", designIdeas: ["Offre duo", "Cadeau idéal", "Love story client"] },
  // Mars
  { date: "03-08", name: "Journée de la femme", emoji: "💪", category: "journee_mondiale", designIdeas: ["Hommage", "Portrait femme entrepreneure", "Promo spéciale"] },
  { date: "03-20", name: "Journée du bonheur", emoji: "😊", category: "journee_mondiale", designIdeas: ["Positif", "Coulisses équipe", "Ce qui nous rend heureux"] },
  { date: "03-21", name: "Printemps", emoji: "🌸", category: "saisonnier", designIdeas: ["Renouveau", "Nouvelle collection", "Ménage de printemps"] },
  // Avril
  { date: "04-01", name: "Poisson d'Avril", emoji: "🐟", category: "fete", designIdeas: ["Humour", "Faux produit", "Blague"] },
  { date: "04-20", name: "Pâques (approx.)", emoji: "🐣", category: "commercial", designIdeas: ["Chasse aux œufs", "Promo Pâques", "Chocolat"] },
  { date: "04-22", name: "Journée de la Terre", emoji: "🌍", category: "journee_mondiale", designIdeas: ["Éco-responsabilité", "Engagements verts", "Nature Réunion"] },
  // Mai
  { date: "05-01", name: "Fête du travail", emoji: "🌷", category: "fete", designIdeas: ["Muguet", "Repos mérité", "Équipe au travail"] },
  { date: "05-08", name: "Victoire 1945", emoji: "🇫🇷", category: "fete", designIdeas: ["Hommage", "Histoire"] },
  { date: "05-25", name: "Fête des mères", emoji: "👩‍❤️", category: "commercial", designIdeas: ["Idée cadeau", "Offre spéciale mamans", "Portrait maman"] },
  // Juin
  { date: "06-15", name: "Fête des pères", emoji: "👨‍👧", category: "commercial", designIdeas: ["Idée cadeau papa", "Offre spéciale papas", "Portrait papa"] },
  { date: "06-20", name: "Abolition esclavage (La Réunion)", emoji: "✊", category: "local", designIdeas: ["Hommage", "Culture réunionnaise", "Liberté"] },
  { date: "06-21", name: "Fête de la musique", emoji: "🎵", category: "fete", designIdeas: ["Playlist", "Ambiance", "Musique réunionnaise"] },
  { date: "06-21", name: "Été / Hiver austral", emoji: "☀️", category: "saisonnier", designIdeas: ["Saison", "Soldes d'été", "Vacances"] },
  // Juillet
  { date: "07-14", name: "Fête nationale", emoji: "🇫🇷", category: "fete", designIdeas: ["Tricolore", "Feux d'artifice", "France"] },
  // Août
  { date: "08-15", name: "Assomption", emoji: "⛪", category: "fete", designIdeas: ["Été", "Vacances", "Famille"] },
  // Septembre
  { date: "09-01", name: "Rentrée scolaire", emoji: "📚", category: "commercial", designIdeas: ["Back to school", "Nouveau départ", "Promo rentrée"] },
  { date: "09-21", name: "Journée de la paix", emoji: "🕊️", category: "journee_mondiale", designIdeas: ["Message de paix", "Unité", "Solidarité"] },
  // Octobre
  { date: "10-01", name: "Octobre rose", emoji: "🎀", category: "journee_mondiale", designIdeas: ["Sensibilisation cancer du sein", "Rose", "Soutien"] },
  { date: "10-31", name: "Halloween", emoji: "🎃", category: "commercial", designIdeas: ["Déco effrayante", "Promo spooky", "Déguisements"] },
  // Novembre
  { date: "11-01", name: "Toussaint", emoji: "🕯️", category: "fete", designIdeas: ["Hommage", "Recueillement"] },
  { date: "11-11", name: "Armistice", emoji: "🇫🇷", category: "fete", designIdeas: ["Hommage", "Histoire"] },
  { date: "11-25", name: "Black Friday (approx.)", emoji: "🏷️", category: "commercial", designIdeas: ["Méga promo", "Offre flash", "Réduction exclusive"] },
  // Décembre
  { date: "12-20", name: "Fêt Kaf (La Réunion)", emoji: "✊", category: "local", designIdeas: ["Culture créole", "Hommage", "Identité réunionnaise"] },
  { date: "12-25", name: "Noël", emoji: "🎄", category: "commercial", designIdeas: ["Cadeaux", "Offre de Noël", "Ambiance fête", "Carte de vœux"] },
  { date: "12-31", name: "Saint-Sylvestre", emoji: "🥂", category: "fete", designIdeas: ["Rétrospective", "Bilan annuel", "Vœux"] },
];

const MONTHS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

export default function EditorialCalendar() {
  const currentMonth = new Date().getMonth();
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [filterCategory, setFilterCategory] = useState<string>("all");

  const filteredEvents = useMemo(() => {
    const monthStr = String(selectedMonth + 1).padStart(2, "0");
    return EDITORIAL_EVENTS
      .filter(e => e.date.startsWith(monthStr + "-"))
      .filter(e => filterCategory === "all" || e.category === filterCategory)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [selectedMonth, filterCategory]);

  // Upcoming events (next 30 days from today)
  const upcomingEvents = useMemo(() => {
    const today = new Date();
    const year = today.getFullYear();
    return EDITORIAL_EVENTS
      .map(e => {
        const [mm, dd] = e.date.split("-").map(Number);
        let eventDate = new Date(year, mm - 1, dd);
        if (eventDate < today) eventDate = new Date(year + 1, mm - 1, dd);
        const daysUntil = Math.ceil((eventDate.getTime() - today.getTime()) / 86400000);
        return { ...e, eventDate, daysUntil };
      })
      .filter(e => e.daysUntil >= 0 && e.daysUntil <= 30)
      .sort((a, b) => a.daysUntil - b.daysUntil)
      .slice(0, 5);
  }, []);

  const prevMonth = () => setSelectedMonth(m => m === 0 ? 11 : m - 1);
  const nextMonth = () => setSelectedMonth(m => m === 11 ? 0 : m + 1);

  return (
    <div className="space-y-4">
      {/* Upcoming events alert */}
      {upcomingEvents.length > 0 && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-primary">Événements à venir (30 jours)</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {upcomingEvents.map((e, i) => (
              <Badge
                key={i}
                variant="outline"
                className={`text-xs py-1 px-2.5 ${CATEGORY_CONFIG[e.category].class}`}
              >
                {e.emoji} {e.name}
                <span className="ml-1.5 opacity-70">
                  {e.daysUntil === 0 ? "Aujourd'hui" : `dans ${e.daysUntil}j`}
                </span>
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Month navigation + filter */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={prevMonth}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="font-semibold text-sm min-w-[100px] text-center">
            <CalendarDays className="w-4 h-4 inline mr-1.5" />
            {MONTHS[selectedMonth]}
          </span>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={nextMonth}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          {selectedMonth !== currentMonth && (
            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setSelectedMonth(currentMonth)}>
              Aujourd'hui
            </Button>
          )}
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[140px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes</SelectItem>
            {Object.entries(CATEGORY_CONFIG).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Events list */}
      {filteredEvents.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <CalendarDays className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Pas d'événement en {MONTHS[selectedMonth]}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredEvents.map((event, idx) => {
            const day = parseInt(event.date.split("-")[1]);
            const catCfg = CATEGORY_CONFIG[event.category];
            return (
              <Card key={idx} className="border-0 shadow-sm shadow-primary/5 overflow-hidden">
                <div className="flex items-stretch">
                  {/* Date column */}
                  <div className="w-16 shrink-0 flex flex-col items-center justify-center bg-muted/30 border-r border-border/50 py-3">
                    <span className="text-2xl font-bold text-primary">{day}</span>
                    <span className="text-[10px] uppercase text-muted-foreground font-medium">
                      {MONTHS[selectedMonth].slice(0, 3)}
                    </span>
                  </div>
                  {/* Content */}
                  <div className="flex-1 p-3">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-lg">{event.emoji}</span>
                      <span className="font-semibold text-sm">{event.name}</span>
                      <Badge variant="outline" className={`text-[10px] ${catCfg.class}`}>
                        {catCfg.label}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {event.designIdeas.map((idea, i) => (
                        <span key={i} className="inline-flex items-center text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                          💡 {idea}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
