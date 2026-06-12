import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Mail,
  MapPin,
  KeyRound,
  ShieldCheck,
  Clock,
  AlertCircle,
  ExternalLink,
  PartyPopper,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import logo from "@/assets/logo.webp";

type StepKey = "intro" | "courrier" | "connexion" | "code" | "verifie" | "merci";

const STEPS: { key: StepKey; label: string; time?: string }[] = [
  { key: "intro", label: "Bienvenue", time: "30 sec" },
  { key: "courrier", label: "Recevoir le courrier", time: "5-14 jours" },
  { key: "connexion", label: "Se connecter", time: "1 min" },
  { key: "code", label: "Saisir le code", time: "2 min" },
  { key: "verifie", label: "Fiche validée", time: "instant" },
];

export default function TutoGmbValidation() {
  const [step, setStep] = useState<StepKey>("intro");

  const stepIndex = STEPS.findIndex((s) => s.key === step);
  const progress = ((stepIndex + 1) / STEPS.length) * 100;

  const goNext = () => {
    const next = STEPS[stepIndex + 1];
    if (next) setStep(next.key);
    else setStep("merci");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const goPrev = () => {
    const prev = STEPS[stepIndex - 1];
    if (prev) setStep(prev.key);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Top bar */}
      <header className="sticky top-0 z-20 backdrop-blur-xl bg-background/70 border-b border-border/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt="Adamkom" className="h-8 w-auto" />
            <span className="font-display font-bold text-lg hidden sm:inline">Adamkom</span>
          </Link>
          <Badge variant="secondary" className="gap-1">
            <ShieldCheck className="h-3 w-3" />
            Validation Google Business
          </Badge>
        </div>
        {step !== "merci" && (
          <div className="h-1 bg-muted">
            <div
              className="h-full bg-primary transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {step === "intro" && <IntroStep onNext={goNext} />}
            {step === "courrier" && <CourrierStep onNext={goNext} onPrev={goPrev} />}
            {step === "connexion" && <ConnexionStep onNext={goNext} onPrev={goPrev} />}
            {step === "code" && <CodeStep onNext={goNext} onPrev={goPrev} />}
            {step === "verifie" && <VerifieStep onNext={goNext} onPrev={goPrev} />}
            {step === "merci" && <MerciStep />}
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="max-w-4xl mx-auto px-4 sm:px-6 py-8 text-center text-sm text-muted-foreground">
        <p>
          Besoin d'aide ? Contactez-nous à{" "}
          <a href="mailto:contact@adamkom.com" className="text-primary hover:underline">
            contact@adamkom.com
          </a>
        </p>
      </footer>
    </div>
  );
}

/* ---------- Reusable bits ---------- */

function StepHeader({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: any;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-8 text-center">
      <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4">
        <Icon className="h-7 w-7" />
      </div>
      <h1 className="text-3xl sm:text-4xl font-display font-bold tracking-tight">{title}</h1>
      {subtitle && <p className="mt-2 text-muted-foreground max-w-xl mx-auto">{subtitle}</p>}
    </div>
  );
}

function InfoBox({
  variant = "info",
  children,
}: {
  variant?: "info" | "warning" | "success";
  children: React.ReactNode;
}) {
  const styles = {
    info: "bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-300",
    warning: "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300",
    success: "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300",
  }[variant];
  const Icon = variant === "warning" ? AlertCircle : variant === "success" ? CheckCircle2 : AlertCircle;
  return (
    <div className={`flex gap-3 rounded-xl border p-4 ${styles}`}>
      <Icon className="h-5 w-5 shrink-0 mt-0.5" />
      <div className="text-sm leading-relaxed">{children}</div>
    </div>
  );
}

function NumberedList({ items }: { items: { title: string; desc: React.ReactNode }[] }) {
  return (
    <ol className="space-y-4">
      {items.map((it, i) => (
        <li
          key={i}
          className="flex gap-4 rounded-2xl border border-border/60 bg-card/50 backdrop-blur p-4 sm:p-5"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">
            {i + 1}
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold mb-1">{it.title}</h3>
            <div className="text-sm text-muted-foreground leading-relaxed">{it.desc}</div>
          </div>
        </li>
      ))}
    </ol>
  );
}

function NavButtons({
  onNext,
  onPrev,
  nextLabel = "Continuer",
}: {
  onNext: () => void;
  onPrev?: () => void;
  nextLabel?: string;
}) {
  return (
    <div className="mt-8 flex flex-col-reverse sm:flex-row sm:justify-between gap-3">
      {onPrev ? (
        <Button variant="ghost" onClick={onPrev} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Précédent
        </Button>
      ) : (
        <span />
      )}
      <Button onClick={onNext} size="lg" className="gap-2">
        {nextLabel} <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

/* ---------- Steps ---------- */

function IntroStep({ onNext }: { onNext: () => void }) {
  return (
    <div>
      <StepHeader
        icon={ShieldCheck}
        title="Validez votre fiche Google My Business"
        subtitle="On vous guide pas-à-pas pour saisir le code reçu par courrier et activer votre fiche."
      />
      <div className="grid sm:grid-cols-3 gap-3 mb-8">
        <div className="rounded-2xl border bg-card/50 p-5 text-center">
          <Mail className="h-6 w-6 text-primary mx-auto mb-2" />
          <h3 className="font-semibold text-sm">1. Courrier</h3>
          <p className="text-xs text-muted-foreground mt-1">Google vous envoie un code par la poste</p>
        </div>
        <div className="rounded-2xl border bg-card/50 p-5 text-center">
          <KeyRound className="h-6 w-6 text-primary mx-auto mb-2" />
          <h3 className="font-semibold text-sm">2. Code à 5 chiffres</h3>
          <p className="text-xs text-muted-foreground mt-1">Vous le saisissez sur votre fiche</p>
        </div>
        <div className="rounded-2xl border bg-card/50 p-5 text-center">
          <CheckCircle2 className="h-6 w-6 text-emerald-500 mx-auto mb-2" />
          <h3 className="font-semibold text-sm">3. Fiche active</h3>
          <p className="text-xs text-muted-foreground mt-1">Visible sur Google et Maps</p>
        </div>
      </div>
      <InfoBox variant="info">
        <strong>Pourquoi cette étape ?</strong> Google envoie un code unique à votre adresse pour
        confirmer que votre entreprise existe vraiment à cet endroit. C'est la seule façon d'activer
        votre fiche.
      </InfoBox>
      <NavButtons onNext={onNext} nextLabel="C'est parti" />
    </div>
  );
}

function CourrierStep({ onNext, onPrev }: { onNext: () => void; onPrev: () => void }) {
  return (
    <div>
      <StepHeader
        icon={Mail}
        title="Recevoir le courrier Google"
        subtitle="Google envoie une carte postale à l'adresse de votre entreprise."
      />
      <NumberedList
        items={[
          {
            title: "Surveillez votre boîte aux lettres",
            desc: (
              <>
                Le courrier arrive sous <strong>5 à 14 jours</strong> en moyenne (parfois jusqu'à 3
                semaines). Il vient de <strong>Google Ireland</strong> ou <strong>Google LLC</strong>.
              </>
            ),
          },
          {
            title: "Reconnaissez la carte postale",
            desc: (
              <>
                C'est une carte blanche avec le logo Google en couleur. Au dos, un{" "}
                <strong>code de vérification à 5 chiffres</strong> entouré dans un cadre.
              </>
            ),
          },
          {
            title: "Ne jetez pas le courrier",
            desc: (
              <>
                Beaucoup de personnes le confondent avec une pub. <strong>Vérifiez bien</strong>{" "}
                avant de jeter tout courrier blanc avec un logo Google.
              </>
            ),
          },
        ]}
      />
      <div className="mt-6">
        <InfoBox variant="warning">
          <strong>Vous n'avez rien reçu après 3 semaines ?</strong> Connectez-vous à votre fiche
          Google Business et cliquez sur "Demander un nouveau code". Vérifiez aussi que l'adresse
          saisie est exacte.
        </InfoBox>
      </div>
      <NavButtons onNext={onNext} onPrev={onPrev} nextLabel="J'ai reçu le code" />
    </div>
  );
}

function ConnexionStep({ onNext, onPrev }: { onNext: () => void; onPrev: () => void }) {
  return (
    <div>
      <StepHeader
        icon={KeyRound}
        title="Connectez-vous à votre fiche"
        subtitle="Utilisez le compte Google associé à votre fiche Business."
      />
      <NumberedList
        items={[
          {
            title: "Ouvrez Google Business Profile",
            desc: (
              <>
                Rendez-vous sur{" "}
                <a
                  href="https://business.google.com/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary font-medium hover:underline inline-flex items-center gap-1"
                >
                  business.google.com <ExternalLink className="h-3 w-3" />
                </a>
                .
              </>
            ),
          },
          {
            title: "Connectez-vous avec le bon compte Google",
            desc: (
              <>
                Utilisez le compte Gmail (ou Google) avec lequel la fiche a été créée. Si vous avez
                un doute, contactez-nous.
              </>
            ),
          },
          {
            title: "Sélectionnez votre établissement",
            desc: (
              <>
                Si vous avez plusieurs fiches, cliquez sur celle qui doit être validée. Vous verrez
                un bandeau jaune ou rouge indiquant "Faire vérifier l'établissement".
              </>
            ),
          },
        ]}
      />
      <NavButtons onNext={onNext} onPrev={onPrev} />
    </div>
  );
}

function CodeStep({ onNext, onPrev }: { onNext: () => void; onPrev: () => void }) {
  return (
    <div>
      <StepHeader
        icon={KeyRound}
        title="Saisir le code à 5 chiffres"
        subtitle="L'étape la plus importante : entrer le code reçu par courrier."
      />
      <NumberedList
        items={[
          {
            title: "Cliquez sur \"Faire vérifier\" ou \"Saisir le code\"",
            desc: (
              <>
                Sur votre tableau de bord, repérez le bouton{" "}
                <strong>"Faire vérifier l'établissement"</strong> ou{" "}
                <strong>"Saisir le code"</strong>.
              </>
            ),
          },
          {
            title: "Recopiez le code à 5 chiffres",
            desc: (
              <>
                Tapez le code <strong>exactement</strong> comme indiqué sur la carte postale.
                Aucune lettre, uniquement <strong>5 chiffres</strong>.
              </>
            ),
          },
          {
            title: "Validez",
            desc: (
              <>
                Cliquez sur <strong>"Vérifier"</strong>. Si le code est correct, votre fiche
                s'active immédiatement.
              </>
            ),
          },
        ]}
      />
      <div className="mt-6 space-y-3">
        <InfoBox variant="warning">
          <strong>Attention :</strong> vous avez un nombre limité d'essais. Vérifiez bien chaque
          chiffre avant de valider.
        </InfoBox>
        <InfoBox variant="info">
          <strong>Le code ne fonctionne pas ?</strong> Vérifiez que vous êtes connecté au bon compte
          Google et que le code n'est pas périmé (valable 30 jours). Si besoin, demandez-en un
          nouveau.
        </InfoBox>
      </div>
      <NavButtons onNext={onNext} onPrev={onPrev} nextLabel="Code validé" />
    </div>
  );
}

function VerifieStep({ onNext, onPrev }: { onNext: () => void; onPrev: () => void }) {
  return (
    <div>
      <StepHeader
        icon={CheckCircle2}
        title="Votre fiche est validée"
        subtitle="Félicitations, votre établissement est officiellement visible sur Google."
      />
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6 mb-6">
        <h3 className="font-semibold flex items-center gap-2 mb-3">
          <MapPin className="h-5 w-5 text-emerald-600" />
          Ce qui se passe maintenant
        </h3>
        <ul className="space-y-2 text-sm">
          <li className="flex gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
            <span>Votre fiche apparaît sur <strong>Google Search</strong> et <strong>Google Maps</strong>.</span>
          </li>
          <li className="flex gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
            <span>Les clients peuvent laisser des <strong>avis</strong>, voir vos horaires et vous appeler.</span>
          </li>
          <li className="flex gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
            <span>Adamkom peut désormais <strong>optimiser votre fiche</strong> (photos, posts, réponses aux avis).</span>
          </li>
        </ul>
      </div>
      <InfoBox variant="success">
        <strong>Prévenez Adamkom dès que c'est fait</strong> en répondant simplement à notre email
        ou en nous contactant. Nous prendrons le relais pour booster votre visibilité locale.
      </InfoBox>
      <NavButtons onNext={onNext} onPrev={onPrev} nextLabel="Terminer" />
    </div>
  );
}

function MerciStep() {
  return (
    <div className="text-center py-10">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
        className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-primary text-primary-foreground mb-6"
      >
        <PartyPopper className="h-10 w-10" />
      </motion.div>
      <h1 className="text-3xl sm:text-4xl font-display font-bold mb-3">Bravo !</h1>
      <p className="text-muted-foreground max-w-md mx-auto mb-8">
        Votre fiche Google My Business est validée. Vous êtes désormais visible auprès de milliers
        de clients potentiels près de chez vous.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Button asChild size="lg" variant="outline">
          <a href="mailto:contact@adamkom.com">
            <Mail className="h-4 w-4 mr-2" />
            Prévenir Adamkom
          </a>
        </Button>
        <Button asChild size="lg">
          <a href="https://business.google.com/" target="_blank" rel="noreferrer">
            Voir ma fiche
            <ExternalLink className="h-4 w-4 ml-2" />
          </a>
        </Button>
      </div>
      <div className="mt-10 inline-flex items-center gap-2 text-xs text-muted-foreground">
        <Clock className="h-3 w-3" />
        Tutoriel réalisé par Adamkom by JJP
      </div>
    </div>
  );
}
