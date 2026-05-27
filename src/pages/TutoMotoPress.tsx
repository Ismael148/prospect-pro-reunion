import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  Circle,
  ArrowRight,
  ArrowLeft,
  ExternalLink,
  Clock,
  Sparkles,
  BedDouble,
  Settings2,
  CalendarRange,
  Tags,
  CreditCard,
  CalendarSync,
  Inbox,
  HelpCircle,
  Hotel,
  Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import logo from "@/assets/logo.webp";

type StepKey =
  | "intro"
  | "install"
  | "settings"
  | "rooms"
  | "rates"
  | "payments"
  | "ical"
  | "bookings";

const STEPS: { key: StepKey; label: string; time: string; icon: any }[] = [
  { key: "intro",    label: "Découvrir MotoPress",        time: "1 min",  icon: Sparkles },
  { key: "install",  label: "Installer le plugin",        time: "3 min",  icon: Settings2 },
  { key: "settings", label: "Paramètres généraux",        time: "5 min",  icon: Hotel },
  { key: "rooms",    label: "Créer vos logements",        time: "10 min", icon: BedDouble },
  { key: "rates",    label: "Saisons & tarifs",           time: "5 min",  icon: Tags },
  { key: "payments", label: "Paiements en ligne",         time: "5 min",  icon: CreditCard },
  { key: "ical",     label: "Synchro Airbnb / Booking",   time: "5 min",  icon: CalendarSync },
  { key: "bookings", label: "Gérer les réservations",     time: "2 min",  icon: Inbox },
];

