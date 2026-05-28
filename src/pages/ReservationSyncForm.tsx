import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Send, CheckCircle2, CalendarSync, ExternalLink, Link2, Copy, ArrowLeftRight } from "lucide-react";
import logo from "@/assets/logo.webp";

const PLATFORMS = [
  {
    key: "airbnb_url", name: "Airbnb", color: "#FF5A5F",
    logo: "https://cdn.simpleicons.org/airbnb/FF5A5F",
    help: "https://www.airbnb.fr/help/article/99",
    steps: [
      "Connectez-vous sur airbnb.fr → Annonces",
      "Onglet Calendrier → Disponibilités → Synchroniser les calendriers",
      "Section « Exporter le calendrier » → Copier le lien (.ics)",
    ],
    pasteSteps: [
      "Toujours dans Annonces → Calendrier → Synchroniser les calendriers",
      "Cliquez sur « Importer le calendrier »",
      "Donnez un nom (ex: « Mon site web ») puis collez le lien ci-dessous",
      "Validez : Airbnb bloquera automatiquement les dates déjà réservées sur votre site",
    ],
  },
  {
    key: "booking_url", name: "Booking.com", color: "#003580",
    logo: "https://cdn.simpleicons.org/bookingdotcom/003580",
    help: "https://partner.booking.com/fr/aide/tarifs-disponibilites/calendrier/synchroniser-mon-calendrier",
    steps: [
      "Connectez-vous sur admin.booking.com",
      "Tarifs & Disponibilités → Synchronisation de calendrier",
      "Section Exporter → Copier le lien iCal",
    ],
    pasteSteps: [
      "admin.booking.com → Tarifs & Disponibilités → Synchronisation de calendrier",
      "Onglet « Importer un calendrier » → Ajouter une connexion",
      "Nom: « Site web » + collez le lien ci-dessous",
      "Sauvegardez : les réservations de votre site bloqueront Booking",
    ],
  },
  {
    key: "vrbo_url", name: "Vrbo / Abritel", color: "#0F4C81",
    logo: "https://cdn.simpleicons.org/vrbo/0F4C81",
    help: "https://help.vrbo.com/articles/How-do-I-sync-my-calendars",
    steps: [
      "Connectez-vous sur vrbo.com ou abritel.fr",
      "Calendrier → Importer/Exporter",
      "Copier l'URL iCal d'export",
    ],
    pasteSteps: [
      "Calendrier → Importer/Exporter → Importer un calendrier",
      "Nom: « Site web » + collez le lien ci-dessous",
      "Validez : Vrbo synchronisera automatiquement les indisponibilités",
    ],
  },
  {
    key: "gites_url", name: "Gîtes de France", color: "#1F8E3E",
    logo: "https://cdn.simpleicons.org/letterboxd/1F8E3E",
    help: "https://pro.gites-de-france.com/",
    steps: [
      "Espace propriétaire Gîtes de France",
      "Planning → Synchronisation iCal",
      "Copier l'URL d'export iCal",
    ],
    pasteSteps: [
      "Espace propriétaire → Planning → Synchronisation iCal",
      "Section « Importer » → collez le lien ci-dessous",
      "Nommez la source « Site web » et enregistrez",
    ],
  },
  {
    key: "expedia_url", name: "Expedia", color: "#00355F",
    logo: "https://cdn.simpleicons.org/expedia/00355F",
    help: "https://welcome.expediapartnercentral.com/",
    steps: [
      "Expedia Partner Central",
      "Tarifs & Disponibilités → Calendrier",
      "Activer l'export iCal puis copier le lien",
    ],
    pasteSteps: [
      "Partner Central → Tarifs & Disponibilités → Calendrier",
      "Section « Importer un calendrier iCal » → collez le lien ci-dessous",
      "Donnez un nom et validez l'import",
    ],
  },
] as const;

