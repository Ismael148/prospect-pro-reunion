import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CreditCard,
  Eye,
  Copy,
  ExternalLink,
  CheckCircle2,
  Trash2,
  Lock,
  Search,
  Plus,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PAYMENT_PROVIDERS, type PaymentProviderKey } from "@/lib/payment-providers";

type Credential = {
  id: string;
  client_id: string | null;
  client_ndi: string | null;
  company_name: string | null;
  contact_email: string;
  contact_name: string | null;
  provider: PaymentProviderKey;
  environment: "test" | "live";
  credentials: Record<string, string>;
  status: string;
  notes: string | null;
  submitted_at: string;
  reviewed_at: string | null;
  created_at: string;
};

const STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  recu: { label: "📥 Reçu", variant: "secondary" },
  en_attente: { label: "⏳ En attente", variant: "outline" },
  configure: { label: "🔧 Configuré", variant: "default" },
  actif: { label: "✅ Actif", variant: "default" },
  rejete: { label: "❌ Rejeté", variant: "destructive" },
};

function maskValue(v: string): string {
  if (!v) return "";
  if (v.length <= 8) return "••••••";
  return v.slice(0, 4) + "•".repeat(Math.max(4, v.length - 8)) + v.slice(-4);
}

function CredentialDetail({ cred, onUpdate }: { cred: Credential; onUpdate: () => void }) {
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [status, setStatus] = useState(cred.status);
  const { toast } = useToast();
  const provider = PAYMENT_PROVIDERS[cred.provider];
  const fields = cred.environment === "test" ? provider.testFields : provider.liveFields;

  async function handleStatusChange(newStatus: string) {
    setStatus(newStatus);
    const { error } = await supabase
      .from("payment_credentials")
      .update({ status: newStatus, reviewed_at: new Date().toISOString() })
      .eq("id", cred.id);
    if (error) {
      toast({ variant: "destructive", title: "Erreur", description: error.message });
    } else {
      toast({ title: "Statut mis à jour" });
      onUpdate();
    }
  }

  function copyValue(key: string, val: string) {
    navigator.clipboard.writeText(val);
    toast({ title: "Copié", description: `${key} copié dans le presse-papiers` });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 pb-4 border-b">
        <img src={provider.logoUrl} alt={provider.name} className="h-10 max-w-[100px] object-contain" />
        <div>
          <div className="font-semibold text-lg">{provider.name}</div>
          <Badge variant="outline" className="mt-1">
            {cred.environment === "test" ? "🧪 TEST" : "🚀 PRODUCTION"}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <div className="text-muted-foreground text-xs">Entreprise</div>
          <div className="font-medium">{cred.company_name || "—"}</div>
        </div>
        <div>
          <div className="text-muted-foreground text-xs">Email</div>
          <div className="font-medium">{cred.contact_email}</div>
        </div>
        {cred.client_ndi && (
          <div>
            <div className="text-muted-foreground text-xs">NDI</div>
            <Link to={`/clients?ndi=${cred.client_ndi}`} className="font-medium text-primary hover:underline">
              {cred.client_ndi}
            </Link>
          </div>
        )}
        <div>
          <div className="text-muted-foreground text-xs">Reçu le</div>
          <div className="font-medium">{new Date(cred.submitted_at).toLocaleString("fr-FR")}</div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Lock className="h-4 w-4" /> Identifiants
        </div>
        <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
          {fields.map((f) => {
            const val = cred.credentials[f.key] || "";
            const isRevealed = revealed[f.key];
            return (
              <div key={f.key} className="space-y-1">
                <div className="text-xs text-muted-foreground">{f.label}</div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded bg-background px-2 py-1.5 text-xs font-mono break-all border">
                    {val ? (isRevealed ? val : maskValue(val)) : <span className="text-muted-foreground">(vide)</span>}
                  </code>
                  {val && (
                    <>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setRevealed({ ...revealed, [f.key]: !isRevealed })}
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => copyValue(f.label, val)}>
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
          {Object.keys(cred.credentials).filter((k) => !fields.find((f) => f.key === k)).map((k) => (
            <div key={k} className="space-y-1">
              <div className="text-xs text-muted-foreground">{k}</div>
              <code className="block rounded bg-background px-2 py-1.5 text-xs font-mono break-all border">
                {revealed[k] ? cred.credentials[k] : maskValue(cred.credentials[k])}
              </code>
            </div>
          ))}
        </div>
      </div>

      {cred.notes && (
        <div className="space-y-1">
          <div className="text-xs text-muted-foreground">Notes du client</div>
          <div className="rounded bg-muted/30 p-3 text-sm">{cred.notes}</div>
        </div>
      )}

      <div className="flex items-center gap-2 pt-3 border-t">
        <Select value={status} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>
                {v.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <a href={provider.dashboardUrl} target="_blank" rel="noreferrer">
          <Button variant="outline" size="sm">
            <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
            Dashboard {provider.name}
          </Button>
        </a>
      </div>
    </div>
  );
}

function InvitationDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactName, setContactName] = useState("");
  const [creating, setCreating] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  async function handleCreate() {
    if (!contactEmail || !companyName) {
      toast({ variant: "destructive", title: "Email + entreprise requis" });
      return;
    }
    setCreating(true);
    const { data, error } = await supabase
      .from("payment_invitations")
      .insert({
        company_name: companyName,
        contact_email: contactEmail,
        contact_name: contactName || null,
        created_by: user?.id,
      })
      .select()
      .single();

    setCreating(false);
    if (error) {
      toast({ variant: "destructive", title: "Erreur", description: error.message });
      return;
    }
    const url = `${window.location.origin}/tuto/paiements?token=${data.token}`;
    setLink(url);
    onCreated();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setLink(null); setCompanyName(""); setContactEmail(""); setContactName(""); } }}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" /> Nouvelle invitation
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Inviter un client à envoyer ses clés</DialogTitle>
        </DialogHeader>
        {link ? (
          <div className="space-y-3">
            <div className="rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 p-3 text-sm text-green-900 dark:text-green-200 flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
              Lien créé. Copiez-le et envoyez-le à votre client.
            </div>
            <div className="flex gap-2">
              <Input value={link} readOnly className="font-mono text-xs" />
              <Button onClick={() => { navigator.clipboard.writeText(link); toast({ title: "Lien copié" }); }}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <Button variant="outline" className="w-full" onClick={() => { setLink(null); setOpen(false); }}>
              Fermer
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="text-sm">Nom de l'entreprise *</label>
              <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Ma Société" />
            </div>
            <div>
              <label className="text-sm">Email du client *</label>
              <Input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="client@example.com" />
            </div>
            <div>
              <label className="text-sm">Nom du contact</label>
              <Input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Prénom Nom" />
            </div>
            <Button onClick={handleCreate} disabled={creating} className="w-full">
              {creating ? "Création..." : "Générer le lien"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function PaymentCredentials() {
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterProvider, setFilterProvider] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const { toast } = useToast();

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("payment_credentials")
      .select("*")
      .order("submitted_at", { ascending: false });
    setLoading(false);
    if (error) {
      toast({ variant: "destructive", title: "Erreur chargement", description: error.message });
      return;
    }
    setCredentials((data || []) as Credential[]);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleDelete(id: string) {
    if (!confirm("Supprimer définitivement cette entrée ?")) return;
    const { error } = await supabase.from("payment_credentials").delete().eq("id", id);
    if (error) {
      toast({ variant: "destructive", title: "Erreur", description: error.message });
    } else {
      toast({ title: "Supprimé" });
      load();
    }
  }

  const filtered = credentials.filter((c) => {
    if (filterProvider !== "all" && c.provider !== filterProvider) return false;
    if (filterStatus !== "all" && c.status !== filterStatus) return false;
    if (search) {
      const s = search.toLowerCase();
      return (
        c.company_name?.toLowerCase().includes(s) ||
        c.contact_email.toLowerCase().includes(s) ||
        c.client_ndi?.toLowerCase().includes(s)
      );
    }
    return true;
  });

  const stats = {
    total: credentials.length,
    actif: credentials.filter((c) => c.status === "actif").length,
    enAttente: credentials.filter((c) => c.status === "recu" || c.status === "en_attente").length,
    test: credentials.filter((c) => c.environment === "test").length,
    live: credentials.filter((c) => c.environment === "live").length,
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-primary" />
            Moyens de paiement clients
          </h1>
          <p className="text-sm text-muted-foreground">
            Clés API reçues — accessibles uniquement aux administrateurs
          </p>
        </div>
        <InvitationDialog onCreated={load} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Total</div><div className="text-2xl font-bold">{stats.total}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">À traiter</div><div className="text-2xl font-bold text-amber-600">{stats.enAttente}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Actifs</div><div className="text-2xl font-bold text-green-600">{stats.actif}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Mode TEST</div><div className="text-2xl font-bold">{stats.test}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Mode LIVE</div><div className="text-2xl font-bold">{stats.live}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs text-muted-foreground">Rechercher</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Entreprise, email, NDI..."
                  className="pl-8"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Provider</label>
              <Select value={filterProvider} onValueChange={setFilterProvider}>
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  {Object.entries(PAYMENT_PROVIDERS).map(([k, p]) => (
                    <SelectItem key={k} value={k}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Statut</label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  {Object.entries(STATUS_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">Chargement...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              Aucune clé reçue pour le moment.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Provider</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Reçu le</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((cred) => {
                  const provider = PAYMENT_PROVIDERS[cred.provider];
                  return (
                    <TableRow key={cred.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <img src={provider.logoUrl} alt={provider.name} className="h-5 max-w-[60px] object-contain" />
                          <span className="font-medium">{provider.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{cred.company_name || "—"}</div>
                        <div className="text-xs text-muted-foreground">{cred.contact_email}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={cred.environment === "live" ? "default" : "secondary"}>
                          {cred.environment === "test" ? "🧪 TEST" : "🚀 LIVE"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATUS_LABELS[cred.status]?.variant || "outline"}>
                          {STATUS_LABELS[cred.status]?.label || cred.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(cred.submitted_at).toLocaleDateString("fr-FR")}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center gap-1 justify-end">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button size="sm" variant="outline">
                                <Eye className="h-3.5 w-3.5 mr-1" /> Voir
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-xl">
                              <DialogHeader>
                                <DialogTitle>Détails — {provider.name}</DialogTitle>
                              </DialogHeader>
                              <CredentialDetail cred={cred} onUpdate={load} />
                            </DialogContent>
                          </Dialog>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(cred.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
