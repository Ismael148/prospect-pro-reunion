import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Globe,
  Search,
  Plus,
  ExternalLink,
  Mail,
  Phone,
  MapPin,
  CheckCircle2,
  Star,
  MessageSquare,
  Trash2,
  Copy,
  Link2,
  Download,
  AlertTriangle,
  BookOpen,
  ListChecks,
  Target,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ClientCombobox } from "@/components/ClientCombobox";
import {
  useClientGmbList,
  useAllClientsForGmbPicker,
  useUpsertClientGmb,
  useDeleteClientGmb,
  GMB_STATUS_LABELS,
  GMB_STATUS_COLORS,
  ACCESS_LEVEL_LABELS,
  type GmbStatus,
  type GmbAccessLevel,
  type ClientGmbWithClient,
  buildGmbCreateUrl,
} from "@/hooks/use-client-gmb";
import { GmbWebmasterPlaybook } from "@/components/gmb/GmbWebmasterPlaybook";
import { GmbActivityTimeline } from "@/components/gmb/GmbActivityTimeline";
import { GmbMonthlyGoals } from "@/components/gmb/GmbMonthlyGoals";

const PUBLIC_BASE_URL =
  typeof window !== "undefined" ? window.location.origin : "https://ai.adamkom.com";

const CHECKLIST_ITEMS: Array<{
  key: keyof ClientGmbWithClient;
  label: string;
  hint?: string;
}> = [
  { key: "checklist_account_created", label: "Compte Google Business créé", hint: "business.google.com" },
  { key: "checklist_postal_requested", label: "Vérification postale demandée" },
  { key: "checklist_code_received", label: "Code reçu du client" },
  { key: "checklist_verified", label: "Fiche vérifiée et active" },
  { key: "checklist_logo_added", label: "Logo ajouté" },
  { key: "checklist_photos_added", label: "Photos (≥ 5) ajoutées" },
  { key: "checklist_hours_set", label: "Horaires renseignés" },
  { key: "checklist_description_added", label: "Description optimisée" },
];

function getProgress(row: ClientGmbWithClient) {
  const total = CHECKLIST_ITEMS.length;
  const done = CHECKLIST_ITEMS.filter((it) => Boolean((row as any)[it.key])).length;
  return Math.round((done / total) * 100);
}