export default function ReservationSyncForm() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [client, setClient] = useState<{ id: string; company_name: string; site_ical_url: string | null } | null>(null);
  const [form, setForm] = useState<Record<string, string>>({
    airbnb_url: "", booking_url: "", vrbo_url: "", gites_url: "", expedia_url: "", notes: "",
  });

  useEffect(() => {
    (async () => {
      if (!token) return;
      const { data, error } = await supabase
        .from("clients")
        .select("id, company_name, site_ical_url")
        .eq("support_token", token)
        .maybeSingle();
      if (error || !data) {
        toast.error("Lien invalide ou expiré");
      } else {
        setClient(data as any);
      }
      setLoading(false);
      if (error || !data) {
        toast.error("Lien invalide ou expiré");
      } else {
        setClient(data);
      }
      setLoading(false);
    })();
  }, [token]);

  const submit = async () => {
    if (!client) return;
    const hasAny = ["airbnb_url", "booking_url", "vrbo_url", "gites_url", "expedia_url"].some(k => form[k]?.trim());
    if (!hasAny) {
      toast.error("Merci de renseigner au moins un lien iCal");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        client_id: client.id,
        airbnb_url: form.airbnb_url?.trim() || null,
        booking_url: form.booking_url?.trim() || null,
        vrbo_url: form.vrbo_url?.trim() || null,
        gites_url: form.gites_url?.trim() || null,
        expedia_url: form.expedia_url?.trim() || null,
        notes: form.notes?.trim() || null,
      };
      const { error } = await supabase.from("reservation_ical_submissions").insert(payload);
      if (error) throw error;
      setSubmitted(true);
      toast.success("Liens envoyés à notre équipe technique !");
    } catch (e: any) {
      toast.error(e.message || "Erreur lors de l'envoi");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 via-white to-rose-50">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 via-white to-rose-50 p-4">
        <Card className="max-w-md w-full"><CardContent className="pt-6 text-center">
          <p className="text-sm text-muted-foreground">Ce lien n'est pas valide. Contactez Adamkom.</p>
        </CardContent></Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 via-white to-rose-50 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold">Merci !</h2>
            <p className="text-sm text-muted-foreground">
              Vos liens iCal ont bien été transmis à l'équipe technique Adamkom.
              Nous configurons la synchronisation sous 24h ouvrées.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-rose-50 py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="text-center">
          <img src={logo} alt="Adamkom" className="h-12 mx-auto mb-3" />
          <h1 className="text-2xl md:text-3xl font-bold flex items-center justify-center gap-2">
            <CalendarSync className="w-7 h-7 text-primary" />
            Synchronisation iCal
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            Pour <strong>{client.company_name}</strong> — connectez vos plateformes de réservation à votre site
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Comment ça marche ?</CardTitle>
            <CardDescription>
              La synchronisation iCal se fait dans <strong>les deux sens</strong> :<br />
              <span className="block mt-2">① <strong>Plateformes → Site</strong> : récupérez vos liens iCal et collez-les ci-dessous.</span>
              <span className="block mt-1">② <strong>Site → Plateformes</strong> : copiez le lien iCal de votre site (encadré vert) et collez-le sur chaque plateforme en suivant les étapes 🟢.</span>
              <span className="block mt-2 text-xs">Résultat : <strong>plus aucune double réservation</strong>.</span>
            </CardDescription>
          </CardHeader>
        </Card>

        {client.site_ical_url && (
          <Card className="border-emerald-500/40 bg-gradient-to-br from-emerald-50 to-white">
            <CardContent className="pt-6 space-y-3">
              <div className="flex items-center gap-2">
                <ArrowLeftRight className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-emerald-700">Votre lien iCal — à coller sur vos plateformes</h3>
              </div>
              <p className="text-xs text-muted-foreground">
                Voici le lien iCal généré par <strong>votre site web</strong>. Copiez-le et collez-le sur chacune de
                vos plateformes (instructions détaillées dans chaque carte ci-dessous, section verte 🟢).
              </p>
              <div className="flex items-center gap-2">
                <Input value={client.site_ical_url} readOnly className="text-xs font-mono bg-white" />
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 shrink-0"
                  onClick={() => {
                    navigator.clipboard.writeText(client.site_ical_url!);
                    toast.success("Lien copié ! Collez-le sur vos plateformes.");
                  }}
                >
                  <Copy className="w-3.5 h-3.5 mr-1" /> Copier
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {PLATFORMS.map((p) => (
          <Card key={p.key} style={{ borderColor: `${p.color}33` }}>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <img src={p.logo} alt={p.name} className="w-8 h-8" />
                <div className="flex-1">
                  <CardTitle className="text-base" style={{ color: p.color }}>{p.name}</CardTitle>
                </div>
                <a href={p.help} target="_blank" rel="noopener noreferrer">
                  <Badge variant="outline" className="text-[10px]">
                    Aide <ExternalLink className="w-2.5 h-2.5 ml-1" />
                  </Badge>
                </a>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* SENS 1 : Plateforme → Site */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge className="bg-pink-100 text-pink-700 hover:bg-pink-100 text-[10px]">① Exporter vers nous</Badge>
                </div>
                <ol className="text-xs space-y-1 list-decimal pl-5 text-muted-foreground">
                  {p.steps.map((s, i) => <li key={i}>{s}</li>)}
                </ol>
                <div>
                  <Label htmlFor={p.key} className="text-xs">Lien iCal {p.name}</Label>
                  <Input
                    id={p.key}
                    type="url"
                    placeholder={`https://...${p.name.toLowerCase().split(" ")[0]}.ics`}
                    value={form[p.key]}
                    onChange={(e) => setForm({ ...form, [p.key]: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>

              {/* SENS 2 : Site → Plateforme */}
              {client.site_ical_url && (
                <div className="space-y-2 rounded-lg bg-emerald-50/60 border border-emerald-200 p-3">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 text-[10px]">
                      🟢 ② Importer notre lien dans {p.name}
                    </Badge>
                  </div>
                  <ol className="text-xs space-y-1 list-decimal pl-5 text-emerald-900/80">
                    {p.pasteSteps.map((s, i) => <li key={i}>{s}</li>)}
                  </ol>
                  <div className="flex items-center gap-2 pt-1">
                    <Input value={client.site_ical_url} readOnly className="text-[11px] h-8 font-mono bg-white" />
                    <Button
                      size="sm" variant="outline"
                      className="border-emerald-300 text-emerald-700 hover:bg-emerald-100"
                      onClick={() => {
                        navigator.clipboard.writeText(client.site_ical_url!);
                        toast.success("Lien copié !");
                      }}
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        <Card>
          <CardContent className="pt-6 space-y-4">
            <div>
              <Label htmlFor="notes" className="text-xs">Notes ou autres plateformes (facultatif)</Label>
              <Textarea
                id="notes"
                placeholder="Ex : j'utilise aussi Hotels.com, Trivago... ou toute info utile"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="mt-1"
                rows={3}
              />
            </div>
            <Button
              onClick={submit}
              disabled={submitting}
              className="w-full bg-gradient-to-r from-primary to-primary/80"
              size="lg"
            >
              {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              Envoyer mes liens iCal
            </Button>
          </CardContent>
        </Card>

        <p className="text-center text-[11px] text-muted-foreground">
          © Adamkom · Agence digitale · La Réunion
        </p>
      </div>
    </div>
  );
}
