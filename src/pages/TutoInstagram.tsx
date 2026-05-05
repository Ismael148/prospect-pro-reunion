import { useState, useEffect, useMemo } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  Circle,
  ArrowRight,
  ArrowLeft,
  ExternalLink,
  Clock,
  ShieldCheck,
  Instagram,
  Smartphone,
  UserPlus,
  Link2,
  Send,
  PartyPopper,
  HelpCircle,
  Mail,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { z } from "zod";
import { useSubmitFbOnboarding, useClientByNdi } from "@/hooks/use-fb-onboarding";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo.webp";

type StepKey = "intro" | "create" | "pro" | "link" | "envoi";

const STEPS_ALL: { key: StepKey; label: string; time?: string }[] = [
  { key: "intro", label: "Avez-vous Instagram ?", time: "30 sec" },
  { key: "create", label: "Créer votre compte IG", time: "3 min" },
  { key: "pro", label: "Passer en compte Pro", time: "2 min" },
  { key: "link", label: "Relier IG à Facebook", time: "2 min" },
  { key: "envoi", label: "Envoyer à Adamkom", time: "1 min" },
];

const schema = z.object({
  company_name: z.string().trim().min(2, "Nom requis").max(120),
  contact_email: z.string().trim().email("Email invalide").max(255),
  business_manager_email: z.string().trim().email("Email invalide").max(255),
  ig_username: z.string().trim().min(1, "Identifiant IG requis").max(60),
  fb_page_url: z.string().trim().url("URL invalide").max(300).optional().or(z.literal("")),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});

