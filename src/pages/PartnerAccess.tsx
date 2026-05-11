import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Building2, CheckCircle2, Clock, Copy, ExternalLink, Mail, Pencil, Plus, RefreshCw,
  Send, Share2, Trash2, XCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  usePartnerAccessList, useUpsertPartnerAccess, useDeletePartnerAccess,
  usePartnerNotifications, useUpsertPartnerNotification, useDeletePartnerNotification,
  useMarkNotificationPublished, useClientsLight,
  type PartnerAccess, type PartnerAccessStatus, type PartnerAccessType, type PartnerAccessRole,
  type PartnerNotification, type PartnerNotificationType, type PartnerNotificationStatus,
} from "@/hooks/use-partner-access";

const ACCESS_TYPE_LABELS: Record<PartnerAccessType, string> = {
  fb_page: "Page Facebook",
  fb_business_manager: "Business Manager",
  ig_account: "Compte Instagram",
  ad_account: "Compte publicitaire",
  catalog: "Catalogue produits",
  gmb_location: "Fiche Google My Business",
  pixel: "Pixel Meta",
};

const STATUS_CONFIG: Record<PartnerAccessStatus, { label: string; className: string; icon: any }> = {
  a_inviter: { label: "À inviter", className: "bg-muted text-muted-foreground", icon: Clock },
  invitation_envoyee: { label: "Invitation envoyée", className: "bg-blue-500/10 text-blue-600 border-blue-500/30", icon: Send },
  accepte: { label: "Accepté", className: "bg-green-500/10 text-green-600 border-green-500/30", icon: CheckCircle2 },
  refuse: { label: "Refusé", className: "bg-red-500/10 text-red-600 border-red-500/30", icon: XCircle },
  expire: { label: "Expirée", className: "bg-orange-500/10 text-orange-600 border-orange-500/30", icon: Clock },
  revoque: { label: "Révoqué", className: "bg-red-500/10 text-red-600 border-red-500/30", icon: XCircle },
};

const NOTIF_TYPE_LABELS: Record<PartnerNotificationType, string> = {
  post: "Publication",
  story: "Story",
  reel: "Reel",
  gmb_post: "Post Google",
  gmb_review_reply: "Réponse avis Google",
  message_reply: "Réponse message",
  announcement: "Annonce",
};

const NOTIF_STATUS_CONFIG: Record<PartnerNotificationStatus, { label: string; className: string }> = {
  brouillon: { label: "Brouillon", className: "bg-muted text-muted-foreground" },
  planifie: { label: "Planifié", className: "bg-blue-500/10 text-blue-600 border-blue-500/30" },
  publie_manuel: { label: "Publié (manuel)", className: "bg-green-500/10 text-green-600 border-green-500/30" },
  publie_api: { label: "Publié (API)", className: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30" },
  echec: { label: "Échec", className: "bg-red-500/10 text-red-600 border-red-500/30" },
};

const PLATFORMS = [
  { value: "facebook", label: "Facebook" },
  { value: "instagram", label: "Instagram" },
  { value: "google_my_business", label: "Google My Business" },
];

const FB_BM_INVITE_URL = "https://business.facebook.com/settings/people";
const GMB_MANAGE_URL = "https://business.google.com/locations";

export default function PartnerAccess() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <header className="space-y-2">
        <div className="flex items-center gap-3">
          <Share2 className="w-7 h-7 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">Accès Partenaire</h1>
        </div>
        <p className="text-muted-foreground max-w-3xl">
          Mode semi-automatique : invitez vos clients via Business Manager, suivez les accès
          accordés, et publiez des notifications/posts manuellement en attendant la validation
          de l'app Meta.
        </p>
      </header>

      <Tabs defaultValue="access" className="space-y-4">
        <TabsList>
          <TabsTrigger value="access">📋 Accès BM</TabsTrigger>
          <TabsTrigger value="notifications">📢 Publications & notifications</TabsTrigger>
          <TabsTrigger value="guide">📘 Guide d'invitation</TabsTrigger>
        </TabsList>

        <TabsContent value="access"><AccessTab /></TabsContent>
        <TabsContent value="notifications"><NotificationsTab /></TabsContent>
        <TabsContent value="guide"><GuideTab /></TabsContent>
      </Tabs>
    </div>
  );
}