function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-white/40 bg-white/70 backdrop-blur-xl shadow-[0_10px_40px_-15px_rgba(255,0,110,0.15)] ${className}`}>
      {children}
    </div>
  );
}

function Stepper({ current, completed, onSelect }: {
  current: StepKey;
  completed: Set<StepKey>;
  onSelect: (k: StepKey) => void;
}) {
  return (
    <nav className="space-y-1">
      {STEPS.map((s, i) => {
        const isActive = s.key === current;
        const isDone = completed.has(s.key);
        const Icon = s.icon;
        return (
          <button
            key={s.key}
            onClick={() => onSelect(s.key)}
            className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all ${
              isActive
                ? "bg-gradient-to-r from-[#ff006e]/15 to-[#ff006e]/5 border border-[#ff006e]/30"
                : "hover:bg-white/60 border border-transparent"
            }`}
          >
            <div className={`flex-shrink-0 h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold ${
              isDone
                ? "bg-emerald-500 text-white"
                : isActive
                ? "bg-[#ff006e] text-white"
                : "bg-zinc-200 text-zinc-600"
            }`}>
              {isDone ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold truncate ${isActive ? "text-zinc-900" : "text-zinc-700"}`}>
                {s.label}
              </p>
              <p className="text-[10px] text-zinc-500 flex items-center gap-1">
                <Clock className="h-2.5 w-2.5" /> {s.time}
              </p>
            </div>
            <Icon className={`h-4 w-4 ${isActive ? "text-[#ff006e]" : "text-zinc-400"}`} />
          </button>
        );
      })}
    </nav>
  );
}

function StepHeader({ time, title, subtitle }: { time: string; title: string; subtitle?: string }) {
  return (
    <div>
      <Badge className="bg-[#ff006e]/10 text-[#ff006e] hover:bg-[#ff006e]/10 border-0">{time}</Badge>
      <h2 className="text-2xl md:text-3xl font-bold text-zinc-900 mt-2">{title}</h2>
      {subtitle && <p className="mt-2 text-zinc-600">{subtitle}</p>}
    </div>
  );
}

function NumberedList({ items }: { items: { t: string; d?: string }[] }) {
  return (
    <ol className="space-y-3">
      {items.map((s, i) => (
        <li key={i} className="flex gap-4">
          <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gradient-to-br from-[#ff006e] to-[#ff5c8a] text-white font-bold flex items-center justify-center text-sm">
            {i + 1}
          </div>
          <div>
            <p className="font-semibold text-zinc-900">{s.t}</p>
            {s.d && <p className="text-sm text-zinc-600 mt-0.5">{s.d}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}

function InfoBox({ children, variant = "info" }: { children: React.ReactNode; variant?: "info" | "warn" | "tip" }) {
  const map = {
    info: "border-blue-300 bg-blue-50 text-blue-900",
    warn: "border-amber-300 bg-amber-50 text-amber-900",
    tip:  "border-emerald-300 bg-emerald-50 text-emerald-900",
  };
  return <div className={`rounded-xl border-2 p-4 text-sm ${map[variant]}`}>{children}</div>;
}

/* ============ Steps content ============ */

function StepIntro() {
  return (
    <div className="space-y-5">
      <StepHeader
        time="1 min"
        title="Bienvenue dans votre tutoriel MotoPress"
        subtitle="MotoPress Hotel Booking est le plugin WordPress qui transforme votre site en véritable moteur de réservation en ligne — comme Airbnb ou Booking, mais 100% sur VOTRE site."
      />
      <div className="grid md:grid-cols-3 gap-3">
        {[
          { i: BedDouble, t: "Gérez vos logements", d: "Chambres, villas, gîtes : autant que vous voulez." },
          { i: CalendarRange, t: "Calendrier en temps réel", d: "Disponibilités à jour automatiquement." },
          { i: CreditCard, t: "Paiements sécurisés", d: "Acompte ou paiement intégral en ligne." },
        ].map((c, i) => {
          const Icon = c.i;
          return (
            <div key={i} className="rounded-xl border border-zinc-200 bg-white p-4">
              <Icon className="h-6 w-6 text-[#ff006e] mb-2" />
              <p className="font-semibold text-zinc-900 text-sm">{c.t}</p>
              <p className="text-xs text-zinc-600 mt-1">{c.d}</p>
            </div>
          );
        })}
      </div>
      <InfoBox variant="tip">
        💡 <strong>Bon à savoir :</strong> votre site Adamkom est livré avec MotoPress déjà installé et configuré.
        Ce tuto sert à vous montrer comment <strong>ajouter / modifier vos logements et tarifs au quotidien</strong>.
      </InfoBox>
    </div>
  );
}

function StepInstall() {
  return (
    <div className="space-y-5">
      <StepHeader
        time="3 min"
        title="Accéder à MotoPress sur votre site"
        subtitle="Toute la gestion se fait depuis votre tableau de bord WordPress."
      />
      <NumberedList items={[
        { t: "Connectez-vous à votre site", d: "Adresse de connexion : votresite.com/wp-admin (lien fourni par Adamkom)." },
        { t: "Entrez vos identifiants", d: "Utilisateur et mot de passe envoyés par email lors de la livraison." },
        { t: "Dans le menu de gauche, cherchez « Accommodation »", d: "C'est le nom anglais utilisé par MotoPress. Ce menu regroupe tout : logements, réservations, tarifs." },
        { t: "Cliquez sur « Bookings » → « Calendar »", d: "Vous verrez le calendrier global avec toutes les réservations." },
      ]} />
      <InfoBox variant="warn">
        ⚠️ <strong>Vous avez perdu vos identifiants ?</strong> Pas de panique : contactez le support Adamkom, on les régénère en 5 minutes.
      </InfoBox>
    </div>
  );
}

function StepSettings() {
  return (
    <div className="space-y-5">
      <StepHeader
        time="5 min"
        title="Vérifier les paramètres généraux"
        subtitle="On a déjà tout configuré pour vous, mais voici comment vérifier / modifier."
      />
      <NumberedList items={[
        { t: "Accommodation → Settings", d: "Onglet principal des réglages." },
        { t: "Onglet « General »", d: "Devise (€), format de date (jj/mm/aaaa), heure de check-in/check-out par défaut." },
        { t: "Onglet « Emails »", d: "Personnalisez les emails envoyés aux clients (confirmation, annulation, rappel). L'expéditeur est déjà configuré." },
        { t: "Onglet « Taxes & Fees »", d: "Ajoutez la taxe de séjour ou frais de ménage si applicable." },
        { t: "Onglet « Search Availability »", d: "Choisissez si vos clients peuvent réserver à la nuitée, semaine ou mois." },
      ]} />
      <InfoBox>
        ℹ️ Cliquez toujours sur <strong>« Save Changes »</strong> en bas de page après modification, sinon rien n'est enregistré.
      </InfoBox>
    </div>
  );
}

function StepRooms() {
  return (
    <div className="space-y-5">
      <StepHeader
        time="10 min"
        title="Créer ou modifier un logement"
        subtitle="Un « Accommodation Type » = un type de logement (ex : Chambre Double, Villa 4 personnes)."
      />
      <NumberedList items={[
        { t: "Accommodation → Accommodation Types → Add New", d: "Pour créer un nouveau type. Pour modifier un existant, cliquez directement sur son nom." },
        { t: "Titre du logement", d: "Ex : « Villa Vue Mer 4 personnes »." },
        { t: "Description", d: "Texte détaillé qui s'affichera sur la fiche publique. Soyez vendeur !" },
        { t: "Image principale + galerie", d: "À droite : « Featured Image » pour la miniature. Ajoutez ensuite 5 à 10 photos dans « Gallery »." },
        { t: "Caractéristiques (Categories, Amenities, Features)", d: "Cochez : nb de chambres, équipements (clim, wifi, piscine...), services (parking, animaux acceptés...)." },
        { t: "Capacité et tarif de base", d: "Bloc « Accommodation » : nombre d'adultes/enfants max, prix de base par nuit (sera affiné dans les saisons)." },
        { t: "Inventaire (nombre d'unités identiques)", d: "Si vous avez 3 chambres doubles identiques, mettez « Total Accommodations : 3 »." },
        { t: "Cliquez « Publish » (ou « Update »)", d: "Le logement est maintenant visible et réservable sur votre site." },
      ]} />
      <InfoBox variant="tip">
        📸 <strong>Conseil pro :</strong> les photos sont LE facteur n°1 de réservation. Privilégiez le format paysage,
        bien éclairé, sans clutter. 1600x900 px minimum.
      </InfoBox>
    </div>
  );
}

function StepRates() {
  return (
    <div className="space-y-5">
      <StepHeader
        time="5 min"
        title="Définir les saisons et tarifs"
        subtitle="Ajustez vos prix selon les périodes (haute saison, vacances scolaires, événements...)."
      />
      <NumberedList items={[
        { t: "Accommodation → Seasons → Add New", d: "Créez une saison : ex « Haute saison été » du 01/12 au 31/03 (été austral La Réunion)." },
        { t: "Accommodation → Rates → Add New", d: "Créez un tarif lié à un logement et une (ou plusieurs) saison(s)." },
        { t: "Définissez le prix par nuit", d: "Vous pouvez aussi définir un tarif par semaine ou par personne supplémentaire." },
        { t: "Règles spéciales (facultatif)", d: "Séjour minimum (ex : 3 nuits en haute saison), réduction longue durée, etc." },
        { t: "Enregistrez", d: "MotoPress applique automatiquement le bon tarif selon les dates choisies par le client." },
      ]} />
      <InfoBox>
        💰 <strong>Exemple Réunion :</strong> Haute saison (juillet-août + déc-jan) 150€/nuit · Basse saison 95€/nuit · Minimum 2 nuits toute l'année.
      </InfoBox>
    </div>
  );
}

function StepPayments() {
  return (
    <div className="space-y-5">
      <StepHeader
        time="5 min"
        title="Configurer les paiements en ligne"
        subtitle="Permettez à vos clients de payer (acompte ou totalité) directement à la réservation."
      />
      <NumberedList items={[
        { t: "Accommodation → Settings → Payments", d: "Section centrale des moyens de paiement." },
        { t: "Activez les passerelles souhaitées", d: "Stripe (carte bancaire), PayPal, virement bancaire, paiement sur place..." },
        { t: "Renseignez vos clés API", d: "Pour Stripe : compte → Développeurs → Clés API → copier la « Clé publiable » et la « Clé secrète »." },
        { t: "Choisissez le mode", d: "Paiement intégral à la réservation OU acompte (ex : 30%) + solde à l'arrivée." },
        { t: "Testez avec une fausse réservation", d: "Stripe propose un mode test avec carte 4242 4242 4242 4242." },
      ]} />
      <InfoBox variant="tip">
        🔐 Besoin d'aide pour configurer Stripe ou un autre prestataire ? Notre <Link to="/tuto/paiements" className="underline font-semibold">tuto paiements dédié</Link> vous guide pas à pas.
      </InfoBox>
    </div>
  );
}

function StepIcal() {
  return (
    <div className="space-y-5">
      <StepHeader
        time="5 min"
        title="Synchroniser Airbnb, Booking & autres"
        subtitle="Évitez les doubles réservations : votre calendrier MotoPress se met à jour automatiquement quand un client réserve sur Airbnb ou Booking (et inversement)."
      />
      <NumberedList items={[
        { t: "Récupérez vos liens iCal", d: "Chaque plateforme (Airbnb, Booking, Vrbo...) fournit un lien .ics dans son calendrier. Notre formulaire dédié vous guide." },
        { t: "Dans MotoPress : Accommodation → Sync Calendars", d: "Onglet de synchronisation iCal." },
        { t: "Pour chaque logement, ajoutez les liens d'import", d: "Collez le lien iCal d'Airbnb, puis celui de Booking, etc. → cochez « Auto-sync »." },
        { t: "Copiez le lien d'export MotoPress", d: "À coller dans Airbnb / Booking pour qu'eux aussi voient vos réservations directes." },
        { t: "Vérifiez la synchro toutes les 1-2h", d: "MotoPress synchronise automatiquement. En cas de doute, bouton « Sync Now »." },
      ]} />
      <InfoBox variant="warn">
        ⚠️ La synchro iCal a un délai de 30 min à 2h selon les plateformes. Ce n'est PAS instantané —
        évitez d'accepter une réservation manuelle dans la même tranche horaire qu'une réservation OTA.
      </InfoBox>
      <InfoBox variant="tip">
        🤝 <strong>Adamkom peut tout configurer pour vous :</strong> envoyez-nous vos liens iCal via le formulaire dédié et on s'occupe du reste.
      </InfoBox>
    </div>
  );
}

function StepBookings() {
  return (
    <div className="space-y-5">
      <StepHeader
        time="2 min"
        title="Suivre et gérer vos réservations"
        subtitle="Tout se passe dans le menu Bookings."
      />
      <NumberedList items={[
        { t: "Accommodation → Bookings", d: "Liste de toutes les réservations (en attente, confirmées, annulées)." },
        { t: "Cliquez sur une réservation pour voir le détail", d: "Coordonnées client, dates, montant, statut paiement." },
        { t: "Statuts à connaître", d: "« Pending » = en attente · « Confirmed » = confirmée · « Cancelled » = annulée. Modifiez à la main si besoin." },
        { t: "Calendrier visuel", d: "Bookings → Calendar : vue mensuelle avec toutes les unités et leurs occupations." },
        { t: "Emails automatiques", d: "Le client reçoit automatiquement confirmation, rappel J-2 et email post-séjour." },
      ]} />
      <InfoBox variant="tip">
        ✅ Vous êtes prêt ! Pour toute question, contactez le support Adamkom — on intervient sous 24h ouvrées.
      </InfoBox>
    </div>
  );
}

/* ============ Main page ============ */

export default function TutoMotoPress() {
  const [current, setCurrent] = useState<StepKey>("intro");
  const [completed, setCompleted] = useState<Set<StepKey>>(new Set());

  const idx = useMemo(() => STEPS.findIndex(s => s.key === current), [current]);
  const step = STEPS[idx];

  const goNext = () => {
    setCompleted(prev => new Set(prev).add(current));
    if (idx < STEPS.length - 1) setCurrent(STEPS[idx + 1].key);
  };
  const goPrev = () => { if (idx > 0) setCurrent(STEPS[idx - 1].key); };

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-pink-50">
      {/* Header */}
      <header className="border-b border-white/40 bg-white/60 backdrop-blur-xl sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Adamkom" className="h-9" />
            <div>
              <p className="text-[11px] uppercase tracking-wider text-[#ff006e] font-bold">Tutoriel</p>
              <h1 className="text-base md:text-lg font-bold text-zinc-900 leading-tight">MotoPress Hotel Booking</h1>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2 text-xs text-zinc-600">
            <Clock className="h-4 w-4" /> ~35 min · 100% gratuit
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 md:px-8 pt-10 pb-6">
        <div className="text-center max-w-2xl mx-auto">
          <Badge className="bg-[#ff006e]/10 text-[#ff006e] hover:bg-[#ff006e]/10 border-0 mb-4">
            <Sparkles className="h-3 w-3 mr-1" /> Guide complet
          </Badge>
          <h2 className="text-3xl md:text-5xl font-bold text-zinc-900 leading-tight">
            Gérez vos <span className="bg-gradient-to-r from-[#ff006e] to-[#ff5c8a] bg-clip-text text-transparent">réservations</span> comme un pro
          </h2>
          <p className="mt-4 text-zinc-600">
            Apprenez à utiliser MotoPress Hotel Booking sur votre site Adamkom : créer vos logements,
            fixer vos tarifs, synchroniser avec Airbnb et Booking, et encaisser en ligne.
          </p>
        </div>
      </section>

      {/* Body */}
      <main className="max-w-7xl mx-auto px-4 md:px-8 pb-20 grid md:grid-cols-[280px_1fr] gap-6">
        {/* Stepper */}
        <aside className="md:sticky md:top-24 md:self-start">
          <GlassCard className="p-3">
            <Stepper current={current} completed={completed} onSelect={setCurrent} />
          </GlassCard>
          <div className="mt-4 hidden md:block">
            <a
              href="https://motopress.com/products/hotel-booking/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-xs text-zinc-500 hover:text-[#ff006e] transition-colors"
            >
              <ExternalLink className="h-3 w-3" /> Documentation officielle MotoPress
            </a>
          </div>
        </aside>

        {/* Content */}
        <div className="min-w-0">
          <GlassCard className="p-6 md:p-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={current}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {current === "intro" && <StepIntro />}
                {current === "install" && <StepInstall />}
                {current === "settings" && <StepSettings />}
                {current === "rooms" && <StepRooms />}
                {current === "rates" && <StepRates />}
                {current === "payments" && <StepPayments />}
                {current === "ical" && <StepIcal />}
                {current === "bookings" && <StepBookings />}
              </motion.div>
            </AnimatePresence>

            {/* Nav */}
            <div className="mt-8 pt-6 border-t border-zinc-200 flex items-center justify-between gap-3">
              <Button variant="outline" onClick={goPrev} disabled={idx === 0}>
                <ArrowLeft className="h-4 w-4 mr-2" /> Précédent
              </Button>
              <p className="text-xs text-zinc-500 hidden sm:block">
                Étape {idx + 1} / {STEPS.length}
              </p>
              {idx < STEPS.length - 1 ? (
                <Button
                  onClick={goNext}
                  className="bg-gradient-to-r from-[#ff006e] to-[#ff5c8a] hover:opacity-90"
                >
                  C'est fait <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button
                  onClick={() => setCompleted(prev => new Set(prev).add(current))}
                  className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:opacity-90"
                >
                  Terminer <CheckCircle2 className="h-4 w-4 ml-2" />
                </Button>
              )}
            </div>
          </GlassCard>

          {/* Help footer */}
          <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-[#ff006e]/10 flex items-center justify-center flex-shrink-0">
              <HelpCircle className="h-6 w-6 text-[#ff006e]" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-zinc-900">Besoin d'aide ?</p>
              <p className="text-sm text-zinc-600">
                L'équipe Adamkom peut configurer MotoPress pour vous, ou prendre en charge la mise en ligne de vos logements (sur devis).
              </p>
            </div>
            <a href="mailto:contact@adamkom.com">
              <Button variant="outline" className="border-[#ff006e]/30 text-[#ff006e] hover:bg-[#ff006e]/5">
                <Mail className="h-4 w-4 mr-2" /> Nous contacter
              </Button>
            </a>
          </div>
        </div>
      </main>

      <footer className="py-6 text-center text-xs text-zinc-500">
        © Adamkom · Agence digitale · La Réunion
      </footer>
    </div>
  );
}
