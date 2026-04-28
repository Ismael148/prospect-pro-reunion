import { useState } from "react";
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
  Plus, ExternalLink, Pencil, Trash2, CheckCircle2, Clock, Calendar, Share2, Copy, LogIn,
} from "lucide-react";
import {
  useSocialAccounts, useSocialPublications, useUpsertSocialAccount,
  useDeleteSocialAccount, useCreateSocialPublication, useUpdateSocialPublication,
  useDeleteSocialPublication, type SocialPlatform, type SocialPublication,
} from "@/hooks/use-social";
import { useMetaOAuth } from "@/hooks/use-meta-oauth";

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
            <span>{cfg.icon}</span> Configurer {cfg.label}
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
                      {PLATFORM_CONFIG[p].icon} {PLATFORM_CONFIG[p].label}
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

export default function SocialMediaSection({ clientId }: { clientId: string }) {
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
                        {cfg.icon}
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
                          {cfg?.icon}
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