/* ─────────── ACCÈS BM ─────────── */
function AccessTab() {
  const [statusFilter, setStatusFilter] = useState<PartnerAccessStatus | "all">("all");
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Partial<PartnerAccess> | null>(null);

  const { data: list = [], isLoading } = usePartnerAccessList({ status: statusFilter });
  const del = useDeletePartnerAccess();

  const filtered = useMemo(() => {
    return list.filter((a) => {
      if (platformFilter !== "all" && a.platform !== platformFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        return (
          a.clients?.company_name?.toLowerCase().includes(s) ||
          a.invitation_email?.toLowerCase().includes(s) ||
          a.asset_name?.toLowerCase().includes(s)
        );
      }
      return true;
    });
  }, [list, platformFilter, search]);

  const stats = useMemo(() => {
    const s = { total: list.length, a_inviter: 0, invitation_envoyee: 0, accepte: 0 };
    list.forEach((a) => { (s as any)[a.status] = ((s as any)[a.status] || 0) + 1; });
    return s;
  }, [list]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total" value={stats.total} icon={Share2} />
        <StatCard label="À inviter" value={stats.a_inviter} icon={Clock} accent="muted" />
        <StatCard label="Invitations envoyées" value={stats.invitation_envoyee} icon={Send} accent="blue" />
        <StatCard label="Acceptés" value={stats.accepte} icon={CheckCircle2} accent="green" />
      </div>

      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <CardTitle className="text-lg">Accès Business Manager</CardTitle>
          <div className="flex flex-wrap gap-2">
            <Input
              placeholder="Rechercher client / email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-[220px]"
            />
            <Select value={platformFilter} onValueChange={setPlatformFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes plateformes</SelectItem>
                {PLATFORMS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous statuts</SelectItem>
                {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={() => setEditing({})}><Plus className="w-4 h-4 mr-1" /> Nouvel accès</Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-sm py-6 text-center">Chargement…</p>
          ) : filtered.length === 0 ? (
            <div className="py-10 text-center space-y-2">
              <Building2 className="w-10 h-10 mx-auto text-muted-foreground" />
              <p className="text-muted-foreground">Aucun accès enregistré pour le moment.</p>
              <Button variant="outline" onClick={() => setEditing({})}>
                <Plus className="w-4 h-4 mr-1" /> Ajouter le premier
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((a) => <AccessRow key={a.id} access={a} onEdit={() => setEditing(a)} onDelete={() => del.mutate(a.id)} />)}
            </div>
          )}
        </CardContent>
      </Card>

      {editing && <AccessDialog access={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function AccessRow({ access, onEdit, onDelete }: { access: PartnerAccess; onEdit: () => void; onDelete: () => void }) {
  const cfg = STATUS_CONFIG[access.status];
  const Icon = cfg.icon;
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border rounded-lg p-3 hover:bg-muted/40 transition">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className={cfg.className}>
            <Icon className="w-3 h-3 mr-1" /> {cfg.label}
          </Badge>
          <Badge variant="secondary">{ACCESS_TYPE_LABELS[access.access_type]}</Badge>
          <Badge variant="outline">{access.platform}</Badge>
          {access.granted_role && <Badge variant="outline">Rôle : {access.granted_role}</Badge>}
        </div>
        <div className="mt-1.5 font-medium">
          {access.clients?.company_name || "—"}{access.clients?.ndi && <span className="text-muted-foreground text-sm ml-1">({access.clients.ndi})</span>}
        </div>
        <div className="text-xs text-muted-foreground space-x-3">
          {access.asset_name && <span>📎 {access.asset_name}</span>}
          {access.invitation_email && <span>✉️ {access.invitation_email}</span>}
          {access.invitation_sent_at && <span>📤 Envoyée le {new Date(access.invitation_sent_at).toLocaleDateString("fr-FR")}</span>}
          {access.accepted_at && <span>✅ Acceptée le {new Date(access.accepted_at).toLocaleDateString("fr-FR")}</span>}
        </div>
        {access.notes && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{access.notes}</p>}
      </div>
      <div className="flex gap-1.5 shrink-0">
        {access.invitation_link && (
          <Button size="sm" variant="outline" asChild>
            <a href={access.invitation_link} target="_blank" rel="noreferrer"><ExternalLink className="w-3.5 h-3.5" /></a>
          </Button>
        )}
        <Button size="sm" variant="outline" onClick={onEdit}><Pencil className="w-3.5 h-3.5" /></Button>
        <Button size="sm" variant="outline" onClick={onDelete} className="text-destructive hover:text-destructive">
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

function AccessDialog({ access, onClose }: { access: Partial<PartnerAccess>; onClose: () => void }) {
  const { data: clients = [] } = useClientsLight();
  const upsert = useUpsertPartnerAccess();
  const [form, setForm] = useState<any>({
    id: access.id,
    client_id: access.client_id || "",
    platform: access.platform || "facebook",
    access_type: access.access_type || "fb_page",
    status: access.status || "a_inviter",
    invitation_email: access.invitation_email || "",
    business_manager_id: access.business_manager_id || "",
    asset_id: access.asset_id || "",
    asset_name: access.asset_name || "",
    granted_role: access.granted_role || "",
    invitation_link: access.invitation_link || "",
    notes: access.notes || "",
  });

  const inviteUrl = form.platform === "google_my_business" ? GMB_MANAGE_URL : FB_BM_INVITE_URL;

  const submit = async () => {
    if (!form.client_id) { toast.error("Sélectionnez un client"); return; }
    await upsert.mutateAsync(form);
    onClose();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{access.id ? "Modifier l'accès" : "Nouvel accès partenaire"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Client *</Label>
              <ClientCombobox
                options={clients as any}
                value={form.client_id}
                onChange={(v) => setForm({ ...form, client_id: v })}
                placeholder="Rechercher / choisir un client…"
              />
            </div>
            <div>
              <Label>Plateforme</Label>
              <Select value={form.platform} onValueChange={(v) => setForm({ ...form, platform: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PLATFORMS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Type d'accès</Label>
              <Select value={form.access_type} onValueChange={(v) => setForm({ ...form, access_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ACCESS_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Statut</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Email d'invitation</Label>
              <Input type="email" value={form.invitation_email} onChange={(e) => setForm({ ...form, invitation_email: e.target.value })} placeholder="client@exemple.com" />
            </div>
            <div>
              <Label>Rôle accordé</Label>
              <Select value={form.granted_role || "_none"} onValueChange={(v) => setForm({ ...form, granted_role: v === "_none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">—</SelectItem>
                  {(["admin","editor","advertiser","analyst","manager","owner"] as PartnerAccessRole[]).map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Business Manager ID</Label>
              <Input value={form.business_manager_id} onChange={(e) => setForm({ ...form, business_manager_id: e.target.value })} placeholder="123456789012345" />
            </div>
            <div>
              <Label>Asset ID (page / compte / fiche)</Label>
              <Input value={form.asset_id} onChange={(e) => setForm({ ...form, asset_id: e.target.value })} />
            </div>
            <div className="col-span-2">
              <Label>Nom de l'asset</Label>
              <Input value={form.asset_name} onChange={(e) => setForm({ ...form, asset_name: e.target.value })} placeholder="Ex: Page Restaurant Le Trio" />
            </div>
            <div className="col-span-2">
              <Label>Lien invitation (optionnel)</Label>
              <div className="flex gap-2">
                <Input value={form.invitation_link} onChange={(e) => setForm({ ...form, invitation_link: e.target.value })} placeholder="https://business.facebook.com/…" />
                <Button type="button" variant="outline" asChild>
                  <a href={inviteUrl} target="_blank" rel="noreferrer">
                    <ExternalLink className="w-3.5 h-3.5 mr-1" /> Ouvrir BM
                  </a>
                </Button>
              </div>
            </div>
            <div className="col-span-2">
              <Label>Notes</Label>
              <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={submit} disabled={upsert.isPending}>
            {upsert.isPending ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─────────── NOTIFICATIONS / PUBLICATIONS ─────────── */
function NotificationsTab() {
  const [statusFilter, setStatusFilter] = useState<PartnerNotificationStatus | "all">("all");
  const [editing, setEditing] = useState<Partial<PartnerNotification> | null>(null);
  const { data: list = [], isLoading } = usePartnerNotifications({ status: statusFilter });
  const del = useDeletePartnerNotification();
  const markPublished = useMarkNotificationPublished();

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <CardTitle className="text-lg">Publications & notifications</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Préparez le contenu, publiez-le manuellement sur la page client (ou via API si l'accès le permet).
            </p>
          </div>
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous statuts</SelectItem>
                {Object.entries(NOTIF_STATUS_CONFIG).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={() => setEditing({})}><Plus className="w-4 h-4 mr-1" /> Nouvelle</Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-sm py-6 text-center">Chargement…</p>
          ) : list.length === 0 ? (
            <p className="text-muted-foreground text-sm py-10 text-center">Aucune notification.</p>
          ) : (
            <div className="space-y-2">
              {list.map((n) => (
                <NotificationRow
                  key={n.id}
                  notif={n}
                  onEdit={() => setEditing(n)}
                  onDelete={() => del.mutate(n.id)}
                  onMarkPublished={() => markPublished.mutate({ id: n.id })}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {editing && <NotificationDialog notif={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function NotificationRow({ notif, onEdit, onDelete, onMarkPublished }: {
  notif: PartnerNotification;
  onEdit: () => void;
  onDelete: () => void;
  onMarkPublished: () => void;
}) {
  const cfg = NOTIF_STATUS_CONFIG[notif.status];
  const isPublished = notif.status === "publie_manuel" || notif.status === "publie_api";

  const copyContent = () => {
    navigator.clipboard.writeText(notif.content);
    toast.success("Contenu copié");
  };

  return (
    <div className="border rounded-lg p-3 space-y-2 hover:bg-muted/40 transition">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className={cfg.className}>{cfg.label}</Badge>
            <Badge variant="secondary">{NOTIF_TYPE_LABELS[notif.notification_type]}</Badge>
            <Badge variant="outline">{notif.platform}</Badge>
          </div>
          <div className="mt-1 font-medium">{notif.clients?.company_name || "—"}</div>
          {notif.title && <div className="text-sm font-medium">{notif.title}</div>}
          <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-3 mt-1">{notif.content}</p>
          <div className="text-xs text-muted-foreground mt-1 space-x-3">
            {notif.scheduled_for && <span>📅 Prévu le {new Date(notif.scheduled_for).toLocaleString("fr-FR")}</span>}
            {notif.published_at && <span>✅ Publié le {new Date(notif.published_at).toLocaleString("fr-FR")}</span>}
          </div>
        </div>
        <div className="flex flex-col gap-1.5 shrink-0">
          <Button size="sm" variant="outline" onClick={copyContent}><Copy className="w-3.5 h-3.5" /></Button>
          {notif.target_url && (
            <Button size="sm" variant="outline" asChild>
              <a href={notif.target_url} target="_blank" rel="noreferrer"><ExternalLink className="w-3.5 h-3.5" /></a>
            </Button>
          )}
          {!isPublished && (
            <Button size="sm" variant="default" onClick={onMarkPublished} title="Marquer comme publié manuellement">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={onEdit}><Pencil className="w-3.5 h-3.5" /></Button>
          <Button size="sm" variant="outline" onClick={onDelete} className="text-destructive hover:text-destructive">
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function NotificationDialog({ notif, onClose }: { notif: Partial<PartnerNotification>; onClose: () => void }) {
  const { data: clients = [] } = useClientsLight();
  const upsert = useUpsertPartnerNotification();
  const [form, setForm] = useState<any>({
    id: notif.id,
    client_id: notif.client_id || "",
    platform: notif.platform || "facebook",
    notification_type: notif.notification_type || "post",
    title: notif.title || "",
    content: notif.content || "",
    target_url: notif.target_url || "",
    scheduled_for: notif.scheduled_for ? notif.scheduled_for.slice(0, 16) : "",
    status: notif.status || "brouillon",
    notes: notif.notes || "",
  });

  const submit = async () => {
    if (!form.client_id) return toast.error("Sélectionnez un client");
    if (!form.content?.trim()) return toast.error("Le contenu est requis");
    await upsert.mutateAsync({
      ...form,
      scheduled_for: form.scheduled_for ? new Date(form.scheduled_for).toISOString() : null,
    });
    onClose();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{notif.id ? "Modifier la publication" : "Nouvelle publication"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label>Client *</Label>
              <Select value={form.client_id} onValueChange={(v) => setForm({ ...form, client_id: v })}>
                <SelectTrigger><SelectValue placeholder="Choisir…" /></SelectTrigger>
                <SelectContent>
                  {clients.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.company_name}{c.ndi ? ` (${c.ndi})` : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Plateforme</Label>
              <Select value={form.platform} onValueChange={(v) => setForm({ ...form, platform: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PLATFORMS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Type</Label>
              <Select value={form.notification_type} onValueChange={(v) => setForm({ ...form, notification_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(NOTIF_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Titre (optionnel)</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="col-span-2">
              <Label>Contenu *</Label>
              <Textarea rows={6} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="Texte à publier sur la page du client…" />
            </div>
            <div>
              <Label>URL cible (page à publier)</Label>
              <Input value={form.target_url} onChange={(e) => setForm({ ...form, target_url: e.target.value })} placeholder="https://facebook.com/…" />
            </div>
            <div>
              <Label>Planifié pour</Label>
              <Input type="datetime-local" value={form.scheduled_for} onChange={(e) => setForm({ ...form, scheduled_for: e.target.value })} />
            </div>
            <div className="col-span-2">
              <Label>Statut</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(NOTIF_STATUS_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={submit} disabled={upsert.isPending}>
            {upsert.isPending ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─────────── GUIDE ─────────── */
function GuideTab() {
  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Mail className="w-5 h-5 text-[#1877F2]" /> Inviter un client sur Business Manager (Facebook/Instagram)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <ol className="list-decimal list-inside space-y-2">
            <li>Ouvrir <a className="text-primary underline" href={FB_BM_INVITE_URL} target="_blank" rel="noreferrer">business.facebook.com/settings/people</a>.</li>
            <li>Cliquer sur <b>Ajouter</b> → entrer l'email professionnel du client.</li>
            <li>Choisir le rôle (Admin / Éditeur).</li>
            <li>Assigner les <b>actifs</b> (Pages, Compte pub, Catalogue, Pixel).</li>
            <li>Envoyer l'invitation, puis enregistrer ici l'accès avec statut <b>Invitation envoyée</b>.</li>
            <li>Quand le client accepte → passer le statut à <b>Accepté</b>.</li>
          </ol>
          <Button asChild variant="outline" className="w-full">
            <a href={FB_BM_INVITE_URL} target="_blank" rel="noreferrer">
              <ExternalLink className="w-4 h-4 mr-1" /> Ouvrir Business Manager
            </a>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Mail className="w-5 h-5 text-[#4285F4]" /> Inviter sur Google My Business
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <ol className="list-decimal list-inside space-y-2">
            <li>Le client doit ouvrir <a className="text-primary underline" href={GMB_MANAGE_URL} target="_blank" rel="noreferrer">business.google.com</a>.</li>
            <li>Sur sa fiche → ⋮ → <b>Gestionnaires d'établissement</b>.</li>
            <li>Inviter votre email pro avec le rôle <b>Manager</b>.</li>
            <li>Accepter l'invitation depuis votre Gmail pro.</li>
            <li>Enregistrer l'accès ici avec statut <b>Accepté</b>.</li>
          </ol>
          <Button asChild variant="outline" className="w-full">
            <a href={GMB_MANAGE_URL} target="_blank" rel="noreferrer">
              <ExternalLink className="w-4 h-4 mr-1" /> Ouvrir GMB
            </a>
          </Button>
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <RefreshCw className="w-5 h-5" /> Workflow semi-automatique recommandé
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>1. <b>Créer un accès</b> par client + plateforme (statut « À inviter »).</p>
          <p>2. <b>Envoyer l'invitation</b> via le BM, puis basculer le statut à « Invitation envoyée ».</p>
          <p>3. <b>Préparer les publications</b> dans l'onglet « Publications & notifications » (statut Brouillon).</p>
          <p>4. Quand l'accès est accepté, vous pouvez : (a) <b>publier manuellement</b> via le BM et marquer ✓, ou (b) attendre la validation Meta pour publier via API automatiquement.</p>
          <p className="text-muted-foreground italic">Astuce : le bouton « Copier » sur chaque publication permet de coller rapidement le texte dans Meta Business Suite.</p>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, accent }: { label: string; value: number; icon: any; accent?: string }) {
  const colorMap: Record<string, string> = {
    muted: "text-muted-foreground",
    blue: "text-blue-500",
    green: "text-green-500",
  };
  return (
    <Card>
      <CardContent className="p-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
        <Icon className={`w-7 h-7 ${accent ? colorMap[accent] : "text-primary"}`} />
      </CardContent>
    </Card>
  );
}
