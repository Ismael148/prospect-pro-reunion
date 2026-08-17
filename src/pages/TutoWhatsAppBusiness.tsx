import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  MessageCircle,
  Building2,
  Smartphone,
  BadgeCheck,
  KeyRound,
  ClipboardList,
  AlertCircle,
  ExternalLink,
  PartyPopper,
  ShieldCheck,
  Copy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import logo from "@/assets/logo.webp";

type StepKey =
  | "intro"
  | "prerequis"
  | "business"
  | "app"
  | "numero"
  | "verif"
  | "token"
  | "infos"
  | "merci";

const STEPS: { key: StepKey; label: string; time?: string }[] = [
  { key: "intro", label: "Bienvenue", time: "1 min" },
  { key: "prerequis", label: "Préparer", time: "5 min" },
  { key: "business", label: "Compte Meta Business", time: "5 min" },
  { key: "app", label: "Créer l'application", time: "5 min" },
  { key: "numero", label: "Ajouter le numéro", time: "5 min" },
  { key: "verif", label: "Vérifier l'entreprise", time: "1-3 jours" },
  { key: "token", label: "Token permanent", time: "5 min" },
  { key: "infos", label: "Nous transmettre", time: "2 min" },
];

export default function TutoWhatsAppBusiness() {
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
      <header className="sticky top-0 z-20 backdrop-blur-xl bg-background/70 border-b border-border/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt="Adamkom" className="h-8 w-auto" />
            <span className="font-display font-bold text-lg hidden sm:inline">Adamkom</span>
          </Link>
          <Badge variant="secondary" className="gap-1">
            <MessageCircle className="h-3 w-3" />
            WhatsApp Business
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

      {step !== "merci" && (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-6">
          <div className="flex flex-wrap gap-2">
            {STEPS.map((s, i) => (
              <button
                key={s.key}
                onClick={() => {
                  setStep(s.key);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className={`text-[11px] rounded-full border px-3 py-1 transition-colors ${
                  i === stepIndex
                    ? "bg-primary text-primary-foreground border-primary"
                    : i < stepIndex
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                    : "bg-card/50 text-muted-foreground border-border/60 hover:bg-muted"
                }`}
              >
                {i + 1}. {s.label}
              </button>
            ))}
          </div>
        </div>
      )}

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
            {step === "prerequis" && <PrerequisStep onNext={goNext} onPrev={goPrev} />}
            {step === "business" && <BusinessStep onNext={goNext} onPrev={goPrev} />}
            {step === "app" && <AppStep onNext={goNext} onPrev={goPrev} />}
            {step === "numero" && <NumeroStep onNext={goNext} onPrev={goPrev} />}
            {step === "verif" && <VerifStep onNext={goNext} onPrev={goPrev} />}
            {step === "token" && <TokenStep onNext={goNext} onPrev={goPrev} />}
            {step === "infos" && <InfosStep onNext={goNext} onPrev={goPrev} />}
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
  time,
}: {
  icon: any;
  title: string;
  subtitle?: string;
  time?: string;
}) {
  return (
    <div className="mb-8 text-center">
      <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4">
        <Icon className="h-7 w-7" />
      </div>
      <h1 className="text-3xl sm:text-4xl font-display font-bold tracking-tight">{title}</h1>
      {subtitle && <p className="mt-2 text-muted-foreground max-w-xl mx-auto">{subtitle}</p>}
      {time && (
        <Badge variant="outline" className="mt-3">
          ⏱ {time}
        </Badge>
      )}
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
  const Icon = variant === "success" ? CheckCircle2 : AlertCircle;
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

function Ext({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="text-primary font-medium hover:underline inline-flex items-center gap-1"
    >
      {children} <ExternalLink className="h-3 w-3" />
    </a>
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
        icon={MessageCircle}
        title="Créez votre compte WhatsApp Business"
        subtitle="On vous guide pas-à-pas pour que les messages envoyés depuis votre site arrivent directement sur votre WhatsApp."
      />
      <div className="grid sm:grid-cols-3 gap-3 mb-8">
        <div className="rounded-2xl border bg-card/50 p-5 text-center">
          <Building2 className="h-6 w-6 text-primary mx-auto mb-2" />
          <h3 className="font-semibold text-sm">1. Votre compte Meta</h3>
          <p className="text-xs text-muted-foreground mt-1">Au nom de votre entreprise</p>
        </div>
        <div className="rounded-2xl border bg-card/50 p-5 text-center">
          <Smartphone className="h-6 w-6 text-primary mx-auto mb-2" />
          <h3 className="font-semibold text-sm">2. Votre numéro</h3>
          <p className="text-xs text-muted-foreground mt-1">Vérifié par SMS ou appel</p>
        </div>
        <div className="rounded-2xl border bg-card/50 p-5 text-center">
          <CheckCircle2 className="h-6 w-6 text-emerald-500 mx-auto mb-2" />
          <h3 className="font-semibold text-sm">3. Nous envoyer 3 infos</h3>
          <p className="text-xs text-muted-foreground mt-1">On branche tout sur votre site</p>
        </div>
      </div>
      <InfoBox variant="info">
        <strong>Pourquoi devez-vous le faire vous-même ?</strong> Le compte WhatsApp Business doit
        être associé à votre entreprise (nom légal, numéro de téléphone, documents officiels). Seul
        le dirigeant peut le créer. Ensuite, vous nous transmettez 3 informations et{" "}
        <strong>nous nous occupons du reste</strong>.
      </InfoBox>
      <NavButtons onNext={onNext} nextLabel="C'est parti" />
    </div>
  );
}

function PrerequisStep({ onNext, onPrev }: { onNext: () => void; onPrev: () => void }) {
  const items = [
    "Un compte Facebook personnel (pour créer le compte Meta Business)",
    "Le nom légal de votre entreprise et son adresse",
    "Un document officiel : registre de commerce, Kbis, statuts…",
    "Un numéro de téléphone dédié, capable de recevoir un SMS ou un appel",
  ];
  return (
    <div>
      <StepHeader
        icon={ClipboardList}
        title="Ce dont vous aurez besoin"
        subtitle="Préparez ces 4 éléments avant de commencer, vous gagnerez du temps."
        time="5 min de préparation"
      />
      <ul className="space-y-3 mb-6">
        {items.map((it, i) => (
          <li
            key={i}
            className="flex gap-3 rounded-xl border border-border/60 bg-card/50 p-4 text-sm"
          >
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
            <span>{it}</span>
          </li>
        ))}
      </ul>
      <InfoBox variant="warning">
        <strong>Très important :</strong> le numéro que vous allez utiliser ne doit{" "}
        <strong>pas déjà être utilisé</strong> sur WhatsApp classique ni sur l'application WhatsApp
        Business. Idéalement, prenez une nouvelle carte SIM dédiée à votre entreprise.
      </InfoBox>
      <NavButtons onNext={onNext} onPrev={onPrev} nextLabel="J'ai tout préparé" />
    </div>
  );
}

function BusinessStep({ onNext, onPrev }: { onNext: () => void; onPrev: () => void }) {
  return (
    <div>
      <StepHeader
        icon={Building2}
        title="Étape 1 — Créer un compte Meta Business"
        subtitle="C'est l'espace officiel de Meta qui regroupe vos outils professionnels."
        time="5 min"
      />
      <NumberedList
        items={[
          {
            title: "Ouvrez Meta Business",
            desc: (
              <>
                Rendez-vous sur <Ext href="https://business.facebook.com">business.facebook.com</Ext>{" "}
                et connectez-vous avec votre compte Facebook personnel.
              </>
            ),
          },
          {
            title: "Créez le compte au nom de votre entreprise",
            desc: (
              <>
                Cliquez sur <strong>« Créer un compte »</strong>, puis renseignez le{" "}
                <strong>nom exact de votre entreprise</strong>, votre nom et votre email
                professionnel.
              </>
            ),
          },
          {
            title: "Vous avez déjà un Business Manager ?",
            desc: <>Parfait, passez directement à l'étape suivante — pas besoin d'en créer un second.</>,
          },
        ]}
      />
      <div className="mt-6">
        <InfoBox variant="info">
          Votre compte Facebook personnel reste privé : Meta l'utilise uniquement pour vous
          identifier comme administrateur.
        </InfoBox>
      </div>
      <NavButtons onNext={onNext} onPrev={onPrev} />
    </div>
  );
}

function AppStep({ onNext, onPrev }: { onNext: () => void; onPrev: () => void }) {
  return (
    <div>
      <StepHeader
        icon={KeyRound}
        title="Étape 2 — Créer votre application"
        subtitle="L'application est le « connecteur » entre votre site et WhatsApp."
        time="5 min"
      />
      <NumberedList
        items={[
          {
            title: "Allez sur Meta for Developers",
            desc: (
              <>
                Ouvrez{" "}
                <Ext href="https://developers.facebook.com/apps">developers.facebook.com/apps</Ext>{" "}
                (connecté avec le même compte Facebook).
              </>
            ),
          },
          {
            title: "Cliquez sur « Créer une application »",
            desc: (
              <>
                Choisissez le type <strong>« Entreprise » / « Business »</strong>, donnez un nom
                (ex : « WhatsApp – Nom de votre société ») et validez.
              </>
            ),
          },
          {
            title: "Ajoutez le produit WhatsApp",
            desc: (
              <>
                Depuis le tableau de bord de l'application, trouvez la carte{" "}
                <strong>WhatsApp</strong> et cliquez sur <strong>« Configurer »</strong>.
              </>
            ),
          },
        ]}
      />
      <NavButtons onNext={onNext} onPrev={onPrev} />
    </div>
  );
}

function NumeroStep({ onNext, onPrev }: { onNext: () => void; onPrev: () => void }) {
  return (
    <div>
      <StepHeader
        icon={Smartphone}
        title="Étape 3 — Ajouter et vérifier votre numéro"
        subtitle="C'est le numéro qui recevra les messages de vos clients."
        time="5 min"
      />
      <NumberedList
        items={[
          {
            title: "Ouvrez « Configuration de l'API »",
            desc: (
              <>
                Dans le menu de gauche : <strong>WhatsApp → Configuration de l'API</strong> (API
                Setup), puis suivez <strong>« Étape 2 : Configuration de la production »</strong>.
              </>
            ),
          },
          {
            title: "Ajoutez votre numéro professionnel",
            desc: (
              <>
                Saisissez le numéro <strong>dédié</strong> à votre entreprise, au format
                international (ex : +262 692 XX XX XX).
              </>
            ),
          },
          {
            title: "Saisissez le code reçu",
            desc: (
              <>
                Meta vous envoie un code par <strong>SMS ou appel</strong>. Entrez-le pour valider
                le numéro.
              </>
            ),
          },
        ]}
      />
      <div className="mt-6">
        <InfoBox variant="warning">
          Une fois validé, ce numéro devient votre <strong>numéro WhatsApp Business officiel</strong>{" "}
          : il ne doit plus être utilisé avec l'application WhatsApp classique.
        </InfoBox>
      </div>
      <NavButtons onNext={onNext} onPrev={onPrev} nextLabel="Mon numéro est validé" />
    </div>
  );
}

function VerifStep({ onNext, onPrev }: { onNext: () => void; onPrev: () => void }) {
  return (
    <div>
      <StepHeader
        icon={BadgeCheck}
        title="Étape 4 — Vérifier votre entreprise"
        subtitle="Meta doit confirmer que votre entreprise existe légalement."
        time="quelques heures à quelques jours"
      />
      <NumberedList
        items={[
          {
            title: "Suivez « Étape 3 : Vérification de l'entreprise »",
            desc: <>Toujours dans le parcours guidé de la page Configuration de l'API.</>,
          },
          {
            title: "Renseignez vos informations légales",
            desc: (
              <>
                Nom légal, adresse, site internet et téléphone — ils doivent être{" "}
                <strong>identiques</strong> à ceux de votre document officiel.
              </>
            ),
          },
          {
            title: "Importez le document officiel",
            desc: <>Registre de commerce, Kbis, statuts ou équivalent, en PDF ou photo bien lisible.</>,
          },
        ]}
      />
      <div className="mt-6 space-y-4">
        <InfoBox variant="info">
          Le délai de validation dépend de Meta : de <strong>quelques heures à quelques jours</strong>.
          Vous recevrez un email dès que c'est validé.
        </InfoBox>
        <InfoBox variant="warning">
          <strong>Refusé ?</strong> C'est presque toujours une différence entre l'adresse saisie et
          celle du document. Corrigez et re-soumettez — c'est possible plusieurs fois.
        </InfoBox>
      </div>
      <NavButtons onNext={onNext} onPrev={onPrev} />
    </div>
  );
}

function TokenStep({ onNext, onPrev }: { onNext: () => void; onPrev: () => void }) {
  return (
    <div>
      <StepHeader
        icon={ShieldCheck}
        title="Étape 5 — Générer un token permanent"
        subtitle="Le token affiché par défaut expire au bout de 24h : il en faut un qui n'expire jamais."
        time="5 min"
      />
      <NumberedList
        items={[
          {
            title: "Ouvrez les Utilisateurs système",
            desc: (
              <>
                Dans <strong>Meta Business Suite</strong> :{" "}
                <Ext href="https://business.facebook.com/settings/system-users">
                  Paramètres de l'entreprise → Utilisateurs système
                </Ext>
                .
              </>
            ),
          },
          {
            title: "Créez un nouvel utilisateur système",
            desc: (
              <>
                Cliquez sur <strong>« Ajouter »</strong>, nommez-le (ex : « API WhatsApp ») et
                choisissez le rôle <strong>Admin</strong>.
              </>
            ),
          },
          {
            title: "Assignez votre application WhatsApp",
            desc: (
              <>
                Bouton <strong>« Ajouter des actifs »</strong> → sélectionnez votre application et
                activez la permission <strong>whatsapp_business_messaging</strong>.
              </>
            ),
          },
          {
            title: "Générez le token",
            desc: (
              <>
                Cliquez sur <strong>« Générer un nouveau token »</strong>, choisissez votre
                application, cochez les permissions puis validez.{" "}
                <strong>Copiez-le immédiatement</strong> : il ne sera plus affiché ensuite.
              </>
            ),
          },
        ]}
      />
      <div className="mt-6">
        <InfoBox variant="warning">
          Ce token est une <strong>clé sensible</strong>, comme un mot de passe. Ne le publiez jamais
          et ne l'envoyez pas dans une conversation publique.
        </InfoBox>
      </div>
      <NavButtons onNext={onNext} onPrev={onPrev} />
    </div>
  );
}

function InfosStep({ onNext, onPrev }: { onNext: () => void; onPrev: () => void }) {
  const rows = [
    {
      label: "Phone Number ID",
      where: "WhatsApp → Configuration de l'API : le nombre affiché juste en dessous de votre numéro vérifié",
    },
    {
      label: "Access Token permanent",
      where: "Créé via l'Utilisateur système (Étape 5 de ce guide)",
    },
    {
      label: "Numéro WhatsApp Business",
      where: "Le numéro que vous avez ajouté et vérifié à l'Étape 3",
    },
  ];

  const template = `Bonjour,

Voici mes informations WhatsApp Business :

- Phone Number ID : 
- Access Token permanent : 
- Numéro WhatsApp Business : 

Merci !`;

  return (
    <div>
      <StepHeader
        icon={ClipboardList}
        title="Les 3 informations à nous transmettre"
        subtitle="Dernière ligne droite : envoyez-nous ces 3 éléments et nous branchons tout sur votre site."
        time="2 min"
      />
      <div className="space-y-3 mb-6">
        {rows.map((r, i) => (
          <div key={i} className="rounded-2xl border border-border/60 bg-card/50 p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-1">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                {i + 1}
              </span>
              <h3 className="font-semibold">{r.label}</h3>
            </div>
            <p className="text-sm text-muted-foreground sm:pl-9">{r.where}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-border/60 bg-muted/40 p-4 mb-6">
        <div className="flex items-center justify-between gap-3 mb-2">
          <h3 className="font-semibold text-sm">Modèle de message prêt à copier</h3>
          <Button
            size="sm"
            variant="outline"
            className="gap-2"
            onClick={() => {
              navigator.clipboard.writeText(template);
              toast.success("Modèle copié !");
            }}
          >
            <Copy className="h-3.5 w-3.5" /> Copier
          </Button>
        </div>
        <pre className="whitespace-pre-wrap text-xs text-muted-foreground leading-relaxed">
          {template}
        </pre>
      </div>

      <InfoBox variant="warning">
        Merci de nous transmettre ces informations par un <strong>canal sécurisé</strong> (appel,
        message privé), et si possible <strong>pas par email en clair</strong>. Nous les intégrons
        ensuite directement dans les réglages de votre site.
      </InfoBox>

      <NavButtons onNext={onNext} onPrev={onPrev} nextLabel="J'ai tout envoyé" />
    </div>
  );
}

function MerciStep() {
  return (
    <div className="text-center">
      <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500 mb-5">
        <PartyPopper className="h-8 w-8" />
      </div>
      <h1 className="text-3xl sm:text-4xl font-display font-bold tracking-tight mb-3">
        Bravo, tout est prêt !
      </h1>
      <p className="text-muted-foreground max-w-xl mx-auto mb-8">
        Dès réception de vos 3 informations, notre équipe connecte WhatsApp à votre site sous 24h
        ouvrées et effectue un test d'envoi avec vous.
      </p>
      <div className="grid sm:grid-cols-3 gap-3 text-left mb-8">
        {[
          { t: "Connexion", d: "Nous branchons l'API sur votre formulaire de contact" },
          { t: "Test", d: "Nous vous envoyons un message de test à valider" },
          { t: "En ligne", d: "Vos clients vous écrivent directement sur WhatsApp" },
        ].map((c, i) => (
          <div key={i} className="rounded-2xl border bg-card/50 p-5">
            <CheckCircle2 className="h-5 w-5 text-emerald-500 mb-2" />
            <h3 className="font-semibold text-sm">{c.t}</h3>
            <p className="text-xs text-muted-foreground mt-1">{c.d}</p>
          </div>
        ))}
      </div>
      <Button asChild size="lg" className="gap-2">
        <a href="mailto:contact@adamkom.com">
          <MessageCircle className="h-4 w-4" /> Nous contacter
        </a>
      </Button>
    </div>
  );
}
