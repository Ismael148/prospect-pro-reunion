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
  Sparkles,
  Facebook,
  Building2,
  Link2,
  Mail,
  KeyRound,
  Send,
  PartyPopper,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { TutoFAQ } from "@/components/tuto/TutoFAQ";
import { FACEBOOK_FAQ } from "@/lib/tuto-faq";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { z } from "zod";
import { useSubmitFbOnboarding, useClientByNdi } from "@/hooks/use-fb-onboarding";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo.webp";

/* ──────────────────────────────────────────────────────────
   Steps content
   ────────────────────────────────────────────────────────── */

type StepKey =
  | "intro"
  | "page"
  | "bm"
  | "rattach"
  | "id"
  | "envoi"
  | "merci";

const STEPS: { key: StepKey; label: string; time?: string }[] = [
  { key: "intro", label: "Avez-vous une page FB ?", time: "30 sec" },
  { key: "page", label: "Créer votre page", time: "5 min" },
  { key: "bm", label: "Créer le Business Manager", time: "3 min" },
  { key: "rattach", label: "Rattacher la page", time: "2 min" },
  { key: "id", label: "Trouver l'ID du BM", time: "30 sec" },
  { key: "envoi", label: "Envoyer à Adamkom", time: "1 min" },
];

/* ──────────────────────────────────────────────────────────
   Validation schema for the final form
   ────────────────────────────────────────────────────────── */

const submissionSchema = z.object({
  company_name: z.string().trim().min(2, "Nom requis").max(120),
  contact_email: z.string().trim().email("Email invalide").max(255),
  business_manager_email: z.string().trim().email("Email du BM invalide").max(255),
  business_manager_id: z.string().trim().max(50).optional().or(z.literal("")),
  fb_page_url: z.string().trim().url("URL invalide").max(300).optional().or(z.literal("")),
  fb_page_name: z.string().trim().max(120).optional().or(z.literal("")),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});

/* ──────────────────────────────────────────────────────────
   Reusable bits
   ────────────────────────────────────────────────────────── */

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

function Step1({ onPick }: { onPick: (hasPage: boolean) => void }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl md:text-3xl font-bold text-zinc-900">Bonjour 👋</h2>
        <p className="mt-2 text-zinc-600">
          On va vous accompagner pas-à-pas pour préparer votre <strong>Business Manager Facebook</strong>{" "}
          afin que l'équipe Adamkom puisse gérer vos publications. <br />
          C'est rapide, gratuit, et tout reste dans votre nom.
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
            <span className="font-bold text-zinc-900">J'ai déjà une page</span>
          </div>
          <p className="text-sm text-zinc-600">
            Parfait, on saute la création et on va directement au Business Manager.
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
            Aucun souci, on vous montre comment créer votre page FB en 5 min.
          </p>
          <span className="mt-3 inline-flex items-center text-sm font-semibold text-[#ff006e] group-hover:translate-x-1 transition-transform">
            Créer ma page <ArrowRight className="ml-1 h-4 w-4" />
          </span>
        </button>
      </div>
    </div>
  );
}

