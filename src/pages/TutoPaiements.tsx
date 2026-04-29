import { useState, useEffect, useMemo } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  ArrowRight,
  ExternalLink,
  Sparkles,
  Shield,
  Send,
  PartyPopper,
  CreditCard,
  Lock,
  Eye,
  EyeOff,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { BeginnerGuide } from "@/components/tuto/BeginnerGuide";
import { TutoFAQ } from "@/components/tuto/TutoFAQ";
import {
  PAYMENT_PROVIDERS,
  PROVIDER_KEYS_ORDER,
  PAYMENT_FAQ,
  type PaymentProviderKey,
  type ProviderConfig,
} from "@/lib/payment-providers";
import logo from "@/assets/logo.webp";

const submissionSchema = z.object({
  company_name: z.string().trim().min(2, "Nom requis").max(120),
  contact_email: z.string().trim().email("Email invalide").max(255),
  contact_name: z.string().trim().max(120).optional().or(z.literal("")),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});

function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-border/40 bg-background/70 backdrop-blur-xl shadow-[0_10px_40px_-15px_rgba(255,0,110,0.15)] ${className}`}
    >
      {children}
    </div>
  );
}

function ProviderCard({
  provider,
  selected,
  onClick,
}: {
  provider: ProviderConfig;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex flex-col items-start gap-3 rounded-xl border p-4 text-left transition-all hover:scale-[1.02] hover:shadow-lg ${
        selected
          ? "border-primary bg-primary/5 shadow-md ring-2 ring-primary/30"
          : "border-border bg-background/60 hover:border-primary/40"
      }`}
    >
      <div className="flex w-full items-center justify-between">
        <div className="flex h-10 items-center">
          <img
            src={provider.logoUrl}
            alt={provider.name}
            className="h-8 max-w-[120px] object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        </div>
        {selected && <CheckCircle2 className="h-5 w-5 text-primary" />}
      </div>
      <div>
        <div className="font-semibold text-foreground">{provider.name}</div>
        <div className="text-xs text-muted-foreground line-clamp-2">{provider.tagline}</div>
      </div>
      <Badge variant="outline" className="text-[10px]">
        {provider.pricing.split("·")[0].trim()}
      </Badge>
    </button>
  );
}

