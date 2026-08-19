import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  CheckCircle2,
  MessageCircle,
  ExternalLink,
  Send,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import logo from "@/assets/logo.webp";

const STEPS: { title: string; desc: React.ReactNode }[] = [
  {
    title: "Créez votre compte Meta Business",
    desc: (
      <>
        Rendez-vous sur{" "}
        <Ext href="https://business.facebook.com/">business.facebook.com</Ext> et créez un compte au
        nom de votre entreprise (nom légal + adresse).
      </>
    ),
  },
  {
    title: "Activez WhatsApp",
    desc: (
      <>
        Dans <strong>Paramètres → Comptes → Comptes WhatsApp</strong>, cliquez sur{" "}
        <strong>Ajouter</strong> et suivez l'assistant.
      </>
    ),
  },
  {
    title: "Ajoutez et vérifiez votre numéro",
    desc: (
      <>
        Utilisez un numéro <strong>qui n'est pas déjà sur WhatsApp</strong>. Vous recevrez un code
        par SMS ou appel pour le valider.
      </>
    ),
  },
  {
    title: "Envoyez-nous vos infos",
    desc: <>Remplissez le formulaire ci-dessous, on s'occupe de tout le reste.</>,
  },
];

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

export default function TutoWhatsAppBusiness() {
  const [params] = useSearchParams();
  const clientId = params.get("client_id") || undefined;

  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [waNumber, setWaNumber] = useState("");
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim() || !email.trim()) {
      toast.error("Le nom de votre société et votre email sont obligatoires");
      return;
    }
    setLoading(true);
    try {
      const { error } = await (supabase as any).rpc("submit_whatsapp_onboarding_public", {
        p_company_name: companyName.trim(),
        p_contact_email: email.trim(),
        p_whatsapp_number: waNumber.trim() || null,
        p_phone_number_id: phoneNumberId.trim() || null,
        p_access_token: accessToken.trim() || null,
        p_notes: notes.trim() || null,
        p_client_id: clientId || null,
      });
      if (error) throw error;
      setDone(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
      toast.success("Merci ! Vos informations nous sont bien parvenues.");
    } catch (err: any) {
      toast.error(err?.message || "Erreur lors de l'envoi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <header className="sticky top-0 z-20 backdrop-blur-xl bg-background/70 border-b border-border/50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt="Adamkom" className="h-8 w-auto" />
            <span className="font-display font-bold text-lg hidden sm:inline">Adamkom</span>
          </Link>
          <Badge variant="secondary" className="gap-1">
            <MessageCircle className="h-3 w-3" />
            WhatsApp Business
          </Badge>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        {done ? (
          <div className="text-center py-16">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500 mb-4">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h1 className="text-3xl font-display font-bold">Merci !</h1>
            <p className="mt-3 text-muted-foreground">
              Nous avons bien reçu vos informations. Notre équipe revient vers vous très vite.
            </p>
          </div>
        ) : (
          <>
            <div className="text-center mb-10">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4">
                <MessageCircle className="h-7 w-7" />
              </div>
              <h1 className="text-3xl sm:text-4xl font-display font-bold tracking-tight">
                WhatsApp Business en 4 étapes
              </h1>
              <p className="mt-2 text-muted-foreground max-w-xl mx-auto">
                Simple et rapide : créez votre compte, puis envoyez-nous vos informations juste en
                dessous.
              </p>
            </div>

            <ol className="space-y-3 mb-10">
              {STEPS.map((s, i) => (
                <li
                  key={i}
                  className="flex gap-4 rounded-2xl border border-border/60 bg-card/50 backdrop-blur p-4 sm:p-5"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">
                    {i + 1}
                  </div>
                  <div className="min-w-0">
                    <h2 className="font-semibold mb-1">{s.title}</h2>
                    <div className="text-sm text-muted-foreground leading-relaxed">{s.desc}</div>
                  </div>
                </li>
              ))}
            </ol>

            <form
              onSubmit={submit}
              className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur p-5 sm:p-7 space-y-4"
            >
              <div>
                <h2 className="text-xl font-display font-bold">Vos informations</h2>
                <p className="text-sm text-muted-foreground">
                  Remplissez au minimum votre société et votre email. Les champs techniques sont
                  facultatifs — si vous ne les avez pas, laissez-les vides, nous vous aiderons.
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="wa-company">Nom de votre société *</Label>
                  <Input
                    id="wa-company"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Ex : Boutique Réunion"
                    maxLength={150}
                    required
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="wa-email">Votre email *</Label>
                  <Input
                    id="wa-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="contact@masociete.com"
                    maxLength={255}
                    required
                    className="mt-1.5"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="wa-number">Numéro WhatsApp Business</Label>
                <Input
                  id="wa-number"
                  value={waNumber}
                  onChange={(e) => setWaNumber(e.target.value)}
                  placeholder="+262 692 00 00 00"
                  maxLength={40}
                  className="mt-1.5"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="wa-pnid">Phone Number ID (si vous l'avez)</Label>
                  <Input
                    id="wa-pnid"
                    value={phoneNumberId}
                    onChange={(e) => setPhoneNumberId(e.target.value)}
                    placeholder="Facultatif"
                    maxLength={120}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="wa-token">Access Token (si vous l'avez)</Label>
                  <Input
                    id="wa-token"
                    value={accessToken}
                    onChange={(e) => setAccessToken(e.target.value)}
                    placeholder="Facultatif"
                    maxLength={500}
                    className="mt-1.5"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="wa-notes">Remarques</Label>
                <Textarea
                  id="wa-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Une question, un blocage ?"
                  maxLength={1000}
                  className="mt-1.5"
                />
              </div>

              <div className="flex items-start gap-2 text-xs text-muted-foreground">
                <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-500" />
                Vos informations sont transmises de manière sécurisée et utilisées uniquement pour
                configurer votre WhatsApp Business.
              </div>

              <Button type="submit" size="lg" className="w-full gap-2" disabled={loading}>
                <Send className="h-4 w-4" />
                {loading ? "Envoi en cours…" : "Envoyer mes informations"}
              </Button>
            </form>
          </>
        )}
      </main>

      <footer className="max-w-3xl mx-auto px-4 sm:px-6 py-8 text-center text-sm text-muted-foreground">
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
