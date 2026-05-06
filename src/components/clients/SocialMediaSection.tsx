import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import EditorialCalendar from "@/components/clients/EditorialCalendar";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Plus, ExternalLink, Pencil, Trash2, CheckCircle2, Clock, Calendar, Share2, Copy, LogIn, Link2, MapPin, Facebook, Instagram,
  Send, History as HistoryIcon,
} from "lucide-react";
import {
  useSocialAccounts, useSocialPublications, useUpsertSocialAccount,
  useDeleteSocialAccount, useCreateSocialPublication, useUpdateSocialPublication,
  useDeleteSocialPublication, type SocialPlatform, type SocialPublication,
} from "@/hooks/use-social";
import { useMetaOAuth } from "@/hooks/use-meta-oauth";
import { PUBLISHED_URL } from "@/lib/constants";

function PlatformLogo({ platform, className = "w-4 h-4" }: { platform: SocialPlatform; className?: string }) {
  if (platform === "facebook") {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <path fill="#1877F2" d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.414c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.971H15.83c-1.49 0-1.955.93-1.955 1.884v2.265h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073Z" />
      </svg>
    );
  }
  if (platform === "instagram") {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <defs>
          <linearGradient id="instagram-gradient" x1="3" y1="21" x2="21" y2="3" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FEDA75" />
            <stop offset="0.32" stopColor="#FA7E1E" />
            <stop offset="0.58" stopColor="#D62976" />
            <stop offset="0.82" stopColor="#962FBF" />
            <stop offset="1" stopColor="#4F5BD5" />
          </linearGradient>
        </defs>
        <rect width="24" height="24" rx="6" fill="url(#instagram-gradient)" />
        <path fill="#fff" d="M12 7.2A4.8 4.8 0 1 0 12 16.8 4.8 4.8 0 0 0 12 7.2Zm0 7.92A3.12 3.12 0 1 1 12 8.88a3.12 3.12 0 0 1 0 6.24Zm6.12-8.1a1.14 1.14 0 1 1-2.28 0 1.14 1.14 0 0 1 2.28 0Z" />
        <path fill="#fff" d="M12 2.4c2.607 0 2.934.012 3.96.06 1.02.048 1.716.21 2.328.45a4.7 4.7 0 0 1 1.704 1.098A4.7 4.7 0 0 1 21.09 5.712c.24.612.402 1.308.45 2.328.048 1.026.06 1.353.06 3.96s-.012 2.934-.06 3.96c-.048 1.02-.21 1.716-.45 2.328a4.7 4.7 0 0 1-1.098 1.704 4.7 4.7 0 0 1-1.704 1.098c-.612.24-1.308.402-2.328.45-1.026.048-1.353.06-3.96.06s-2.934-.012-3.96-.06c-1.02-.048-1.716-.21-2.328-.45a4.7 4.7 0 0 1-1.704-1.098 4.7 4.7 0 0 1-1.098-1.704c-.24-.612-.402-1.308-.45-2.328C2.412 14.934 2.4 14.607 2.4 12s.012-2.934.06-3.96c.048-1.02.21-1.716.45-2.328a4.7 4.7 0 0 1 1.098-1.704A4.7 4.7 0 0 1 5.712 2.91c.612-.24 1.308-.402 2.328-.45C9.066 2.412 9.393 2.4 12 2.4Zm0 1.728c-2.562 0-2.865.012-3.882.06-.942.042-1.452.198-1.794.33-.45.174-.774.384-1.11.72-.336.336-.546.66-.72 1.11-.132.342-.288.852-.33 1.794-.048 1.017-.06 1.32-.06 3.882s.012 2.865.06 3.882c.042.942.198 1.452.33 1.794.174.45.384.774.72 1.11.336.336.66.546 1.11.72.342.132.852.288 1.794.33 1.017.048 1.32.06 3.882.06s2.865-.012 3.882-.06c.942-.042 1.452-.198 1.794-.33.45-.174.774-.384 1.11-.72.336-.336.546-.66.72-1.11.132-.342.288-.852.33-1.794.048-1.017.06-1.32.06-3.882s-.012-2.865-.06-3.882c-.042-.942-.198-1.452-.33-1.794-.174-.45-.384-.774-.72-1.11-.336-.336-.66-.546-1.11-.72-.342-.132-.852-.288-1.794-.33-1.017-.048-1.32-.06-3.882-.06Z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path fill="#4285F4" d="M23.52 12.27c0-.82-.07-1.42-.22-2.05H12v3.88h6.64c-.13.96-.86 2.4-2.48 3.37l-.02.13 3.6 2.4.25.02c2.28-1.82 3.53-4.5 3.53-7.75Z" />
      <path fill="#34A853" d="M12 23c3.27 0 6.01-.93 8.01-2.53l-3.82-3c-1.02.62-2.39 1.05-4.19 1.05-3.2 0-5.92-1.82-6.89-4.34l-.14.01-3.74 2.5-.05.12C3.16 20.49 7.24 23 12 23Z" />
      <path fill="#FBBC05" d="M5.11 14.18A5.8 5.8 0 0 1 4.78 12c0-.75.12-1.48.32-2.18l-.01-.15-3.79-2.54-.12.05A10.3 10.3 0 0 0 0 12c0 1.74.43 3.39 1.18 4.82l3.93-2.64Z" />
      <path fill="#EA4335" d="M12 5.48c2.28 0 3.82.85 4.7 1.56l3.43-2.88C18.02 2.47 15.27 1 12 1 7.24 1 3.16 3.51 1.18 7.18l3.92 2.64C6.08 7.3 8.8 5.48 12 5.48Z" />
    </svg>
  );
}