function Step2_CreatePage() {
  return (
    <div className="space-y-5">
      <div>
        <Badge className="bg-[#ff006e]/10 text-[#ff006e] hover:bg-[#ff006e]/10 border-0">5 min</Badge>
        <h2 className="text-2xl md:text-3xl font-bold text-zinc-900 mt-2">Créer votre page Facebook</h2>
        <p className="mt-2 text-zinc-600">Suivez ces 6 étapes simples sur Facebook.</p>
      </div>

      <ol className="space-y-3">
        {[
          {
            t: "Allez sur la page de création",
            d: (
              <>
                Ouvrez{" "}
                <a
                  href="https://www.facebook.com/pages/create"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#ff006e] font-semibold inline-flex items-center gap-1 hover:underline"
                >
                  facebook.com/pages/create <ExternalLink className="h-3 w-3" />
                </a>
                . Connectez-vous avec votre compte Facebook personnel.
              </>
            ),
          },
          { t: "Tapez le nom de votre entreprise", d: "Exactement comme vous voulez qu'il apparaisse." },
          {
            t: "Choisissez une catégorie",
            d: "Ex : Restaurant, Coiffeur, Boutique, Services aux entreprises, etc.",
          },
          { t: "Ajoutez une photo de profil (logo)", d: "Format carré, minimum 320×320 px." },
          {
            t: "Ajoutez une photo de couverture",
            d: "Format paysage, minimum 820×312 px. Mettez une photo de votre vitrine, vos produits ou un design pro.",
          },
          {
            t: "Cliquez sur « Créer la page »",
            d: (
              <>
                Voilà, votre page est en ligne 🎉. Notez l'URL (ex :{" "}
                <a
                  href="https://facebook.com/votre-entreprise"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#ff006e] font-semibold inline-flex items-center gap-1 hover:underline"
                >
                  facebook.com/votre-entreprise <ExternalLink className="h-3 w-3" />
                </a>
                ).
              </>
            ),
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

      <MiniMockup label="facebook.com/pages/create">
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <Facebook className="h-5 w-5 text-blue-600" />
            <span className="font-bold text-zinc-800">Créer une nouvelle page</span>
          </div>
          <div className="space-y-2">
            <div className="h-3 bg-zinc-200 rounded w-1/3" />
            <div className="h-9 bg-white border-2 border-[#ff006e] rounded-lg flex items-center px-3 text-sm text-zinc-700">
              Mon Entreprise SARL
            </div>
            <div className="h-3 bg-zinc-200 rounded w-1/4 mt-3" />
            <div className="h-9 bg-white border border-zinc-300 rounded-lg flex items-center px-3 text-sm text-zinc-500">
              Restaurant
            </div>
          </div>
          <button className="w-full mt-3 bg-blue-600 text-white text-sm font-semibold py-2 rounded-lg">
            Créer la page
          </button>
        </div>
      </MiniMockup>
    </div>
  );
}

function Step3_CreateBM() {
  return (
    <div className="space-y-5">
      <div>
        <Badge className="bg-[#ff006e]/10 text-[#ff006e] hover:bg-[#ff006e]/10 border-0">3 min</Badge>
        <h2 className="text-2xl md:text-3xl font-bold text-zinc-900 mt-2">Créer votre Business Manager</h2>
        <p className="mt-2 text-zinc-600">
          Le Business Manager (BM) est l'espace pro de Facebook qui vous permet de gérer votre page et de
          déléguer des accès à une agence (nous !) sans donner votre mot de passe.
        </p>
      </div>

      <ol className="space-y-3">
        {[
          {
            t: "Ouvrez Business Manager",
            d: (
              <>
                Allez sur{" "}
                <a
                  href="https://business.facebook.com/overview"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#ff006e] font-semibold inline-flex items-center gap-1 hover:underline"
                >
                  business.facebook.com/overview <ExternalLink className="h-3 w-3" />
                </a>
              </>
            ),
          },
          { t: "Cliquez « Créer un compte »", d: "Bouton bleu en haut à droite." },
          {
            t: "Renseignez les infos",
            d: "Nom de votre entreprise, votre nom, votre email professionnel.",
          },
          {
            t: "Validez votre email",
            d: "Facebook vous envoie un lien de confirmation. Cliquez dessus.",
          },
          {
            t: "C'est fait ✅",
            d: "Vous avez maintenant un Business Manager actif. On va y rattacher votre page à l'étape suivante.",
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

      <MiniMockup label="business.facebook.com">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-blue-700" />
            <span className="font-bold text-zinc-800">Meta Business Suite</span>
          </div>
          <button className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg font-semibold">
            + Créer un compte
          </button>
        </div>
        <div className="rounded-lg border-2 border-dashed border-[#ff006e] bg-[#ff006e]/5 p-4 text-center">
          <p className="text-sm font-semibold text-zinc-800">Bienvenue dans votre BM</p>
          <p className="text-xs text-zinc-500 mt-1">Aucune page rattachée pour le moment</p>
        </div>
      </MiniMockup>
    </div>
  );
}

function Step4_Attach() {
  return (
    <div className="space-y-5">
      <div>
        <Badge className="bg-[#ff006e]/10 text-[#ff006e] hover:bg-[#ff006e]/10 border-0">2 min</Badge>
        <h2 className="text-2xl md:text-3xl font-bold text-zinc-900 mt-2">Rattacher votre page au BM</h2>
        <p className="mt-2 text-zinc-600">Maintenant on connecte votre page Facebook à votre Business Manager.</p>
      </div>

      <ol className="space-y-3">
        {[
          { t: "Dans le BM, cliquez sur ⚙️ Paramètres", d: "Icône engrenage en bas à gauche." },
          { t: "Menu de gauche → « Comptes » → « Pages »", d: "Vous arrivez sur la liste des pages." },
          { t: "Bouton bleu « Ajouter »", d: "Choisissez « Ajouter une page » (PAS « Demander l'accès »)." },
          { t: "Tapez le nom de votre page", d: "Sélectionnez-la dans la liste qui s'affiche." },
          { t: "Confirmez", d: "Votre page est désormais rattachée à votre BM ✅" },
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

      <MiniMockup label="Paramètres → Comptes → Pages">
        <div className="flex gap-3">
          <div className="w-24 space-y-1.5">
            <div className="h-6 bg-zinc-200 rounded text-[10px] flex items-center px-2 text-zinc-600">Comptes</div>
            <div className="h-6 bg-[#ff006e] rounded text-[10px] flex items-center px-2 text-white font-semibold">
              Pages
            </div>
            <div className="h-6 bg-zinc-100 rounded text-[10px] flex items-center px-2 text-zinc-500">Pixels</div>
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-zinc-700">Pages</span>
              <button className="text-[10px] bg-blue-600 text-white px-2 py-1 rounded font-semibold">
                + Ajouter
              </button>
            </div>
            <div className="h-12 rounded border-2 border-[#ff006e] bg-[#ff006e]/5 flex items-center px-3">
              <Facebook className="h-4 w-4 text-blue-600 mr-2" />
              <span className="text-xs font-semibold text-zinc-800">Mon Entreprise SARL</span>
            </div>
          </div>
        </div>
      </MiniMockup>

      <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 flex gap-3">
        <HelpCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-amber-900">Important</p>
          <p className="text-xs text-amber-800 mt-1">
            Choisissez bien <strong>« Ajouter une page »</strong> (pas « Demander l'accès »), car c'est VOTRE page,
            pas celle d'un client.
          </p>
        </div>
      </div>
    </div>
  );
}

function Step5_FindId() {
  return (
    <div className="space-y-5">
      <div>
        <Badge className="bg-[#ff006e]/10 text-[#ff006e] hover:bg-[#ff006e]/10 border-0">30 sec</Badge>
        <h2 className="text-2xl md:text-3xl font-bold text-zinc-900 mt-2">Trouver l'ID de votre Business Manager</h2>
        <p className="mt-2 text-zinc-600">
          On a besoin de cet identifiant unique (<strong>15 à 16 chiffres</strong>) pour vous rattacher dans notre système.
        </p>
      </div>

      {/* Big visual comparison Page ID vs BM ID */}
      <div className="rounded-2xl border-2 border-amber-400 bg-gradient-to-br from-amber-50 to-orange-50 p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="h-10 w-10 rounded-full bg-amber-500 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xl font-bold">!</span>
          </div>
          <div>
            <p className="font-bold text-amber-950 text-base">⚠️ À ne SURTOUT pas confondre</p>
            <p className="text-sm text-amber-900 mt-0.5">
              Beaucoup de gens se trompent ici. Lisez bien la différence ci-dessous 👇
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          {/* WRONG — Page ID */}
          <div className="rounded-xl border-2 border-red-300 bg-white p-4 relative overflow-hidden">
            <span className="absolute top-2 right-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              ❌ PAS ÇA
            </span>
            <div className="flex items-center gap-2 mb-2">
              <Facebook className="h-5 w-5 text-blue-600" />
              <span className="font-bold text-zinc-900 text-sm">ID de la PAGE Facebook</span>
            </div>
            <p className="text-xs text-zinc-600 mb-3">
              Identifie uniquement votre <strong>page publique</strong> (celle que les gens visitent et likent).
            </p>
            <div className="rounded-lg bg-red-50 border border-red-200 p-2 mb-2">
              <p className="text-[10px] text-red-700 font-semibold uppercase tracking-wide">Où on le trouve</p>
              <p className="text-xs text-zinc-700 mt-0.5">Sur votre page → « À propos » → « Informations sur la Page »</p>
            </div>
            <div className="font-mono text-sm bg-zinc-100 text-zinc-500 line-through rounded px-2 py-1 text-center">
              100123456789012
            </div>
          </div>

          {/* RIGHT — BM ID */}
          <div className="rounded-xl border-2 border-emerald-400 bg-white p-4 relative overflow-hidden shadow-md">
            <span className="absolute top-2 right-2 bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              ✅ C'EST ÇA
            </span>
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="h-5 w-5 text-emerald-700" />
              <span className="font-bold text-zinc-900 text-sm">ID du BUSINESS MANAGER</span>
            </div>
            <p className="text-xs text-zinc-600 mb-3">
              Identifie votre <strong>compte entreprise Meta</strong> (le « coffre » qui contient la page).
            </p>
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-2 mb-2">
              <p className="text-[10px] text-emerald-800 font-semibold uppercase tracking-wide">Où on le trouve</p>
              <p className="text-xs text-zinc-700 mt-0.5">
                <a
                  href="https://business.facebook.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#ff006e] font-semibold inline-flex items-center gap-1 hover:underline"
                >
                  business.facebook.com <ExternalLink className="h-3 w-3" />
                </a>{" "}
                → ⚙️ Paramètres → « Infos sur l'entreprise »
              </p>
            </div>
            <div className="font-mono text-sm bg-emerald-50 text-emerald-900 font-bold rounded px-2 py-1 text-center border border-emerald-200">
              1234567890123456
            </div>
          </div>
        </div>

        <p className="text-xs text-amber-900 mt-3 text-center">
          💡 Astuce mémo : <strong>Page ID</strong> = identifiant public · <strong>BM ID</strong> = identifiant pro (celui qu'on demande)
        </p>
      </div>

      <ol className="space-y-3">
        {[
          { t: <>Allez sur <a href="https://business.facebook.com" target="_blank" rel="noopener noreferrer" className="text-[#ff006e] font-semibold inline-flex items-center gap-1 hover:underline">business.facebook.com <ExternalLink className="h-3 w-3" /></a></>, d: "Connectez-vous avec le compte qui gère votre BM (PAS la page Facebook publique)." },
          { t: "Cliquez sur ⚙️ Paramètres (en bas à gauche)", d: "Puis ouvrez « Paramètres de l'entreprise »." },
          { t: "Menu gauche → « Infos sur l'entreprise »", d: "Section « Compte ». ⚠️ Pas « Pages » — sinon vous tomberez sur l'ID de la page, pas du BM." },
          { t: "Repérez « ID de l'entreprise »", d: "Affiché en haut, sous le nom de votre Portefeuille business. 15 à 16 chiffres." },
          { t: "Copiez-le 📋", d: "Collez-le à l'étape suivante du formulaire." },
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

      <div className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm">
        <p className="text-xs text-zinc-500 mb-2 font-medium">
          📸 Sur la capture ci-dessous, ce qui est entouré est l'ID de la <strong>Page Facebook</strong> (à NE PAS envoyer).
          Le bon ID — celui du Business Manager — se trouve au même type d'emplacement, mais dans « Infos sur l'entreprise » du BM.
        </p>
        <img
          src="/tuto/fb-bm-id.png"
          alt="Capture d'écran Meta Business montrant l'ID de la Page Facebook"
          className="w-full rounded-lg border border-zinc-200"
        />
      </div>

      <MiniMockup label="business.facebook.com → Paramètres → Infos sur l'entreprise">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-blue-700" />
            <span className="font-bold text-zinc-800">Mon Entreprise SARL</span>
            <span className="ml-auto text-[10px] text-zinc-400 uppercase">Portefeuille business</span>
          </div>
          <div className="rounded-lg border-2 border-[#ff006e] bg-[#ff006e]/5 p-3 relative">
            <span className="text-[10px] uppercase font-semibold text-zinc-500 tracking-wide">
              ID de l'entreprise (15-16 chiffres) — c'est CELUI-CI
            </span>
            <p className="font-mono text-lg font-bold text-zinc-900 mt-1">1234567890123456</p>
            <span className="absolute -top-2 -right-2 bg-[#ff006e] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              ← copiez ça
            </span>
          </div>
        </div>
      </MiniMockup>
    </div>
  );
}

function Step6_Form({
  prefill,
  hasExistingPage,
  onSent,
}: {
  prefill: { company_name: string; contact_email: string; client_id?: string | null; client_ndi?: string | null };
  hasExistingPage: boolean;
  onSent: () => void;
}) {
  const [form, setForm] = useState({
    company_name: prefill.company_name,
    contact_email: prefill.contact_email,
    business_manager_email: "",
    business_manager_id: "",
    fb_page_url: "",
    fb_page_name: "",
    notes: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const submit = useSubmitFbOnboarding();

  const handleChange = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = submissionSchema.safeParse(form);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      parsed.error.issues.forEach((i) => {
        errs[String(i.path[0])] = i.message;
      });
      setErrors(errs);
      return;
    }
    setErrors({});
    submit.mutate(
      {
        company_name: parsed.data.company_name,
        contact_email: parsed.data.contact_email,
        business_manager_email: parsed.data.business_manager_email,
        business_manager_id: parsed.data.business_manager_id || null,
        fb_page_url: parsed.data.fb_page_url || null,
        fb_page_name: parsed.data.fb_page_name || null,
        notes: parsed.data.notes || null,
        client_id: prefill.client_id ?? null,
        client_ndi: prefill.client_ndi ?? null,
        has_existing_page: hasExistingPage,
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
            console.error("[TutoFacebook] confirmation email failed", err);
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
        <h2 className="text-2xl md:text-3xl font-bold text-zinc-900 mt-2">
          Envoyez vos infos à Adamkom
        </h2>
        <p className="mt-2 text-zinc-600">
          Une fois ce formulaire envoyé, notre équipe vous recontacte sous 24h pour finaliser le rattachement.
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
            className="mt-1.5 bg-white border-zinc-300 text-zinc-900 placeholder:text-zinc-400 focus-visible:ring-[#ff006e]"
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
            className="mt-1.5 bg-white border-zinc-300 text-zinc-900 placeholder:text-zinc-400 focus-visible:ring-[#ff006e]"
            maxLength={255}
          />
          {errors.contact_email && <p className="text-xs text-red-600 mt-1">{errors.contact_email}</p>}
        </div>

        <div className="sm:col-span-2">
          <Label htmlFor="business_manager_email" className="flex items-center gap-1.5">
            <Mail className="h-3.5 w-3.5" /> Email rattaché au Business Manager *
          </Label>
          <Input
            id="business_manager_email"
            type="email"
            value={form.business_manager_email}
            onChange={(e) => handleChange("business_manager_email", e.target.value)}
            className="mt-1.5 bg-white border-zinc-300 text-zinc-900 placeholder:text-zinc-400 focus-visible:ring-[#ff006e]"
            maxLength={255}
            placeholder="celui utilisé pour créer le BM"
          />
          {errors.business_manager_email && (
            <p className="text-xs text-red-600 mt-1">{errors.business_manager_email}</p>
          )}
        </div>

        <div className="sm:col-span-2">
          <Label htmlFor="business_manager_id" className="flex items-center gap-1.5">
            <KeyRound className="h-3.5 w-3.5" /> ID du Business Manager
          </Label>
          <Input
            id="business_manager_id"
            value={form.business_manager_id}
            onChange={(e) => handleChange("business_manager_id", e.target.value)}
            className="mt-1.5 font-mono bg-white border-zinc-300 text-zinc-900 placeholder:text-zinc-400 focus-visible:ring-[#ff006e]"
            placeholder="ex : 123456789012345"
            maxLength={50}
          />
          <p className="text-[11px] text-zinc-500 mt-1">
            15-16 chiffres trouvés à l'étape 5 — <strong className="text-amber-700">⚠️ pas l'ID de votre page Facebook</strong>, mais bien celui du Business Manager (Portefeuille business).
          </p>
        </div>

        <div>
          <Label htmlFor="fb_page_name" className="flex items-center gap-1.5">
            <Facebook className="h-3.5 w-3.5" /> Nom de la page FB
          </Label>
          <Input
            id="fb_page_name"
            value={form.fb_page_name}
            onChange={(e) => handleChange("fb_page_name", e.target.value)}
            className="mt-1.5 bg-white border-zinc-300 text-zinc-900 placeholder:text-zinc-400 focus-visible:ring-[#ff006e]"
            maxLength={120}
          />
        </div>

        <div>
          <Label htmlFor="fb_page_url" className="flex items-center gap-1.5">
            <Link2 className="h-3.5 w-3.5" /> URL de la page FB
          </Label>
          <Input
            id="fb_page_url"
            value={form.fb_page_url}
            onChange={(e) => handleChange("fb_page_url", e.target.value)}
            className="mt-1.5 bg-white border-zinc-300 text-zinc-900 placeholder:text-zinc-400 focus-visible:ring-[#ff006e]"
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
            className="mt-1.5 bg-white border-zinc-300 text-zinc-900 placeholder:text-zinc-400 focus-visible:ring-[#ff006e]"
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
          Vos accès Facebook Business sont arrivés chez Adamkom.
        </p>
      </div>

      <div className="max-w-md mx-auto rounded-2xl border border-zinc-200 bg-white p-5 text-left space-y-2">
        <p className="text-xs uppercase font-bold text-zinc-500 tracking-wide">Récapitulatif</p>
        <ul className="text-sm text-zinc-700 space-y-1.5">
          <li className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
            Informations Business Manager transmises
          </li>
          {email && (
            <li className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-zinc-400 flex-shrink-0" />
              <span className="text-xs text-zinc-500">Confirmation envoyée sur <strong className="text-zinc-700">{email}</strong></span>
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

      <p className="text-xs text-zinc-500 max-w-md mx-auto">
        💡 Pas reçu de mail ? Vérifiez vos spams ou contactez votre conseiller.
      </p>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────
   Main page
   ────────────────────────────────────────────────────────── */

export default function TutoFacebook() {
  const [params] = useSearchParams();
  const ndi = params.get("client");
  const { data: clientPrefill } = useClientByNdi(ndi);

  const [stepIdx, setStepIdx] = useState(0);
  const [hasExistingPage, setHasExistingPage] = useState(true);
  const [done, setDone] = useState(false);

  // skip "create page" if user has one
  const visibleSteps = useMemo(
    () => (hasExistingPage ? STEPS.filter((s) => s.key !== "page") : STEPS),
    [hasExistingPage]
  );
  const current = visibleSteps[stepIdx];

  useEffect(() => {
    document.title = "Tutoriel Facebook Business — Adamkom";
  }, []);

  const goNext = () => setStepIdx((i) => Math.min(i + 1, visibleSteps.length - 1));
  const goPrev = () => setStepIdx((i) => Math.max(i - 1, 0));

  const handleIntroPick = (hasPage: boolean) => {
    setHasExistingPage(hasPage);
    setStepIdx(1);
  };

  return (
    <div className="light min-h-screen bg-zinc-50 relative overflow-hidden text-zinc-900">
      {/* Animated gradient background */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-[#ff006e]/15 blur-[120px]" />
        <div className="absolute top-40 -left-40 h-[400px] w-[400px] rounded-full bg-[#ff5c8a]/10 blur-[100px]" />
      </div>

      {/* Top nav */}
      <header className="border-b border-white/40 bg-white/60 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Adamkom" className="h-8 w-auto" />
            <div className="hidden sm:flex items-center gap-2 text-xs text-zinc-500">
              <Clock className="h-3.5 w-3.5" /> 10 min
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
        {/* Hero */}
        {stepIdx === 0 && !done && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-10"
          >
            <Badge className="bg-[#ff006e]/10 text-[#ff006e] hover:bg-[#ff006e]/10 border-0 mb-4">
              ✨ Tutoriel exclusif client Adamkom
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold text-zinc-900 tracking-tight">
              Préparez votre <br className="sm:hidden" />
              <span className="bg-gradient-to-r from-[#ff006e] to-[#ff5c8a] bg-clip-text text-transparent">
                Facebook Business
              </span>
              <br />
              en 10 min
            </h1>
            <p className="mt-4 text-lg text-zinc-600 max-w-2xl mx-auto">
              Suivez ce guide simple pour qu'Adamkom puisse gérer vos publications. Tout reste dans votre nom et
              sous votre contrôle.
            </p>
            {clientPrefill && (
              <p className="mt-3 text-sm text-zinc-500">
                👋 Bienvenue <strong className="text-zinc-700">{clientPrefill.company_name}</strong>
              </p>
            )}
          </motion.div>
        )}

        <div className="grid md:grid-cols-[260px_1fr] gap-6 md:gap-10">
          {/* Stepper */}
          <aside className="md:sticky md:top-24 md:self-start">
            <GlassCard className="p-5">
              <p className="text-[11px] uppercase font-bold text-zinc-500 tracking-widest mb-3">
                Progression
              </p>
              <ol className="space-y-3">
                {visibleSteps.map((s, i) => {
                  const isActive = i === stepIdx;
                  const isDone = i < stepIdx || done;
                  return (
                    <li
                      key={s.key}
                      className={`flex items-start gap-2.5 cursor-pointer ${
                        isActive ? "" : "opacity-70"
                      }`}
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
                        {s.time && (
                          <p className="text-[10px] text-zinc-500 mt-0.5">{s.time}</p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </GlassCard>
          </aside>

          {/* Content */}
          <main>
            <GlassCard className="p-6 md:p-10 min-h-[500px]">
              <AnimatePresence mode="wait">
                {done ? (
                  <motion.div
                    key="thanks"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
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
                    {current.key === "intro" && <Step1 onPick={handleIntroPick} />}
                    {current.key === "page" && <Step2_CreatePage />}
                    {current.key === "bm" && <Step3_CreateBM />}
                    {current.key === "rattach" && <Step4_Attach />}
                    {current.key === "id" && <Step5_FindId />}
                    {current.key === "envoi" && (
                      <Step6_Form
                        prefill={{
                          company_name: clientPrefill?.company_name || "",
                          contact_email: clientPrefill?.email || "",
                          client_id: clientPrefill?.id ?? null,
                          client_ndi: clientPrefill?.ndi ?? null,
                        }}
                        hasExistingPage={hasExistingPage}
                        onSent={() => setDone(true)}
                      />
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Nav buttons (hide on intro & thanks & form-handled steps) */}
              {!done && current.key !== "intro" && current.key !== "envoi" && (
                <div className="mt-8 pt-6 border-t border-zinc-200 flex justify-between">
                  <Button variant="outline" onClick={goPrev} disabled={stepIdx === 0} className="bg-white border-zinc-300 text-zinc-900 hover:bg-zinc-100 hover:text-zinc-900">
                    <ArrowLeft className="h-4 w-4" /> Retour
                  </Button>
                  <Button
                    onClick={goNext}
                    className="bg-gradient-to-r from-[#ff006e] to-[#ff5c8a] hover:from-[#e6005f] hover:to-[#ff4577] text-white font-semibold shadow-md shadow-[#ff006e]/30"
                  >
                    C'est fait, étape suivante <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </GlassCard>

            {/* Footer note */}
            {!done && (
              <p className="text-center text-xs text-zinc-500 mt-6">
                Besoin d'aide ? Contactez votre conseiller Adamkom au{" "}
                <a href="tel:0262666876" className="text-[#ff006e] font-semibold">
                  0262 66 68 76
                </a>
              </p>
            )}
            <div className="mt-12">
              <TutoFAQ items={FACEBOOK_FAQ} title="❓ Questions fréquentes" />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
