import { useState } from "react";
import {
  useFbOnboardingList,
  useUpdateFbOnboardingStatus,
  useDeleteFbOnboarding,
  type FbOnboardingStatus,
} from "@/hooks/use-fb-onboarding";
import {
  useGmbOnboardingList,
  useUpdateGmbOnboardingStatus,
  useDeleteGmbOnboarding,
  type GmbOnboardingStatus,
} from "@/hooks/use-gmb-onboarding";
import { useUpsertClientGmb } from "@/hooks/use-client-gmb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Mail, Building2, KeyRound, Link2, Facebook, MapPin, Inbox, CheckCircle2, Archive,
  Trash2, Search, Copy, ExternalLink, Phone, PlusCircle,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const STATUS_LABEL = { recu: "Reçu", traite: "Traité", archive: "Archivé" } as const;
const STATUS_COLOR = {
  recu: "bg-amber-100 text-amber-800 border-amber-200",
  traite: "bg-emerald-100 text-emerald-800 border-emerald-200",
  archive: "bg-zinc-100 text-zinc-600 border-zinc-200",
} as const;

function copyText(value: string, label: string) {
  navigator.clipboard.writeText(value).then(() => toast.success(`${label} copié`));
}

function InfoRow({ icon: Icon, label, value, mono, link }: any) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-[11px] uppercase font-semibold text-muted-foreground tracking-wide">{label}</p>
        <div className="flex items-center gap-1.5">
          {link ? (
            <a href={value} target="_blank" rel="noreferrer" className={`truncate text-[#ff006e] hover:underline ${mono ? "font-mono" : ""}`}>{value}</a>
          ) : (
            <span className={`truncate ${mono ? "font-mono" : ""}`}>{value}</span>
          )}
          <button onClick={() => copyText(value, label)} className="text-muted-foreground hover:text-[#ff006e] flex-shrink-0" title="Copier">
            <Copy className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── FB tab ───────────────────────────────────────────────── */