// Platform config
const PLATFORM_CONFIG: Record<SocialPlatform, { label: string; color: string; bg: string; placeholder: string; publishUrl: string }> = {
  facebook: {
    label: "Facebook",
    color: "text-[#1877F2]",
    bg: "bg-[#1877F2]/10",
    placeholder: "https://facebook.com/votre-page",
    publishUrl: "https://www.facebook.com/",
  },
  instagram: {
    label: "Instagram",
    color: "text-[#E4405F]",
    bg: "bg-[#E4405F]/10",
    placeholder: "https://instagram.com/votre-compte",
    publishUrl: "https://www.instagram.com/",
  },
  google_my_business: {
    label: "Google My Business",
    color: "text-[#4285F4]",
    bg: "bg-[#34A853]/10",
    placeholder: "https://business.google.com/...",
    publishUrl: "https://business.google.com/",
  },
};

const PLATFORMS: SocialPlatform[] = ["facebook", "instagram", "google_my_business"];

const STATUS_CONFIG = {
  a_faire: { label: "À faire", class: "bg-muted text-muted-foreground border-border" },
  planifie: { label: "Planifié", class: "bg-info/10 text-info border-info/20" },
  publie: { label: "Publié", class: "bg-success/10 text-success border-success/20" },
};

interface AccountEditDialogProps {
  clientId: string;
  platform: SocialPlatform;
  existingUrl?: string | null;
  existingUsername?: string | null;
  existingPageId?: string | null;
  trigger: React.ReactNode;
}