export default function Gmb() {
  const [statusFilter, setStatusFilter] = useState<GmbStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [activeRow, setActiveRow] = useState<ClientGmbWithClient | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [pickedClientId, setPickedClientId] = useState<string>("");

  const { data: rows = [], isLoading } = useClientGmbList({ status: statusFilter, search });
  const { data: candidates = [] } = useAllClientsForGmbPicker();
  const upsert = useUpsertClientGmb();
  const del = useDeleteClientGmb();

  const stats = useMemo(() => {
    const all = rows;
    const now = Date.now();
    const staleThreshold = 30 * 24 * 3600 * 1000;
    const totalUnanswered = all.reduce((s, r) => s + (r.unanswered_reviews || 0), 0);
    const stalePosts = all.filter((r) => {
      if (r.status !== "active") return false;
      if (!r.last_post_at) return true;
      return now - new Date(r.last_post_at).getTime() > staleThreshold;
    }).length;
    const avgProgress =
      all.length === 0
        ? 0
        : Math.round(all.reduce((s, r) => s + getProgress(r), 0) / all.length);
    return {
      total: all.length,
      active: all.filter((r) => r.status === "active").length,
      pending: all.filter((r) =>
        ["a_creer", "compte_cree", "verification_postale_demandee", "code_recu"].includes(r.status)
      ).length,
      suspended: all.filter((r) => r.status === "suspendue").length,
      totalUnanswered,
      stalePosts,
      avgProgress,
    };
  }, [rows]);

  const exportCsv = () => {
    const header = [
      "Client","Ville","NDI","Statut","Progression %","Note moyenne","Avis totaux","Avis sans réponse","Dernier post","URL fiche","Lien client",
    ];
    const lines = rows.map((r) => [
      r.clients?.company_name || "",
      r.clients?.city || "",
      r.clients?.ndi || "",
      GMB_STATUS_LABELS[r.status],
      getProgress(r),
      r.average_rating ?? "",
      r.total_reviews ?? "",
      r.unanswered_reviews ?? "",
      r.last_post_at ? new Date(r.last_post_at).toLocaleDateString("fr-FR") : "",
      r.gmb_url || "",
      r.clients?.gmb_public_token
        ? `${PUBLIC_BASE_URL}/mon-gmb/${r.clients.gmb_public_token}`
        : "",
    ]);
    const csv = [header, ...lines]
      .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gmb-suivi-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Export CSV téléchargé");
  };

  const pickedCandidate = candidates.find((c: any) => c.id === pickedClientId);
  const pickedAlreadyTracked = Boolean(pickedCandidate?.existing_gmb_id);

  const handleCreate = async () => {
    if (!pickedClientId) {
      toast.error("Sélectionne un client");
      return;
    }
    if (pickedAlreadyTracked) {
      // Ouvre directement la fiche existante — recherche large (indépendante des filtres)
      let existing = rows.find((r) => r.client_id === pickedClientId) as ClientGmbWithClient | undefined;
      if (!existing) {
        const { data, error } = await (supabase as any)
          .from("client_gmb")
          .select(
            "*, clients(id, company_name, ndi, address, city, postal_code, phone, sector, has_gmb, gmb_public_token)"
          )
          .eq("client_id", pickedClientId)
          .maybeSingle();
        if (error) {
          toast.error(error.message);
          return;
        }
        existing = data as ClientGmbWithClient;
      }
      if (existing) {
        setActiveRow(existing);
        setCreateOpen(false);
        setPickedClientId("");
        toast.info("Fiche GMB existante ouverte");
      } else {
        toast.error("Fiche introuvable");
      }
      return;
    }
    await upsert.mutateAsync({ client_id: pickedClientId, status: "a_creer" });
    setCreateOpen(false);
    setPickedClientId("");
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">
            <Globe className="mr-2 inline-block h-7 w-7 text-primary" />
            Gestion GMB centralisée
          </h1>
          <p className="mt-1 text-muted-foreground">
            Suivi des fiches Google Business Profile de tous tes clients — création, vérification
            postale, optimisation.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCsv} className="gap-2">
            <Download className="h-4 w-4" /> Export CSV
          </Button>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Activer le suivi GMB
              </Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Activer le suivi GMB pour un client</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Label>Client</Label>
              {candidates.length === 0 ? (
                <div className="rounded-md border p-3 text-sm text-muted-foreground">
                  Aucun client dans la base. Ajoute d'abord un client dans <strong>Clients</strong>.
                </div>
              ) : (
                <ClientCombobox
                  options={candidates as any}
                  value={pickedClientId}
                  onChange={setPickedClientId}
                  placeholder="Rechercher un client (nom, NDI, ville)…"
                  getBadge={(c: any) =>
                    c.existing_gmb_id ? (
                      <Badge variant="outline" className="text-[10px]">✓ Déjà suivi</Badge>
                    ) : null
                  }
                />
              )}
              {pickedAlreadyTracked ? (
                <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-sm">
                  Ce client a <strong>déjà</strong> une fiche GMB en suivi. Clique sur <strong>Ouvrir la fiche</strong> pour accéder au <strong>guide webmaster, la checklist, les objectifs mensuels et le journal d'activité</strong>.
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Le statut initial sera <Badge variant="outline">À créer</Badge>. Une fois activé, tu retrouves le <strong>guide pas-à-pas, la checklist des 8 étapes, les objectifs mensuels et le journal d'activité</strong> visible par le client.
                </p>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleCreate} disabled={upsert.isPending}>
                {pickedAlreadyTracked ? "Ouvrir la fiche" : "Activer"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Guide d'utilisation */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4 text-sm">
          <p className="font-semibold mb-2">📘 Comment ça marche ?</p>
          <ol className="list-decimal ml-5 space-y-1 text-muted-foreground">
            <li><strong>Activer le suivi GMB</strong> pour un client → il apparaît dans la liste ci-dessous.</li>
            <li>Clique sur <strong>Gérer</strong> sur sa carte → tu accèdes à 6 onglets : <strong>Guide</strong> (pas-à-pas webmaster), <strong>Checklist</strong> (8 étapes), <strong>Objectifs</strong> (posts/avis/photos du mois), <strong>Journal</strong> (actions visibles ou non par le client), <strong>Infos</strong> et <strong>Avis</strong>.</li>
            <li>Copie le <strong>Lien client</strong> et envoie-le au client — il voit alors le travail en direct sur <code>/mon-gmb/…</code>.</li>
          </ol>
        </CardContent>
      </Card>


      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Fiches suivies" value={stats.total} sub={`${stats.avgProgress}% moyen`} />
        <StatCard label="Actives" value={stats.active} accent="text-emerald-600" />
        <StatCard label="En cours" value={stats.pending} accent="text-amber-600" />
        <StatCard
          label="⚠ Alertes"
          value={stats.totalUnanswered + stats.stalePosts}
          accent="text-destructive"
          sub={`${stats.totalUnanswered} avis · ${stats.stalePosts} sans post`}
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher par client, ville, NDI…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
          <SelectTrigger className="md:w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            {(Object.keys(GMB_STATUS_LABELS) as GmbStatus[]).map((s) => (
              <SelectItem key={s} value={s}>
                {GMB_STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Grid */}
      {isLoading ? (
        <p className="text-muted-foreground">Chargement…</p>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-muted-foreground">
            Aucune fiche en suivi. Clique sur <strong>Activer le suivi GMB</strong> pour commencer.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((row) => (
            <GmbCard
              key={row.id}
              row={row}
              onOpen={() => setActiveRow(row)}
              onDelete={() => del.mutate(row.id)}
            />
          ))}
        </div>
      )}

      {/* Detail dialog */}
      {activeRow && (
        <GmbDetailDialog
          row={activeRow}
          open={!!activeRow}
          onClose={() => setActiveRow(null)}
        />
      )}
    </div>
  );
}

