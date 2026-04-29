import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  CreditCard, Copy, Send, ExternalLink, Eye, EyeOff, ShieldCheck, Link2, Loader2,
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

  const sendEmail = async () => {
    if (!clientEmail) {
      toast.error("Aucun email client renseigné");
      return;
    }
    setSending(true);
    try {
      const inv = activeInvite || (await ensureInvitation());
      const link = `${PUBLISHED_URL}/tuto/paiements?token=${inv.token}`;
      const greeting = clientCompany || "vous";
      const subject = `Configurer vos moyens de paiement en ligne — ${clientCompany || ""}`.trim();
      const htmlContent = `
        <div style="font-family:Inter,Arial,sans-serif;max-width:620px;margin:0 auto;padding:24px;color:#18181b">
          <p>Bonjour <strong>${greeting}</strong>,</p>
          <p>Pour activer les paiements en ligne sur votre site, nous avons besoin que vous nous transmettiez vos clés API (Stripe, PayPal, Alma, …).</p>
          <p>Nous avons préparé un <strong>tutoriel pas-à-pas sécurisé</strong> qui vous accompagne pour créer vos comptes et récupérer vos clés <strong>de TEST</strong> puis <strong>de PRODUCTION</strong>.</p>
          <ul style="line-height:1.8">
            <li>✅ Stripe, PayPal Pro, Alma, Mollie, Lyra/SystemPay, HelloAsso, Sumup</li>
            <li>🔐 Vos clés sont chiffrées en base et accessibles uniquement à notre équipe technique</li>
            <li>📚 Captures d'écran et liens directs vers chaque dashboard</li>
          </ul>
          <p style="text-align:center;margin:32px 0">
            <a href="${link}" style="background:linear-gradient(135deg,#ff006e,#ff5c8a);color:#fff;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:600;display:inline-block">
              💳 Accéder au tutoriel paiements
            </a>
          </p>
          <p style="font-size:12px;color:#71717a">Lien personnel valable 30 jours : <a href="${link}" style="color:#ff006e;word-break:break-all">${link}</a></p>
          <p>Une question ? Notre équipe reste à votre disposition.</p>
          <p>Très cordialement,<br><strong style="color:#ff006e">L'équipe Adamkom</strong></p>
        </div>
      `;
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
              onClick={sendEmail}
              disabled={!clientEmail || sending}
            >
              {sending ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Send className="w-3.5 h-3.5 mr-1" />}
              Envoyer le mail
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
