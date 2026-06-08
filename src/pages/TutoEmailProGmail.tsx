import { useState, useMemo } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight, ArrowLeft, CheckCircle2, Sparkles, ShieldCheck,
  Mail, Settings2, Server, Send, Smartphone, HelpCircle, Inbox,
  ExternalLink, Copy, Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import logo from "@/assets/logo.webp";

type StepKey = "intro" | "open" | "add" | "imap" | "smtp" | "test" | "mobile";

const STEPS: { key: StepKey; label: string; time: string; icon: any }[] = [
  { key: "intro",  label: "Pourquoi connecter à Gmail",   time: "1 min", icon: Sparkles },
  { key: "open",   label: "Ouvrir les paramètres Gmail",  time: "1 min", icon: Settings2 },
  { key: "add",    label: "Ajouter votre email pro",      time: "2 min", icon: Mail },
  { key: "imap",   label: "Réception (IMAP)",             time: "2 min", icon: Inbox },
  { key: "smtp",   label: "Envoi (SMTP)",                 time: "2 min", icon: Send },
  { key: "test",   label: "Vérifier et tester",           time: "1 min", icon: CheckCircle2 },
  { key: "mobile", label: "Application mobile Gmail",     time: "1 min", icon: Smartphone },
];

// Hébergeur par défaut : LWS (mail.[votredomaine])
const LWS_DEFAULTS = {
  host: "LWS",
  imapServer: "mail.[votredomaine].xx",
  imapPort: "993",
  imapSecurity: "SSL/TLS",
  smtpServer: "mail.[votredomaine].xx",
  smtpPort: "465",
  smtpSecurity: "SSL/TLS",
  panel: "https://panel.lws.fr",
  note: "Chez LWS, les serveurs de mail sont sous la forme mail.votredomaine (ex : mail.monsite.fr). Aucun « app password » spécifique n'est requis : utilisez directement le mot de passe créé dans LWSPanel > Emails.",
};

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
        <p className="font-mono text-sm text-zinc-900 truncate">{value}</p>
      </div>
      <Button
        size="sm"
        variant="outline"
        className="flex-shrink-0"
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