function StatCard({ label, value, accent, sub }: { label: string; value: number; accent?: string; sub?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className={`mt-1 text-3xl font-bold ${accent || ""}`}>{value}</p>
        {sub && <p className="mt-0.5 text-[10px] text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function GmbCard({
  row,
  onOpen,
  onDelete,
}: {
  row: ClientGmbWithClient;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const progress = getProgress(row);
  const client = row.clients;
  return (
    <Card className="group transition-all hover:shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <CardTitle className="truncate text-base">
              {client?.company_name || "Client supprimé"}
            </CardTitle>
            {client?.city && (
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" /> {client.city}
              </p>
            )}
          </div>
          <Badge className={GMB_STATUS_COLORS[row.status]}>{GMB_STATUS_LABELS[row.status]}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Progress */}
        <div>
          <div className="mb-1 flex justify-between text-xs">
            <span className="text-muted-foreground">Avancement</span>
            <span className="font-semibold">{progress}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-gradient-to-r from-primary to-primary/70 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Stats inline */}
        {row.status === "active" && (
          <div className="flex gap-3 text-xs text-muted-foreground">
            {row.average_rating != null && (
              <span className="flex items-center gap-1">
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                {row.average_rating.toFixed(1)}
              </span>
            )}
            <span className="flex items-center gap-1">
              <MessageSquare className="h-3 w-3" /> {row.total_reviews} avis
            </span>
            {row.unanswered_reviews > 0 && (
              <Badge variant="destructive" className="text-[10px]">
                {row.unanswered_reviews} sans réponse
              </Badge>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-2 pt-2">
          {row.gmb_url ? (
            <Button asChild size="sm" variant="outline" className="gap-1">
              <a href={row.gmb_url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3 w-3" />
                Ouvrir la fiche
              </a>
            </Button>
          ) : client ? (
            <Button asChild size="sm" variant="outline" className="gap-1">
              <a href={buildGmbCreateUrl(client)} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3 w-3" />
                Créer sur Google
              </a>
            </Button>
          ) : null}
          <Button size="sm" onClick={onOpen}>
            Gérer
          </Button>
          {client?.gmb_public_token && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1"
              onClick={() => {
                const url = `${PUBLIC_BASE_URL}/mon-gmb/${client.gmb_public_token}`;
                navigator.clipboard.writeText(url);
                toast.success("Lien client copié — envoie-le au client");
              }}
              title="Copier le lien de suivi client"
            >
              <Link2 className="h-3 w-3" /> Lien client
            </Button>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="ghost" className="text-destructive">
                <Trash2 className="h-3 w-3" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Retirer du suivi GMB ?</AlertDialogTitle>
                <AlertDialogDescription>
                  Cette action retire uniquement le suivi dans Adamkom. La fiche Google n'est pas
                  affectée.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={onDelete}>Retirer</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}

function GmbDetailDialog({
  row,
  open,
  onClose,
}: {
  row: ClientGmbWithClient;
  open: boolean;
  onClose: () => void;
}) {
  const upsert = useUpsertClientGmb();
  const [draft, setDraft] = useState({
    status: row.status,
    access_level: row.access_level,
    gmb_url: row.gmb_url || "",
    gmb_location_id: row.gmb_location_id || "",
    business_name_on_google: row.business_name_on_google || "",
    google_account_email: row.google_account_email || "",
    notes: row.notes || "",
    total_reviews: row.total_reviews ?? 0,
    average_rating: row.average_rating ?? "",
    unanswered_reviews: row.unanswered_reviews ?? 0,
    checklist_account_created: row.checklist_account_created,
    checklist_postal_requested: row.checklist_postal_requested,
    checklist_code_received: row.checklist_code_received,
    checklist_verified: row.checklist_verified,
    checklist_logo_added: row.checklist_logo_added,
    checklist_photos_added: row.checklist_photos_added,
    checklist_hours_set: row.checklist_hours_set,
    checklist_description_added: row.checklist_description_added,
  });

  const client = row.clients;

  const handleSave = async () => {
    await upsert.mutateAsync({
      id: row.id,
      client_id: row.client_id,
      ...draft,
      gmb_url: draft.gmb_url || null,
      gmb_location_id: draft.gmb_location_id || null,
      business_name_on_google: draft.business_name_on_google || null,
      google_account_email: draft.google_account_email || null,
      notes: draft.notes || null,
      average_rating:
        draft.average_rating === "" ? null : Number(draft.average_rating),
      total_reviews: Number(draft.total_reviews) || 0,
      unanswered_reviews: Number(draft.unanswered_reviews) || 0,
    });
    onClose();
  };

  const copyClientInfo = () => {
    if (!client) return;
    const text = [
      client.company_name,
      [client.address, client.postal_code, client.city].filter(Boolean).join(", "),
      client.phone,
      client.sector,
    ]
      .filter(Boolean)
      .join("\n");
    navigator.clipboard.writeText(text);
    toast.success("Infos copiées — colle-les dans Google Business Manager");
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            {client?.company_name || "Fiche GMB"}
          </DialogTitle>
          {client?.gmb_public_token && (
            <div className="flex items-center gap-2 pt-1">
              <Link2 className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground truncate">
                {`${PUBLIC_BASE_URL}/mon-gmb/${client.gmb_public_token}`}
              </span>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 px-2 text-xs"
                onClick={() => {
                  navigator.clipboard.writeText(
                    `${PUBLIC_BASE_URL}/mon-gmb/${client.gmb_public_token}`
                  );
                  toast.success("Lien copié");
                }}
              >
                <Copy className="mr-1 h-3 w-3" /> Copier
              </Button>
            </div>
          )}
        </DialogHeader>

        <Tabs defaultValue="playbook">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="playbook" className="gap-1">
              <BookOpen className="h-3 w-3" /> Guide
            </TabsTrigger>
            <TabsTrigger value="checklist" className="gap-1">
              <ListChecks className="h-3 w-3" /> Checklist
            </TabsTrigger>
            <TabsTrigger value="goals" className="gap-1">
              <Target className="h-3 w-3" /> Objectifs
            </TabsTrigger>
            <TabsTrigger value="activity" className="gap-1">
              <MessageSquare className="h-3 w-3" /> Journal
            </TabsTrigger>
            <TabsTrigger value="info">Infos</TabsTrigger>
            <TabsTrigger value="stats">Avis</TabsTrigger>
          </TabsList>

          <TabsContent value="playbook" className="pt-4">
            <GmbWebmasterPlaybook row={row} />
          </TabsContent>

          <TabsContent value="goals" className="pt-4">
            <GmbMonthlyGoals clientGmbId={row.id} clientId={row.client_id} />
          </TabsContent>

          <TabsContent value="activity" className="pt-4">
            <GmbActivityTimeline clientGmbId={row.id} clientId={row.client_id} />
          </TabsContent>


          <TabsContent value="checklist" className="space-y-4 pt-4">
            {/* Quick actions */}
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="space-y-3 p-4">
                <p className="text-sm font-semibold">🚀 Actions rapides</p>
                <div className="flex flex-wrap gap-2">
                  {client && (
                    <Button asChild size="sm" variant="outline">
                      <a
                        href={buildGmbCreateUrl(client)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="gap-1"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Créer la fiche sur Google
                      </a>
                    </Button>
                  )}
                  <Button asChild size="sm" variant="outline">
                    <a
                      href="https://business.google.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="gap-1"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Business Manager
                    </a>
                  </Button>
                  <Button size="sm" variant="outline" onClick={copyClientInfo} className="gap-1">
                    <Copy className="h-3 w-3" />
                    Copier infos client
                  </Button>
                </div>
                {client && (
                  <div className="rounded-md bg-background/60 p-3 text-xs space-y-1">
                    <p>
                      <strong>{client.company_name}</strong>
                    </p>
                    {client.address && (
                      <p className="flex items-center gap-1 text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {client.address}, {client.postal_code} {client.city}
                      </p>
                    )}
                    {client.phone && (
                      <p className="flex items-center gap-1 text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        {client.phone}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Checklist */}
            <div className="space-y-2">
              {CHECKLIST_ITEMS.map((it) => (
                <label
                  key={String(it.key)}
                  className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 hover:bg-accent/40"
                >
                  <Checkbox
                    checked={(draft as any)[it.key] as boolean}
                    onCheckedChange={(v) =>
                      setDraft({ ...draft, [it.key]: Boolean(v) } as any)
                    }
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{it.label}</p>
                    {it.hint && <p className="text-xs text-muted-foreground">{it.hint}</p>}
                  </div>
                  {(draft as any)[it.key] && (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  )}
                </label>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="info" className="space-y-4 pt-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <Label>Statut</Label>
                <Select
                  value={draft.status}
                  onValueChange={(v) => setDraft({ ...draft, status: v as GmbStatus })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(GMB_STATUS_LABELS) as GmbStatus[]).map((s) => (
                      <SelectItem key={s} value={s}>
                        {GMB_STATUS_LABELS[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Niveau d'accès</Label>
                <Select
                  value={draft.access_level}
                  onValueChange={(v) =>
                    setDraft({ ...draft, access_level: v as GmbAccessLevel })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(ACCESS_LEVEL_LABELS) as GmbAccessLevel[]).map((s) => (
                      <SelectItem key={s} value={s}>
                        {ACCESS_LEVEL_LABELS[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Label>URL de la fiche Google</Label>
                <Input
                  placeholder="https://g.page/…"
                  value={draft.gmb_url}
                  onChange={(e) => setDraft({ ...draft, gmb_url: e.target.value })}
                />
              </div>
              <div>
                <Label>Nom sur Google</Label>
                <Input
                  value={draft.business_name_on_google}
                  onChange={(e) =>
                    setDraft({ ...draft, business_name_on_google: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Location ID</Label>
                <Input
                  placeholder="locations/123…"
                  value={draft.gmb_location_id}
                  onChange={(e) => setDraft({ ...draft, gmb_location_id: e.target.value })}
                />
              </div>
              <div className="md:col-span-2">
                <Label>
                  <Mail className="mr-1 inline h-3 w-3" /> Compte Google associé
                </Label>
                <Input
                  type="email"
                  placeholder="contact@client.fr"
                  value={draft.google_account_email}
                  onChange={(e) =>
                    setDraft({ ...draft, google_account_email: e.target.value })
                  }
                />
              </div>
              <div className="md:col-span-2">
                <Label>Notes internes</Label>
                <Textarea
                  rows={3}
                  value={draft.notes}
                  onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="stats" className="space-y-4 pt-4">
            <p className="text-sm text-muted-foreground">
              Reporting manuel pour le moment — l'API Google Business Profile pourra alimenter ces
              chiffres automatiquement plus tard.
            </p>
            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <Label>Note moyenne (/5)</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="5"
                  value={draft.average_rating}
                  onChange={(e) =>
                    setDraft({ ...draft, average_rating: e.target.value as any })
                  }
                />
              </div>
              <div>
                <Label>Total avis</Label>
                <Input
                  type="number"
                  min="0"
                  value={draft.total_reviews}
                  onChange={(e) =>
                    setDraft({ ...draft, total_reviews: Number(e.target.value) })
                  }
                />
              </div>
              <div>
                <Label>Avis sans réponse</Label>
                <Input
                  type="number"
                  min="0"
                  value={draft.unanswered_reviews}
                  onChange={(e) =>
                    setDraft({ ...draft, unanswered_reviews: Number(e.target.value) })
                  }
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={handleSave} disabled={upsert.isPending}>
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
