import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Clock,
  Sparkles,
  LogIn,
  Inbox,
  Bell,
  HelpCircle,
  Mail,
  CalendarRange,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import logo from "@/assets/logo.webp";

type StepKey = "intro" | "login" | "bookings" | "emails";

const STEPS: { key: StepKey; label: string; time: string; icon: any }[] = [
  { key: "intro",    label: "Bienvenue",                       time: "1 min", icon: Sparkles },
  { key: "login",    label: "Se connecter à votre back-office", time: "1 min", icon: LogIn },
  { key: "bookings", label: "Voir vos réservations",            time: "2 min", icon: Inbox },
  { key: "emails",   label: "Recevoir les alertes par email",   time: "1 min", icon: Bell },
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
              isDone ? "bg-emerald-500 text-white" : isActive ? "bg-[#ff006e] text-white" : "bg-zinc-200 text-zinc-600"
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
        title="Comment recevoir vos réservations"
        subtitle="Ce guide vous montre uniquement comment consulter et gérer les réservations reçues sur votre site, depuis votre back-office."
      />
      <div className="grid md:grid-cols-3 gap-3">
        {[
          { i: LogIn, t: "1. Connexion", d: "Accédez à votre back-office en 1 clic." },
          { i: Inbox, t: "2. Réservations", d: "Visualisez toutes vos réservations en temps réel." },
          { i: Bell,  t: "3. Notifications", d: "Recevez un email à chaque nouvelle réservation." },
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
        💡 Votre site est <strong>déjà configuré par Adamkom</strong>. Vos chambres, tarifs et calendriers sont en place — vous n'avez rien à paramétrer.
      </InfoBox>
    </div>
  );
}

function StepLogin() {
  return (
    <div className="space-y-5">
      <StepHeader
        time="1 min"
        title="Se connecter à votre back-office"
        subtitle="Toute la gestion des réservations se fait depuis votre tableau de bord."
      />
      <NumberedList items={[
        { t: "Ouvrez votre navigateur", d: "Chrome, Safari, Firefox… aucune installation nécessaire." },
        { t: "Allez sur l'adresse de connexion", d: "votresite.com/wp-admin (l'adresse exacte vous a été envoyée par email à la livraison de votre site)." },
        { t: "Saisissez vos identifiants", d: "Identifiant et mot de passe transmis par Adamkom." },
        { t: "Vous arrivez sur votre tableau de bord", d: "C'est votre espace privé. Tout est en français une fois traduit, ou en anglais selon la configuration." },
      ]} />
      <InfoBox variant="warn">
        ⚠️ <strong>Identifiants perdus ?</strong> Contactez le support Adamkom, on vous les renvoie en quelques minutes.
      </InfoBox>
    </div>
  );
}

function StepBookings() {
  return (
    <div className="space-y-5">
      <StepHeader
        time="2 min"
        title="Consulter vos réservations"
        subtitle="C'est l'étape la plus importante : voir qui a réservé, quand, et pour combien."
      />
      <NumberedList items={[
        { t: "Dans le menu de gauche, cherchez « Réservations » (ou « Bookings »)", d: "C'est l'icône avec une liste ou un calendrier." },
        { t: "Cliquez sur « Toutes les réservations »", d: "Vous voyez la liste complète : nom du client, dates, logement réservé, montant, statut du paiement." },
        { t: "Cliquez sur une réservation pour voir le détail", d: "Coordonnées du client (email, téléphone), nombre de personnes, demandes spéciales, statut du paiement." },
        { t: "Vue calendrier (facultatif)", d: "Cliquez sur « Calendrier » pour une vue mensuelle visuelle : vous voyez d'un coup d'œil les jours occupés." },
      ]} />
      <InfoBox>
        ℹ️ <strong>Les statuts à connaître :</strong>
        <ul className="mt-2 space-y-1 list-disc pl-5">
          <li><strong>En attente</strong> : le client a réservé mais pas encore payé.</li>
          <li><strong>Confirmée</strong> : paiement reçu, réservation validée.</li>
          <li><strong>Annulée</strong> : réservation annulée par le client ou par vous.</li>
        </ul>
      </InfoBox>
      <InfoBox variant="tip">
        ✅ Vous n'avez <strong>rien à faire manuellement</strong> : chaque réservation arrive automatiquement ici dès qu'un client réserve sur votre site.
      </InfoBox>
    </div>
  );
}

function StepEmails() {
  return (
    <div className="space-y-5">
      <StepHeader
        time="1 min"
        title="Être prévenu par email à chaque réservation"
        subtitle="Pas besoin de vous connecter sans arrêt : vous recevez un email automatique."
      />
      <NumberedList items={[
        { t: "À chaque nouvelle réservation", d: "Vous recevez un email avec : nom du client, dates, logement, montant." },
        { t: "Le client reçoit aussi un email de confirmation", d: "Tout est automatique, vous n'avez rien à envoyer." },
        { t: "Email non reçu ?", d: "Vérifiez vos spams. Si rien, contactez le support Adamkom : on vérifie l'adresse de notification configurée." },
      ]} />
      <InfoBox variant="tip">
        📧 <strong>Astuce :</strong> ajoutez l'adresse expéditrice à vos contacts pour ne plus jamais manquer une réservation.
      </InfoBox>
      <InfoBox>
        ✅ <strong>C'est tout !</strong> Vous savez maintenant recevoir et consulter vos réservations. Pour toute question, l'équipe Adamkom répond sous 24h ouvrées.
      </InfoBox>
    </div>
  );
}

/* ============ Main page ============ */

export default function TutoMotoPress() {
  const [current, setCurrent] = useState<StepKey>("intro");
  const [completed, setCompleted] = useState<Set<StepKey>>(new Set());

  const idx = useMemo(() => STEPS.findIndex(s => s.key === current), [current]);

  const goNext = () => {
    setCompleted(prev => new Set(prev).add(current));
    if (idx < STEPS.length - 1) setCurrent(STEPS[idx + 1].key);
  };
  const goPrev = () => { if (idx > 0) setCurrent(STEPS[idx - 1].key); };

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-pink-50">
      <header className="border-b border-white/40 bg-white/60 backdrop-blur-xl sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Adamkom" className="h-9" />
            <div>
              <p className="text-[11px] uppercase tracking-wider text-[#ff006e] font-bold">Tutoriel</p>
              <h1 className="text-base md:text-lg font-bold text-zinc-900 leading-tight">Recevoir mes réservations</h1>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2 text-xs text-zinc-600">
            <Clock className="h-4 w-4" /> ~5 min · 100% gratuit
          </div>
        </div>
      </header>

      <section className="max-w-7xl mx-auto px-4 md:px-8 pt-10 pb-6">
        <div className="text-center max-w-2xl mx-auto">
          <Badge className="bg-[#ff006e]/10 text-[#ff006e] hover:bg-[#ff006e]/10 border-0 mb-4">
            <Sparkles className="h-3 w-3 mr-1" /> Guide express
          </Badge>
          <h2 className="text-3xl md:text-5xl font-bold text-zinc-900 leading-tight">
            Recevez vos <span className="bg-gradient-to-r from-[#ff006e] to-[#ff5c8a] bg-clip-text text-transparent">réservations</span> sans effort
          </h2>
          <p className="mt-4 text-zinc-600">
            En 5 minutes, apprenez à vous connecter à votre back-office et à consulter toutes les réservations passées sur votre site.
          </p>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 md:px-8 pb-20 grid md:grid-cols-[280px_1fr] gap-6">
        <aside className="md:sticky md:top-24 md:self-start">
          <GlassCard className="p-3">
            <Stepper current={current} completed={completed} onSelect={setCurrent} />
          </GlassCard>
        </aside>

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
                {current === "login" && <StepLogin />}
                {current === "bookings" && <StepBookings />}
                {current === "emails" && <StepEmails />}
              </motion.div>
            </AnimatePresence>

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

          <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-[#ff006e]/10 flex items-center justify-center flex-shrink-0">
              <HelpCircle className="h-6 w-6 text-[#ff006e]" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-zinc-900">Besoin d'aide ?</p>
              <p className="text-sm text-zinc-600">
                L'équipe Adamkom est à votre disposition pour toute question sur la gestion de vos réservations.
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