export default function TutoEmailProGmail() {
  const [params] = useSearchParams();

  // Infos personnalisées passées par l'admin via ?config=... (texte libre)
  const customConfig = params.get("config") || "";
  // Pré-remplissage optionnel via URL (?email=...&domain=...)
  const presetEmail = params.get("email") || "";
  const presetDomain = params.get("domain") || "";

  const cfg = useMemo(() => {
    const d = presetDomain || "[votredomaine].xx";
    return {
      ...LWS_DEFAULTS,
      imapServer: `mail.${d}`,
      smtpServer: `mail.${d}`,
    };
  }, [presetDomain]);

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
            <Sparkles className="h-3 w-3 mr-1" /> Guide simple
          </Badge>
          <h1 className="text-3xl md:text-5xl font-bold text-zinc-900 leading-tight">
            Recevez vos emails pro <span className="bg-gradient-to-r from-[#ff006e] to-[#ff5c8a] bg-clip-text text-transparent">directement dans Gmail</span>
          </h1>
          <p className="mt-4 text-zinc-600">
            En 10 minutes, centralisez votre email professionnel (ex&nbsp;: contact@votresite.fr) dans
            votre compte Gmail habituel. Vous recevez et répondez depuis Gmail, sur votre ordinateur
            ET votre téléphone.
          </p>
        </div>
      </section>

      {/* Sécurité — bandeau toujours visible */}
      <section className="max-w-7xl mx-auto px-4 md:px-8 pb-6">
        <div className="rounded-2xl border-2 border-[#ff006e]/30 bg-gradient-to-r from-[#ff006e]/5 to-[#ff5c8a]/5 p-5 flex items-start gap-4">
          <div className="h-10 w-10 rounded-full bg-[#ff006e]/15 flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="h-5 w-5 text-[#ff006e]" />
          </div>
          <div>
            <p className="font-semibold text-zinc-900">🔐 Vos accès restent 100% privés</p>
            <p className="text-sm text-zinc-700 mt-1">
              Cette configuration est <strong>plus pratique et plus sécurisée quand c'est VOUS qui la faites</strong>.
              Chez <strong>Adamkom</strong>, nous <strong>n'avons jamais accès</strong> à votre compte Gmail ni
              à votre mot de passe email pro&nbsp;: nous ne le demandons jamais. Vos identifiants restent
              uniquement entre vos mains.
            </p>
          </div>
        </div>
      </section>

      {/* Infos de config personnalisées (envoyées par Adamkom dans l'email) */}
      {customConfig && (
        <section className="max-w-7xl mx-auto px-4 md:px-8 pb-6">
          <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-5">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-amber-700 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-900">📌 Informations de configuration pour votre compte</p>
                <pre className="mt-2 whitespace-pre-wrap font-mono text-sm text-amber-900">{customConfig}</pre>
              </div>
            </div>
          </div>
        </section>
      )}

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
                      subtitle="Gmail est l'interface email la plus utilisée au monde. La connecter à votre email pro vous évite de jongler entre plusieurs boîtes."
                    />
                    <div className="grid md:grid-cols-3 gap-3">
                      {[
                        { i: Smartphone, t: "Mobile & desktop", d: "Vos emails pro arrivent dans l'app Gmail de votre téléphone, automatiquement." },
                        { i: Inbox, t: "Une seule boîte", d: "Plus besoin d'aller sur le webmail LWS : tout est centralisé." },
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
                    <InfoBox variant="security">
                      🔐 <strong>Adamkom ne vous demandera jamais</strong> votre mot de passe Gmail ni votre mot de passe email pro.
                      C'est pour cette raison que <strong>c'est à vous de faire cette manipulation</strong> : vos accès restent privés.
                      Suivez simplement les étapes ci-dessous, ça prend 10 minutes.
                    </InfoBox>
                  </div>
                )}

                {current === "open" && (
                  <div className="space-y-5">
                    <StepHeader
                      time="1 min"
                      title="Ouvrir les paramètres de Gmail"
                      subtitle="Faites cette étape depuis un ordinateur (pas le téléphone) : c'est plus simple."
                    />
                    <NumberedList
                      items={[
                        { t: "Allez sur gmail.com", d: "Connectez-vous à votre compte Gmail habituel." },
                        { t: "Cliquez sur la roue dentée ⚙️", d: "En haut à droite, puis sur « Voir tous les paramètres »." },
                        { t: "Onglet « Comptes et importation »", d: "C'est là que tout se passe." },
                      ]}
                    />
                    <a
                      href="https://mail.google.com/mail/u/0/#settings/accounts"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button className="bg-gradient-to-r from-[#ff006e] to-[#ff5c8a] hover:opacity-90">
                        <ExternalLink className="h-4 w-4 mr-2" /> Ouvrir les paramètres Gmail
                      </Button>
                    </a>
                  </div>
                )}

                {current === "add" && (
                  <div className="space-y-5">
                    <StepHeader
                      time="2 min"
                      title="Ajouter votre email pro"
                      subtitle="Toujours dans l'onglet « Comptes et importation »."
                    />
                    <NumberedList
                      items={[
                        { t: "Section « Consulter d'autres comptes de messagerie »", d: "Cliquez sur « Ajouter un compte de messagerie »." },
                        { t: "Entrez votre adresse email pro", d: presetEmail ? `Ex : ${presetEmail}` : "Ex : contact@votresite.fr (l'adresse fournie par Adamkom)." },
                        { t: "Cochez « Importer les e-mails depuis mon autre compte (POP3) »", d: "⚠️ Si Gmail propose Gmailify, ignorez : utilisez POP3 (ou IMAP via l'option avancée si disponible)." },
                        { t: "Cliquez sur « Suivant »", d: "Gmail va vous demander les paramètres du serveur de réception." },
                      ]}
                    />
                  </div>
                )}

                {current === "imap" && (
                  <div className="space-y-5">
                    <StepHeader
                      time="2 min"
                      title="Paramètres de réception (IMAP / POP3)"
                      subtitle={`Hébergeur : ${cfg.host}. Voici les valeurs à copier dans le formulaire Gmail.`}
                    />
                    <div className="grid sm:grid-cols-2 gap-3">
                      <CopyRow label="Nom d'utilisateur" value={presetEmail || "contact@votresite.fr"} />
                      <CopyRow label="Mot de passe" value="(celui créé dans LWSPanel)" />
                      <CopyRow label="Serveur POP / IMAP" value={cfg.imapServer} />
                      <CopyRow label="Port" value={cfg.imapPort} />
                      <CopyRow label="Sécurité" value={cfg.imapSecurity} />
                    </div>
                    <InfoBox variant="tip">
                      ✅ Cochez <strong>« Utiliser toujours une connexion sécurisée (SSL) »</strong>.<br />
                      💡 Vous pouvez aussi cocher <strong>« Marquer les messages »</strong> avec un libellé (ex : « Pro ») pour les retrouver facilement dans Gmail.
                    </InfoBox>
                  </div>
                )}

                {current === "smtp" && (
                  <div className="space-y-5">
                    <StepHeader
                      time="2 min"
                      title="Paramètres d'envoi (SMTP)"
                      subtitle="Indispensable pour pouvoir RÉPONDRE depuis votre adresse pro."
                    />
                    <NumberedList
                      items={[
                        { t: "Gmail propose « Souhaitez-vous pouvoir envoyer des messages en tant que… ? »", d: "Cliquez « Oui »." },
                        { t: "Nom à afficher", d: "Ex : « Votre Société » — c'est ce que le destinataire verra." },
                        { t: "DÉCOCHEZ « Considérer comme un alias »", d: "Si vous voulez que vos réponses partent vraiment depuis l'adresse pro." },
                        { t: "Remplissez les paramètres SMTP ci-dessous", d: "Puis cliquez « Ajouter un compte »." },
                      ]}
                    />
                    <div className="grid sm:grid-cols-2 gap-3">
                      <CopyRow label="Serveur SMTP" value={cfg.smtpServer} />
                      <CopyRow label="Port" value={cfg.smtpPort} />
                      <CopyRow label="Nom d'utilisateur" value={presetEmail || "contact@votresite.fr"} />
                      <CopyRow label="Mot de passe" value="(idem réception)" />
                      <CopyRow label="Sécurité" value={cfg.smtpSecurity} />
                    </div>
                  </div>
                )}

                {current === "test" && (
                  <div className="space-y-5">
                    <StepHeader
                      time="1 min"
                      title="Vérifier et tester"
                      subtitle="Gmail envoie un code de vérification sur votre adresse pro."
                    />
                    <NumberedList
                      items={[
                        { t: "Allez voir le code", d: `Ouvrez votre webmail LWS (${cfg.panel}) ou attendez quelques secondes que le code arrive dans Gmail.` },
                        { t: "Copiez-collez le code dans Gmail", d: "Et validez. C'est fini côté configuration." },
                        { t: "Envoyez-vous un email test", d: "Depuis Gmail → écrivez à votre adresse pro, et inversement depuis le webmail vers Gmail." },
                        { t: "Choisissez l'adresse d'envoi par défaut", d: "Dans la fenêtre de composition, vous pouvez désormais choisir l'adresse expéditrice (Gmail ou pro)." },
                      ]}
                    />
                    <InfoBox variant="tip">
                      ✨ <strong>Astuce</strong> : dans « Comptes et importation » → « Répondre avec la même adresse que celle utilisée pour recevoir le message », ça évite les erreurs.
                    </InfoBox>
                  </div>
                )}

                {current === "mobile" && (
                  <div className="space-y-5">
                    <StepHeader
                      time="1 min"
                      title="Sur votre téléphone (app Gmail)"
                      subtitle="Bonne nouvelle : il n'y a rien à faire."
                    />
                    <InfoBox variant="tip">
                      📱 L'app Gmail (iOS / Android) <strong>synchronise automatiquement</strong> votre adresse pro dès la configuration côté ordinateur terminée.
                      Vous recevez les notifications, vous pouvez répondre en choisissant l'adresse expéditrice (icône en haut du brouillon).
                    </InfoBox>
                    <div className="rounded-xl border border-zinc-200 bg-white p-5">
                      <p className="font-semibold text-zinc-900 mb-2">🎉 C'est terminé !</p>
                      <p className="text-sm text-zinc-600">
                        Votre adresse pro est désormais branchée à Gmail. Tous les messages envoyés via le formulaire
                        de contact de votre site arrivent dans Gmail, et vous pouvez répondre directement.
                      </p>
                    </div>
                    <InfoBox variant="security">
                      🔐 Rappel sécurité : si vous avez besoin de réinitialiser le mot de passe email pro,
                      faites-le depuis <a href={cfg.panel} target="_blank" rel="noopener noreferrer" className="underline font-semibold">LWSPanel</a>.
                      <strong> Adamkom n'a pas accès à ce mot de passe</strong> et ne vous le demandera jamais.
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
                Contactez le support Adamkom via votre espace dédié. Nous vous guidons sans jamais demander vos mots de passe.
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