function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-white/40 bg-white/70 backdrop-blur-xl shadow-[0_10px_40px_-15px_rgba(255,0,110,0.15)] ${className}`}
    >
      {children}
    </div>
  );
}

function MiniMockup({ children, label }: { children: React.ReactNode; label?: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50 overflow-hidden shadow-inner">
      <div className="flex items-center gap-1.5 px-3 py-2 bg-white border-b border-zinc-200">
        <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
        {label && <span className="ml-3 text-[11px] text-zinc-500 font-mono">{label}</span>}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function NumberedList({ items }: { items: { t: string; d: React.ReactNode }[] }) {
  return (
    <ol className="space-y-3">
      {items.map((s, i) => (
        <li key={i} className="flex gap-4">
          <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gradient-to-br from-[#ff006e] to-[#ff5c8a] text-white font-bold flex items-center justify-center text-sm">
            {i + 1}
          </div>
          <div>
            <p className="font-semibold text-zinc-900">{s.t}</p>
            <p className="text-sm text-zinc-600 mt-0.5">{s.d}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function StepIntro({ onPick }: { onPick: (hasIg: boolean) => void }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl md:text-3xl font-bold text-zinc-900">Bonjour 👋</h2>
        <p className="mt-2 text-zinc-600">
          On va créer votre compte <strong>Instagram pro</strong> et le relier à votre <strong>page Facebook</strong>{" "}
          pour qu'Adamkom puisse publier pour vous. C'est gratuit, rapide et tout reste à votre nom.
        </p>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <button
          onClick={() => onPick(true)}
          className="group rounded-2xl border-2 border-zinc-200 hover:border-[#ff006e] bg-white p-6 text-left transition-all hover:shadow-lg"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-full bg-[#ff006e]/10 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-[#ff006e]" />
            </div>
            <span className="font-bold text-zinc-900">J'ai déjà Instagram</span>
          </div>
          <p className="text-sm text-zinc-600">On saute la création, direction le compte Pro et la liaison FB.</p>
          <span className="mt-3 inline-flex items-center text-sm font-semibold text-[#ff006e] group-hover:translate-x-1 transition-transform">
            Continuer <ArrowRight className="ml-1 h-4 w-4" />
          </span>
        </button>
        <button
          onClick={() => onPick(false)}
          className="group rounded-2xl border-2 border-zinc-200 hover:border-[#ff006e] bg-white p-6 text-left transition-all hover:shadow-lg"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-full bg-[#ff006e]/10 flex items-center justify-center">
              <Instagram className="h-5 w-5 text-[#ff006e]" />
            </div>
            <span className="font-bold text-zinc-900">Je n'ai pas de compte</span>
          </div>
          <p className="text-sm text-zinc-600">Pas de souci, on crée votre compte IG en 3 minutes.</p>
          <span className="mt-3 inline-flex items-center text-sm font-semibold text-[#ff006e] group-hover:translate-x-1 transition-transform">
            Créer mon Instagram <ArrowRight className="ml-1 h-4 w-4" />
          </span>
        </button>
      </div>
    </div>
  );
}

function StepCreate() {
  return (
    <div className="space-y-5">
      <div>
        <Badge className="bg-[#ff006e]/10 text-[#ff006e] hover:bg-[#ff006e]/10 border-0">3 min</Badge>
        <h2 className="text-2xl md:text-3xl font-bold text-zinc-900 mt-2">Créer votre compte Instagram</h2>
        <p className="mt-2 text-zinc-600">À faire depuis votre téléphone (iPhone ou Android).</p>
      </div>
      <NumberedList
        items={[
          {
            t: "Téléchargez l'application Instagram",
            d: (
              <>
                Sur l'App Store ou Google Play, cherchez <strong>Instagram</strong> et installez l'app gratuite.
              </>
            ),
          },
          { t: "Ouvrez l'app et cliquez « Créer un nouveau compte »", d: "Bouton en bas de l'écran d'accueil." },
          {
            t: "Entrez votre email professionnel",
            d: "Idéalement le même que pour Facebook (plus simple à relier ensuite).",
          },
          {
            t: "Choisissez un nom d'utilisateur",
            d: "Ex : @monentreprise.re — court, simple, mémorisable.",
          },
          { t: "Définissez un mot de passe sécurisé", d: "Notez-le bien quelque part de sûr." },
          { t: "Ajoutez une photo de profil (logo)", d: "Format carré, idéalement votre logo ou une photo pro." },
          { t: "Validez votre email", d: "Instagram vous envoie un code à 6 chiffres à recopier." },
        ]}
      />
      <MiniMockup label="instagram.com — création">
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <Instagram className="h-5 w-5 text-pink-600" />
            <span className="font-bold text-zinc-800">Créer un nouveau compte</span>
          </div>
          <div className="space-y-2">
            <div className="h-9 bg-white border-2 border-[#ff006e] rounded-lg flex items-center px-3 text-sm text-zinc-700">
              @monentreprise.re
            </div>
            <div className="h-9 bg-white border border-zinc-300 rounded-lg flex items-center px-3 text-sm text-zinc-500">
              contact@monentreprise.re
            </div>
          </div>
          <button className="w-full mt-3 bg-pink-600 text-white text-sm font-semibold py-2 rounded-lg">
            S'inscrire
          </button>
        </div>
      </MiniMockup>
    </div>
  );
}

function StepPro() {
  return (
    <div className="space-y-5">
      <div>
        <Badge className="bg-[#ff006e]/10 text-[#ff006e] hover:bg-[#ff006e]/10 border-0">2 min</Badge>
        <h2 className="text-2xl md:text-3xl font-bold text-zinc-900 mt-2">Passer en compte professionnel</h2>
        <p className="mt-2 text-zinc-600">
          Indispensable pour qu'Adamkom puisse publier et analyser vos statistiques.
        </p>
      </div>
      <NumberedList
        items={[
          { t: "Ouvrez votre profil IG", d: "Icône en bas à droite (votre photo)." },
          { t: "☰ Menu en haut à droite → Paramètres et confidentialité", d: "Tout en bas du menu." },
          { t: "Cliquez « Type de compte et outils »", d: "Puis « Passer à un compte professionnel »." },
          { t: "Choisissez une catégorie", d: "Ex : Restaurant, Boutique, Coiffeur, Service local..." },
          {
            t: "Sélectionnez « Entreprise » (pas Créateur)",
            d: "Le mode Entreprise permet à Adamkom de publier via le Business Manager.",
          },
          { t: "Vérifiez votre email pro et téléphone", d: "Vous pouvez sauter cette étape si nécessaire." },
        ]}
      />
      <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 flex gap-3">
        <HelpCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-amber-900">Important</p>
          <p className="text-xs text-amber-800 mt-1">
            Choisissez bien <strong>« Entreprise »</strong> et non « Créateur » : seul ce type permet la publication
            automatique via Meta Business.
          </p>
        </div>
      </div>
    </div>
  );
}

function StepLink() {
  return (
    <div className="space-y-5">
      <div>
        <Badge className="bg-[#ff006e]/10 text-[#ff006e] hover:bg-[#ff006e]/10 border-0">2 min</Badge>
        <h2 className="text-2xl md:text-3xl font-bold text-zinc-900 mt-2">Relier Instagram à votre page Facebook</h2>
        <p className="mt-2 text-zinc-600">
          C'est ce qui permet à Adamkom de gérer IG et FB en même temps depuis le Business Manager.
        </p>
      </div>
      <NumberedList
        items={[
          { t: "Toujours sur votre profil IG → ☰ Menu → Paramètres", d: "" },
          { t: "Cliquez « Centre de comptes » (Meta Accounts Center)", d: "Tout en haut des paramètres." },
          { t: "Comptes → Ajouter un compte Facebook", d: "Connectez-vous avec l'identifiant Facebook qui gère votre page pro." },
          {
            t: "Cliquez « Profils »",
            d: "Vérifiez que votre profil Facebook personnel ET votre page d'entreprise sont bien listés.",
          },
          {
            t: "Retour aux paramètres → « Partage entre profils »",
            d: "Activez le partage avec votre page Facebook pro (publications, stories, messages).",
          },
          {
            t: "C'est lié ✅",
            d: "Vos deux comptes sont maintenant connectés et apparaîtront dans le Business Manager.",
          },
        ]}
      />
      <MiniMockup label="Centre de comptes Meta">
        <div className="space-y-2">
          <div className="flex items-center gap-2 p-2 rounded-lg border border-zinc-200">
            <Instagram className="h-4 w-4 text-pink-600" />
            <span className="text-xs font-semibold text-zinc-800">@monentreprise.re</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500 ml-auto" />
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg border-2 border-[#ff006e] bg-[#ff006e]/5">
            <span className="h-4 w-4 rounded-sm bg-blue-600 text-white text-[9px] font-bold flex items-center justify-center">f</span>
            <span className="text-xs font-semibold text-zinc-800">Page Mon Entreprise SARL</span>
            <Link2 className="h-4 w-4 text-[#ff006e] ml-auto" />
          </div>
        </div>
      </MiniMockup>
      <div className="rounded-xl bg-blue-50 border border-blue-200 p-4 flex gap-3">
        <Smartphone className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-blue-900">Astuce</p>
          <p className="text-xs text-blue-800 mt-1">
            Si vous n'arrivez pas à relier les comptes via l'app, faites-le depuis{" "}
            <a
              href="https://accountscenter.facebook.com/"
              target="_blank"
              rel="noreferrer"
              className="underline font-semibold"
            >
              accountscenter.facebook.com
            </a>{" "}
            sur votre ordinateur.
          </p>
        </div>
      </div>
    </div>
  );
}

function StepForm({
  prefill,
  hasExisting,
  onSent,
}: {
  prefill: { company_name: string; contact_email: string; client_id?: string | null; client_ndi?: string | null };
  hasExisting: boolean;
  onSent: () => void;
}) {
  const [form, setForm] = useState({
    company_name: prefill.company_name,
    contact_email: prefill.contact_email,
    business_manager_email: "",
    ig_username: "",
    fb_page_url: "",
    notes: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const submit = useSubmitFbOnboarding();

  const handleChange = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      parsed.error.issues.forEach((i) => {
        errs[String(i.path[0])] = i.message;
      });
      setErrors(errs);
      return;
    }
    setErrors({});
    const igHandle = parsed.data.ig_username.replace(/^@/, "");
    submit.mutate(
      {
        company_name: parsed.data.company_name,
        contact_email: parsed.data.contact_email,
        business_manager_email: parsed.data.business_manager_email,
        business_manager_id: null,
        fb_page_url: parsed.data.fb_page_url || null,
        fb_page_name: `IG: @${igHandle}`,
        notes: `[Instagram] @${igHandle}\n${parsed.data.notes || ""}`.trim(),
        client_id: prefill.client_id ?? null,
        client_ndi: prefill.client_ndi ?? null,
        has_existing_page: hasExisting,
      },
      {
        onSuccess: async () => {
          try {
            await supabase.functions.invoke("send-onboarding-confirmation", {
              body: {
                kind: "facebook",
                recipientEmail: parsed.data.contact_email,
                recipientName: parsed.data.company_name,
                companyName: parsed.data.company_name,
                ndi: prefill.client_ndi ?? null,
              },
            });
          } catch (err) {
            console.error("[TutoInstagram] confirmation email failed", err);
          }
          onSent();
        },
      }
    );
  };

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div>
        <Badge className="bg-[#ff006e]/10 text-[#ff006e] hover:bg-[#ff006e]/10 border-0">1 min</Badge>
        <h2 className="text-2xl md:text-3xl font-bold text-zinc-900 mt-2">Envoyez vos infos à Adamkom</h2>
        <p className="mt-2 text-zinc-600">
          Notre équipe vérifie la liaison IG/FB sous 24h et démarre vos publications.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="company_name" className="flex items-center gap-1.5">
            <Building2 className="h-3.5 w-3.5" /> Nom entreprise *
          </Label>
          <Input
            id="company_name"
            value={form.company_name}
            onChange={(e) => handleChange("company_name", e.target.value)}
            className="mt-1.5 bg-white border-zinc-300 text-zinc-900 focus-visible:ring-[#ff006e]"
            maxLength={120}
          />
          {errors.company_name && <p className="text-xs text-red-600 mt-1">{errors.company_name}</p>}
        </div>

        <div>
          <Label htmlFor="contact_email" className="flex items-center gap-1.5">
            <Mail className="h-3.5 w-3.5" /> Votre email *
          </Label>
          <Input
            id="contact_email"
            type="email"
            value={form.contact_email}
            onChange={(e) => handleChange("contact_email", e.target.value)}
            className="mt-1.5 bg-white border-zinc-300 text-zinc-900 focus-visible:ring-[#ff006e]"
            maxLength={255}
          />
          {errors.contact_email && <p className="text-xs text-red-600 mt-1">{errors.contact_email}</p>}
        </div>

        <div>
          <Label htmlFor="ig_username" className="flex items-center gap-1.5">
            <Instagram className="h-3.5 w-3.5" /> Identifiant Instagram *
          </Label>
          <Input
            id="ig_username"
            value={form.ig_username}
            onChange={(e) => handleChange("ig_username", e.target.value)}
            className="mt-1.5 bg-white border-zinc-300 text-zinc-900 focus-visible:ring-[#ff006e]"
            placeholder="@monentreprise.re"
            maxLength={60}
          />
          {errors.ig_username && <p className="text-xs text-red-600 mt-1">{errors.ig_username}</p>}
        </div>

        <div>
          <Label htmlFor="business_manager_email" className="flex items-center gap-1.5">
            <Mail className="h-3.5 w-3.5" /> Email du compte Facebook *
          </Label>
          <Input
            id="business_manager_email"
            type="email"
            value={form.business_manager_email}
            onChange={(e) => handleChange("business_manager_email", e.target.value)}
            className="mt-1.5 bg-white border-zinc-300 text-zinc-900 focus-visible:ring-[#ff006e]"
            placeholder="celui qui gère votre page FB"
            maxLength={255}
          />
          {errors.business_manager_email && (
            <p className="text-xs text-red-600 mt-1">{errors.business_manager_email}</p>
          )}
        </div>

        <div className="sm:col-span-2">
          <Label htmlFor="fb_page_url" className="flex items-center gap-1.5">
            <Link2 className="h-3.5 w-3.5" /> URL de votre page Facebook (optionnel)
          </Label>
          <Input
            id="fb_page_url"
            value={form.fb_page_url}
            onChange={(e) => handleChange("fb_page_url", e.target.value)}
            className="mt-1.5 bg-white border-zinc-300 text-zinc-900 focus-visible:ring-[#ff006e]"
            placeholder="https://facebook.com/..."
            maxLength={300}
          />
          {errors.fb_page_url && <p className="text-xs text-red-600 mt-1">{errors.fb_page_url}</p>}
        </div>

        <div className="sm:col-span-2">
          <Label htmlFor="notes">Notes (optionnel)</Label>
          <Textarea
            id="notes"
            value={form.notes}
            onChange={(e) => handleChange("notes", e.target.value)}
            className="mt-1.5 bg-white border-zinc-300 text-zinc-900 focus-visible:ring-[#ff006e]"
            rows={3}
            maxLength={1000}
            placeholder="Quelque chose à nous préciser ?"
          />
        </div>
      </div>

      <Button
        type="submit"
        size="lg"
        disabled={submit.isPending}
        className="w-full bg-gradient-to-r from-[#ff006e] to-[#ff5c8a] hover:from-[#e6005f] hover:to-[#ff4577] text-white font-bold shadow-lg shadow-[#ff006e]/30"
      >
        {submit.isPending ? "Envoi en cours..." : (
          <>
            <Send className="h-4 w-4" /> Envoyer mes infos à Adamkom
          </>
        )}
      </Button>

      <p className="text-[11px] text-zinc-500 text-center">
        🔒 Vos données restent confidentielles. Aucun mot de passe ne vous est demandé.
      </p>
    </form>
  );
}

function StepThanks({ ndi, email }: { ndi?: string | null; email?: string | null }) {
  return (
    <div className="text-center py-8 space-y-5">
      <motion.div
        initial={{ scale: 0, rotate: -45 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 200 }}
        className="inline-flex h-20 w-20 rounded-full bg-gradient-to-br from-[#ff006e] to-[#ff5c8a] items-center justify-center shadow-lg shadow-[#ff006e]/30"
      >
        <PartyPopper className="h-10 w-10 text-white" />
      </motion.div>
      <div>
        <h2 className="text-3xl font-bold text-zinc-900">Demande bien envoyée ! 🎉</h2>
        <p className="text-zinc-600 mt-3 max-w-md mx-auto">
          Vos infos Instagram + Facebook sont arrivées chez Adamkom.
        </p>
      </div>
      <div className="max-w-md mx-auto rounded-2xl border border-zinc-200 bg-white p-5 text-left space-y-2">
        <p className="text-xs uppercase font-bold text-zinc-500 tracking-wide">Récapitulatif</p>
        <ul className="text-sm text-zinc-700 space-y-1.5">
          <li className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
            Liaison Instagram / Facebook transmise
          </li>
          {email && (
            <li className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-zinc-400 flex-shrink-0" />
              <span className="text-xs text-zinc-500">
                Confirmation envoyée sur <strong className="text-zinc-700">{email}</strong>
              </span>
            </li>
          )}
          {ndi && (
            <li className="flex items-center gap-2 pt-1 border-t border-zinc-100 mt-2">
              <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Réf.</span>
              <code className="text-xs bg-zinc-100 px-2 py-0.5 rounded text-zinc-700 font-mono">{ndi}</code>
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}

export default function TutoInstagram() {
  const [params] = useSearchParams();
  const ndi = params.get("client");
  const { data: clientPrefill } = useClientByNdi(ndi);

  const [stepIdx, setStepIdx] = useState(0);
  const [hasExisting, setHasExisting] = useState(true);
  const [done, setDone] = useState(false);

  const visibleSteps = useMemo(
    () => (hasExisting ? STEPS_ALL.filter((s) => s.key !== "create") : STEPS_ALL),
    [hasExisting]
  );
  const current = visibleSteps[stepIdx];

  useEffect(() => {
    document.title = "Tutoriel Instagram + Facebook — Adamkom";
  }, []);

  const goNext = () => setStepIdx((i) => Math.min(i + 1, visibleSteps.length - 1));
  const goPrev = () => setStepIdx((i) => Math.max(i - 1, 0));

  const handleIntroPick = (h: boolean) => {
    setHasExisting(h);
    setStepIdx(1);
  };

  return (
    <div className="light min-h-screen bg-zinc-50 relative overflow-hidden text-zinc-900">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-[#ff006e]/15 blur-[120px]" />
        <div className="absolute top-40 -left-40 h-[400px] w-[400px] rounded-full bg-[#ff5c8a]/10 blur-[100px]" />
      </div>

      <header className="border-b border-white/40 bg-white/60 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Adamkom" className="h-8 w-auto" />
            <div className="hidden sm:flex items-center gap-2 text-xs text-zinc-500">
              <Clock className="h-3.5 w-3.5" /> 8 min
              <span className="text-zinc-300">•</span>
              <ShieldCheck className="h-3.5 w-3.5" /> 100% sécurisé
            </div>
          </div>
          <Link to="/" className="text-xs text-zinc-500 hover:text-[#ff006e]">
            ai.adamkom.com
          </Link>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8 md:py-12">
        {stepIdx === 0 && !done && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
            <Badge className="bg-[#ff006e]/10 text-[#ff006e] hover:bg-[#ff006e]/10 border-0 mb-4">
              ✨ Tutoriel exclusif client Adamkom
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold text-zinc-900 tracking-tight">
              Créez votre <br className="sm:hidden" />
              <span className="bg-gradient-to-r from-[#ff006e] to-[#ff5c8a] bg-clip-text text-transparent">
                Instagram Pro
              </span>
              <br />
              et reliez-le à Facebook
            </h1>
            <p className="mt-4 text-lg text-zinc-600 max-w-2xl mx-auto">
              Suivez ce guide en 8 minutes pour qu'Adamkom puisse publier sur vos deux réseaux d'un coup.
            </p>
            {clientPrefill && (
              <p className="mt-3 text-sm text-zinc-500">
                👋 Bienvenue <strong className="text-zinc-700">{clientPrefill.company_name}</strong>
              </p>
            )}
          </motion.div>
        )}

        <div className="grid md:grid-cols-[260px_1fr] gap-6 md:gap-10">
          <aside className="md:sticky md:top-24 md:self-start">
            <GlassCard className="p-5">
              <p className="text-[11px] uppercase font-bold text-zinc-500 tracking-widest mb-3">Progression</p>
              <ol className="space-y-3">
                {visibleSteps.map((s, i) => {
                  const isActive = i === stepIdx;
                  const isDone = i < stepIdx || done;
                  return (
                    <li
                      key={s.key}
                      className={`flex items-start gap-2.5 cursor-pointer ${isActive ? "" : "opacity-70"}`}
                      onClick={() => !done && setStepIdx(i)}
                    >
                      {isDone ? (
                        <CheckCircle2 className="h-5 w-5 text-[#ff006e] flex-shrink-0 mt-0.5" />
                      ) : isActive ? (
                        <div className="h-5 w-5 rounded-full border-2 border-[#ff006e] bg-[#ff006e]/20 flex-shrink-0 mt-0.5 flex items-center justify-center">
                          <div className="h-2 w-2 rounded-full bg-[#ff006e]" />
                        </div>
                      ) : (
                        <Circle className="h-5 w-5 text-zinc-300 flex-shrink-0 mt-0.5" />
                      )}
                      <div className="min-w-0">
                        <p
                          className={`text-sm leading-tight ${
                            isActive ? "font-bold text-zinc-900" : "text-zinc-700"
                          }`}
                        >
                          {s.label}
                        </p>
                        {s.time && <p className="text-[10px] text-zinc-500 mt-0.5">{s.time}</p>}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </GlassCard>
          </aside>

          <main>
            <GlassCard className="p-6 md:p-10 min-h-[500px]">
              <AnimatePresence mode="wait">
                {done ? (
                  <motion.div key="thanks" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <StepThanks ndi={ndi || clientPrefill?.ndi} email={clientPrefill?.email} />
                  </motion.div>
                ) : (
                  <motion.div
                    key={current.key}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.25 }}
                  >
                    {current.key === "intro" && <StepIntro onPick={handleIntroPick} />}
                    {current.key === "create" && <StepCreate />}
                    {current.key === "pro" && <StepPro />}
                    {current.key === "link" && <StepLink />}
                    {current.key === "envoi" && (
                      <StepForm
                        prefill={{
                          company_name: clientPrefill?.company_name || "",
                          contact_email: clientPrefill?.email || "",
                          client_id: clientPrefill?.id ?? null,
                          client_ndi: clientPrefill?.ndi ?? null,
                        }}
                        hasExisting={hasExisting}
                        onSent={() => setDone(true)}
                      />
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {!done && current.key !== "intro" && current.key !== "envoi" && (
                <div className="flex items-center justify-between mt-8 pt-6 border-t border-zinc-200">
                  <Button variant="outline" onClick={goPrev} disabled={stepIdx === 0}>
                    <ArrowLeft className="h-4 w-4 mr-1" /> Précédent
                  </Button>
                  <Button
                    onClick={goNext}
                    className="bg-gradient-to-r from-[#ff006e] to-[#ff5c8a] hover:from-[#e6005f] hover:to-[#ff4577] text-white font-bold"
                  >
                    Suivant <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              )}
            </GlassCard>
          </main>
        </div>
      </div>
    </div>
  );
}
