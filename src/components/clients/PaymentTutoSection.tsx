import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  CreditCard, Copy, Send, ExternalLink, Eye, EyeOff, ShieldCheck, Link2, Loader2, Mail,
} from "lucide-react";
import { PUBLISHED_URL } from "@/lib/constants";
import { PAYMENT_PROVIDERS, type PaymentProviderKey } from "@/lib/payment-providers";

interface Props {
  clientId: string;
  clientNdi?: string | null;
  clientEmail?: string | null;
  clientCompany?: string;
}

const PROVIDER_LOGOS: Record<string, string> = {
  stripe: "💳",
  paypal: "🅿️",
  alma: "🟣",
  mollie: "🌷",
  lyra: "🔷",
  helloasso: "💙",
  sumup: "🟦",
};

export default function PaymentTutoSection({ clientId, clientNdi, clientEmail, clientCompany }: Props) {
  const { user, hasRole } = useAuth();
  const isAdmin = hasRole("admin");
  const queryClient = useQueryClient();
  const [sending, setSending] = useState(false);
  const [creatingInvite, setCreatingInvite] = useState(false);
  const [reveal, setReveal] = useState<Record<string, boolean>>({});

  // Invitations existantes pour ce client (pour récupérer un token actif si dispo)
  const { data: invitations } = useQuery({
    queryKey: ["payment-invitations", clientId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("payment_invitations")
        .select("*")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  // Clés reçues (admin only via RLS)
  const { data: credentials, isLoading: loadingCreds } = useQuery({
    queryKey: ["payment-credentials", clientId],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("payment_credentials")
        .select("*")
        .eq("client_id", clientId)
        .order("submitted_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const activeInvite = invitations?.find((i: any) => !i.completed_at && new Date(i.expires_at) > new Date());
  const tutoLink = activeInvite
    ? `${PUBLISHED_URL}/tuto/paiements?token=${activeInvite.token}`
    : `${PUBLISHED_URL}/tuto/paiements`;

  const ensureInvitation = async () => {
    if (activeInvite) return activeInvite;
    if (!clientEmail) throw new Error("Aucun email client renseigné");
    setCreatingInvite(true);
    try {
      const { data, error } = await (supabase as any)
        .from("payment_invitations")
        .insert({
          client_id: clientId,
          client_ndi: clientNdi || null,
          contact_email: clientEmail,
          company_name: clientCompany || null,
          created_by: user?.id || null,
        })
        .select()
        .single();
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["payment-invitations", clientId] });
      return data;
    } finally {
      setCreatingInvite(false);
    }
  };

  const copyLink = async () => {
    try {
      const inv = activeInvite || (await ensureInvitation());
      const link = `${PUBLISHED_URL}/tuto/paiements?token=${inv.token}`;
      await navigator.clipboard.writeText(link);
      toast.success("Lien tuto Paiements copié !");
    } catch (e: any) {
      toast.error(e.message || "Impossible de générer le lien");
    }
  };

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLink, setPreviewLink] = useState<string>("");

  const greeting = clientCompany || clientEmail || "vous";
  const subject = clientCompany
    ? `💳 ${clientCompany} — Configurez vos moyens de paiement en ligne`
    : `💳 Configurez vos moyens de paiement en ligne`;

  const buildEmailHtml = (link: string) => `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${subject}</title></head>
<body style="margin:0;padding:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Arial,sans-serif;color:#18181b;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f7;padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 8px 32px -12px rgba(0,0,0,0.12);">
        <!-- Hero -->
        <tr><td style="background:linear-gradient(135deg,#ff006e 0%,#ff5c8a 100%);padding:36px 32px;text-align:center;">
          <div style="font-size:44px;line-height:1;margin-bottom:8px;">💳</div>
          <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.3px;">Activez vos paiements en ligne</h1>
          <p style="margin:10px 0 0;color:rgba(255,255,255,0.92);font-size:14px;">Tutoriel sécurisé — Stripe · PayPal · Alma · Mollie · +3</p>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:36px 36px 8px;">
          <p style="margin:0 0 18px;font-size:16px;line-height:1.6;">Bonjour <strong>${greeting}</strong>,</p>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:#3f3f46;">
            Pour <strong style="color:#18181b">encaisser vos paiements en ligne</strong> directement sur votre site Adamkom,
            nous avons besoin de vos clés API auprès de votre solution de paiement préférée.
          </p>
          <p style="margin:0 0 24px;font-size:15px;line-height:1.65;color:#3f3f46;">
            Suivez notre <strong>tutoriel pas-à-pas</strong> : on vous guide pour
            <strong>créer votre compte</strong>, faire <strong>les tests</strong>, puis basculer en <strong>production</strong>.
          </p>
        </td></tr>

        <!-- CTA -->
        <tr><td align="center" style="padding:8px 36px 28px;">
          <table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:12px;background:linear-gradient(135deg,#ff006e,#ff5c8a);">
            <a href="${link}" style="display:inline-block;padding:16px 34px;color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;border-radius:12px;letter-spacing:0.2px;">
              ▶  Démarrer le tutoriel
            </a>
          </td></tr></table>
          <p style="margin:14px 0 0;font-size:12px;color:#71717a;">Lien personnel valable 30 jours</p>
        </td></tr>

        <!-- Features -->
        <tr><td style="padding:0 36px 8px;">
          <div style="background:#fafafa;border:1px solid #ececef;border-radius:14px;padding:20px 22px;">
            <p style="margin:0 0 12px;font-size:11px;font-weight:700;color:#ff006e;text-transform:uppercase;letter-spacing:0.8px;">✓ Ce que vous allez configurer</p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;color:#27272a;">
              <tr><td style="padding:6px 0;line-height:1.5;"><strong style="color:#ff006e">▸</strong>&nbsp; Stripe — cartes bancaires & Apple/Google Pay</td></tr>
              <tr><td style="padding:6px 0;line-height:1.5;"><strong style="color:#ff006e">▸</strong>&nbsp; PayPal Pro — paiements internationaux</td></tr>
              <tr><td style="padding:6px 0;line-height:1.5;"><strong style="color:#ff006e">▸</strong>&nbsp; Alma — paiement en 3x / 4x sans frais</td></tr>
              <tr><td style="padding:6px 0;line-height:1.5;"><strong style="color:#ff006e">▸</strong>&nbsp; Mollie · Lyra/SystemPay · HelloAsso · Sumup</td></tr>
            </table>
          </div>
        </td></tr>

        <!-- Security -->
        <tr><td style="padding:18px 36px 8px;">
          <div style="background:#fff6fa;border:1px solid #ffd6e6;border-radius:12px;padding:14px 18px;display:flex;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
              <td style="font-size:22px;width:30px;vertical-align:top;">🔐</td>
              <td style="font-size:13px;line-height:1.5;color:#52525b;">
                <strong style="color:#18181b">100% sécurisé</strong> — vos clés sont chiffrées en base et accessibles uniquement par notre équipe technique. Vous gardez la propriété complète de vos comptes.
              </td>
            </tr></table>
          </div>
        </td></tr>

        <!-- Help -->
        <tr><td style="padding:24px 36px 8px;">
          <p style="margin:0;font-size:14px;line-height:1.6;color:#3f3f46;">
            <strong>Besoin d'aide ?</strong> Répondez simplement à cet email, notre équipe vous accompagne.
          </p>
        </td></tr>

        <!-- Signature -->
        <tr><td style="padding:24px 36px 36px;">
          <p style="margin:0 0 4px;font-size:14px;color:#27272a;">Très cordialement,</p>
          <p style="margin:0;font-size:15px;font-weight:700;color:#ff006e;">L'équipe Adamkom</p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#fafafa;padding:18px 36px;border-top:1px solid #ececef;text-align:center;">
          <p style="margin:0 0 6px;font-size:11px;color:#a1a1aa;">Si le bouton ne fonctionne pas, copiez ce lien :</p>
          <p style="margin:0;font-size:11px;color:#ff006e;word-break:break-all;">
            <a href="${link}" style="color:#ff006e;text-decoration:none;">${link}</a>
          </p>
          <p style="margin:14px 0 0;font-size:11px;color:#a1a1aa;">© Adamkom · Agence digitale · La Réunion</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  const previewHtml = useMemo(
    () => buildEmailHtml(previewLink || `${PUBLISHED_URL}/tuto/paiements?token=APERCU`),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [previewLink, clientCompany, clientEmail]
  );

  const openPreview = async () => {
    if (!clientEmail) {
      toast.error("Aucun email client renseigné");
      return;
    }
    try {
      const inv = activeInvite || (await ensureInvitation());
      setPreviewLink(`${PUBLISHED_URL}/tuto/paiements?token=${inv.token}`);
      setPreviewOpen(true);
    } catch (e: any) {
      toast.error(e.message || "Impossible de générer le lien");
    }
  };

  const sendEmail = async () => {
    if (!clientEmail || !previewLink) return;
    setSending(true);
    try {
      const htmlContent = buildEmailHtml(previewLink);
      const { error } = await supabase.functions.invoke("send-brevo-campaign", {
        body: {
          action: "send_client_email",
          recipientEmail: clientEmail,
          recipientName: clientCompany || clientEmail,
          subject,
          htmlContent,
          trigger: "tuto_paiements",
          client_id: clientId,
        },
      });
      if (error) throw error;
      toast.success(`Mail tuto Paiements envoyé à ${clientEmail}`);
      setPreviewOpen(false);
    } catch (e: any) {
      toast.error(e.message || "Erreur lors de l'envoi");
    } finally {
      setSending(false);
    }
  };

  const maskValue = (val: string) => {
    if (!val) return "";
    if (val.length <= 8) return "••••••";
    return val.slice(0, 4) + "••••••••" + val.slice(-4);
  };

  const copyValue = (val: string, label: string) => {
    navigator.clipboard.writeText(val).then(() => toast.success(`${label} copié`));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <CreditCard className="w-4 h-4 text-primary" />
          Moyens de paiement en ligne
          <Badge variant="outline" className="ml-2 text-[10px]">Stripe · PayPal · Alma · +4</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Bloc tuto link */}
        <div className="p-3 rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <div className="flex items-center gap-2 mb-2">
            <Link2 className="w-4 h-4 text-primary" />
            <span className="text-xs font-semibold text-primary uppercase tracking-wide">Lien tuto personnalisé</span>
            {!activeInvite && (
              <Badge variant="outline" className="text-[10px]">
                Aucune invitation active
              </Badge>
            )}
            {activeInvite && (
              <Badge variant="outline" className="text-[10px] border-success/30 text-success">
                <ShieldCheck className="w-3 h-3 mr-1" /> Invitation active
              </Badge>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground mb-3">
            Le client suit un tuto sécurisé pour créer ses comptes Stripe/PayPal/Alma/… et nous transmet ses clés API. Lien valable 30 jours, clés chiffrées en base, accessibles uniquement aux admins.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Input value={tutoLink} readOnly className="text-xs flex-1 min-w-[200px] bg-background" />
            <Button size="sm" variant="outline" onClick={copyLink} disabled={creatingInvite}>
              {creatingInvite ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
              Copier
            </Button>
            <Button size="sm" variant="ghost" asChild>
              <a href={tutoLink} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-3.5 h-3.5 mr-1" /> Ouvrir
              </a>
            </Button>
            <Button
              size="sm"
              className="bg-gradient-to-r from-primary to-primary/80"
              onClick={openPreview}
              disabled={!clientEmail || creatingInvite}
            >
              {creatingInvite ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Mail className="w-3.5 h-3.5 mr-1" />}
              Aperçu & Envoyer
            </Button>
          </div>
          {!clientEmail && (
            <p className="text-[11px] text-destructive mt-2">⚠️ Renseignez l'email du client pour pouvoir lui envoyer le tuto.</p>
          )}
        </div>

        {/* Liste des clés reçues — admin only */}
        {isAdmin && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Clés reçues ({credentials?.length || 0})
              </h4>
              <Button asChild size="sm" variant="ghost" className="h-7 text-xs">
                <a href="/paiements"><ExternalLink className="w-3 h-3 mr-1" /> Dashboard</a>
              </Button>
            </div>

            {loadingCreds && <p className="text-xs text-muted-foreground py-2">Chargement…</p>}
            {!loadingCreds && !credentials?.length && (
              <div className="text-center py-6 border border-dashed rounded-lg">
                <CreditCard className="w-6 h-6 text-muted-foreground/40 mx-auto mb-1" />
                <p className="text-xs text-muted-foreground">Aucune clé reçue pour ce client</p>
              </div>
            )}

            {credentials?.map((cred: any) => {
              const provider = PAYMENT_PROVIDERS[cred.provider as PaymentProviderKey];
              const isRevealed = reveal[cred.id];
              return (
                <div key={cred.id} className="p-3 rounded-lg border bg-card/50 space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{PROVIDER_LOGOS[cred.provider] || "💳"}</span>
                      <div>
                        <p className="text-sm font-semibold">
                          {provider?.name || cred.provider}
                          <Badge
                            variant="outline"
                            className={`ml-2 text-[10px] ${cred.environment === "live" ? "border-success/30 text-success" : "border-warning/30 text-warning"}`}
                          >
                            {cred.environment === "live" ? "🟢 PROD" : "🧪 TEST"}
                          </Badge>
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          Reçu le {new Date(cred.submitted_at).toLocaleDateString("fr-FR")}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs"
                      onClick={() => setReveal((p) => ({ ...p, [cred.id]: !p[cred.id] }))}
                    >
                      {isRevealed ? <><EyeOff className="w-3 h-3 mr-1" /> Masquer</> : <><Eye className="w-3 h-3 mr-1" /> Révéler</>}
                    </Button>
                  </div>

                  <div className="grid gap-1.5">
                    {Object.entries(cred.credentials || {}).map(([key, val]) => (
                      <div key={key} className="flex items-center gap-2 text-xs">
                        <span className="text-muted-foreground min-w-[140px] truncate" title={key}>{key}</span>
                        <code className="flex-1 px-2 py-1 rounded bg-muted font-mono text-[11px] truncate">
                          {isRevealed ? String(val) : maskValue(String(val))}
                        </code>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          onClick={() => copyValue(String(val), key)}
                          title="Copier"
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  {cred.notes && (
                    <p className="text-[11px] text-muted-foreground border-t pt-2 italic">📝 {cred.notes}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {!isAdmin && (
          <p className="text-[11px] text-muted-foreground italic flex items-center gap-1.5">
            <ShieldCheck className="w-3 h-3" /> Les clés API sont visibles uniquement par les administrateurs.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
