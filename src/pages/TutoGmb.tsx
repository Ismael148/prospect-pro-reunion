import { useState, useEffect, useMemo } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  ExternalLink,
  Sparkles,
  MapPin,
  Search,
  UserPlus,
  Send,
  PartyPopper,
  Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { z } from "zod";
import { useSubmitGmbOnboarding } from "@/hooks/use-gmb-onboarding";
import { useClientByNdi } from "@/hooks/use-fb-onboarding";
import logo from "@/assets/logo.webp";

const ADAMKOM_GOOGLE_EMAIL = "adamkom.co@gmail.com";

type StepKey = "intro" | "create" | "find" | "manager" | "envoi" | "merci";

const STEPS_EXISTING: { key: StepKey; label: string; time?: string }[] = [
  { key: "intro", label: "Avez-vous une fiche GMB ?", time: "30 sec" },
  { key: "find", label: "Retrouvez votre fiche", time: "1 min" },
  { key: "manager", label: "Ajoutez Adamkom", time: "2 min" },
  { key: "envoi", label: "Envoyer à Adamkom", time: "1 min" },
];

const STEPS_NEW: { key: StepKey; label: string; time?: string }[] = [
  { key: "intro", label: "Avez-vous une fiche GMB ?", time: "30 sec" },
  { key: "create", label: "Créer votre fiche", time: "8 min" },
  { key: "manager", label: "Ajoutez Adamkom", time: "2 min" },
  { key: "envoi", label: "Envoyer à Adamkom", time: "1 min" },
];

