import { useMemo, useState } from "react";
import { useAuditLog } from "@/hooks/use-audit-log";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ShieldCheck, Download, Eye, Pencil, Trash2, FileText, RefreshCw } from "lucide-react";

const ACTION_META: Record<string, { label: string; icon: typeof Eye; className: string }> = {
  view: { label: "Consultation", icon: Eye, className: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  download: { label: "Téléchargement", icon: Download, className: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" },
  export: { label: "Export", icon: FileText, className: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
  update: { label: "Modification", icon: Pencil, className: "bg-primary/10 text-primary border-primary/20" },
  insert: { label: "Création", icon: Pencil, className: "bg-primary/10 text-primary border-primary/20" },
  delete: { label: "Suppression", icon: Trash2, className: "bg-destructive/10 text-destructive border-destructive/20" },
};

const RESOURCE_LABELS: Record<string, string> = {
  client_form: "Formulaire client",
  profile: "Profil membre",
  client: "Fiche client",
  storage_object: "Fichier",
};

export default function AuditLog() {
  const { hasRole } = useAuth();
  const [search, setSearch] = useState("");
  const [resourceType, setResourceType] = useState("all");
  const [action, setAction] = useState("all");

  const { data: entries = [], isLoading, refetch, isFetching } = useAuditLog({ resourceType, action, search });

  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return {
      total: entries.length,
      today: entries.filter((e) => e.created_at.slice(0, 10) === today).length,
      downloads: entries.filter((e) => e.action === "download" || e.action === "export").length,
      changes: entries.filter((e) => ["update", "delete", "insert"].includes(e.action)).length,
    };
  }, [entries]);

  if (!hasRole("admin")) {
    return (
      <main className="p-6">
        <Card className="glass-card">
          <CardContent className="p-10 text-center text-muted-foreground">
            Accès réservé aux administrateurs.
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="p-4 md:p-6 space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
            <ShieldCheck className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-[Space_Grotesk] tracking-tight">Journal d'audit</h1>
            <p className="text-sm text-muted-foreground">
              Qui consulte, télécharge ou modifie les formulaires et les profils
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
          Actualiser
        </Button>
      </header>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Entrées (500 max)", value: stats.total },
          { label: "Aujourd'hui", value: stats.today },
          { label: "Téléchargements", value: stats.downloads },
          { label: "Modifications", value: stats.changes },
        ].map((s) => (
          <Card key={s.label} className="glass-card">
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">{s.label}</p>
              <p className="text-2xl font-bold mt-1">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <Card className="glass-card">
        <CardHeader className="gap-3">
          <CardTitle className="text-base">Événements</CardTitle>
          <div className="flex flex-wrap gap-2">
            <Input
              placeholder="Rechercher (membre, ressource…)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-xs"
              aria-label="Rechercher dans le journal d'audit"
            />
            <Select value={resourceType} onValueChange={setResourceType}>
              <SelectTrigger className="w-[190px]" aria-label="Filtrer par type de donnée">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les données</SelectItem>
                <SelectItem value="client_form">Formulaires clients</SelectItem>
                <SelectItem value="profile">Profils membres</SelectItem>
                <SelectItem value="client">Fiches clients</SelectItem>
                <SelectItem value="storage_object">Fichiers</SelectItem>
              </SelectContent>
            </Select>
            <Select value={action} onValueChange={setAction}>
              <SelectTrigger className="w-[170px]" aria-label="Filtrer par action">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les actions</SelectItem>
                <SelectItem value="view">Consultation</SelectItem>
                <SelectItem value="download">Téléchargement</SelectItem>
                <SelectItem value="export">Export</SelectItem>
                <SelectItem value="update">Modification</SelectItem>
                <SelectItem value="delete">Suppression</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Chargement…</p>
          ) : entries.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Aucun événement enregistré.</p>
          ) : (
            <ul className="divide-y divide-border/60">
              {entries.map((e) => {
                const meta = ACTION_META[e.action] ?? {
                  label: e.action,
                  icon: FileText,
                  className: "bg-muted text-muted-foreground border-border",
                };
                const Icon = meta.icon;
                return (
                  <li key={e.id} className="py-3 flex flex-wrap items-center gap-3">
                    <Badge variant="outline" className={meta.className}>
                      <Icon className="w-3 h-3 mr-1" />
                      {meta.label}
                    </Badge>
                    <span className="text-sm font-medium">{e.actor_email || "Système"}</span>
                    <span className="text-sm text-muted-foreground">
                      {RESOURCE_LABELS[e.resource_type] ?? e.resource_type}
                      {e.resource_label ? ` · ${e.resource_label}` : ""}
                    </span>
                    <span className="ml-auto text-xs text-muted-foreground tabular-nums">
                      {new Date(e.created_at).toLocaleString("fr-FR", { timeZone: "Indian/Reunion" })}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
