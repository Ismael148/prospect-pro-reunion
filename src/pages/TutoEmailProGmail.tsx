import { useState, useMemo } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight, ArrowLeft, CheckCircle2, Sparkles, ShieldCheck,
  Mail, Settings2, Send, Smartphone, HelpCircle, Inbox,
  ExternalLink, Copy, Info, AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import logo from "@/assets/logo.webp";

type StepKey = "intro" | "creds" | "open" | "add" | "pop" | "smtp" | "test" | "mobile";

const STEPS: { key: StepKey; label: string; time: string; icon: any }[] = [
  { key: "intro",  label: "Pourquoi & comment ça marche",       time: "1 min", icon: Sparkles },
  { key: "creds",  label: "Vos identifiants",                   time: "1 min", icon: ShieldCheck },
  { key: "open",   label: "Ouvrir Gmail (ordinateur)",          time: "1 min", icon: Settings2 },
  { key: "add",    label: "Ajouter votre email pro",            time: "2 min", icon: Mail },
  { key: "pop",    label: "Réception (POP)",                    time: "2 min", icon: Inbox },
  { key: "smtp",   label: "Envoi (SMTP)",                       time: "2 min", icon: Send },
  { key: "test",   label: "Vérifier & tester",                  time: "1 min", icon: CheckCircle2 },
  { key: "mobile", label: "Sur votre téléphone",                time: "1 min", icon: Smartphone },
];

// Captures d'écran officielles Google (centre d'aide Gmail)
const GIF_CHECK_EMAIL =
  "https://storage.googleapis.com/support-kms-prod/fLy5R54whP2vhKzEIsJO8MhrJMktHrlqNKMs";
const GIF_CHANGE_SETTINGS =
  "https://storage.googleapis.com/support-kms-prod/ZpIfaXmkqQV4tt5bjGAh1TpIIp7TTTZSNmWK";