function CredentialInput({
  field,
  value,
  onChange,
}: {
  field: { key: string; label: string; placeholder: string; required?: boolean; type?: string; helpText?: string };
  value: string;
  onChange: (v: string) => void;
}) {
  const [show, setShow] = useState(false);
  const isPassword = field.type === "password";
  return (
    <div className="space-y-1.5">
      <Label className="text-foreground text-sm">
        {field.label} {field.required && <span className="text-primary">*</span>}
      </Label>
      <div className="relative">
        <Input
          type={isPassword && !show ? "password" : "text"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          className="bg-background text-foreground border-input pr-10 font-mono text-sm"
          autoComplete="off"
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow(!show)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>
      {field.helpText && (
        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
          <Info className="h-3 w-3" /> {field.helpText}
        </p>
      )}
    </div>
  );
}

export default function TutoPaiements() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const { toast } = useToast();

  const [invitation, setInvitation] = useState<any>(null);
  const [selectedProvider, setSelectedProvider] = useState<PaymentProviderKey>("stripe");
  const [environment, setEnvironment] = useState<"test" | "live">("test");
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [companyName, setCompanyName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactName, setContactName] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const provider = PAYMENT_PROVIDERS[selectedProvider];

  useEffect(() => {
    if (!token) return;
    (async () => {
      const { data } = await supabase
        .from("payment_invitations")
        .select("*")
        .eq("token", token)
        .maybeSingle();
      if (data) {
        setInvitation(data);
        setCompanyName(data.company_name || "");
        setContactEmail(data.contact_email || "");
        setContactName(data.contact_name || "");
      }
    })();
  }, [token]);

  // Reset credentials when changing provider/env
  useEffect(() => {
    setCredentials({});
  }, [selectedProvider, environment]);

  const fields = environment === "test" ? provider.testFields : provider.liveFields;
  const steps = environment === "test" ? provider.testSteps : provider.liveSteps;

  async function handleSubmit() {
    const baseValidation = submissionSchema.safeParse({
      company_name: companyName,
      contact_email: contactEmail,
      contact_name: contactName,
      notes,
    });
    if (!baseValidation.success) {
      toast({
        variant: "destructive",
        title: "Champs invalides",
        description: baseValidation.error.errors[0].message,
      });
      return;
    }

    // Check required credentials
    const missing = fields.filter((f) => f.required && !credentials[f.key]?.trim());
    if (missing.length > 0) {
      toast({
        variant: "destructive",
        title: "Clés manquantes",
        description: `Renseignez : ${missing.map((m) => m.label).join(", ")}`,
      });
      return;
    }

    if (environment === "live" && !provider.hasTestMode) {
      // helloasso skips
    }

    setSubmitting(true);

    const { error } = await supabase.from("payment_credentials").insert({
      client_id: invitation?.client_id || null,
      client_ndi: invitation?.client_ndi || null,
      company_name: companyName,
      contact_email: contactEmail,
      contact_name: contactName || null,
      provider: selectedProvider,
      environment,
      credentials,
      notes: notes || null,
      status: "recu",
      submitted_via: token ? "invitation" : "public_form",
    });

    if (error) {
      setSubmitting(false);
      toast({
        variant: "destructive",
        title: "Erreur d'envoi",
        description: error.message,
      });
      return;
    }

    // Send confirmation email
    try {
      await supabase.functions.invoke("send-payment-confirmation", {
        body: {
          recipientEmail: contactEmail,
          recipientName: contactName || companyName,
          companyName,
          providers: [selectedProvider],
          environment,
        },
      });
    } catch (e) {
      console.warn("Email confirmation failed", e);
    }

    // Mark invitation as completed
    if (invitation?.id) {
      await supabase
        .from("payment_invitations")
        .update({ completed_at: new Date().toISOString() })
        .eq("id", invitation.id);
    }

    setSubmitting(false);
    setSubmitted(true);
    toast({
      title: "Clés envoyées avec succès 🎉",
      description: "Notre équipe va prendre le relais sous 24h.",
    });
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-full max-w-lg"
        >
          <GlassCard className="p-8 text-center">
            <PartyPopper className="mx-auto h-16 w-16 text-primary mb-4" />
            <h1 className="text-2xl font-bold text-foreground mb-3">Vos clés sont bien reçues !</h1>
            <p className="text-muted-foreground mb-2">
              Un email de confirmation a été envoyé à <strong className="text-foreground">{contactEmail}</strong>.
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              Notre équipe traite votre demande sous 24h ouvrées et reviendra vers vous pour les tests.
            </p>
            <div className="flex flex-col gap-2">
              <Button
                onClick={() => {
                  setSubmitted(false);
                  setCredentials({});
                  setNotes("");
                }}
                variant="outline"
              >
                Envoyer un autre moyen de paiement
              </Button>
            </div>
          </GlassCard>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <header className="border-b border-border/40 bg-background/70 backdrop-blur-xl sticky top-0 z-30">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt="Adamkom" className="h-8" />
          </Link>
          <Badge variant="outline" className="gap-1">
            <Lock className="h-3 w-3" /> Connexion sécurisée
          </Badge>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
            <Sparkles className="h-3 w-3 mr-1" /> Activez vos paiements en ligne
          </Badge>
          <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-3 tracking-tight">
            Acceptez les paiements{" "}
            <span className="bg-gradient-to-r from-primary to-pink-500 bg-clip-text text-transparent">
              en quelques minutes
            </span>
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto text-base md:text-lg">
            Choisissez votre solution de paiement, suivez le tuto pas à pas, et envoyez-nous vos clés API.
            Nous configurons tout pour vous.
          </p>
        </motion.div>

        {/* Provider selector */}
        <GlassCard className="p-5 md:p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard className="h-5 w-5 text-primary" />
            <h2 className="font-semibold text-foreground">1. Choisissez votre solution de paiement</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {PROVIDER_KEYS_ORDER.map((key) => (
              <ProviderCard
                key={key}
                provider={PAYMENT_PROVIDERS[key]}
                selected={selectedProvider === key}
                onClick={() => setSelectedProvider(key)}
              />
            ))}
          </div>
        </GlassCard>

        {/* Provider details + steps + form */}
        <motion.div
          key={selectedProvider}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid lg:grid-cols-5 gap-6"
        >
          {/* Left: Steps */}
          <div className="lg:col-span-3 space-y-6">
            <GlassCard className="p-5 md:p-6">
              <div className="flex items-start gap-4 mb-4">
                <div
                  className="flex h-14 w-24 items-center justify-center rounded-lg bg-white p-2 border border-border"
                  style={{ boxShadow: `0 0 0 1px ${provider.color}20` }}
                >
                  <img src={provider.logoUrl} alt={provider.name} className="max-h-full max-w-full object-contain" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-foreground">{provider.name}</h3>
                  <p className="text-sm text-muted-foreground">{provider.tagline}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    <span className="font-medium">Tarifs :</span> {provider.pricing}
                  </p>
                </div>
              </div>

              <p className="text-sm text-foreground/80 mb-4">{provider.description}</p>

              <div className="flex flex-wrap gap-2 mb-4">
                {provider.bestFor.map((b) => (
                  <Badge key={b} variant="secondary" className="text-[11px]">
                    {b}
                  </Badge>
                ))}
              </div>

              {provider.news && (
                <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 text-xs text-foreground mb-4">
                  {provider.news}
                </div>
              )}

              <a
                href={provider.signupUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5" /> Créer un compte {provider.name}
              </a>
            </GlassCard>

            <GlassCard className="p-5 md:p-6">
              <Tabs value={environment} onValueChange={(v) => setEnvironment(v as "test" | "live")}>
                <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                  <h3 className="font-semibold text-foreground">2. Suivez les étapes</h3>
                  <TabsList>
                    {provider.hasTestMode && <TabsTrigger value="test">🧪 TEST</TabsTrigger>}
                    <TabsTrigger value="live">🚀 PRODUCTION</TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="test" className="space-y-3">
                  {steps.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      {provider.name} ne propose pas de mode TEST. Passez directement en production.
                    </p>
                  )}
                  {provider.testSteps.map((step, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm">
                        {i + 1}
                      </div>
                      <div>
                        <div className="font-medium text-foreground text-sm">{step.title}</div>
                        <div className="text-xs text-muted-foreground">{step.description}</div>
                        {step.link && (
                          <a
                            href={step.link}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1"
                          >
                            <ExternalLink className="h-3 w-3" /> Ouvrir
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </TabsContent>

                <TabsContent value="live" className="space-y-3">
                  {provider.liveSteps.map((step, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm">
                        {i + 1}
                      </div>
                      <div>
                        <div className="font-medium text-foreground text-sm">{step.title}</div>
                        <div className="text-xs text-muted-foreground">{step.description}</div>
                        {step.link && (
                          <a
                            href={step.link}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1"
                          >
                            <ExternalLink className="h-3 w-3" /> Ouvrir
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </TabsContent>
              </Tabs>
            </GlassCard>

            {provider.beginnerGuide && provider.beginnerGuide.length > 0 && (
              <GlassCard className="p-5 md:p-6">
                <BeginnerGuide
                  title={`Guide ultra-débutant ${provider.name}`}
                  intro="Si vous n'avez jamais créé de compte de paiement en ligne, suivez ces étapes pas-à-pas. Pensez à préparer vos documents avant de commencer."
                  steps={provider.beginnerGuide}
                  accentColor={provider.color}
                />
              </GlassCard>
            )}
          </div>

          {/* Right: Form */}
          <div className="lg:col-span-2">
            <GlassCard className="p-5 md:p-6 lg:sticky lg:top-24">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-foreground">3. Envoyez vos clés en sécurité</h3>
              </div>

              <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 p-3 mb-4">
                <p className="text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
                  <Lock className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  Vos clés sont chiffrées et accessibles uniquement par les administrateurs Adamkom.
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <Label className="text-foreground text-sm">Nom de l'entreprise *</Label>
                  <Input
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Ex: Ma Société"
                    className="bg-background text-foreground"
                  />
                </div>
                <div>
                  <Label className="text-foreground text-sm">Email de contact *</Label>
                  <Input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="vous@entreprise.com"
                    className="bg-background text-foreground"
                  />
                </div>
                <div>
                  <Label className="text-foreground text-sm">Votre nom</Label>
                  <Input
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="Prénom Nom"
                    className="bg-background text-foreground"
                  />
                </div>

                <div className="border-t border-border pt-3 mt-3">
                  <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
                    Clés {provider.name} ({environment.toUpperCase()})
                  </p>
                  {fields.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Pas de mode {environment} pour ce provider.</p>
                  ) : (
                    <div className="space-y-3">
                      {fields.map((field) => (
                        <CredentialInput
                          key={field.key}
                          field={field}
                          value={credentials[field.key] || ""}
                          onChange={(v) => setCredentials((c) => ({ ...c, [field.key]: v }))}
                        />
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <Label className="text-foreground text-sm">Notes / précisions (optionnel)</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Ex: produits à vendre, devises, abonnements..."
                    rows={3}
                    className="bg-background text-foreground"
                  />
                </div>

                <Button
                  onClick={handleSubmit}
                  disabled={submitting || fields.length === 0}
                  className="w-full"
                  size="lg"
                >
                  {submitting ? (
                    "Envoi en cours..."
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Envoyer mes clés en sécurité
                    </>
                  )}
                </Button>

                <p className="text-[11px] text-muted-foreground text-center">
                  En envoyant, vous acceptez que Adamkom configure ces moyens de paiement pour votre compte.
                </p>
              </div>
            </GlassCard>
          </div>
        </motion.div>

        <div className="mt-12">
          <TutoFAQ items={PAYMENT_FAQ} title="❓ Questions fréquentes des clients" />
        </div>

        <div className="text-center mt-10 text-xs text-muted-foreground">
          <p>
            Une question ? Contactez-nous sur{" "}
            <a href="mailto:contact@adamkom.com" className="text-primary hover:underline">
              contact@adamkom.com
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}
