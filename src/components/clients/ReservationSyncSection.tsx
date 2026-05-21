import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { CalendarSync, Copy, Mail, Loader2, ExternalLink, Link2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  clientId: string;
  clientEmail?: string | null;
  clientCompany?: string;
  clientManager?: string | null;
}

// Logos via simple-icons CDN (svg colorisé, fiable et conforme aux marques)
const PLATFORMS = [
  {
    key: "airbnb",
    name: "Airbnb",
    color: "#FF5A5F",
    logo: "https://cdn.simpleicons.org/airbnb/FF5A5F",
    helpUrl: "https://www.airbnb.fr/help/article/99",
    steps: [
      "Connectez-vous sur airbnb.fr puis allez dans <strong>Annonces</strong>.",
      "Cliquez sur l'annonce concernée → onglet <strong>Calendrier</strong>.",
      "Cliquez sur <strong>Disponibilités</strong> puis <strong>Synchronisez les calendriers</strong>.",
      "Section <strong>Exporter le calendrier</strong> → <strong>Copier le lien</strong> (.ics).",
      "Collez ce lien dans le champ <em>Lien iCal Airbnb</em> ci-dessous puis envoyez-le-nous.",
    ],
  },
  {
    key: "booking",
    name: "Booking.com",
    color: "#003580",
    logo: "https://cdn.simpleicons.org/bookingdotcom/003580",
    helpUrl: "https://partner.booking.com/fr/aide/tarifs-disponibilites/calendrier/synchroniser-mon-calendrier",
    steps: [
      "Connectez-vous sur <strong>admin.booking.com</strong> (extranet partenaire).",
      "Menu <strong>Tarifs & Disponibilités</strong> → <strong>Synchronisation de calendrier</strong>.",
      "Section <strong>Exporter le calendrier</strong> : sélectionnez le type de chambre.",
      "Cliquez sur <strong>Copier le lien iCal</strong>.",
      "Collez-le dans le champ <em>Lien iCal Booking.com</em> ci-dessous.",
    ],
  },
  {
    key: "vrbo",
    name: "Vrbo / Abritel",
    color: "#0F4C81",
    logo: "https://cdn.simpleicons.org/vrbo/0F4C81",
    helpUrl: "https://help.vrbo.com/articles/How-do-I-sync-my-calendars",
    steps: [
      "Connectez-vous sur <strong>vrbo.com</strong> ou abritel.fr.",
      "Allez dans <strong>Calendrier</strong> → <strong>Importer/Exporter</strong>.",
      "Section <strong>Exporter le calendrier</strong> → copier l'URL iCal.",
      "Collez-le dans le champ <em>Lien iCal Vrbo</em> ci-dessous.",
    ],
  },
  {
    key: "gites",
    name: "Gîtes de France",
    color: "#1F8E3E",
    logo: "https://cdn.simpleicons.org/letterboxd/1F8E3E",
    helpUrl: "https://pro.gites-de-france.com/",
    steps: [
      "Connectez-vous sur l'<strong>espace propriétaire</strong> Gîtes de France.",
      "Onglet <strong>Planning</strong> → <strong>Synchronisation iCal</strong>.",
      "Copiez l'<strong>URL d'export iCal</strong>.",
    ],
  },
  {
    key: "expedia",
    name: "Expedia",
    color: "#FFC72C",
    logo: "https://cdn.simpleicons.org/expedia/00355F",
    helpUrl: "https://welcome.expediapartnercentral.com/",
    steps: [
      "Connectez-vous à <strong>Expedia Partner Central</strong>.",
      "Menu <strong>Tarifs & Disponibilités</strong> → <strong>Calendrier</strong>.",
      "Activez l'<strong>export iCal</strong> et copiez le lien généré.",
    ],
  },
] as const;