function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-white/40 bg-white/70 backdrop-blur-xl shadow-[0_10px_40px_-15px_rgba(255,0,110,0.15)] ${className}`}>
      {children}
    </div>
  );
}

function CopyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white px-3 py-2.5">
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wide text-zinc-500">{label}</p>
        <p className="font-mono text-sm text-zinc-900 truncate">{value || "—"}</p>
      </div>
      <Button
        size="sm"
        variant="outline"
        className="flex-shrink-0"
        disabled={!value}
        onClick={() => {
          navigator.clipboard.writeText(value);
          toast.success("Copié !");
        }}
      >
        <Copy className="h-3.5 w-3.5" />
      </Button>
    </div>
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

function NumberedList({ items }: { items: { t: string; d?: React.ReactNode }[] }) {
  return (
    <ol className="space-y-3">
      {items.map((s, i) => (
        <li key={i} className="flex gap-4">
          <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gradient-to-br from-[#ff006e] to-[#ff5c8a] text-white font-bold flex items-center justify-center text-sm">
            {i + 1}
          </div>
          <div>
            <p className="font-semibold text-zinc-900">{s.t}</p>
            {s.d && <div className="text-sm text-zinc-600 mt-0.5">{s.d}</div>}
          </div>
        </li>
      ))}
    </ol>
  );
}

function InfoBox({
  children,
  variant = "info",
}: {
  children: React.ReactNode;
  variant?: "info" | "warn" | "tip" | "security";
}) {
  const map = {
    info: "border-blue-300 bg-blue-50 text-blue-900",
    warn: "border-amber-300 bg-amber-50 text-amber-900",
    tip: "border-emerald-300 bg-emerald-50 text-emerald-900",
    security: "border-[#ff006e]/30 bg-[#ff006e]/5 text-zinc-900",
  };
  return <div className={`rounded-xl border-2 p-4 text-sm ${map[variant]}`}>{children}</div>;
}

function GoogleScreenshot({ src, alt, caption }: { src: string; alt: string; caption?: string }) {
  return (
    <figure className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
      <img src={src} alt={alt} className="w-full h-auto" loading="lazy" />
      {caption && (
        <figcaption className="px-4 py-2 text-xs text-zinc-500 border-t border-zinc-100 bg-zinc-50">
          📸 Capture officielle Google · {caption}
        </figcaption>
      )}
    </figure>
  );
}

export default function TutoEmailProGmail() {
  const [params] = useSearchParams();

  // Tous les champs sont pré-remplis par Adamkom via l'URL.
  const presetEmail = params.get("email") || "";
  const presetDomain =
    params.get("domain") ||
    (presetEmail.includes("@") ? presetEmail.split("@")[1] : "");
  const popServer = params.get("pop_server") || (presetDomain ? `mail.${presetDomain}` : "");
  const popPort = params.get("pop_port") || "995";
  const smtpServer = params.get("smtp_server") || (presetDomain ? `mail.${presetDomain}` : "");
  const smtpPort = params.get("smtp_port") || "465";
  const password = params.get("password") || "";
  const label = params.get("label") || "Pro";
  const customConfig = params.get("config") || "";

  const cfg = useMemo(
    () => ({
      email: presetEmail || "contact@votresite.fr",
      domain: presetDomain || "[votredomaine]",
      popServer,
      popPort,
      smtpServer,
      smtpPort,
      password,
      label,
    }),
    [presetEmail, presetDomain, popServer, popPort, smtpServer, smtpPort, password, label]
  );

  const [current, setCurrent] = useState<StepKey>("intro");
  const [completed, setCompleted] = useState<Set<StepKey>>(new Set());
  const idx = STEPS.findIndex((s) => s.key === current);

  const goNext = () => {
    setCompleted((p) => new Set(p).add(current));
    if (idx < STEPS.length - 1) setCurrent(STEPS[idx + 1].key);
  };
  const goPrev = () => {
    if (idx > 0) setCurrent(STEPS[idx - 1].key);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#fff8fb] via-[#ffeef5] to-[#fff8fb]">
      {/* Header */}
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-white/70 border-b border-white/40">
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img src={logo} alt="Adamkom" className="h-8 w-auto" />
            <span className="font-bold text-zinc-900 hidden sm:inline">Tutoriels Adamkom</span>
          </Link>
          <Badge className="bg-[#ff006e] text-white hover:bg-[#ff006e]">
            <Mail className="h-3 w-3 mr-1" /> Email Pro → Gmail
          </Badge>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 md:px-8 pt-10 pb-6">
        <div className="max-w-3xl">
          <Badge className="bg-[#ff006e]/10 text-[#ff006e] hover:bg-[#ff006e]/10 border-0 mb-4">
            <Sparkles className="h-3 w-3 mr-1" /> Guide officiel · mis à jour 2026
          </Badge>
          <h1 className="text-3xl md:text-5xl font-bold text-zinc-900 leading-tight">
            Recevez vos emails pro{" "}
            <span className="bg-gradient-to-r from-[#ff006e] to-[#ff5c8a] bg-clip-text text-transparent">
              directement dans Gmail
            </span>
          </h1>
          <p className="mt-4 text-zinc-600">
            En 10 minutes, on suit ensemble la <strong>procédure officielle Gmail</strong> pour brancher
            votre adresse pro (<span className="font-mono">{cfg.email}</span>) à votre compte Google
            habituel. Vous recevez et répondez depuis Gmail, sur ordinateur et téléphone.
          </p>
          <div className="mt-3 text-xs text-zinc-500">
            Source officielle :{" "}
            <a
              href="https://support.google.com/mail/answer/21289?hl=fr"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              support.google.com/mail/answer/21289
            </a>
          </div>
        </div>
      </section>

      {/* Sécurité */}
      <section className="max-w-7xl mx-auto px-4 md:px-8 pb-6">
        <div className="rounded-2xl border-2 border-[#ff006e]/30 bg-gradient-to-r from-[#ff006e]/5 to-[#ff5c8a]/5 p-5 flex items-start gap-4">
          <div className="h-10 w-10 rounded-full bg-[#ff006e]/15 flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="h-5 w-5 text-[#ff006e]" />
          </div>
          <div>
            <p className="font-semibold text-zinc-900">🔐 Vos accès restent 100% privés</p>
            <p className="text-sm text-zinc-700 mt-1">
              C'est <strong>plus pratique et plus sécurisé quand c'est VOUS qui le faites</strong>. Chez{" "}
              <strong>Adamkom</strong>, nous <strong>n'avons jamais accès</strong> à votre compte Gmail
              ni à votre mot de passe email pro&nbsp;: nous ne le demandons jamais.
            </p>
          </div>
        </div>
      </section>

      {/* Body */}
      <main className="max-w-7xl mx-auto px-4 md:px-8 pb-20 grid md:grid-cols-[280px_1fr] gap-6">
        {/* Stepper */}
        <aside className="md:sticky md:top-24 md:self-start">
          <GlassCard className="p-3">
            <nav className="space-y-1">
              {STEPS.map((s, i) => {
                const isActive = s.key === current;
                const isDone = completed.has(s.key);
                const Icon = s.icon;
                return (
                  <button
                    key={s.key}
                    onClick={() => setCurrent(s.key)}
                    className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all ${
                      isActive
                        ? "bg-gradient-to-r from-[#ff006e]/15 to-[#ff006e]/5 border border-[#ff006e]/30"
                        : "hover:bg-white/60 border border-transparent"
                    }`}
                  >
                    <div
                      className={`flex-shrink-0 h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold ${
                        isDone
                          ? "bg-emerald-500 text-white"
                          : isActive
                          ? "bg-[#ff006e] text-white"
                          : "bg-zinc-200 text-zinc-600"
                      }`}
                    >
                      {isDone ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-medium truncate ${isActive ? "text-zinc-900" : "text-zinc-700"}`}>
                        {s.label}
                      </p>
                      <p className="text-[11px] text-zinc-500">{s.time}</p>
                    </div>
                    <Icon className={`h-4 w-4 flex-shrink-0 ${isActive ? "text-[#ff006e]" : "text-zinc-400"}`} />
                  </button>
                );
              })}
            </nav>
          </GlassCard>
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
                {current === "intro" && (
                  <div className="space-y-5">
                    <StepHeader
                      time="1 min"
                      title="Pourquoi rapatrier vos emails pro dans Gmail ?"
                      subtitle="Gmail est l'interface email la plus utilisée au monde. On la connecte à votre adresse pro pour tout centraliser."
                    />
                    <div className="grid md:grid-cols-3 gap-3">
                      {[
                        { i: Smartphone, t: "Mobile & desktop", d: "Vos emails pro arrivent dans l'app Gmail de votre téléphone, automatiquement." },
                        { i: Inbox, t: "Une seule boîte", d: "Plus besoin d'aller sur votre webmail : tout est centralisé dans Gmail." },
                        { i: ShieldCheck, t: "Sécurité Google", d: "Filtres anti-spam, double authentification, recherche puissante." },
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
                    <InfoBox variant="info">
                      ℹ️ <strong>Méthode utilisée</strong> : « ajouter un compte de messagerie » via{" "}
                      <strong>POP</strong>. C'est la procédure officielle Gmail (la même que pour Yahoo,
                      iCloud, etc.).
                    </InfoBox>
                    <InfoBox variant="security">
                      🔐 <strong>Adamkom ne vous demandera jamais</strong> votre mot de passe Gmail ni votre
                      mot de passe email pro. Suivez les étapes : ça prend 10 minutes.
                    </InfoBox>
                  </div>
                )}

                {current === "creds" && (
                  <div className="space-y-5">
                    <StepHeader
                      time="1 min"
                      title="Vos identifiants (préparés par Adamkom)"
                      subtitle="Gardez cette page ouverte : vous allez recopier ces valeurs dans Gmail."
                    />
                    <div className="grid sm:grid-cols-2 gap-3">
                      <CopyRow label="Email pro" value={cfg.email} />
                      <CopyRow label="Mot de passe" value={cfg.password || "(celui de votre webmail)"} />
                      <CopyRow label="Serveur POP (réception)" value={cfg.popServer} />
                      <CopyRow label="Port POP" value={`${cfg.popPort} (SSL)`} />
                      <CopyRow label="Serveur SMTP (envoi)" value={cfg.smtpServer} />
                      <CopyRow label="Port SMTP" value={`${cfg.smtpPort} (SSL)`} />
                      <CopyRow label="Libellé Gmail recommandé" value={cfg.label} />
                    </div>
                    {customConfig && (
                      <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-4">
                        <div className="flex items-start gap-3">
                          <Info className="h-5 w-5 text-amber-700 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="font-semibold text-amber-900">📌 Notes complémentaires :</p>
                            <pre className="mt-2 whitespace-pre-wrap font-mono text-sm text-amber-900">
                              {customConfig}
                            </pre>
                          </div>
                        </div>
                      </div>
                    )}
                    {!cfg.password && (
                      <InfoBox variant="warn">
                        <AlertTriangle className="inline h-4 w-4 mr-1" />
                        Le mot de passe n'apparaît pas ici&nbsp;: c'est <strong>celui que vous utilisez pour
                        vous connecter à votre webmail pro</strong> (celui qu'Adamkom vous a transmis dans un
                        email précédent ou que vous avez choisi vous-même).
                      </InfoBox>
                    )}
                  </div>
                )}

                {current === "open" && (
                  <div className="space-y-5">
                    <StepHeader
                      time="1 min"
                      title="Ouvrir Gmail sur un ordinateur"
                      subtitle="Important : cette manipulation se fait depuis un ordinateur (pas le téléphone). Une fois finie, le téléphone se synchronise tout seul."
                    />
                    <NumberedList
                      items={[
                        { t: "Allez sur gmail.com", d: "Connectez-vous au compte Gmail où vous voulez recevoir vos emails pro." },
                        { t: "Cliquez sur la roue dentée ⚙️", d: "En haut à droite de Gmail." },
                        { t: "Cliquez sur « Afficher tous les paramètres »", d: "C'est le bouton en haut du petit menu qui s'ouvre." },
                        { t: "Onglet « Comptes et importation »", d: "Ou « Comptes » selon la version. C'est là que tout se passe." },
                      ]}
                    />
                    <GoogleScreenshot
                      src={GIF_CHANGE_SETTINGS}
                      alt="Capture Gmail — Comptes et importation"
                      caption="Onglet « Comptes et importation »"
                    />
                    <a
                      href="https://mail.google.com/mail/u/0/#settings/accounts"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button className="bg-gradient-to-r from-[#ff006e] to-[#ff5c8a] hover:opacity-90">
                        <ExternalLink className="h-4 w-4 mr-2" /> Ouvrir cette page Gmail
                      </Button>
                    </a>
                  </div>
                )}

                {current === "add" && (
                  <div className="space-y-5">
                    <StepHeader
                      time="2 min"
                      title="Ajouter votre email pro"
                      subtitle="On suit la procédure officielle Gmail : Comptes et importation → Consulter d'autres comptes de messagerie."
                    />
                    <NumberedList
                      items={[
                        {
                          t: "Section « Consulter d'autres comptes de messagerie »",
                          d: "Cliquez sur « Ajouter un compte de messagerie ».",
                        },
                        {
                          t: "Saisissez l'adresse email pro",
                          d: <span>Tapez : <span className="font-mono bg-zinc-100 px-1.5 py-0.5 rounded">{cfg.email}</span>, puis cliquez sur <strong>Suivant</strong>.</span>,
                        },
                        {
                          t: "Si Gmail propose « Gmailify », IGNOREZ",
                          d: <span>Choisissez <strong>« Importer les e-mails depuis mon autre compte (POP3) »</strong>, puis <strong>Suivant</strong>.</span>,
                        },
                      ]}
                    />
                    <GoogleScreenshot
                      src={GIF_CHECK_EMAIL}
                      alt="Capture Gmail — Consulter un autre compte"
                      caption="Consulter d'autres comptes de messagerie"
                    />
                    <InfoBox variant="warn">
                      ⚠️ <strong>Note Google</strong> : Gmailify et l'accès POP évoluent. Si Gmail vous dit
                      que POP est désactivé, suivez les étapes affichées à l'écran ou contactez Adamkom — on
                      vous dépanne.
                    </InfoBox>
                  </div>
                )}

                {current === "pop" && (
                  <div className="space-y-5">
                    <StepHeader
                      time="2 min"
                      title="Paramètres de réception (POP)"
                      subtitle="C'est ici que vous collez les valeurs que nous vous avons préparées."
                    />
                    <div className="grid sm:grid-cols-2 gap-3">
                      <CopyRow label="Nom d'utilisateur" value={cfg.email} />
                      <CopyRow label="Mot de passe" value={cfg.password || "(celui de votre webmail)"} />
                      <CopyRow label="Serveur POP" value={cfg.popServer} />
                      <CopyRow label="Port" value={cfg.popPort} />
                    </div>
                    <InfoBox variant="tip">
                      ✅ <strong>Cases à cocher recommandées par Google</strong> :
                      <ul className="mt-2 ml-5 list-disc space-y-1">
                        <li>« Conserver une copie du message récupéré sur le serveur »</li>
                        <li>« Toujours utiliser une connexion sécurisée (SSL) lors de la récupération des e-mails »</li>
                        <li>« Ajouter un libellé aux messages entrants » → choisissez <span className="font-mono bg-white px-1.5 py-0.5 rounded border">{cfg.label}</span></li>
                      </ul>
                    </InfoBox>
                    <InfoBox variant="warn">
                      Si Gmail affiche <strong>« Le serveur a refusé l'accès POP3 »</strong>, vérifiez le
                      serveur ({cfg.popServer}) et le port ({cfg.popPort}). En dernier recours, certains
                      hébergeurs demandent un <strong>mot de passe d'application</strong> — contactez
                      Adamkom, on vous guide.
                    </InfoBox>
                    <p className="text-sm text-zinc-600">
                      Une fois validé, cliquez sur <strong>« Ajouter un compte »</strong>.
                    </p>
                  </div>
                )}

                {current === "smtp" && (
                  <div className="space-y-5">
                    <StepHeader
                      time="2 min"
                      title="Paramètres d'envoi (SMTP)"
                      subtitle="Indispensable pour pouvoir RÉPONDRE depuis votre adresse pro (et pas votre Gmail personnel)."
                    />
                    <NumberedList
                      items={[
                        { t: "Gmail demande : « Souhaitez-vous pouvoir envoyer des messages en tant que… ? »", d: "Cliquez sur Oui, puis Suivant." },
                        { t: "Nom à afficher", d: "Ex : « Votre Société » — c'est ce que le destinataire verra." },
                        { t: "DÉCOCHEZ « Considérer comme un alias »", d: "Si vous voulez que vos réponses partent vraiment depuis l'adresse pro." },
                        { t: "Remplissez les paramètres SMTP ci-dessous", d: "Puis cliquez « Ajouter un compte »." },
                      ]}
                    />
                    <div className="grid sm:grid-cols-2 gap-3">
                      <CopyRow label="Serveur SMTP" value={cfg.smtpServer} />
                      <CopyRow label="Port" value={cfg.smtpPort} />
                      <CopyRow label="Nom d'utilisateur" value={cfg.email} />
                      <CopyRow label="Mot de passe" value={cfg.password || "(idem réception)"} />
                      <CopyRow label="Sécurité" value="SSL/TLS" />
                    </div>
                  </div>
                )}

                {current === "test" && (
                  <div className="space-y-5">
                    <StepHeader
                      time="1 min"
                      title="Vérifier & tester"
                      subtitle="Gmail envoie un code de vérification sur votre adresse pro pour confirmer que c'est bien vous."
                    />
                    <NumberedList
                      items={[
                        { t: "Allez chercher le code", d: <span>Ouvrez votre <strong>webmail pro</strong> habituel (ou attendez quelques secondes que le code arrive aussi dans Gmail).</span> },
                        { t: "Copiez-collez le code dans Gmail", d: "Et validez. C'est terminé côté configuration." },
                        { t: "Envoyez-vous un email test", d: "Depuis Gmail → écrivez à votre adresse pro, et inversement depuis le webmail vers Gmail." },
                        { t: "Choisissez l'adresse d'envoi par défaut", d: "Dans la fenêtre de composition, vous pouvez désormais choisir l'adresse expéditrice (Gmail ou pro)." },
                      ]}
                    />
                    <InfoBox variant="tip">
                      ✨ <strong>Astuce Google officielle</strong> : dans « Comptes et importation » →
                      activez <strong>« Répondre avec la même adresse que celle utilisée pour recevoir le
                      message »</strong>. Ça évite les erreurs.
                    </InfoBox>
                  </div>
                )}

                {current === "mobile" && (
                  <div className="space-y-5">
                    <StepHeader
                      time="1 min"
                      title="Sur votre téléphone (app Gmail)"
                      subtitle="Bonne nouvelle : il n'y a rien à refaire."
                    />
                    <InfoBox variant="tip">
                      📱 L'app Gmail (iOS / Android) <strong>synchronise automatiquement</strong> votre
                      adresse pro dès que la configuration côté ordinateur est terminée. Vous recevez les
                      notifications, vous pouvez répondre en choisissant l'adresse expéditrice (icône en
                      haut du brouillon).
                    </InfoBox>
                    <div className="rounded-xl border border-zinc-200 bg-white p-5">
                      <p className="font-semibold text-zinc-900 mb-2">🎉 C'est terminé !</p>
                      <p className="text-sm text-zinc-600">
                        Votre adresse pro est désormais branchée à Gmail. Tous les messages envoyés via le
                        formulaire de contact de votre site arrivent dans Gmail, et vous pouvez répondre
                        directement depuis votre adresse pro.
                      </p>
                    </div>
                    <InfoBox variant="security">
                      🔐 Rappel sécurité : si vous devez réinitialiser le mot de passe email pro, faites-le
                      depuis votre interface d'hébergement. <strong>Adamkom n'a pas accès à ce mot de passe</strong>
                      {" "}et ne vous le demandera jamais.
                    </InfoBox>
                  </div>
                )}
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
                <Button onClick={goNext} className="bg-gradient-to-r from-[#ff006e] to-[#ff5c8a] hover:opacity-90">
                  C'est fait <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button
                  onClick={() => setCompleted((p) => new Set(p).add(current))}
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
              <p className="font-semibold text-zinc-900">Bloqué quelque part ?</p>
              <p className="text-sm text-zinc-600">
                Contactez le support Adamkom via votre espace dédié. Nous vous guidons sans jamais demander
                vos mots de passe.
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