function FbInbox() {
  const [filter, setFilter] = useState<FbOnboardingStatus | "all">("all");
  const [search, setSearch] = useState("");
  const { data, isLoading } = useFbOnboardingList({ status: filter });
  const updateStatus = useUpdateFbOnboardingStatus();
  const remove = useDeleteFbOnboarding();

  const filtered = (data || []).filter((s) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return s.company_name.toLowerCase().includes(q) || s.contact_email.toLowerCase().includes(q)
      || s.business_manager_email.toLowerCase().includes(q) || (s.business_manager_id || "").includes(q);
  });

  const counts = {
    recu: (data || []).filter((s) => s.status === "recu").length,
    traite: (data || []).filter((s) => s.status === "traite").length,
    archive: (data || []).filter((s) => s.status === "archive").length,
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {(["recu", "traite", "archive"] as FbOnboardingStatus[]).map((s) => (
          <Card key={s} className="cursor-pointer hover:shadow-md transition" onClick={() => setFilter(s)}>
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{STATUS_LABEL[s]}</p>
              <p className="text-3xl font-bold mt-1">{counts[s]}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="recu">À traiter</SelectItem>
            <SelectItem value="traite">Traités</SelectItem>
            <SelectItem value="archive">Archivés</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <p className="text-center text-muted-foreground py-12">Chargement...</p>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="p-12 text-center text-muted-foreground">Aucune soumission Facebook pour le moment.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((s) => (
            <Card key={s.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Facebook className="h-5 w-5 text-[#1877F2]" />
                      {s.company_name}
                      {s.client_ndi && <Badge variant="outline" className="text-xs">{s.client_ndi}</Badge>}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">
                      Reçu le {format(new Date(s.created_at), "d MMM yyyy 'à' HH:mm", { locale: fr })}
                      {!s.has_existing_page && <span className="ml-2 text-amber-600 font-semibold">• Page créée pour l'occasion</span>}
                    </p>
                  </div>
                  <Badge className={`${STATUS_COLOR[s.status]} border`}>{STATUS_LABEL[s.status]}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid sm:grid-cols-2 gap-3 text-sm">
                  <InfoRow icon={Mail} label="Contact" value={s.contact_email} />
                  <InfoRow icon={Mail} label="Email du BM" value={s.business_manager_email} />
                  {s.business_manager_id && <InfoRow icon={KeyRound} label="ID Business Manager" value={s.business_manager_id} mono />}
                  {s.fb_page_name && <InfoRow icon={Facebook} label="Nom de la page" value={s.fb_page_name} />}
                  {s.fb_page_url && <InfoRow icon={Link2} label="URL de la page" value={s.fb_page_url} link />}
                </div>
                {s.notes && (
                  <div className="rounded-lg bg-muted/50 p-3 text-sm">
                    <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">Notes</p>
                    <p>{s.notes}</p>
                  </div>
                )}
                <div className="flex gap-2 flex-wrap pt-2">
                  {s.status !== "traite" && (
                    <Button size="sm" onClick={() => updateStatus.mutate({ id: s.id, status: "traite" })} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                      <CheckCircle2 className="h-4 w-4" /> Marquer traité
                    </Button>
                  )}
                  {s.status !== "archive" && (
                    <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: s.id, status: "archive" })}>
                      <Archive className="h-4 w-4" /> Archiver
                    </Button>
                  )}
                  {s.client_id && (
                    <Button size="sm" variant="outline" asChild>
                      <a href={`/clients/${s.client_id}`}><ExternalLink className="h-4 w-4" /> Voir la fiche</a>
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700 hover:bg-red-50 ml-auto"
                    onClick={() => { if (confirm("Supprimer ?")) remove.mutate(s.id); }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── GMB tab ──────────────────────────────────────────────── */
function GmbInbox() {
  const [filter, setFilter] = useState<GmbOnboardingStatus | "all">("all");
  const [search, setSearch] = useState("");
  const { data, isLoading } = useGmbOnboardingList({ status: filter });
  const updateStatus = useUpdateGmbOnboardingStatus();
  const remove = useDeleteGmbOnboarding();
  const upsertGmb = useUpsertClientGmb();

  const handleCreateGmbListing = async (s: any) => {
    if (!s.client_id) { toast.error("Soumission non liée à un client"); return; }
    try {
      await upsertGmb.mutateAsync({
        client_id: s.client_id,
        status: "a_creer",
        access_level: "aucun",
        business_name_on_google: s.gmb_business_name || s.company_name,
        google_account_email: s.google_account_email || null,
        notes: `Fiche à créer suite à soumission tuto GMB du ${format(new Date(s.created_at), "d MMM yyyy", { locale: fr })}.\nContact: ${s.contact_email}${s.notes ? "\n\nNote client : " + s.notes : ""}`,
      } as any);
      toast.success("Fiche GMB créée — visible dans le module GMB");
    } catch (e: any) {
      toast.error(e.message || "Erreur (fiche déjà existante ?)");
    }
  };


  const filtered = (data || []).filter((s) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return s.company_name.toLowerCase().includes(q) || s.contact_email.toLowerCase().includes(q)
      || (s.google_account_email || "").toLowerCase().includes(q);
  });

  const counts = {
    recu: (data || []).filter((s) => s.status === "recu").length,
    traite: (data || []).filter((s) => s.status === "traite").length,
    archive: (data || []).filter((s) => s.status === "archive").length,
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {(["recu", "traite", "archive"] as GmbOnboardingStatus[]).map((s) => (
          <Card key={s} className="cursor-pointer hover:shadow-md transition" onClick={() => setFilter(s)}>
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{STATUS_LABEL[s]}</p>
              <p className="text-3xl font-bold mt-1">{counts[s]}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="recu">À traiter</SelectItem>
            <SelectItem value="traite">Traités</SelectItem>
            <SelectItem value="archive">Archivés</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <p className="text-center text-muted-foreground py-12">Chargement...</p>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="p-12 text-center text-muted-foreground">Aucune soumission GMB pour le moment.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((s) => (
            <Card key={s.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-[#34A853]" />
                      {s.company_name}
                      {s.client_ndi && <Badge variant="outline" className="text-xs">{s.client_ndi}</Badge>}
                      {s.manager_added && <Badge className="text-xs bg-emerald-100 text-emerald-800 border-emerald-200">✓ Adamkom ajouté</Badge>}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">
                      Reçu le {format(new Date(s.created_at), "d MMM yyyy 'à' HH:mm", { locale: fr })}
                      {!s.has_existing_listing && <span className="ml-2 text-amber-600 font-semibold">• Fiche à créer</span>}
                    </p>
                  </div>
                  <Badge className={`${STATUS_COLOR[s.status]} border`}>{STATUS_LABEL[s.status]}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid sm:grid-cols-2 gap-3 text-sm">
                  <InfoRow icon={Mail} label="Contact" value={s.contact_email} />
                  {s.google_account_email && <InfoRow icon={Mail} label="Compte Google" value={s.google_account_email} />}
                  {s.gmb_business_name && <InfoRow icon={Building2} label="Nom sur Maps" value={s.gmb_business_name} />}
                  {s.gmb_phone && <InfoRow icon={Phone} label="Téléphone" value={s.gmb_phone} />}
                  {s.gmb_address && <InfoRow icon={MapPin} label="Adresse" value={s.gmb_address} />}
                  {s.gmb_maps_url && <InfoRow icon={Link2} label="Lien Google Maps" value={s.gmb_maps_url} link />}
                </div>
                {s.notes && (
                  <div className="rounded-lg bg-muted/50 p-3 text-sm">
                    <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">Notes</p>
                    <p>{s.notes}</p>
                  </div>
                )}
                <div className="flex gap-2 flex-wrap pt-2">
                  {s.status !== "traite" && (
                    <Button size="sm" onClick={() => updateStatus.mutate({ id: s.id, status: "traite" })} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                      <CheckCircle2 className="h-4 w-4" /> Marquer traité
                    </Button>
                  )}
                  {s.status !== "archive" && (
                    <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: s.id, status: "archive" })}>
                      <Archive className="h-4 w-4" /> Archiver
                    </Button>
                  )}
                  {s.client_id && !s.has_existing_listing && (
                    <Button size="sm" variant="outline" onClick={() => handleCreateGmbListing(s)} disabled={upsertGmb.isPending} className="border-amber-300 text-amber-700 hover:bg-amber-50">
                      <PlusCircle className="h-4 w-4" /> Créer la fiche GMB
                    </Button>
                  )}
                  {s.client_id && (
                    <Button size="sm" variant="outline" asChild>
                      <a href={`/clients/${s.client_id}`}><ExternalLink className="h-4 w-4" /> Voir la fiche</a>
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700 hover:bg-red-50 ml-auto"
                    onClick={() => { if (confirm("Supprimer ?")) remove.mutate(s.id); }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Main page ────────────────────────────────────────────── */
export default function OnboardingInbox() {
  const { data: fbData } = useFbOnboardingList();
  const { data: gmbData } = useGmbOnboardingList();
  const fbPending = (fbData || []).filter((s) => s.status === "recu").length;
  const gmbPending = (gmbData || []).filter((s) => s.status === "recu").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Inbox className="h-7 w-7 text-[#ff006e]" /> Onboarding Clients
        </h1>
        <p className="text-muted-foreground mt-1">
          Soumissions reçues via les tutoriels publics — Facebook (<code className="text-xs bg-muted px-1.5 py-0.5 rounded">/tuto/facebook</code>) et Google My Business (<code className="text-xs bg-muted px-1.5 py-0.5 rounded">/tuto/gmb</code>)
        </p>
      </div>

      <Tabs defaultValue="facebook">
        <TabsList>
          <TabsTrigger value="facebook" className="gap-2">
            <Facebook className="h-4 w-4 text-[#1877F2]" /> Facebook
            {fbPending > 0 && <span className="ml-1 inline-flex items-center justify-center min-w-5 h-5 px-1.5 text-[10px] font-bold rounded-full bg-[#ff006e] text-white">{fbPending}</span>}
          </TabsTrigger>
          <TabsTrigger value="gmb" className="gap-2">
            <MapPin className="h-4 w-4 text-[#34A853]" /> Google My Business
            {gmbPending > 0 && <span className="ml-1 inline-flex items-center justify-center min-w-5 h-5 px-1.5 text-[10px] font-bold rounded-full bg-[#ff006e] text-white">{gmbPending}</span>}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="facebook" className="mt-6"><FbInbox /></TabsContent>
        <TabsContent value="gmb" className="mt-6"><GmbInbox /></TabsContent>
      </Tabs>
    </div>
  );
}
