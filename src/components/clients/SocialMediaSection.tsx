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

// Platform config
const PLATFORM_CONFIG: Record<SocialPlatform, { label: string; icon: string; color: string; bg: string; placeholder: string; publishUrl: string }> = {
  facebook: {
    label: "Facebook",
    icon: "𝐟",
    color: "text-[#1877F2]",
    bg: "bg-[#1877F2]/10",
    placeholder: "https://facebook.com/votre-page",
    publishUrl: "https://www.facebook.com/",
  },
  instagram: {
    label: "Instagram",
    icon: "📸",
    color: "text-[#E4405F]",
    bg: "bg-[#E4405F]/10",
    placeholder: "https://instagram.com/votre-compte",
    publishUrl: "https://www.instagram.com/",
  },
  google_my_business: {
    label: "Google My Business",
    icon: "🔍",
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
