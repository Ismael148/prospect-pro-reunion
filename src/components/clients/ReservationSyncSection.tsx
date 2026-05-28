import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { CalendarSync, Copy, Mail, Loader2, ExternalLink, Link2, Inbox, ArrowLeftRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PUBLISHED_URL } from "@/lib/constants";

interface Props {
  clientId: string;
  clientEmail?: string | null;
  clientCompany?: string;
  clientManager?: string | null;
  clientToken?: string | null;
}

const PLATFORMS = [
  { key: "airbnb", name: "Airbnb", color: "#FF5A5F", logo: "https://cdn.simpleicons.org/airbnb/FF5A5F" },
  { key: "booking", name: "Booking.com", color: "#003580", logo: "https://cdn.simpleicons.org/bookingdotcom/003580" },
  { key: "vrbo", name: "Vrbo / Abritel", color: "#0F4C81", logo: "https://cdn.simpleicons.org/vrbo/0F4C81" },
  { key: "gites", name: "Gîtes de France", color: "#1F8E3E", logo: "https://cdn.simpleicons.org/letterboxd/1F8E3E" },
  { key: "expedia", name: "Expedia", color: "#00355F", logo: "https://cdn.simpleicons.org/expedia/00355F" },
] as const;

interface Submission {
  id: string;
  airbnb_url: string | null;
  booking_url: string | null;
  vrbo_url: string | null;
  gites_url: string | null;
  expedia_url: string | null;
  notes: string | null;
  status: string;
  submitted_at: string;
}