const submissionSchema = z.object({
  company_name: z.string().trim().min(2, "Nom requis").max(120),
  contact_email: z.string().trim().email("Email invalide").max(255),
  google_account_email: z.string().trim().email("Email Google invalide").max(255),
  gmb_business_name: z.string().trim().max(120).optional().or(z.literal("")),
  gmb_maps_url: z.string().trim().url("URL invalide").max(400).optional().or(z.literal("")),
  gmb_address: z.string().trim().max(200).optional().or(z.literal("")),
  gmb_phone: z.string().trim().max(40).optional().or(z.literal("")),
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

function Step1({ onPick }: { onPick: (hasListing: boolean) => void }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl md:text-3xl font-bold text-zinc-900">Bonjour 👋</h2>
        <p className="mt-2 text-zinc-600">
          Pour gérer votre <strong>visibilité Google</strong> (fiche Google My Business / Google Maps),
          on a besoin d'un accès <strong>Gestionnaire</strong> sur votre fiche. <br />
          Pas de mot de passe à donner — juste 2 minutes pour nous ajouter, et tout reste à votre nom.
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
            <span className="font-bold text-zinc-900">J'ai déjà une fiche</span>
          </div>
          <p className="text-sm text-zinc-600">
            Mon entreprise apparaît déjà sur Google Maps. On nous ajoute en 2 min.
          </p>
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
              <Sparkles className="h-5 w-5 text-[#ff006e]" />
            </div>
            <span className="font-bold text-zinc-900">Je n'en ai pas encore</span>
          </div>
          <p className="text-sm text-zinc-600">
            On vous montre comment créer votre fiche Google en 8 min.
          </p>
          <span className="mt-3 inline-flex items-center text-sm font-semibold text-[#ff006e] group-hover:translate-x-1 transition-transform">
            Créer ma fiche <ArrowRight className="ml-1 h-4 w-4" />
          </span>
        </button>
      </div>
    </div>
  );
}

function StepFind() {
  return (
    <div className="space-y-5">
      <div>
        <Badge className="bg-[#ff006e]/10 text-[#ff006e] hover:bg-[#ff006e]/10 border-0">1 min</Badge>
        <h2 className="text-2xl md:text-3xl font-bold text-zinc-900 mt-2">Retrouvez votre fiche</h2>
        <p className="mt-2 text-zinc-600">
          Avant d'ajouter Adamkom, vérifions que vous gérez bien votre fiche.
        </p>
      </div>

      <ol className="space-y-3">
        {[
          {
            t: "Allez sur Google Business",
            d: (
              <>
                Ouvrez{" "}
                <a
                  href="https://business.google.com/locations"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#ff006e] font-semibold inline-flex items-center gap-1 hover:underline"
                >
                  business.google.com/locations <ExternalLink className="h-3 w-3" />
                </a>
                . Connectez-vous avec le compte Google qui gère votre fiche.
              </>
            ),
          },
          { t: "Trouvez votre établissement", d: "Vous devriez voir le nom de votre entreprise dans la liste." },
          {
            t: "Cliquez dessus",
            d: "Cela ouvre le tableau de bord de votre fiche Google. Vous êtes prêt pour l'étape suivante !",
          },
          {
            t: "Vous ne voyez pas votre fiche ?",
            d: "Vous utilisez peut-être le mauvais compte Google. Essayez avec un autre compte, ou créez la fiche (étape « Je n'en ai pas »).",
          },
        ].map((s, i) => (
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

      <MiniMockup label="business.google.com/locations">
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-2">
            <Search className="h-4 w-4 text-zinc-400" />
            <span className="text-sm text-zinc-600">Vos établissements</span>
          </div>
          <div className="rounded-lg border-2 border-[#ff006e] bg-[#ff006e]/5 p-3 flex items-center gap-3">
            <MapPin className="h-5 w-5 text-[#ff006e]" />
            <div>
              <p className="text-sm font-bold text-zinc-800">Mon Entreprise SARL</p>
              <p className="text-xs text-zinc-500">Saint-Denis, La Réunion</p>
            </div>
          </div>
        </div>
      </MiniMockup>
    </div>
  );
}

function StepCreate() {
  return (
    <div className="space-y-5">
      <div>
        <Badge className="bg-[#ff006e]/10 text-[#ff006e] hover:bg-[#ff006e]/10 border-0">8 min</Badge>
        <h2 className="text-2xl md:text-3xl font-bold text-zinc-900 mt-2">Créer votre fiche Google</h2>
        <p className="mt-2 text-zinc-600">
          Une fiche Google My Business, c'est gratuit et c'est ce qui vous fait apparaître sur Google Maps
          quand vos clients vous cherchent.
        </p>
      </div>

      <ol className="space-y-3">
        {[
          {
            t: "Allez sur Google Business",
            d: (
              <>
                Ouvrez{" "}
                <a
                  href="https://business.google.com/create"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#ff006e] font-semibold inline-flex items-center gap-1 hover:underline"
                >
                  business.google.com/create <ExternalLink className="h-3 w-3" />
                </a>
                . Connectez-vous avec votre compte Google pro.
              </>
            ),
          },
          { t: "Renseignez le nom de votre entreprise", d: "Tel qu'il doit apparaître sur Google Maps." },
          { t: "Choisissez la catégorie", d: "Ex : Restaurant, Coiffeur, Plombier, Garage..." },
          { t: "Ajoutez votre adresse", d: "Si vous accueillez des clients, votre adresse physique apparaîtra sur Maps." },
          { t: "Numéro de téléphone + site web", d: "Optionnel mais fortement recommandé." },
          {
            t: "Vérification postale ou téléphone",
            d: "Google vous enverra un code (par carte postale ou SMS). Saisissez-le pour activer la fiche.",
          },
          {
            t: "C'est fait ✅",
            d: "Votre fiche est en ligne. Passez à l'étape suivante pour nous donner accès.",
          },
        ].map((s, i) => (
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

      <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-900">
        ⚠️ La vérification par carte postale prend <strong>5 à 14 jours</strong>. Pendant ce temps, vous
        pouvez déjà passer à l'étape suivante : ajouter Adamkom comme gestionnaire.
      </div>
    </div>
  );
}

function StepManager() {
  return (
    <div className="space-y-5">
      <div>
        <Badge className="bg-[#ff006e]/10 text-[#ff006e] hover:bg-[#ff006e]/10 border-0">2 min</Badge>
        <h2 className="text-2xl md:text-3xl font-bold text-zinc-900 mt-2">
          Ajoutez Adamkom comme gestionnaire
        </h2>
        <p className="mt-2 text-zinc-600">
          C'est l'étape clé : on va ajouter notre email pour pouvoir publier, répondre aux avis et
          optimiser votre fiche — <strong>sans avoir vos mots de passe</strong>.
        </p>
      </div>

      <div className="rounded-2xl border-2 border-[#ff006e]/20 bg-gradient-to-br from-[#ff006e]/5 to-[#ff5c8a]/5 p-5">
        <div className="flex items-center gap-2 mb-2">
          <Mail className="h-5 w-5 text-[#ff006e]" />
          <p className="font-bold text-zinc-900">Email à ajouter :</p>
        </div>
        <div className="flex items-center gap-2 bg-white border border-zinc-200 rounded-lg px-4 py-3">
          <code className="flex-1 text-base font-mono text-zinc-900">{ADAMKOM_GOOGLE_EMAIL}</code>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              navigator.clipboard.writeText(ADAMKOM_GOOGLE_EMAIL);
            }}
            className="h-8 text-[#ff006e]"
          >
            Copier
          </Button>
        </div>
      </div>

      <ol className="space-y-3">
        {[
          {
            t: "Ouvrez votre fiche",
            d: (
              <>
                Allez sur{" "}
                <a
                  href="https://business.google.com/locations"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#ff006e] font-semibold inline-flex items-center gap-1 hover:underline"
                >
                  business.google.com/locations <ExternalLink className="h-3 w-3" />
                </a>
                {" "}et cliquez sur votre établissement.
              </>
            ),
          },
          { t: "Cliquez sur le menu (≡) → « Utilisateurs »", d: "Ou directement « Paramètres » → « Personnes et accès »." },
          { t: "Cliquez sur « Ajouter »", d: "Bouton bleu « + Ajouter des utilisateurs »." },
          {
            t: "Collez notre email",
            d: (
              <>
                Collez : <code className="bg-zinc-100 px-1.5 py-0.5 rounded text-[#ff006e] font-mono">{ADAMKOM_GOOGLE_EMAIL}</code>
              </>
            ),
          },
          {
            t: "Choisissez le rôle « Gestionnaire »",
            d: "(Pas Propriétaire — vous restez le seul propriétaire de votre fiche.)",
          },
          { t: "Cliquez « Inviter »", d: "Voilà 🎉 — on reçoit l'invitation et on l'accepte sous 24h." },
        ].map((s, i) => (
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

      <MiniMockup label="business.google.com/users">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-bold text-zinc-800 text-sm">Personnes et accès</span>
            <button className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg font-semibold">
              + Ajouter
            </button>
          </div>
          <div className="rounded-lg border-2 border-[#ff006e] bg-[#ff006e]/5 p-3 flex items-center gap-3">
            <UserPlus className="h-4 w-4 text-[#ff006e]" />
            <div className="flex-1">
              <p className="text-xs font-mono text-zinc-800">{ADAMKOM_GOOGLE_EMAIL}</p>
              <p className="text-[10px] text-zinc-500 mt-0.5">Rôle : Gestionnaire</p>
            </div>
          </div>
        </div>
      </MiniMockup>
    </div>
  );
}

function StepEnvoi({
  defaultCompany,
  defaultEmail,
  hasListing,
  clientId,
  clientNdi,
  onSubmitted,
}: {
  defaultCompany: string;
  defaultEmail: string;
  hasListing: boolean;
  clientId: string | null;
  clientNdi: string | null;
  onSubmitted: () => void;
}) {
  const submit = useSubmitGmbOnboarding();
  const [form, setForm] = useState({
    company_name: defaultCompany,
    contact_email: defaultEmail,
    google_account_email: "",
    gmb_business_name: "",
    gmb_maps_url: "",
    gmb_address: "",
    gmb_phone: "",
    manager_added: false,
    notes: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setForm((f) => ({
      ...f,
      company_name: f.company_name || defaultCompany,
      contact_email: f.contact_email || defaultEmail,
    }));
  }, [defaultCompany, defaultEmail]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = submissionSchema.safeParse(form);
    if (!result.success) {
      const errs: Record<string, string> = {};
      result.error.errors.forEach((er) => {
        if (er.path[0]) errs[er.path[0].toString()] = er.message;
      });
      setErrors(errs);
      return;
    }
    setErrors({});
    try {
      await submit.mutateAsync({
        client_id: clientId,
        client_ndi: clientNdi,
        company_name: form.company_name,
        contact_email: form.contact_email,
        google_account_email: form.google_account_email,
        gmb_business_name: form.gmb_business_name,
        gmb_maps_url: form.gmb_maps_url,
        gmb_address: form.gmb_address,
        gmb_phone: form.gmb_phone,
        manager_added: form.manager_added,
        has_existing_listing: hasListing,
        notes: form.notes,
      });
      onSubmitted();
    } catch {
      /* toast handled in hook */
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <Badge className="bg-[#ff006e]/10 text-[#ff006e] hover:bg-[#ff006e]/10 border-0">1 min</Badge>
        <h2 className="text-2xl md:text-3xl font-bold text-zinc-900 mt-2">Envoyez-nous vos infos</h2>
        <p className="mt-2 text-zinc-600">
          Dernière étape : confirmez les infos pour qu'on puisse retrouver votre fiche et accepter
          l'invitation.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="company_name">Nom de votre entreprise *</Label>
            <Input
              id="company_name"
              value={form.company_name}
              onChange={(e) => setForm({ ...form, company_name: e.target.value })}
              className="mt-1.5"
            />
            {errors.company_name && <p className="text-xs text-red-600 mt-1">{errors.company_name}</p>}
          </div>
          <div>
            <Label htmlFor="contact_email">Votre email *</Label>
            <Input
              id="contact_email"
              type="email"
              value={form.contact_email}
              onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
              className="mt-1.5"
            />
            {errors.contact_email && <p className="text-xs text-red-600 mt-1">{errors.contact_email}</p>}
          </div>
        </div>

        <div>
          <Label htmlFor="google_account_email">
            Email Google qui gère votre fiche * <span className="text-xs text-zinc-500">(celui où vous êtes connecté)</span>
          </Label>
          <Input
            id="google_account_email"
            type="email"
            placeholder="exemple@gmail.com"
            value={form.google_account_email}
            onChange={(e) => setForm({ ...form, google_account_email: e.target.value })}
            className="mt-1.5"
          />
          {errors.google_account_email && (
            <p className="text-xs text-red-600 mt-1">{errors.google_account_email}</p>
          )}
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="gmb_business_name">Nom exact sur Google Maps</Label>
            <Input
              id="gmb_business_name"
              placeholder="Ex : Pizzeria du Port"
              value={form.gmb_business_name}
              onChange={(e) => setForm({ ...form, gmb_business_name: e.target.value })}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="gmb_phone">Téléphone affiché</Label>
            <Input
              id="gmb_phone"
              placeholder="0262 XX XX XX"
              value={form.gmb_phone}
              onChange={(e) => setForm({ ...form, gmb_phone: e.target.value })}
              className="mt-1.5"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="gmb_address">Adresse de l'établissement</Label>
          <Input
            id="gmb_address"
            placeholder="Ex : 12 rue de la Paix, 97400 Saint-Denis"
            value={form.gmb_address}
            onChange={(e) => setForm({ ...form, gmb_address: e.target.value })}
            className="mt-1.5"
          />
        </div>

        <div>
          <Label htmlFor="gmb_maps_url">Lien Google Maps de votre fiche (recommandé)</Label>
          <Input
            id="gmb_maps_url"
            placeholder="https://maps.google.com/..."
            value={form.gmb_maps_url}
            onChange={(e) => setForm({ ...form, gmb_maps_url: e.target.value })}
            className="mt-1.5"
          />
          {errors.gmb_maps_url && <p className="text-xs text-red-600 mt-1">{errors.gmb_maps_url}</p>}
          <p className="text-xs text-zinc-500 mt-1">
            Astuce : cherchez votre entreprise sur Google Maps, copiez l'URL de la barre d'adresse.
          </p>
        </div>

        <label className="flex items-start gap-3 rounded-xl border-2 border-zinc-200 hover:border-[#ff006e] p-4 cursor-pointer transition-colors">
          <input
            type="checkbox"
            checked={form.manager_added}
            onChange={(e) => setForm({ ...form, manager_added: e.target.checked })}
            className="mt-1 h-5 w-5 accent-[#ff006e]"
          />
          <div>
            <p className="font-semibold text-zinc-900">
              ✅ J'ai ajouté <code className="text-[#ff006e]">{ADAMKOM_GOOGLE_EMAIL}</code> comme
              Gestionnaire de ma fiche
            </p>
            <p className="text-xs text-zinc-500 mt-0.5">
              Cochez seulement si vous l'avez vraiment fait (sinon on ne pourra rien faire 😉).
            </p>
          </div>
        </label>

        <div>
          <Label htmlFor="notes">Notes / commentaires (optionnel)</Label>
          <Textarea
            id="notes"
            rows={3}
            placeholder="Une particularité, une question, une info utile..."
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className="mt-1.5"
          />
        </div>

        <Button
          type="submit"
          disabled={submit.isPending}
          className="w-full bg-gradient-to-r from-[#ff006e] to-[#ff5c8a] hover:from-[#e6005f] hover:to-[#e64a7a] text-white font-bold py-6 text-base"
        >
          <Send className="h-5 w-5 mr-2" />
          {submit.isPending ? "Envoi en cours..." : "Envoyer à Adamkom"}
        </Button>
      </form>
    </div>
  );
}

function StepMerci() {
  return (
    <div className="text-center py-10 space-y-5">
      <div className="inline-flex h-20 w-20 rounded-full bg-gradient-to-br from-[#ff006e] to-[#ff5c8a] items-center justify-center">
        <PartyPopper className="h-10 w-10 text-white" />
      </div>
      <div>
        <h2 className="text-3xl font-bold text-zinc-900">Merci ! 🎉</h2>
        <p className="text-zinc-600 mt-2 max-w-md mx-auto">
          Vos infos ont bien été envoyées à Adamkom. Notre équipe va accepter l'invitation Google sous{" "}
          <strong>24h ouvrées</strong> et commencer à optimiser votre présence locale.
        </p>
      </div>
      <Link to="/">
        <Button variant="outline" className="rounded-full">
          Retour à l'accueil
        </Button>
      </Link>
    </div>
  );
}

export default function TutoGmb() {
  const [searchParams] = useSearchParams();
  const ndi = searchParams.get("client");
  const { data: clientData } = useClientByNdi(ndi);

  const [hasListing, setHasListing] = useState<boolean | null>(null);
  const [step, setStep] = useState<StepKey>("intro");
  const [done, setDone] = useState(false);

  const steps = useMemo(() => (hasListing ? STEPS_EXISTING : STEPS_NEW), [hasListing]);

  const handlePick = (h: boolean) => {
    setHasListing(h);
    setStep(h ? "find" : "create");
  };

  const goNext = () => {
    if (step === "find") setStep("manager");
    else if (step === "create") setStep("manager");
    else if (step === "manager") setStep("envoi");
  };

  const goPrev = () => {
    if (step === "find" || step === "create") setStep("intro");
    else if (step === "manager") setStep(hasListing ? "find" : "create");
    else if (step === "envoi") setStep("manager");
  };

  if (done) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-orange-50 py-8 px-4">
        <div className="max-w-3xl mx-auto">
          <GlassCard className="p-8">
            <StepMerci />
          </GlassCard>
        </div>
      </div>
    );
  }

  const currentIndex = steps.findIndex((s) => s.key === step);

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-orange-50">
      {/* Decorative blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-[#ff006e]/10 blur-3xl" />
        <div className="absolute top-1/2 -right-24 h-96 w-96 rounded-full bg-orange-200/30 blur-3xl" />
      </div>

      <div className="relative max-w-5xl mx-auto px-4 py-6 md:py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link to="/" className="flex items-center gap-3">
            <img src={logo} alt="Adamkom" className="h-10 w-auto" />
          </Link>
          <Badge className="bg-white/70 backdrop-blur text-zinc-700 border border-white/40">
            <MapPin className="h-3 w-3 mr-1" /> Tuto Google My Business
          </Badge>
        </div>

        {/* Title */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-5xl font-bold text-zinc-900 tracking-tight" style={{ fontFamily: "Space Grotesk, sans-serif" }}>
            Donnez-nous accès à votre <span className="text-[#ff006e]">fiche Google</span>
          </h1>
          {clientData?.company_name && (
            <p className="mt-3 text-zinc-600">
              Onboarding personnalisé pour <strong>{clientData.company_name}</strong>
            </p>
          )}
        </div>

        <div className="grid lg:grid-cols-[260px_1fr] gap-6">
          {/* Stepper sidebar */}
          {hasListing !== null && (
            <GlassCard className="p-4 h-fit lg:sticky lg:top-6">
              <p className="text-xs uppercase font-semibold text-zinc-500 tracking-wide mb-3 px-2">
                Étapes
              </p>
              <ol className="space-y-1">
                {steps.map((s, idx) => {
                  const isDone = idx < currentIndex;
                  const isActive = s.key === step;
                  return (
                    <li
                      key={s.key}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${
                        isActive
                          ? "bg-[#ff006e]/10 text-[#ff006e] font-semibold"
                          : isDone
                          ? "text-zinc-400"
                          : "text-zinc-700"
                      }`}
                    >
                      <span
                        className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          isActive
                            ? "bg-[#ff006e] text-white"
                            : isDone
                            ? "bg-emerald-500 text-white"
                            : "bg-zinc-200 text-zinc-500"
                        }`}
                      >
                        {isDone ? <CheckCircle2 className="h-3.5 w-3.5" /> : idx + 1}
                      </span>
                      <span className="flex-1 leading-tight">{s.label}</span>
                      {s.time && <span className="text-[10px] text-zinc-400">{s.time}</span>}
                    </li>
                  );
                })}
              </ol>
            </GlassCard>
          )}

          {/* Step content */}
          <GlassCard className="p-6 md:p-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                {step === "intro" && <Step1 onPick={handlePick} />}
                {step === "find" && <StepFind />}
                {step === "create" && <StepCreate />}
                {step === "manager" && <StepManager />}
                {step === "envoi" && (
                  <StepEnvoi
                    defaultCompany={clientData?.company_name || ""}
                    defaultEmail={clientData?.email || ""}
                    hasListing={hasListing!}
                    clientId={clientData?.id || null}
                    clientNdi={ndi}
                    onSubmitted={() => setDone(true)}
                  />
                )}
              </motion.div>
            </AnimatePresence>

            {/* Nav buttons */}
            {step !== "intro" && step !== "envoi" && (
              <div className="flex items-center justify-between mt-8 pt-6 border-t border-zinc-200">
                <Button variant="ghost" onClick={goPrev}>
                  <ArrowLeft className="h-4 w-4 mr-1" /> Précédent
                </Button>
                <Button
                  onClick={goNext}
                  className="bg-gradient-to-r from-[#ff006e] to-[#ff5c8a] hover:from-[#e6005f] hover:to-[#e64a7a] text-white"
                >
                  Étape suivante <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            )}
          </GlassCard>
        </div>

        <p className="text-center text-xs text-zinc-400 mt-8">
          🔒 Adamkom n'a jamais accès à votre mot de passe Google. Vous pouvez retirer notre accès à tout moment.
        </p>
      </div>
    </div>
  );
}
