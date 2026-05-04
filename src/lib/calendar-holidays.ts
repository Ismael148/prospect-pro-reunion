// Jours fériés France métropolitaine + La Réunion + dates spéciales
// Calculés dynamiquement par année (Pâques via algorithme de Meeus)

export type Holiday = {
  date: string; // YYYY-MM-DD
  name: string;
  emoji: string;
  type: "ferie" | "local" | "fete";
};

function easterDate(year: number): Date {
  // Algo Meeus/Jones/Butcher
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function fmt(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

export function getHolidays(year: number): Holiday[] {
  const easter = easterDate(year);
  return [
    { date: `${year}-01-01`, name: "Jour de l'An", emoji: "🎆", type: "ferie" },
    { date: fmt(addDays(easter, 1)), name: "Lundi de Pâques", emoji: "🐣", type: "ferie" },
    { date: `${year}-05-01`, name: "Fête du Travail", emoji: "🌷", type: "ferie" },
    { date: `${year}-05-08`, name: "Victoire 1945", emoji: "🇫🇷", type: "ferie" },
    { date: fmt(addDays(easter, 39)), name: "Ascension", emoji: "⛪", type: "ferie" },
    { date: fmt(addDays(easter, 50)), name: "Lundi de Pentecôte", emoji: "🕊️", type: "ferie" },
    { date: `${year}-07-14`, name: "Fête Nationale", emoji: "🇫🇷", type: "ferie" },
    { date: `${year}-08-15`, name: "Assomption", emoji: "⛪", type: "ferie" },
    { date: `${year}-11-01`, name: "Toussaint", emoji: "🕯️", type: "ferie" },
    { date: `${year}-11-11`, name: "Armistice 1918", emoji: "🇫🇷", type: "ferie" },
    { date: `${year}-12-25`, name: "Noël", emoji: "🎄", type: "ferie" },
    // La Réunion
    { date: `${year}-12-20`, name: "Fèt Kaf (La Réunion)", emoji: "✊", type: "local" },
    // Fêtes commerciales
    { date: `${year}-02-14`, name: "Saint-Valentin", emoji: "❤️", type: "fete" },
    { date: `${year}-03-08`, name: "Journée de la femme", emoji: "💪", type: "fete" },
    { date: `${year}-04-01`, name: "Poisson d'Avril", emoji: "🐟", type: "fete" },
    { date: `${year}-05-25`, name: "Fête des mères", emoji: "👩‍❤️", type: "fete" },
    { date: `${year}-06-15`, name: "Fête des pères", emoji: "👨‍👧", type: "fete" },
    { date: `${year}-06-21`, name: "Fête de la musique", emoji: "🎵", type: "fete" },
    { date: `${year}-10-31`, name: "Halloween", emoji: "🎃", type: "fete" },
    { date: `${year}-11-28`, name: "Black Friday", emoji: "🏷️", type: "fete" },
    { date: `${year}-12-31`, name: "Saint-Sylvestre", emoji: "🥂", type: "fete" },
  ];
}

export function getHolidaysForRange(years: number[]): Holiday[] {
  return years.flatMap((y) => getHolidays(y));
}