export default function ReservationSyncSection({ clientId, clientEmail, clientCompany, clientManager, clientToken }: Props) {
  const [sending, setSending] = useState(false);
  const [sendingPaste, setSendingPaste] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [pastePreviewOpen, setPastePreviewOpen] = useState(false);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [siteIcalUrl, setSiteIcalUrl] = useState<string>("");
  const [savingUrl, setSavingUrl] = useState(false);

  const greeting = (clientManager && clientManager.trim()) || clientCompany || "vous";
  const formUrl = clientToken ? `${PUBLISHED_URL}/ical/${clientToken}` : null;
  const subject = `📅 ${clientCompany || ""} — Synchronisation de vos plateformes de réservation`.trim();
  const pasteSubject = `🔗 ${clientCompany || ""} — Afficher vos réservations site sur Airbnb, Booking…`.trim();

  useEffect(() => {
    (async () => {
      const [{ data: subs }, { data: client }] = await Promise.all([
        supabase
          .from("reservation_ical_submissions")
          .select("id,airbnb_url,booking_url,vrbo_url,gites_url,expedia_url,notes,status,submitted_at")
          .eq("client_id", clientId)
          .order("submitted_at", { ascending: false }),
        supabase.from("clients").select("site_ical_url").eq("id", clientId).maybeSingle(),
      ]);
      setSubmissions((subs as Submission[]) || []);
      setSiteIcalUrl(((client as any)?.site_ical_url as string) || "");
    })();
  }, [clientId]);

  const saveSiteIcalUrl = async () => {
    setSavingUrl(true);
    try {
      const { error } = await supabase
        .from("clients")
        .update({ site_ical_url: siteIcalUrl.trim() || null } as any)
        .eq("id", clientId);
      if (error) throw error;
      toast.success("Lien iCal du site enregistré — visible dans le tutoriel du formulaire client");
    } catch (e: any) {
      toast.error(e.message || "Erreur");
    } finally { setSavingUrl(false); }
  };

  const buildEmailHtml = () => `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${subject}</title></head>
<body style="margin:0;padding:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Arial,sans-serif;color:#18181b;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f7;padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 8px 32px -12px rgba(0,0,0,0.12);">
        <tr><td style="background:linear-gradient(135deg,#ff006e 0%,#ff5c8a 100%);padding:36px 32px;text-align:center;">
          <div style="font-size:44px;line-height:1;margin-bottom:8px;">📅</div>
          <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.3px;">Synchronisez vos réservations</h1>
          <p style="margin:10px 0 0;color:rgba(255,255,255,0.92);font-size:14px;">Airbnb · Booking · Vrbo · Gîtes de France · Expedia</p>
        </td></tr>

        <tr><td style="padding:32px 36px 8px;">
          <p style="margin:0 0 14px;font-size:16px;line-height:1.6;">Bonjour <strong>${greeting}</strong>,</p>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#3f3f46;">
            Afin d'afficher en temps réel vos <strong>disponibilités</strong> sur votre site internet
            et d'éviter les <strong>doubles réservations</strong>, nous avons préparé pour vous un
            <strong>formulaire guidé</strong>.
          </p>
          <p style="margin:0 0 22px;font-size:15px;line-height:1.7;color:#3f3f46;">
            Vous y trouverez la procédure détaillée, plateforme par plateforme, pour récupérer vos
            liens iCal — et vous pourrez nous les transmettre en quelques clics, en toute sécurité.
          </p>
        </td></tr>

        <tr><td align="center" style="padding:8px 36px 28px;">
          <a href="${formUrl}" style="display:inline-block;background:linear-gradient(135deg,#ff006e,#ff5c8a);color:#ffffff;text-decoration:none;padding:16px 36px;border-radius:12px;font-size:15px;font-weight:700;letter-spacing:0.3px;box-shadow:0 6px 18px -4px rgba(255,0,110,0.45);">
            ✦ Ouvrir le formulaire guidé
          </a>
          <p style="margin:14px 0 0;font-size:11px;color:#a1a1aa;word-break:break-all;">
            ou copiez ce lien : <span style="color:#71717a;">${formUrl}</span>
          </p>
        </td></tr>

        <tr><td style="padding:0 36px 8px;">
          <div style="background:#fafafa;border:1px solid #ececef;border-radius:12px;padding:18px 20px;">
            <p style="margin:0 0 10px;font-size:13px;font-weight:600;color:#18181b;">Plateformes prises en charge :</p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                ${PLATFORMS.map(p => `
                <td align="center" style="padding:6px;">
                  <img src="${p.logo}" alt="${p.name}" width="28" height="28" style="display:block;margin:0 auto 4px;border:0;" />
                  <span style="font-size:10px;color:#52525b;">${p.name}</span>
                </td>`).join("")}
              </tr>
            </table>
          </div>
        </td></tr>

        <tr><td style="padding:22px 36px 8px;">
          <div style="background:#fff6fa;border:1px solid #ffd6e6;border-radius:12px;padding:14px 18px;">
            <p style="margin:0;font-size:13px;line-height:1.65;color:#52525b;">
              ⏱️ <strong>Cela ne prend que quelques minutes.</strong><br/>
              Une fois vos liens reçus, notre équipe technique configure la synchronisation
              sous <strong>24h ouvrées</strong> et vous confirme la mise en service.
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

  const PASTE_STEPS: Record<string, string[]> = {
    airbnb: [
      "Connectez-vous sur airbnb.com → Annonces → sélectionnez votre logement",
      "Menu Calendrier → Disponibilités → Synchroniser les calendriers",
      "Cliquez « Importer un calendrier » → collez le lien ci-dessous → Nommez « Site Adamkom » → Importer",
    ],
    booking: [
      "Connectez-vous sur admin.booking.com → Tarifs & Disponibilités",
      "Onglet « Synchronisation calendrier » (iCal) → Importer un calendrier",
      "Collez le lien ci-dessous → Nommez « Site Adamkom » → Enregistrer",
    ],
    vrbo: [
      "Connectez-vous sur vrbo.com / abritel.fr → Calendrier",
      "Importer un calendrier → collez le lien ci-dessous → Enregistrer",
    ],
    gites: [
      "Espace propriétaire Gîtes de France → Calendrier de réservation",
      "Importer un planning externe (iCal) → collez le lien → Valider",
    ],
    expedia: [
      "Expedia Partner Central → Property → Rates & Inventory",
      "Calendar sync → Import calendar → collez le lien → Save",
    ],
  };

  const buildPasteEmailHtml = () => {
    const siteLink = siteIcalUrl?.trim();
    const platformsHtml = PLATFORMS.map(p => `
      <tr><td style="padding:14px 0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #ececef;border-radius:12px;overflow:hidden;">
          <tr><td style="padding:14px 18px;background:${p.color}0d;border-bottom:1px solid #ececef;">
            <table role="presentation"><tr>
              <td style="padding-right:10px;vertical-align:middle;"><img src="${p.logo}" alt="${p.name}" width="22" height="22" style="display:block;"/></td>
              <td style="vertical-align:middle;font-weight:700;color:${p.color};font-size:14px;">${p.name}</td>
            </tr></table>
          </td></tr>
          <tr><td style="padding:14px 18px;font-size:13px;line-height:1.7;color:#3f3f46;">
            <ol style="margin:0 0 0 18px;padding:0;">
              ${PASTE_STEPS[p.key].map(s => `<li style="margin-bottom:4px;">${s}</li>`).join("")}
            </ol>
          </td></tr>
        </table>
      </td></tr>`).join("");

    return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${pasteSubject}</title></head>
<body style="margin:0;padding:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Arial,sans-serif;color:#18181b;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f7;padding:32px 12px;">
<tr><td align="center">
<table role="presentation" width="640" cellpadding="0" cellspacing="0" style="max-width:640px;width:100%;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 8px 32px -12px rgba(0,0,0,0.12);">
  <tr><td style="background:linear-gradient(135deg,#059669 0%,#10b981 100%);padding:36px 32px;text-align:center;">
    <div style="font-size:44px;line-height:1;margin-bottom:8px;">🔗</div>
    <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.3px;">Afficher les réservations de votre site sur vos plateformes</h1>
    <p style="margin:10px 0 0;color:rgba(255,255,255,0.92);font-size:14px;">Tutoriel iCal — sens inverse</p>
  </td></tr>

  <tr><td style="padding:32px 36px 8px;">
    <p style="margin:0 0 14px;font-size:16px;line-height:1.6;">Bonjour <strong>${greeting}</strong>,</p>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#3f3f46;">
      Pour que les réservations de <strong>votre site Adamkom</strong> s'affichent automatiquement sur Airbnb, Booking, Vrbo, etc. — et que vos conditions d'annulation et de séjour soient bien transmises — il vous suffit d'ajouter <strong>UN seul lien</strong> sur chaque plateforme.
    </p>
  </td></tr>

  ${siteLink ? `
  <tr><td style="padding:8px 36px 16px;">
    <div style="background:#ecfdf5;border:2px solid #10b981;border-radius:14px;padding:18px 20px;">
      <p style="margin:0 0 8px;font-size:12px;font-weight:700;color:#047857;text-transform:uppercase;letter-spacing:0.5px;">🔗 Votre lien iCal à copier</p>
      <div style="background:#ffffff;border:1px solid #a7f3d0;border-radius:8px;padding:12px 14px;font-family:Menlo,Monaco,'Courier New',monospace;font-size:12px;color:#065f46;word-break:break-all;">${siteLink}</div>
      <p style="margin:10px 0 0;font-size:12px;color:#047857;">Copiez ce lien — vous le collerez à l'étape 3 de chaque plateforme ci-dessous.</p>
    </div>
  </td></tr>` : `
  <tr><td style="padding:8px 36px 16px;">
    <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;padding:14px 18px;">
      <p style="margin:0;font-size:13px;color:#9a3412;">⚠️ Aucun lien iCal de site enregistré côté Adamkom. Contactez-nous pour le générer.</p>
    </div>
  </td></tr>`}

  <tr><td style="padding:8px 36px 16px;">
    <h2 style="margin:0 0 6px;font-size:16px;color:#18181b;">📚 Tutoriel par plateforme</h2>
    <p style="margin:0 0 8px;font-size:13px;color:#71717a;">Cliquez, suivez les 3 étapes, c'est terminé en 2 minutes par plateforme.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${platformsHtml}</table>
  </td></tr>

  <tr><td style="padding:16px 36px 8px;">
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:14px 18px;">
      <p style="margin:0;font-size:13px;line-height:1.65;color:#166534;">
        ✅ <strong>Une fois fait, c'est automatique.</strong> Les disponibilités de votre site se mettront à jour
        sur Airbnb, Booking, etc. — fini les doubles réservations.
      </p>
    </div>
  </td></tr>

  <tr><td style="padding:24px 36px 36px;">
    <p style="margin:0 0 4px;font-size:14px;color:#27272a;">Besoin d'aide ? Répondez simplement à cet email.</p>
    <p style="margin:8px 0 0;font-size:15px;font-weight:700;color:#059669;">L'équipe Adamkom</p>
  </td></tr>

  <tr><td style="background:#fafafa;padding:18px 36px;border-top:1px solid #ececef;text-align:center;">
    <p style="margin:0;font-size:11px;color:#a1a1aa;">© Adamkom · Agence digitale · La Réunion</p>
  </td></tr>
</table>
</td></tr></table></body></html>`;
  };

  const previewHtml = useMemo(() => buildEmailHtml(), [greeting, clientCompany, formUrl]);
  const pastePreviewHtml = useMemo(() => buildPasteEmailHtml(), [greeting, clientCompany, siteIcalUrl]);

  const copyLink = async () => {
    if (!formUrl) return;
    try {
      await navigator.clipboard.writeText(formUrl);
      toast.success("Lien du formulaire copié");
    } catch { toast.error("Impossible de copier"); }
  };

  const sendEmail = async () => {
    if (!clientEmail) { toast.error("Aucun email client renseigné"); return; }
    if (!formUrl) { toast.error("Token client manquant — impossible de générer le lien"); return; }
    setSending(true);
    try {
      const { error } = await supabase.functions.invoke("send-brevo-campaign", {
        body: {
          action: "send_client_email",
          recipientEmail: clientEmail,
          recipientName: greeting,
          subject,
          htmlContent: buildEmailHtml(),
          trigger: "tuto_reservation_sync_form",
          client_id: clientId,
        },
      });
      if (error) throw error;
      toast.success(`Email envoyé à ${clientEmail}`);
      setPreviewOpen(false);
    } catch (e: any) {
      toast.error(e.message || "Erreur lors de l'envoi");
    } finally { setSending(false); }
  };

  const sendPasteEmail = async () => {
    if (!clientEmail) { toast.error("Aucun email client renseigné"); return; }
    if (!siteIcalUrl?.trim()) { toast.error("Enregistre d'abord le lien iCal du site"); return; }
    setSendingPaste(true);
    try {
      const { error } = await supabase.functions.invoke("send-brevo-campaign", {
        body: {
          action: "send_client_email",
          recipientEmail: clientEmail,
          recipientName: greeting,
          subject: pasteSubject,
          htmlContent: buildPasteEmailHtml(),
          trigger: "tuto_reservation_paste_link",
          client_id: clientId,
        },
      });
      if (error) throw error;
      toast.success(`Tuto sens inverse envoyé à ${clientEmail}`);
      setPastePreviewOpen(false);
    } catch (e: any) {
      toast.error(e.message || "Erreur lors de l'envoi");
    } finally { setSendingPaste(false); }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarSync className="w-4 h-4 text-primary" />
          Synchronisation plateformes de réservation
          <Badge variant="outline" className="ml-2 text-[10px]">iCal · Formulaire guidé</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-3 rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <div className="flex items-center gap-2 mb-2">
            <Link2 className="w-4 h-4 text-primary" />
            <span className="text-xs font-semibold text-primary uppercase tracking-wide">Envoyer le tutoriel + formulaire</span>
          </div>
          <p className="text-[11px] text-muted-foreground mb-3">
            Envoyez à <strong>{greeting}</strong> un email contenant un bouton vers un
            <strong> formulaire guidé</strong> où le client peut récupérer puis envoyer ses liens iCal
            (Airbnb, Booking, Vrbo, Gîtes, Expedia) en quelques clics.
          </p>

          {formUrl && (
            <div className="mb-3 flex items-center gap-2">
              <Input value={formUrl} readOnly className="text-[11px] h-8" />
              <Button size="sm" variant="ghost" onClick={copyLink}>
                <Copy className="w-3.5 h-3.5" />
              </Button>
              <a href={formUrl} target="_blank" rel="noopener noreferrer">
                <Button size="sm" variant="ghost">
                  <ExternalLink className="w-3.5 h-3.5" />
                </Button>
              </a>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              className="bg-gradient-to-r from-primary to-primary/80"
              onClick={() => setPreviewOpen(true)}
              disabled={!clientEmail || !formUrl}
            >
              <Mail className="w-3.5 h-3.5 mr-1" /> Aperçu & Envoyer
            </Button>
          </div>
          {!clientEmail && <p className="text-[11px] text-destructive mt-2">⚠️ Renseignez l'email du client.</p>}
          {!clientToken && <p className="text-[11px] text-destructive mt-2">⚠️ Token client manquant — impossible de générer le lien du formulaire.</p>}
        </div>

        {/* URL iCal du site du client (à coller sur les plateformes) */}
        <div className="p-3 rounded-xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 to-transparent">
          <div className="flex items-center gap-2 mb-2">
            <Link2 className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">
              Lien iCal du site (sens inverse)
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground mb-3">
            Collez ici le lien iCal <strong>exporté depuis le site du client</strong> (ex: MotoPress, WooCommerce Bookings…).
            Ce lien sera affiché dans le tutoriel public avec les instructions étape par étape pour le coller
            sur Airbnb, Booking, Vrbo, etc. — permettant la synchronisation dans les <strong>deux sens</strong>.
          </p>
          <div className="flex items-center gap-2">
            <Input
              value={siteIcalUrl}
              onChange={(e) => setSiteIcalUrl(e.target.value)}
              placeholder="https://site-du-client.com/wp-admin/...export.ics"
              className="text-[11px] h-8"
            />
            <Button size="sm" onClick={saveSiteIcalUrl} disabled={savingUrl} className="bg-emerald-600 hover:bg-emerald-700">
              {savingUrl ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Enregistrer"}
            </Button>
            {siteIcalUrl && (
              <Button
                size="sm" variant="ghost"
                onClick={() => { navigator.clipboard.writeText(siteIcalUrl); toast.success("Lien copié"); }}
              >
                <Copy className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>

          <div className="mt-3 pt-3 border-t border-emerald-500/20">
            <Button
              size="sm"
              onClick={() => setPastePreviewOpen(true)}
              disabled={!clientEmail || !siteIcalUrl?.trim()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <ArrowLeftRight className="w-3.5 h-3.5 mr-1" /> Envoyer le tuto "où coller ce lien"
            </Button>
            {!siteIcalUrl?.trim() && (
              <p className="text-[11px] text-muted-foreground mt-1.5 italic">
                Enregistre d'abord le lien iCal du site pour activer l'envoi.
              </p>
            )}
          </div>
        </div>


        {/* Plateformes couvertes */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {PLATFORMS.map((p) => (
            <div
              key={p.key}
              className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-lg border bg-card/40"
              style={{ borderColor: `${p.color}33` }}
            >
              <img src={p.logo} alt={p.name} className="w-7 h-7" />
              <span className="text-[11px] font-medium text-center leading-tight">{p.name}</span>
            </div>
          ))}
        </div>

        {/* Soumissions reçues */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
            <Inbox className="w-3.5 h-3.5" /> Liens iCal reçus ({submissions.length})
          </h4>
          {submissions.length === 0 && (
            <p className="text-[11px] text-muted-foreground italic">
              Aucune soumission pour le moment. Les réponses du client apparaîtront ici dès qu'il aura rempli le formulaire.
            </p>
          )}
          {submissions.map((s) => (
            <div key={s.id} className="p-3 rounded-lg border bg-card/40 space-y-1.5">
              <div className="flex items-center justify-between">
                <Badge variant="secondary" className="text-[10px]">
                  {new Date(s.submitted_at).toLocaleString("fr-FR", { timeZone: "Indian/Reunion" })}
                </Badge>
                <Badge variant="outline" className="text-[10px]">{s.status}</Badge>
              </div>
              {PLATFORMS.map((p) => {
                const url = (s as any)[`${p.key}_url`] as string | null;
                if (!url) return null;
                return (
                  <div key={p.key} className="flex items-center gap-2">
                    <img src={p.logo} alt={p.name} className="w-4 h-4" />
                    <Input value={url} readOnly className="text-[11px] h-7 flex-1" />
                    <Button
                      size="sm" variant="ghost"
                      onClick={() => { navigator.clipboard.writeText(url); toast.success(`URL ${p.name} copiée`); }}
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                );
              })}
              {s.notes && (
                <p className="text-[11px] text-muted-foreground italic border-t pt-1.5">📝 {s.notes}</p>
              )}
            </div>
          ))}
        </div>
      </CardContent>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Aperçu de l'email — Formulaire iCal</DialogTitle>
            <DialogDescription>
              Destinataire : <strong>{clientEmail}</strong> · Sujet : <em>{subject}</em>
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border overflow-hidden bg-white">
            <iframe title="Aperçu email iCal" srcDoc={previewHtml} className="w-full h-[60vh] bg-white" />
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

      <Dialog open={pastePreviewOpen} onOpenChange={setPastePreviewOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Aperçu — Tuto "où coller le lien du site"</DialogTitle>
            <DialogDescription>
              Destinataire : <strong>{clientEmail}</strong> · Sujet : <em>{pasteSubject}</em>
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border overflow-hidden bg-white">
            <iframe title="Aperçu email paste tuto" srcDoc={pastePreviewHtml} className="w-full h-[60vh] bg-white" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPastePreviewOpen(false)}>Annuler</Button>
            <Button onClick={sendPasteEmail} disabled={sendingPaste} className="bg-emerald-600 hover:bg-emerald-700">
              {sendingPaste ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Mail className="w-4 h-4 mr-2" />}
              Envoyer à {clientEmail}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