function AccountEditDialog({ clientId, platform, existingUrl, existingUsername, existingPageId, trigger }: AccountEditDialogProps) {
  const upsertAccount = useUpsertSocialAccount();
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState(existingUrl || "");
  const [username, setUsername] = useState(existingUsername || "");
  const cfg = PLATFORM_CONFIG[platform];

  const handleSave = async () => {
    if (!url.trim() && !username.trim()) { toast.error("URL ou nom d'utilisateur requis"); return; }
    try {
      await upsertAccount.mutateAsync({
        client_id: clientId,
        platform,
        profile_url: url || null,
        username: username || null,
        page_id: existingPageId || username || url || null,
      });
      toast.success("Compte enregistré");
      setOpen(false);
    } catch { toast.error("Erreur lors de l'enregistrement"); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PlatformLogo platform={platform} /> Configurer {cfg.label}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Nom d'utilisateur / Nom de la page</Label>
            <Input placeholder="@nom_compte ou Nom de la Page" value={username} onChange={(e) => setUsername(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>URL du profil / de la page</Label>
            <Input placeholder={cfg.placeholder} value={url} onChange={(e) => setUrl(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
          <Button onClick={handleSave} disabled={upsertAccount.isPending}>Enregistrer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface NewPublicationDialogProps {
  clientId: string;
  accounts: ReturnType<typeof useSocialAccounts>["data"];
}

function NewPublicationDialog({ clientId, accounts }: NewPublicationDialogProps) {
  const { user } = useAuth();
  const createPub = useCreateSocialPublication();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    platform: "" as SocialPlatform | "",
    content: "",
    scheduled_date: "",
  });

  const handleCreate = async () => {
    if (!form.platform || !form.content.trim()) { toast.error("Plateforme et contenu requis"); return; }
    try {
      await createPub.mutateAsync({
        client_id: clientId,
        platform: form.platform as SocialPlatform,
        content: form.content,
        image_url: null,
        scheduled_date: form.scheduled_date || null,
        status: "a_faire",
        created_by: user!.id,
      });
      toast.success("Publication planifiée");
      setOpen(false);
      setForm({ platform: "", content: "", scheduled_date: "" });
    } catch { toast.error("Erreur lors de la création"); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="w-4 h-4 mr-1" /> Planifier</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Nouvelle publication</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Plateforme *</Label>
            <Select value={form.platform} onValueChange={(v) => setForm({ ...form, platform: v as SocialPlatform })}>
              <SelectTrigger><SelectValue placeholder="Choisir une plateforme" /></SelectTrigger>
              <SelectContent>
                {PLATFORMS.map((p) => (
                  <SelectItem key={p} value={p}>
                    <span className="flex items-center gap-2">
                      <PlatformLogo platform={p} /> {PLATFORM_CONFIG[p].label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Contenu *</Label>
            <Textarea placeholder="Rédigez votre publication..." rows={4} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Date prévue</Label>
            <Input type="date" value={form.scheduled_date} onChange={(e) => setForm({ ...form, scheduled_date: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
          <Button onClick={handleCreate} disabled={createPub.isPending}>Créer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TutoLinksBlock({ clientId, clientNdi, clientEmail, clientCompany }: { clientId: string; clientNdi?: string | null; clientEmail?: string | null; clientCompany?: string }) {
  const [resending, setResending] = useState<"facebook" | "gmb" | "instagram" | null>(null);

  const fbLink = clientNdi ? `${PUBLISHED_URL}/tuto/facebook?client=${clientNdi}` : `${PUBLISHED_URL}/tuto/facebook`;
  const gmbLink = clientNdi ? `${PUBLISHED_URL}/tuto/gmb?client=${clientNdi}` : `${PUBLISHED_URL}/tuto/gmb`;
  const igLink = clientNdi ? `${PUBLISHED_URL}/tuto/instagram?client=${clientNdi}` : `${PUBLISHED_URL}/tuto/instagram`;

  const copy = (link: string, label: string) => {
    navigator.clipboard.writeText(link).then(() => toast.success(`Lien tuto ${label} copié !`));
  };

  const resend = async (kind: "facebook" | "gmb") => {
    if (!clientEmail) {
      toast.error("Aucun email client renseigné");
      return;
    }
    setResending(kind);
    try {
      const link = kind === "facebook" ? fbLink : gmbLink;
      const platformLabel = kind === "facebook" ? "Facebook Business" : "Google My Business";
      const subject = `Accès à votre ${kind === "facebook" ? "page Facebook" : "fiche Google"} — ${clientCompany || ""}`.trim();
      const greeting = clientCompany || "vous";
      const htmlContent = `
        <div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#18181b">
          <p>Bonjour <strong>${greeting}</strong>,</p>
          <p>Suite à notre échange, voici à nouveau le tutoriel <strong>${platformLabel}</strong> pour nous transmettre les accès nécessaires à la gestion de vos réseaux sociaux.</p>
          <p>Le tutoriel est ultra-simple, il ne vous prendra que quelques minutes et vous n'avez <strong>aucun mot de passe à nous communiquer</strong>.</p>
          <p style="text-align:center;margin:32px 0">
            <a href="${link}" style="background:linear-gradient(135deg,#ff006e,#ff5c8a);color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">
              ${kind === "facebook" ? "📘" : "📍"} Suivre le tutoriel ${platformLabel}
            </a>
          </p>
          <p style="font-size:13px;color:#71717a">Lien direct : <a href="${link}" style="color:#ff006e;word-break:break-all">${link}</a></p>
          <p>Si vous avez la moindre question, notre équipe se tient à votre disposition.</p>
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
          trigger: kind === "facebook" ? "tuto_facebook" : "tuto_gmb",
          client_id: clientId,
        },
      });
      if (error) throw error;

      // Reset reminder window
      try {
        const { data: existing } = await (supabase as any)
          .from("onboarding_invitations")
          .select("id")
          .eq("kind", kind)
          .eq("contact_email", clientEmail)
          .is("completed_at", null)
          .maybeSingle();
        if (existing?.id) {
          await (supabase as any)
            .from("onboarding_invitations")
            .update({ sent_at: new Date().toISOString(), reminder_count: 0, last_reminder_at: null })
            .eq("id", existing.id);
        } else {
          await (supabase as any).from("onboarding_invitations").insert({
            kind,
            client_id: clientId,
            client_ndi: clientNdi || null,
            contact_email: clientEmail,
            company_name: clientCompany || null,
          });
        }
      } catch (e) { console.warn("invitation tracking failed", e); }

      toast.success(`Mail tuto ${platformLabel} renvoyé à ${clientEmail}`);
    } catch (e: any) {
      toast.error(e.message || "Erreur lors de l'envoi");
    } finally {
      setResending(null);
    }
  };

  return (
    <>
      <div className="mb-4 p-3 rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <div className="flex items-center gap-2 mb-2">
          <Link2 className="w-4 h-4 text-primary" />
          <span className="text-xs font-semibold text-primary uppercase tracking-wide">Liens tutos personnalisés</span>
          {!clientNdi && <Badge variant="outline" className="text-[10px]">NDI manquant — lien générique</Badge>}
        </div>
        <p className="text-[11px] text-muted-foreground mb-3">
          Envoyez ces liens au client pour qu'il vous transmette ses accès Facebook & Google My Business sans partager de mot de passe.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* FACEBOOK */}
          <div className="space-y-1.5 p-2 rounded-lg bg-background/60 border border-border/50">
            <div className="flex items-center gap-1.5 text-xs font-semibold">
              <Facebook className="w-3.5 h-3.5 text-[#1877F2]" /> Facebook
            </div>
            <div className="flex items-center gap-1">
              <Button size="sm" variant="outline" className="flex-1 text-xs justify-start h-8" onClick={() => copy(fbLink, "Facebook")}>
                <Copy className="w-3 h-3 mr-1" /> Copier lien
              </Button>
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0" asChild title="Ouvrir le tuto">
                <a href={fbLink} target="_blank" rel="noopener noreferrer"><ExternalLink className="w-3.5 h-3.5" /></a>
              </Button>
            </div>
            <Button size="sm" variant="default" className="w-full text-xs h-8 bg-[#1877F2] hover:bg-[#1866d4]" onClick={() => resend("facebook")} disabled={!clientEmail || resending === "facebook"}>
              {resending === "facebook" ? "Envoi..." : <><Send className="w-3 h-3 mr-1" /> Renvoyer le mail</>}
            </Button>
          </div>

          {/* GMB */}
          <div className="space-y-1.5 p-2 rounded-lg bg-background/60 border border-border/50">
            <div className="flex items-center gap-1.5 text-xs font-semibold">
              <MapPin className="w-3.5 h-3.5 text-[#34A853]" /> Google My Business
            </div>
            <div className="flex items-center gap-1">
              <Button size="sm" variant="outline" className="flex-1 text-xs justify-start h-8" onClick={() => copy(gmbLink, "Google My Business")}>
                <Copy className="w-3 h-3 mr-1" /> Copier lien
              </Button>
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0" asChild title="Ouvrir le tuto">
                <a href={gmbLink} target="_blank" rel="noopener noreferrer"><ExternalLink className="w-3.5 h-3.5" /></a>
              </Button>
            </div>
            <Button size="sm" variant="default" className="w-full text-xs h-8 bg-[#34A853] hover:bg-[#2d9248]" onClick={() => resend("gmb")} disabled={!clientEmail || resending === "gmb"}>
              {resending === "gmb" ? "Envoi..." : <><Send className="w-3 h-3 mr-1" /> Renvoyer le mail</>}
            </Button>
          </div>
        </div>
        {!clientEmail && (
          <p className="text-[10px] text-amber-600 mt-2">⚠️ Aucun email client — l'envoi automatique est désactivé.</p>
        )}
        <p className="text-[10px] text-muted-foreground mt-2">
          📬 Suivi des envois centralisé dans <a href="/emails" className="text-primary underline">Notifications &gt; Emails</a>.
        </p>
      </div>
    </>
  );
}

function TutoEmailHistoryDialog({ open, onClose, kind, clientEmail }: { open: boolean; onClose: () => void; kind: "facebook" | "gmb" | null; clientEmail: string | null }) {
  const trigger = kind === "facebook" ? "tuto_facebook" : "tuto_gmb";
  const label = kind === "facebook" ? "Facebook" : "Google My Business";

  const { data: logs, isLoading, refetch } = useQuery({
    queryKey: ["tuto-email-log", trigger, clientEmail],
    queryFn: async () => {
      if (!clientEmail || !kind) return [];
      const { data, error } = await supabase
        .from("email_send_log")
        .select("id, message_id, recipient_email, subject, status, error_message, created_at, template_name")
        .eq("recipient_email", clientEmail)
        .eq("template_name", trigger)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      // dedup by message_id (latest first already)
      const map = new Map<string, any>();
      for (const e of data || []) {
        const key = e.message_id || e.id;
        if (!map.has(key)) map.set(key, e);
      }
      return Array.from(map.values());
    },
    enabled: open && !!clientEmail && !!kind,
  });

  const statusBadge = (s: string) => {
    if (s === "sent" || s === "delivered") return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300">{s === "sent" ? "Envoyé" : "Délivré"}</Badge>;
    if (s === "opened") return <Badge className="bg-green-100 text-green-700 border-green-300">Ouvert</Badge>;
    if (s === "clicked") return <Badge className="bg-violet-100 text-violet-700 border-violet-300">Cliqué</Badge>;
    if (s === "bounced" || s === "failed" || s === "spam" || s === "blocked") return <Badge variant="destructive">{s}</Badge>;
    return <Badge variant="outline">{s}</Badge>;
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HistoryIcon className="w-5 h-5" /> Historique envoi tuto {label}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Destinataire : <strong>{clientEmail || "—"}</strong></span>
            <Button size="sm" variant="ghost" onClick={() => refetch()}>Rafraîchir</Button>
          </div>
          {isLoading ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Chargement...</p>
          ) : !logs || logs.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Aucun envoi enregistré pour ce tuto.<br />
              <span className="text-xs">Cliquez sur « Renvoyer le mail » pour envoyer le tuto.</span>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {logs.map((e) => (
                <div key={e.id} className="p-3 rounded-lg border border-border bg-muted/30">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-sm font-medium truncate">{e.subject || "(sans objet)"}</span>
                    {statusBadge(e.status)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(e.created_at).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })}
                  </p>
                  {e.error_message && (
                    <p className="text-xs text-destructive mt-1 break-words">⚠️ {e.error_message}</p>
                  )}
                </div>
              ))}
            </div>
          )}
          <p className="text-[11px] text-muted-foreground pt-2 border-t">
            💡 Si « Envoyé » mais non reçu : vérifier les spams du destinataire ou son adresse email.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function SocialMediaSection({ clientId, clientNdi, clientEmail, clientCompany }: { clientId: string; clientNdi?: string | null; clientEmail?: string | null; clientCompany?: string }) {
  const { data: accounts, isLoading: loadingAccounts } = useSocialAccounts(clientId);
  const { data: publications, isLoading: loadingPubs } = useSocialPublications(clientId);
  const deleteAccount = useDeleteSocialAccount();
  const updatePub = useUpdateSocialPublication();
  const deletePub = useDeleteSocialPublication();
  const { startOAuth } = useMetaOAuth();
  const [oauthLoading, setOauthLoading] = useState(false);

  // Group accounts by platform
  const accountsByPlatform: Record<SocialPlatform, typeof accounts> = {
    facebook: [],
    instagram: [],
    google_my_business: [],
  };
  (accounts || []).forEach((a) => {
    if (accountsByPlatform[a.platform as SocialPlatform]) {
      accountsByPlatform[a.platform as SocialPlatform]!.push(a);
    }
  });

  const handleDeleteAccount = async (id: string) => {
    try {
      await deleteAccount.mutateAsync({ id, clientId });
      toast.success("Compte supprimé");
    } catch { toast.error("Erreur"); }
  };

  const handlePubStatus = async (pub: SocialPublication, status: SocialPublication["status"]) => {
    try {
      await updatePub.mutateAsync({ id: pub.id, clientId: pub.client_id, status });
    } catch { toast.error("Erreur"); }
  };

  const handleDeletePub = async (pub: SocialPublication) => {
    try {
      await deletePub.mutateAsync({ id: pub.id, clientId: pub.client_id });
      toast.success("Publication supprimée");
    } catch { toast.error("Erreur"); }
  };

  const handleCopyAndPublish = async (pub: SocialPublication) => {
    const cfg = PLATFORM_CONFIG[pub.platform as SocialPlatform];
    const platformAccounts = accountsByPlatform[pub.platform as SocialPlatform] || [];
    try {
      await navigator.clipboard.writeText(pub.content);
      toast.success("Contenu copié ! Redirection vers " + cfg.label + "...");
      const targetUrl = platformAccounts[0]?.profile_url || cfg.publishUrl;
      window.open(targetUrl, "_blank");
    } catch {
      toast.error("Impossible de copier le contenu");
    }
  };

  const handleMetaOAuth = async () => {
    setOauthLoading(true);
    try {
      await startOAuth(clientId);
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la connexion Meta");
      setOauthLoading(false);
    }
  };

  const pendingPubs = publications?.filter((p) => p.status !== "publie") || [];
  const publishedPubs = publications?.filter((p) => p.status === "publie") || [];
  const connectedCount = accounts?.length || 0;

  return (
    <Card className="border-0 shadow-md shadow-primary/5">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Share2 className="w-5 h-5" /> Réseaux sociaux
          {connectedCount > 0 && (
            <Badge variant="outline" className="text-xs ml-1">{connectedCount} compte{connectedCount > 1 ? "s" : ""}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* ─── LIENS TUTOS PERSONNALISÉS ─── */}
        <TutoLinksBlock clientId={clientId} clientNdi={clientNdi} clientEmail={clientEmail} clientCompany={clientCompany} />
        <Tabs defaultValue="comptes">
          <TabsList className="mb-4">
            <TabsTrigger value="comptes">Comptes</TabsTrigger>
            <TabsTrigger value="publications" className="relative">
              Publications
              {pendingPubs.length > 0 && (
                <span className="ml-2 inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold rounded-full bg-primary text-primary-foreground">
                  {pendingPubs.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="calendrier">📅 Calendrier</TabsTrigger>
          </TabsList>

          {/* ─── TAB: COMPTES ─── */}
          <TabsContent value="comptes" className="space-y-4 mt-0">
            {PLATFORMS.map((platform) => {
              const cfg = PLATFORM_CONFIG[platform];
              const platformAccounts = accountsByPlatform[platform] || [];
              const isMeta = platform === "facebook" || platform === "instagram";

              return (
                <div key={platform} className="space-y-2">
                  {/* Platform header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm ${cfg.bg}`}>
                        <PlatformLogo platform={platform} className="w-4 h-4" />
                      </div>
                      <span className={`font-semibold text-sm ${cfg.color}`}>{cfg.label}</span>
                      {platformAccounts.length > 0 && (
                        <Badge variant="outline" className="text-[10px]">{platformAccounts.length} page{platformAccounts.length > 1 ? "s" : ""}</Badge>
                      )}
                    </div>
                    {/* Add button */}
                    {isMeta ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={handleMetaOAuth}
                        disabled={oauthLoading}
                      >
                        <LogIn className="w-3.5 h-3.5 mr-1" />
                        {oauthLoading ? "Connexion..." : platformAccounts.length > 0 ? "Ajouter une page" : "Connecter via Meta"}
                      </Button>
                    ) : (
                      <AccountEditDialog
                        clientId={clientId}
                        platform={platform}
                        trigger={
                          <Button variant="outline" size="sm" className="text-xs">
                            <Plus className="w-3.5 h-3.5 mr-1" /> {platformAccounts.length > 0 ? "Ajouter" : "Connecter"}
                          </Button>
                        }
                      />
                    )}
                  </div>

                  {/* Connected accounts list */}
                  {platformAccounts.length === 0 ? (
                    <div className="p-3 rounded-xl border border-dashed border-border/60 text-center">
                      <p className="text-xs text-muted-foreground">Aucune page connectée</p>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {platformAccounts.map((account) => (
                        <div key={account.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-border bg-muted/20">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              {account.username && (
                                <span className="text-sm font-medium truncate">{account.username}</span>
                              )}
                              {account.profile_url && (
                                <a href={account.profile_url} target="_blank" rel="noopener noreferrer"
                                  className="text-xs text-primary flex items-center gap-0.5 hover:underline shrink-0">
                                  <ExternalLink className="w-3 h-3" /> Ouvrir
                                </a>
                              )}
                            </div>
                            {account.page_id && (
                              <p className="text-[10px] text-muted-foreground mt-0.5">ID: {account.page_id}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <AccountEditDialog
                              clientId={clientId}
                              platform={platform}
                              existingUrl={account.profile_url}
                              existingUsername={account.username}
                              existingPageId={account.page_id}
                              trigger={
                                <Button variant="ghost" size="icon" className="h-7 w-7">
                                  <Pencil className="w-3.5 h-3.5" />
                                </Button>
                              }
                            />
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => handleDeleteAccount(account.id)}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </TabsContent>

          {/* ─── TAB: PUBLICATIONS ─── */}
          <TabsContent value="publications" className="mt-0">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">
                {pendingPubs.length} à publier · {publishedPubs.length} publiées
              </p>
              <NewPublicationDialog clientId={clientId} accounts={accounts} />
            </div>

            {!publications?.length ? (
              <div className="text-center py-8 text-muted-foreground">
                <Share2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Aucune publication planifiée</p>
              </div>
            ) : (
              <div className="space-y-3">
                {[...pendingPubs, ...publishedPubs].map((pub) => {
                  const cfg = PLATFORM_CONFIG[pub.platform as SocialPlatform];
                  const statusCfg = STATUS_CONFIG[pub.status as keyof typeof STATUS_CONFIG];
                  const isOverdue = pub.scheduled_date && pub.status === "a_faire" && new Date(pub.scheduled_date) < new Date();
                  return (
                    <div key={pub.id} className={`p-3 rounded-xl border bg-muted/10 transition-colors ${isOverdue ? "border-destructive/30" : "border-border/50"}`}>
                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0 ${cfg?.bg}`}>
                          <PlatformLogo platform={pub.platform as SocialPlatform} className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs font-medium ${cfg?.color}`}>{cfg?.label}</span>
                            {statusCfg && (
                              <Badge variant="outline" className={`text-[10px] px-1.5 ${statusCfg.class}`}>
                                {statusCfg.label}
                              </Badge>
                            )}
                            {isOverdue && (
                              <Badge variant="outline" className="text-[10px] px-1.5 bg-destructive/10 text-destructive border-destructive/20">
                                En retard
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm line-clamp-2">{pub.content}</p>
                          {pub.scheduled_date && (
                            <div className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground">
                              <Calendar className="w-3 h-3" />
                              {new Date(pub.scheduled_date).toLocaleDateString("fr-FR", { timeZone: "Indian/Reunion", day: "numeric", month: "long", year: "numeric" })}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {pub.status !== "publie" && (
                            <Button
                              variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1 text-primary hover:text-primary"
                              title="Copier le contenu et ouvrir la plateforme"
                              onClick={() => handleCopyAndPublish(pub)}
                            >
                              <Copy className="w-3.5 h-3.5" />
                              Publier
                            </Button>
                          )}
                          {pub.status !== "publie" && (
                            <Button
                              variant="ghost" size="icon" className="h-7 w-7 text-success hover:text-success"
                              title="Marquer comme publié"
                              onClick={() => handlePubStatus(pub, "publie")}
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </Button>
                          )}
                          {pub.status === "a_faire" && (
                            <Button
                              variant="ghost" size="icon" className="h-7 w-7 text-info hover:text-info"
                              title="Marquer comme planifié"
                              onClick={() => handlePubStatus(pub, "planifie")}
                            >
                              <Clock className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => handleDeletePub(pub)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
          {/* ─── TAB: CALENDRIER ÉDITORIAL ─── */}
          <TabsContent value="calendrier" className="mt-0">
            <EditorialCalendar />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