export default function ReservationSyncSection({ clientId, clientEmail, clientCompany, clientManager }: Props) {
  const [sending, setSending] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [urls, setUrls] = useState<Record<string, string>>({
    airbnb: "",
    booking: "",
    vrbo: "",
    gites: "",
    expedia: "",
  });

  const greeting = (clientManager && clientManager.trim()) || clientCompany || "vous";
  const subject = `📅 ${clientCompany || ""} — Synchronisation des plateformes de réservation (Airbnb · Booking · Vrbo)`.trim();

  const buildEmailHtml = () => `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${subject}</title></head>
<body style="margin:0;padding:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Arial,sans-serif;color:#18181b;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f7;padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="640" cellpadding="0" cellspacing="0" style="max-width:640px;width:100%;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 8px 32px -12px rgba(0,0,0,0.12);">
        <tr><td style="background:linear-gradient(135deg,#ff006e 0%,#ff5c8a 100%);padding:36px 32px;text-align:center;">
          <div style="font-size:44px;line-height:1;margin-bottom:8px;">📅</div>
          <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.3px;">Synchronisez vos plateformes de réservation</h1>
          <p style="margin:10px 0 0;color:rgba(255,255,255,0.92);font-size:14px;">Airbnb · Booking.com · Vrbo · Gîtes de France · Expedia</p>
        </td></tr>

        <tr><td style="padding:32px 36px 8px;">
          <p style="margin:0 0 14px;font-size:16px;line-height:1.6;">Bonjour <strong>${greeting}</strong>,</p>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:#3f3f46;">
            Pour afficher en temps réel les <strong>disponibilités</strong> de vos hébergements sur votre site et
            éviter les <strong>doubles réservations</strong>, nous synchronisons votre site avec vos plateformes via le format
            <strong>iCal (.ics)</strong>.
          </p>
          <p style="margin:0 0 22px;font-size:15px;line-height:1.65;color:#3f3f46;">
            Il vous suffit de récupérer le <strong>lien d'export iCal</strong> sur chaque plateforme et de nous le renvoyer
            en répondant simplement à cet email.
          </p>
        </td></tr>

        ${PLATFORMS.map((p, i) => `
        <tr><td style="padding:8px 36px;">
          <div style="border:1px solid #ececef;border-radius:14px;padding:18px 20px;background:#fafafa;">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
              <img src="${p.logo}" alt="${p.name}" width="22" height="22" style="display:inline-block;vertical-align:middle;border:0;" />
              <strong style="font-size:15px;color:${p.color};letter-spacing:0.2px;">${i + 1}. ${p.name}</strong>
            </div>
            <ol style="margin:0;padding-left:20px;font-size:13.5px;line-height:1.65;color:#3f3f46;">
              ${p.steps.map((s) => `<li style="margin:3px 0;">${s}</li>`).join("")}
            </ol>
            <p style="margin:10px 0 0;font-size:12px;">
              <a href="${p.helpUrl}" style="color:${p.color};text-decoration:none;">→ Aide officielle ${p.name}</a>
            </p>
          </div>
        </td></tr>`).join("")}

        <tr><td style="padding:22px 36px 8px;">
          <div style="background:#fff6fa;border:1px solid #ffd6e6;border-radius:12px;padding:14px 18px;">
            <p style="margin:0;font-size:13.5px;line-height:1.6;color:#52525b;">
              📨 <strong>Comment nous envoyer vos liens ?</strong><br/>
              Répondez simplement à cet email en collant les URLs iCal récupérées (une par plateforme).
              Notre équipe technique configure la synchronisation sous 24h ouvrées.
            </p>
          </div>
        </td></tr>

        <tr><td style="padding:24px 36px 36px;">
          <p style="margin:0 0 4px;font-size:14px;color:#27272a;">Très cordialement,</p>
          <p style="margin:0;font-size:15px;font-weight:700;color:#ff006e;">L'équipe Adamkom</p>
        </td></tr>

        <tr><td style="background:#fafafa;padding:18px 36px;border-top:1px solid #ececef;text-align:center;">
          <p style="margin:0;font-size:11px;color:#a1a1aa;">© Adamkom · Agence digitale · La Réunion</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  const previewHtml = useMemo(() => buildEmailHtml(), [greeting, clientCompany]);

  const copyTuto = async () => {
    try {
      await navigator.clipboard.writeText(previewHtml);
      toast.success("Tutoriel HTML copié");
    } catch {
      toast.error("Impossible de copier");
    }
  };

  const sendEmail = async () => {
    if (!clientEmail) {
      toast.error("Aucun email client renseigné");
      return;
    }
    setSending(true);
    try {
      const { error } = await supabase.functions.invoke("send-brevo-campaign", {
        body: {
          action: "send_client_email",
          recipientEmail: clientEmail,
          recipientName: greeting,
          subject,
          htmlContent: buildEmailHtml(),
          trigger: "tuto_reservation_sync",
          client_id: clientId,
        },
      });
      if (error) throw error;
      toast.success(`Tutoriel iCal envoyé à ${clientEmail}`);
      setPreviewOpen(false);
    } catch (e: any) {
      toast.error(e.message || "Erreur lors de l'envoi");
    } finally {
      setSending(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarSync className="w-4 h-4 text-primary" />
          Synchronisation plateformes de réservation
          <Badge variant="outline" className="ml-2 text-[10px]">iCal · Airbnb · Booking · Vrbo · +2</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-3 rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <div className="flex items-center gap-2 mb-2">
            <Link2 className="w-4 h-4 text-primary" />
            <span className="text-xs font-semibold text-primary uppercase tracking-wide">Tutoriel personnalisé iCal</span>
          </div>
          <p className="text-[11px] text-muted-foreground mb-3">
            Envoyez à <strong>{greeting}</strong> les instructions détaillées pour récupérer les liens iCal de chaque
            plateforme (Airbnb, Booking, Vrbo…) afin d'éviter les doubles réservations sur le site.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={copyTuto}>
              <Copy className="w-3.5 h-3.5 mr-1" /> Copier le tuto HTML
            </Button>
            <Button
              size="sm"
              className="bg-gradient-to-r from-primary to-primary/80"
              onClick={() => setPreviewOpen(true)}
              disabled={!clientEmail}
            >
              <Mail className="w-3.5 h-3.5 mr-1" /> Aperçu & Envoyer
            </Button>
          </div>
          {!clientEmail && (
            <p className="text-[11px] text-destructive mt-2">⚠️ Renseignez l'email du client pour pouvoir lui envoyer le tuto.</p>
          )}
        </div>

        {/* Aperçu des plateformes couvertes */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {PLATFORMS.map((p) => (
            <a
              key={p.key}
              href={p.helpUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-lg border bg-card/40 hover:bg-card transition-colors"
              style={{ borderColor: `${p.color}33` }}
            >
              <img src={p.logo} alt={p.name} className="w-7 h-7" />
              <span className="text-[11px] font-medium text-center leading-tight">{p.name}</span>
              <ExternalLink className="w-3 h-3 text-muted-foreground" />
            </a>
          ))}
        </div>

        {/* Champs de stockage rapide des URLs (collecte interne, pour copy/notes) */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Liens iCal reçus du client
          </h4>
          {PLATFORMS.map((p) => (
            <div key={p.key} className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 w-32 shrink-0">
                <img src={p.logo} alt={p.name} className="w-4 h-4" />
                <Label className="text-xs">{p.name}</Label>
              </div>
              <Input
                placeholder={`https://...${p.key}.ics`}
                value={urls[p.key] || ""}
                onChange={(e) => setUrls({ ...urls, [p.key]: e.target.value })}
                className="text-xs flex-1"
              />
              <Button
                size="sm"
                variant="ghost"
                disabled={!urls[p.key]}
                onClick={() => {
                  navigator.clipboard.writeText(urls[p.key]);
                  toast.success(`URL ${p.name} copiée`);
                }}
              >
                <Copy className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
          <p className="text-[11px] text-muted-foreground italic">
            💡 Collez ici les liens iCal reçus par mail du client pour les transmettre à l'équipe technique.
          </p>
        </div>
      </CardContent>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Aperçu de l'email — Synchronisation iCal</DialogTitle>
            <DialogDescription>
              Destinataire : <strong>{clientEmail}</strong> · Sujet : <em>{subject}</em>
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border overflow-hidden bg-white">
            <iframe
              title="Aperçu email iCal"
              srcDoc={previewHtml}
              className="w-full h-[60vh] bg-white"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>Annuler</Button>
            <Button onClick={sendEmail} disabled={sending}>
              {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Mail className="w-4 h-4 mr-2" />}
              Envoyer à {clientEmail}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
