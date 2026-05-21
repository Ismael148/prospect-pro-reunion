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
import { Loader2, Send, CheckCircle2, CalendarSync, ExternalLink } from "lucide-react";
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
  },
] as const;

export default function ReservationSyncForm() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [client, setClient] = useState<{ id: string; company_name: string } | null>(null);
  const [form, setForm] = useState<Record<string, string>>({
    airbnb_url: "", booking_url: "", vrbo_url: "", gites_url: "", expedia_url: "", notes: "",
  });

  useEffect(() => {
    (async () => {
      if (!token) return;
      const { data, error } = await supabase
        .from("clients")
        .select("id, company_name")
        .eq("support_token", token)
        .maybeSingle();
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
              Pour chaque plateforme utilisée, récupérez le lien iCal (.ics) et collez-le ci-dessous.
              Cela évite les doubles réservations en synchronisant vos disponibilités en temps réel sur votre site.
            </CardDescription>
          </CardHeader>
        </Card>

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
            <CardContent className="space-y-3">
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
