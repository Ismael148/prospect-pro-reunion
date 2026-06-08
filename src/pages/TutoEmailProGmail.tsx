import { useState, useMemo, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight, ArrowLeft, CheckCircle2, Sparkles, ShieldCheck,
  Mail, Settings2, Send, HelpCircle, ExternalLink, Copy,
  Info, ListChecks,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import logo from "@/assets/logo.webp";

/**
 * Tuto Email Pro → Gmail
 * Suit À LA LETTRE la procédure officielle Gmail :
 * https://support.google.com/mail/answer/21289?hl=fr
 *
 * Objectif client (très simple) :
 *  1) Recevoir les mails de l'adresse pro dans Gmail
 *  2) Pouvoir répondre/envoyer depuis l'adresse pro via Gmail
 */

type StepKey = "creds" | "receive" | "send" | "test" | "done";

const STEPS: { key: StepKey; label: string; time: string; icon: any }[] = [
  { key: "creds",   label: "1. Vos identifiants",         time: "1 min", icon: ShieldCheck },
  { key: "receive", label: "2. Recevoir dans Gmail",      time: "3 min", icon: Mail },
  { key: "send",    label: "3. Envoyer depuis Gmail",     time: "3 min", icon: Send },
  { key: "test",    label: "4. Tester",                   time: "1 min", icon: CheckCircle2 },
  { key: "done",    label: "5. Terminé",                  time: "30 s",  icon: ListChecks },
];

// Captures officielles Google (centre d'aide Gmail)
const GIF_OPEN_SETTINGS =
  "https://storage.googleapis.com/support-kms-prod/ZpIfaXmkqQV4tt5bjGAh1TpIIp7TTTZSNmWK";
const GIF_ADD_ACCOUNT =
  "https://storage.googleapis.com/support-kms-prod/fLy5R54whP2vhKzEIsJO8MhrJMktHrlqNKMs";

const STEP_TASKS: Record<StepKey, string[]> = {
  creds: ["J'ai mes identifiants sous les yeux"],
  receive: [
    "J'ai ouvert Gmail → ⚙️ → Voir tous les paramètres",
    "Onglet « Comptes et importation »",
    "J'ai cliqué « Ajouter un compte de messagerie »",
    "J'ai saisi mon adresse email pro et choisi POP3",
    "J'ai rempli serveur POP, port, identifiant, mot de passe",
    "J'ai coché SSL + « Ajouter un libellé »",
    "Gmail a accepté → mes emails pro arrivent",
  ],
  send: [
    "J'ai répondu OUI à « envoyer des messages en tant que… »",
    "J'ai DÉCOCHÉ « Considérer comme un alias »",
    "J'ai saisi serveur SMTP, port, identifiant, mot de passe",
    "J'ai reçu le code de vérification et l'ai validé",
  ],
  test: [
    "Je me suis envoyé un email test (je l'ai bien reçu dans Gmail)",
    "J'ai envoyé un email DEPUIS l'adresse pro (réception OK)",
  ],
  done: ["Tout fonctionne — je marque comme terminé"],
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
        <p className="font-mono text-sm text-zinc-900 truncate">{value || "—"}</p>
      </div>
      <Button
        size="sm"
        variant="outline"
        className="flex-shrink-0"
        disabled={!value}
        onClick={() => { navigator.clipboard.writeText(value); toast.success("Copié !"); }}
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
  children, variant = "info",
}: { children: React.ReactNode; variant?: "info" | "warn" | "tip" | "security" }) {
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

function StepChecklist({
  step, checked, onToggle,
}: { step: StepKey; checked: Set<string>; onToggle: (task: string) => void }) {
  const tasks = STEP_TASKS[step] || [];
  if (!tasks.length) return null;
  const done = tasks.filter((t) => checked.has(t)).length;
  return (
    <div className="rounded-xl border-2 border-[#ff006e]/20 bg-gradient-to-br from-[#ff006e]/5 to-transparent p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="font-semibold text-zinc-900 flex items-center gap-2">
          <ListChecks className="h-4 w-4 text-[#ff006e]" /> Cochez quand c'est fait
        </p>
        <Badge variant="outline" className="text-xs">{done} / {tasks.length}</Badge>
      </div>
      <div className="space-y-2">
        {tasks.map((t) => {
          const id = `chk-${step}-${t}`;
          const isChecked = checked.has(t);
          return (
            <label
              key={t}
              htmlFor={id}
              className={`flex items-start gap-3 rounded-lg border p-2.5 cursor-pointer transition ${
                isChecked ? "border-emerald-300 bg-emerald-50" : "border-zinc-200 bg-white hover:bg-zinc-50"
              }`}
            >
              <Checkbox id={id} checked={isChecked} onCheckedChange={() => onToggle(t)} className="mt-0.5" />
              <span className={`text-sm ${isChecked ? "text-emerald-900 line-through" : "text-zinc-800"}`}>{t}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

export default function TutoEmailProGmail() {
  const [params] = useSearchParams();

  const presetEmail = params.get("email") || "";
  const presetDomain =
    params.get("domain") || (presetEmail.includes("@") ? presetEmail.split("@")[1] : "");
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
      popServer, popPort, smtpServer, smtpPort, password, label,
    }),
    [presetEmail, presetDomain, popServer, popPort, smtpServer, smtpPort, password, label]
  );

  // Stockage local par adresse email
  const storageKey = `tuto-email-gmail:${cfg.email}`;
  type Saved = { checks: Record<StepKey, string[]>; doneAt: string | null };
  const [state, setState] = useState<Saved>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) return JSON.parse(raw);
    } catch {}
    return { checks: {} as any, doneAt: null };
  });
  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch {}
  }, [storageKey, state]);

  const checksFor = (step: StepKey): Set<string> => new Set(state.checks[step] || []);
  const toggleTask = (step: StepKey, task: string) => {
    setState((s) => {
      const cur = new Set(s.checks[step] || []);
      cur.has(task) ? cur.delete(task) : cur.add(task);
      return { ...s, checks: { ...s.checks, [step]: Array.from(cur) } };
    });
  };

  // Progression globale
  const totalTasks = Object.values(STEP_TASKS).reduce((a, b) => a + b.length, 0);
  const doneTasks = (Object.keys(STEP_TASKS) as StepKey[]).reduce(
    (a, k) => a + (state.checks[k]?.length || 0), 0
  );
  const progressPct = Math.round((doneTasks / totalTasks) * 100);

  const [current, setCurrent] = useState<StepKey>("creds");
  const idx = STEPS.findIndex((s) => s.key === current);
  const isStepDone = (key: StepKey) => {
    const tasks = STEP_TASKS[key] || [];
    return tasks.length > 0 && tasks.every((t) => state.checks[key]?.includes(t));
  };

  const goNext = () => { if (idx < STEPS.length - 1) setCurrent(STEPS[idx + 1].key); };
  const goPrev = () => { if (idx > 0) setCurrent(STEPS[idx - 1].key); };

  const markDone = () => {
    setState((s) => ({ ...s, doneAt: new Date().toISOString() }));
    toast.success("Configuration marquée comme terminée 🎉");
  };
  const resetDone = () => {
    setState((s) => ({ ...s, doneAt: null }));
    toast("Statut réinitialisé");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#fff8fb] via-[#ffeef5] to-[#fff8fb]">
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-white/70 border-b border-white/40">
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img src={logo} alt="Adamkom" className="h-8 w-auto" />
            <span className="font-bold text-zinc-900 hidden sm:inline">Tutoriels Adamkom</span>
          </Link>
          <div className="flex items-center gap-2">
            {state.doneAt && (
              <Badge className="bg-emerald-500 text-white hover:bg-emerald-500">
                <CheckCircle2 className="h-3 w-3 mr-1" /> Terminé
              </Badge>
            )}
            <Badge className="bg-[#ff006e] text-white hover:bg-[#ff006e]">
              <Mail className="h-3 w-3 mr-1" /> Email Pro → Gmail
            </Badge>
          </div>
        </div>
      </header>

      <section className="max-w-7xl mx-auto px-4 md:px-8 pt-10 pb-6">
        <div className="max-w-3xl">
          <Badge className="bg-[#ff006e]/10 text-[#ff006e] hover:bg-[#ff006e]/10 border-0 mb-4">
            <Sparkles className="h-3 w-3 mr-1" /> Procédure officielle Google
          </Badge>
          <h1 className="text-3xl md:text-5xl font-bold text-zinc-900 leading-tight">
            Recevez & envoyez vos emails pro{" "}
            <span className="bg-gradient-to-r from-[#ff006e] to-[#ff5c8a] bg-clip-text text-transparent">
              depuis votre Gmail
            </span>
          </h1>
          <p className="mt-4 text-zinc-600">
            On suit <strong>à la lettre</strong> la procédure officielle Gmail (
            <a className="underline" href="https://support.google.com/mail/answer/21289?hl=fr" target="_blank" rel="noopener noreferrer">
              support.google.com/mail/answer/21289
            </a>). En <strong>moins de 10 minutes</strong>, votre adresse pro
            (<span className="font-mono">{cfg.email}</span>) sera branchée à votre Gmail :
            vous <strong>recevez</strong> ET vous <strong>envoyez</strong> depuis Gmail.
          </p>
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-zinc-600 mb-1">
              <span>Progression : <strong>{doneTasks} / {totalTasks}</strong> tâches</span>
              <span>{progressPct}%</span>
            </div>
            <Progress value={progressPct} className="h-2" />
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 md:px-8 pb-6">
        <div className="rounded-2xl border-2 border-[#ff006e]/30 bg-gradient-to-r from-[#ff006e]/5 to-[#ff5c8a]/5 p-5 flex items-start gap-4">
          <div className="h-10 w-10 rounded-full bg-[#ff006e]/15 flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="h-5 w-5 text-[#ff006e]" />
          </div>
          <div>
            <p className="font-semibold text-zinc-900">🔐 100% privé — vous gardez le contrôle</p>
            <p className="text-sm text-zinc-700 mt-1">
              Cette configuration se fait <strong>côté Gmail uniquement</strong>. Chez{" "}
              <strong>Adamkom</strong>, nous <strong>ne demandons jamais</strong> les accès à votre compte
              Gmail ni à votre webmail pro — c'est plus pratique et plus sécurisé que ce soit vous qui le fassiez.
            </p>
          </div>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 md:px-8 pb-20 grid md:grid-cols-[280px_1fr] gap-6">
        <aside className="md:sticky md:top-24 md:self-start">
          <GlassCard className="p-3">
            <nav className="space-y-1">
              {STEPS.map((s, i) => {
                const isActive = s.key === current;
                const isDone = isStepDone(s.key);
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
                        isDone ? "bg-emerald-500 text-white"
                          : isActive ? "bg-[#ff006e] text-white"
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

        <div className="min-w-0">
          <GlassCard className="p-6 md:p-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={current}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-5"
              >
                {/* ────────── ÉTAPE 1 : Identifiants ────────── */}
                {current === "creds" && (
                  <>
                    <StepHeader
                      time="1 min"
                      title="Étape 1 — Vos identifiants"
                      subtitle="Gardez cette page ouverte. Vous allez recopier ces infos dans Gmail."
                    />
                    <div className="grid sm:grid-cols-2 gap-3">
                      <CopyRow label="Email pro" value={cfg.email} />
                      <CopyRow label="Mot de passe" value={cfg.password || "(celui de votre webmail)"} />
                      <CopyRow label="Serveur de réception (POP)" value={cfg.popServer} />
                      <CopyRow label="Port POP" value={`${cfg.popPort} (SSL)`} />
                      <CopyRow label="Serveur d'envoi (SMTP)" value={cfg.smtpServer} />
                      <CopyRow label="Port SMTP" value={`${cfg.smtpPort} (SSL)`} />
                      <CopyRow label="Libellé Gmail" value={cfg.label} />
                    </div>
                    {customConfig && (
                      <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-4">
                        <div className="flex items-start gap-3">
                          <Info className="h-5 w-5 text-amber-700 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="font-semibold text-amber-900">📌 Notes supplémentaires :</p>
                            <pre className="mt-2 whitespace-pre-wrap font-mono text-sm text-amber-900">
                              {customConfig}
                            </pre>
                          </div>
                        </div>
                      </div>
                    )}
                    <InfoBox variant="tip">
                      ✅ Tout est prêt ? Cliquez sur <strong>Suivant</strong> pour passer à Gmail.
                    </InfoBox>
                  </>
                )}

                {/* ────────── ÉTAPE 2 : RECEVOIR (POP) ────────── */}
                {current === "receive" && (
                  <>
                    <StepHeader
                      time="3 min"
                      title="Étape 2 — Recevoir vos emails pro dans Gmail"
                      subtitle="Source : centre d'aide Gmail — « Ajouter un autre compte de messagerie sur votre ordinateur »."
                    />
                    <InfoBox variant="info">
                      ℹ️ <strong>Important :</strong> faites cette étape <strong>depuis un ordinateur</strong>.
                      L'application Gmail sur téléphone se synchronisera toute seule ensuite.
                    </InfoBox>

                    <NumberedList
                      items={[
                        { t: "Connectez-vous à Gmail", d: <span>Sur ordinateur, ouvrez <a className="underline" href="https://mail.google.com" target="_blank" rel="noopener noreferrer">mail.google.com</a> avec votre Gmail habituel.</span> },
                        { t: "Ouvrez les Paramètres", d: <span>En haut à droite, cliquez sur la roue dentée ⚙️ → <strong>« Voir tous les paramètres »</strong>.</span> },
                        { t: "Onglet « Comptes et importation »", d: "C'est le 4ᵉ ou 5ᵉ onglet en haut de la page." },
                        { t: "Section « Consulter d'autres comptes de messagerie »", d: <span>Cliquez sur <strong>« Ajouter un compte de messagerie »</strong>.</span> },
                        { t: "Saisissez votre adresse email pro", d: <span>Tapez <span className="font-mono bg-zinc-100 px-1.5 py-0.5 rounded">{cfg.email}</span> puis <strong>Suivant</strong>.</span> },
                        { t: "Choisissez POP3", d: <span>Sélectionnez <strong>« Importer les e-mails depuis mon autre compte (POP3) »</strong> puis <strong>Suivant</strong>.</span> },
                        { t: "Remplissez le formulaire POP", d: (
                          <div className="mt-2 space-y-1.5">
                            <div>• <strong>Nom d'utilisateur</strong> : <span className="font-mono bg-zinc-100 px-1.5 py-0.5 rounded">{cfg.email}</span></div>
                            <div>• <strong>Mot de passe</strong> : <span className="font-mono bg-zinc-100 px-1.5 py-0.5 rounded">{cfg.password || "(celui de votre webmail)"}</span></div>
                            <div>• <strong>Serveur POP</strong> : <span className="font-mono bg-zinc-100 px-1.5 py-0.5 rounded">{cfg.popServer}</span></div>
                            <div>• <strong>Port</strong> : <span className="font-mono bg-zinc-100 px-1.5 py-0.5 rounded">{cfg.popPort}</span></div>
                          </div>
                        ) },
                        { t: "Cases à cocher recommandées (par Google)", d: (
                          <ul className="mt-1 ml-4 list-disc space-y-0.5">
                            <li>« Toujours utiliser une connexion sécurisée (<strong>SSL</strong>) »</li>
                            <li>« <strong>Ajouter un libellé</strong> aux messages entrants » → <span className="font-mono">{cfg.label}</span></li>
                          </ul>
                        ) },
                        { t: "Cliquez sur « Ajouter un compte »", d: "Gmail va tester la connexion. Si tout est vert, c'est bon ✅." },
                      ]}
                    />

                    <GoogleScreenshot src={GIF_OPEN_SETTINGS} alt="Ouvrir les paramètres Gmail" caption="Paramètres → Voir tous les paramètres → Comptes et importation" />
                    <GoogleScreenshot src={GIF_ADD_ACCOUNT} alt="Ajouter un compte de messagerie dans Gmail" caption="Ajouter un compte de messagerie" />

                    <a href="https://mail.google.com/mail/u/0/#settings/accounts" target="_blank" rel="noopener noreferrer">
                      <Button className="bg-gradient-to-r from-[#ff006e] to-[#ff5c8a] hover:opacity-90">
                        <ExternalLink className="h-4 w-4 mr-2" /> Ouvrir Gmail → Comptes et importation
                      </Button>
                    </a>

                    <InfoBox variant="warn">
                      ⚠️ Si Gmail affiche <strong>« Le serveur a refusé l'accès POP3 »</strong> :
                      vérifiez le serveur (<span className="font-mono">{cfg.popServer}</span>) et le port
                      (<span className="font-mono">{cfg.popPort}</span>). Si le problème persiste, contactez Adamkom.
                    </InfoBox>
                  </>
                )}

                {/* ────────── ÉTAPE 3 : ENVOYER (SMTP) ────────── */}
                {current === "send" && (
                  <>
                    <StepHeader
                      time="3 min"
                      title="Étape 3 — Envoyer DEPUIS votre adresse pro"
                      subtitle="Juste après l'étape 2, Gmail vous propose automatiquement cette étape. C'est ce qui vous permet de RÉPONDRE depuis l'adresse pro (et pas depuis votre Gmail perso)."
                    />
                    <NumberedList
                      items={[
                        { t: "« Souhaitez-vous pouvoir envoyer des messages en tant que… ? »", d: <span>Cliquez sur <strong>OUI</strong>, puis <strong>Suivant</strong>.</span> },
                        { t: "Nom à afficher", d: "C'est ce que verront vos destinataires (ex : votre prénom ou le nom de votre entreprise)." },
                        { t: "DÉCOCHEZ « Considérer comme un alias »", d: "Pour que les réponses partent bien depuis l'adresse pro." },
                        { t: "Remplissez le formulaire SMTP", d: (
                          <div className="mt-2 space-y-1.5">
                            <div>• <strong>Serveur SMTP</strong> : <span className="font-mono bg-zinc-100 px-1.5 py-0.5 rounded">{cfg.smtpServer}</span></div>
                            <div>• <strong>Port</strong> : <span className="font-mono bg-zinc-100 px-1.5 py-0.5 rounded">{cfg.smtpPort}</span></div>
                            <div>• <strong>Nom d'utilisateur</strong> : <span className="font-mono bg-zinc-100 px-1.5 py-0.5 rounded">{cfg.email}</span></div>
                            <div>• <strong>Mot de passe</strong> : <span className="font-mono bg-zinc-100 px-1.5 py-0.5 rounded">{cfg.password || "(le même qu'à l'étape 2)"}</span></div>
                            <div>• <strong>Sécurité</strong> : <span className="font-mono bg-zinc-100 px-1.5 py-0.5 rounded">SSL</span></div>
                          </div>
                        ) },
                        { t: "Cliquez sur « Ajouter un compte »", d: "Gmail envoie un code de vérification sur votre adresse pro." },
                        { t: "Récupérez le code", d: <span>Ouvrez votre <strong>webmail habituel</strong>, copiez le code reçu, et collez-le dans Gmail. Validez ✅.</span> },
                      ]}
                    />

                    <InfoBox variant="tip">
                      ✨ <strong>Astuce :</strong> dans Gmail → ⚙️ → Comptes et importation, activez
                      <strong> « Répondre avec la même adresse que celle utilisée pour recevoir le message »</strong>.
                      Comme ça, quand un client écrit à votre adresse pro, votre réponse partira bien depuis l'adresse pro.
                    </InfoBox>
                  </>
                )}

                {/* ────────── ÉTAPE 4 : TESTER ────────── */}
                {current === "test" && (
                  <>
                    <StepHeader
                      time="1 min"
                      title="Étape 4 — Vérifier que tout fonctionne"
                      subtitle="On fait deux tests simples pour s'assurer que la réception ET l'envoi marchent."
                    />
                    <NumberedList
                      items={[
                        { t: "Test RÉCEPTION", d: <span>Depuis votre téléphone (ou un autre compte), envoyez un email à <span className="font-mono">{cfg.email}</span>. Il doit apparaître dans Gmail (avec le libellé <strong>{cfg.label}</strong>) au bout de quelques minutes.</span> },
                        { t: "Test ENVOI", d: <span>Dans Gmail, cliquez sur <strong>« Nouveau message »</strong>. Dans le champ <strong>« De »</strong>, choisissez votre adresse pro <span className="font-mono">{cfg.email}</span>. Envoyez-vous un email à vous-même et vérifiez que vous le recevez bien.</span> },
                        { t: "Sur mobile", d: "Ouvrez l'app Gmail sur votre téléphone : vos emails pro arrivent automatiquement, rien à configurer." },
                      ]}
                    />
                    <InfoBox variant="info">
                      ⏱️ Gmail vérifie votre boîte pro toutes les quelques minutes. Si un email tarde, ouvrez Gmail → ⚙️ → Comptes et importation → <strong>« Vérifier les e-mails maintenant »</strong>.
                    </InfoBox>
                  </>
                )}

                {/* ────────── ÉTAPE 5 : TERMINÉ ────────── */}
                {current === "done" && (
                  <>
                    <StepHeader
                      time="30 s"
                      title="🎉 Terminé !"
                      subtitle="Réception + envoi fonctionnent ? Marquez la configuration comme terminée."
                    />
                    {state.doneAt ? (
                      <div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-5 text-emerald-900">
                        <p className="font-bold text-lg flex items-center gap-2">
                          <CheckCircle2 className="h-5 w-5" /> Configuration terminée !
                        </p>
                        <p className="text-sm mt-1">
                          Marquée le {new Date(state.doneAt).toLocaleString("fr-FR")}.
                        </p>
                        <Button variant="outline" size="sm" className="mt-3" onClick={resetDone}>
                          Réinitialiser
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="lg"
                        onClick={markDone}
                        className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:opacity-90"
                      >
                        <CheckCircle2 className="h-5 w-5 mr-2" /> Marquer comme terminé
                      </Button>
                    )}
                    <InfoBox variant="security">
                      🔐 <strong>Rappel sécurité :</strong> votre mot de passe email pro reste connu de
                      vous seul. <strong>Adamkom n'y a pas accès</strong> et ne vous le demandera jamais.
                      Pour le modifier, faites-le depuis votre interface d'hébergement (LWS).
                    </InfoBox>
                  </>
                )}

                {/* Checklist par étape */}
                <StepChecklist
                  step={current}
                  checked={checksFor(current)}
                  onToggle={(t) => toggleTask(current, t)}
                />
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
                <Button onClick={goNext} className="bg-gradient-to-r from-[#ff006e] to-[#ff5c8a] hover:opacity-90">
                  Suivant <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button
                  onClick={markDone}
                  disabled={!!state.doneAt}
                  className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:opacity-90"
                >
                  {state.doneAt ? "Déjà marqué ✓" : "Terminer"}
                  <CheckCircle2 className="h-4 w-4 ml-2" />
                </Button>
              )}
            </div>
          </GlassCard>

          <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-[#ff006e]/10 flex items-center justify-center flex-shrink-0">
              <HelpCircle className="h-6 w-6 text-[#ff006e]" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-zinc-900">Bloqué quelque part ?</p>
              <p className="text-sm text-zinc-600">
                Contactez le support Adamkom via votre espace dédié. On vous guide sans jamais demander vos mots de passe.
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
