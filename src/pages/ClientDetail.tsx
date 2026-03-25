import { useParams, useNavigate } from "react-router-dom";
import { useClient, useClientContacts, useClientActivities, useUpdateClient, useDeleteClient, useCreateContact, useCreateActivity } from "@/hooks/use-clients";
import { useAuth } from "@/contexts/AuthContext";
import { useSalesTeam } from "@/hooks/use-commercials";
import { PIPELINE_LABELS, PIPELINE_COLORS, PIPELINE_ORDER, PACK_LABELS, PROJECT_STATUS_LABELS, PUBLISHED_URL } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  ArrowLeft, Plus, User, Phone, Mail, Briefcase, Building2, Loader2, Clock,
  Globe, MapPin, CreditCard, FileText, MessageSquare, Send, FolderKanban, Hash, UserCheck,
  ClipboardCopy, CheckCircle2, Eye, Download, Pencil, CreditCard as NfcIcon, Ticket, Trash2,
} from "lucide-react";
import { exportClientPDF } from "@/lib/export-client-pdf";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import SocialMediaSection from "@/components/clients/SocialMediaSection";
import { useClientForms, useValidateForm, ClientFormData } from "@/hooks/use-client-forms";

type PipelineStatus = Database["public"]["Enums"]["pipeline_status"];

// ============ Edit Client Dialog ============
function EditClientDialog({ client, onSave }: { client: any; onSave: (updates: any) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    company_name: client.company_name || "",
    phone: client.phone || "",
    email: client.email || "",
    website: client.website || "",
    address: client.address || "",
    city: client.city || "",
    postal_code: client.postal_code || "",
    sector: client.sector || "",
    siret: client.siret || "",
    notes: client.notes || "",
    nfc_quantity: (client as any).nfc_quantity || 1,
    pack_amount: client.pack_amount || "",
    payment_method: client.payment_method || "",
    has_gmb: client.has_gmb || false,
    site_type: (client as any).site_type || "vitrine",
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        ...form,
        pack_amount: form.pack_amount ? parseFloat(form.pack_amount) : null,
        nfc_quantity: parseInt(form.nfc_quantity) || 1,
      });
      setOpen(false);
      toast.success("Fiche client mise à jour");
    } catch {
      toast.error("Erreur de mise à jour");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm"><Pencil className="w-4 h-4 mr-1" /> Modifier</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Modifier la fiche client</DialogTitle></DialogHeader>
        <div className="grid gap-3 py-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Entreprise</Label>
              <Input value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>SIRET</Label>
              <Input value={form.siret} onChange={(e) => setForm({ ...form, siret: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Téléphone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Site web</Label>
            <Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5 col-span-2">
              <Label>Adresse</Label>
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Code postal</Label>
              <Input value={form.postal_code} onChange={(e) => setForm({ ...form, postal_code: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Ville</Label>
              <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Secteur</Label>
              <Input value={form.sector} onChange={(e) => setForm({ ...form, sector: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Montant pack (€)</Label>
              <Input type="number" step="0.01" value={form.pack_amount} onChange={(e) => setForm({ ...form, pack_amount: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Règlement</Label>
              <Select value={form.payment_method} onValueChange={(v) => setForm({ ...form, payment_method: v })}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="especes">Espèces</SelectItem>
                  <SelectItem value="virement">Virement</SelectItem>
                  <SelectItem value="cheque">Chèque</SelectItem>
                  <SelectItem value="cb">Carte bancaire</SelectItem>
                  <SelectItem value="prelevement">Prélèvement</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Qté cartes NFC</Label>
              <Input type="number" min="1" max="20" value={form.nfc_quantity} onChange={(e) => setForm({ ...form, nfc_quantity: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Type de site</Label>
              <Select value={form.site_type} onValueChange={(v) => setForm({ ...form, site_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="vitrine">🌐 Site vitrine</SelectItem>
                  <SelectItem value="ecommerce">🛒 Site e-commerce</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Fiche Google</Label>
              <Select value={form.has_gmb ? "oui" : "non"} onValueChange={(v) => setForm({ ...form, has_gmb: v === "oui" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="non">❌ Pas de fiche Google</SelectItem>
                  <SelectItem value="oui">✅ Fiche existante</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} />
          </div>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Enregistrer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============ Client Info Section ============
function ClientInfoSection({ client, salesTeam }: { client: any; salesTeam?: { agents: any[]; commercials: any[] } }) {
  const PAYMENT_LABELS: Record<string, string> = {
    especes: "Espèces", virement: "Virement bancaire", cheque: "Chèque",
    cb: "Carte bancaire", prelevement: "Prélèvement",
  };

  const signedByName = salesTeam?.commercials.find((c) => c.user_id === client.signed_by)?.full_name;
  const assignedToName = salesTeam?.agents.find((a) => a.user_id === client.assigned_to)?.full_name
    || salesTeam?.commercials.find((c) => c.user_id === client.assigned_to)?.full_name;

  const fields = [
    { label: "NDI Client", value: client.ndi, icon: Hash },
    { label: "SIRET", value: client.siret, icon: FileText },
    { label: "Secteur", value: client.sector, icon: Briefcase },
    { label: "Téléphone", value: client.phone, icon: Phone },
    { label: "Email", value: client.email, icon: Mail },
    { label: "Site web", value: client.website, icon: Globe },
    { label: "Adresse", value: [client.address, client.postal_code, client.city].filter(Boolean).join(", "), icon: MapPin },
    { label: "Pack", value: client.pack_type ? PACK_LABELS[client.pack_type] : null, icon: FolderKanban },
    { label: "Montant", value: client.pack_amount ? `${Number(client.pack_amount).toFixed(2)} €` : null, icon: CreditCard },
    { label: "Qté cartes NFC", value: (client as any).nfc_quantity > 1 ? `${(client as any).nfc_quantity} cartes` : null, icon: NfcIcon },
    { label: "Règlement", value: client.payment_method ? PAYMENT_LABELS[client.payment_method] || client.payment_method : null, icon: CreditCard },
    { label: "Date signature", value: client.signature_date ? new Date(client.signature_date).toLocaleDateString("fr-FR") : null, icon: FileText },
    { label: "Commercial signataire", value: signedByName, icon: UserCheck },
    { label: "Agent assigné", value: assignedToName, icon: User },
    { label: "Type de site", value: (client as any).site_type === "ecommerce" ? "🛒 E-commerce" : "🌐 Vitrine", icon: Globe },
    { label: "Fiche Google", value: client.has_gmb ? "✅ Existante" : "❌ Aucune", icon: MapPin },
  ].filter((f) => f.value);

  return (
    <Card className="border-0 shadow-md shadow-primary/5">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Building2 className="w-5 h-5" /> Informations client
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        {fields.map((f) => (
          <div key={f.label} className="flex items-start gap-2 p-2 rounded-lg bg-muted/30">
            <f.icon className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <span className="text-[11px] text-muted-foreground uppercase tracking-wider">{f.label}</span>
              <p className="font-medium text-sm">{f.value}</p>
            </div>
          </div>
        ))}
        {client.notes && (
          <div className="col-span-full p-2 rounded-lg bg-muted/30">
            <span className="text-[11px] text-muted-foreground uppercase tracking-wider">Notes</span>
            <p className="font-medium text-sm whitespace-pre-wrap">{client.notes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============ Client Projects Section ============
function ClientProjectsSection({ clientId }: { clientId: string }) {
  const navigate = useNavigate();
  const { data: projects, isLoading } = useQuery({
    queryKey: ["client-projects", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects").select("*").eq("client_id", clientId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });

  if (isLoading || !projects?.length) return null;

  return (
    <Card className="border-0 shadow-md shadow-primary/5">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <FolderKanban className="w-5 h-5" /> Projets ({projects.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {projects.map((project) => (
          <div
            key={project.id}
            className="p-3 rounded-lg bg-muted/30 hover:bg-muted/50 cursor-pointer transition-colors"
            onClick={() => navigate(`/projets/${project.id}`)}
          >
            <div className="flex items-center justify-between mb-2">
              <p className="font-medium text-sm">{project.name}</p>
              <Badge variant="outline" className="text-[10px]">
                {PROJECT_STATUS_LABELS[project.status as keyof typeof PROJECT_STATUS_LABELS] || project.status}
              </Badge>
            </div>
            <div className="flex items-center gap-3">
              <Progress value={project.progress || 0} className="flex-1 h-2" />
              <span className="text-xs text-muted-foreground font-medium">{project.progress || 0}%</span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ============ Contacts Section ============
function ContactsSection({ clientId, contacts }: { clientId: string; contacts: any[] | undefined }) {
  const createContact = useCreateContact();
  const [contactOpen, setContactOpen] = useState(false);
  const [contactForm, setContactForm] = useState({
    first_name: "", last_name: "", email: "", phone: "", position: "",
  });

  const handleAddContact = async () => {
    if (!contactForm.first_name.trim() || !contactForm.last_name.trim()) {
      toast.error("Prénom et nom requis");
      return;
    }
    try {
      await createContact.mutateAsync({
        ...contactForm, client_id: clientId, is_primary: (contacts?.length || 0) === 0,
      });
      toast.success("Contact ajouté");
      setContactOpen(false);
      setContactForm({ first_name: "", last_name: "", email: "", phone: "", position: "" });
    } catch {
      toast.error("Erreur");
    }
  };

  return (
    <Card className="border-0 shadow-md shadow-primary/5">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg flex items-center gap-2">
          <User className="w-5 h-5" /> Contacts ({contacts?.length || 0})
        </CardTitle>
        <Dialog open={contactOpen} onOpenChange={setContactOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="w-4 h-4 mr-1" /> Ajouter</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nouveau contact</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Prénom *</Label><Input value={contactForm.first_name} onChange={(e) => setContactForm({ ...contactForm, first_name: e.target.value })} /></div>
                <div className="space-y-2"><Label>Nom *</Label><Input value={contactForm.last_name} onChange={(e) => setContactForm({ ...contactForm, last_name: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Email</Label><Input type="email" value={contactForm.email} onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })} /></div>
                <div className="space-y-2"><Label>Téléphone</Label><Input value={contactForm.phone} onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })} /></div>
              </div>
              <div className="space-y-2"><Label>Poste</Label><Input value={contactForm.position} onChange={(e) => setContactForm({ ...contactForm, position: e.target.value })} placeholder="Ex: Gérant" /></div>
              <Button onClick={handleAddContact} disabled={createContact.isPending}>
                {createContact.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Ajouter le contact
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {!contacts?.length ? (
          <p className="text-muted-foreground text-sm">Aucun contact ajouté</p>
        ) : (
          <div className="grid gap-3">
            {contacts.map((contact) => (
              <div key={contact.id} className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary">
                  <User className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">
                    {contact.first_name} {contact.last_name}
                    {contact.is_primary && <Badge variant="secondary" className="ml-2 text-xs">Principal</Badge>}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                    {contact.position && <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" />{contact.position}</span>}
                    {contact.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{contact.phone}</span>}
                    {contact.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{contact.email}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============ Support Tickets Section ============
function SupportTicketsSection({ clientId }: { clientId: string }) {
  const { data: tickets, isLoading } = useQuery({
    queryKey: ["client-tickets", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_tickets").select("*").eq("client_id", clientId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });

  const TICKET_STATUS: Record<string, string> = {
    ouvert: "bg-warning/10 text-warning border-warning/20",
    en_cours: "bg-primary/10 text-primary border-primary/20",
    resolu: "bg-success/10 text-success border-success/20",
    ferme: "bg-muted text-muted-foreground",
  };

  if (isLoading || !tickets?.length) return null;

  return (
    <Card className="border-0 shadow-md shadow-primary/5">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Ticket className="w-5 h-5" /> Tickets support ({tickets.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {tickets.map((t) => (
          <div key={t.id} className="p-3 rounded-lg bg-muted/30">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-muted-foreground">{t.ticket_number}</span>
                <span className="font-medium text-sm">{t.subject}</span>
              </div>
              <Badge variant="outline" className={`text-[10px] ${TICKET_STATUS[t.status] || ""}`}>
                {t.status === "ouvert" ? "Ouvert" : t.status === "en_cours" ? "En cours" : t.status === "resolu" ? "Résolu" : "Fermé"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2">{t.message}</p>
            {t.attachments && t.attachments.length > 0 && (
              <div className="flex gap-1 mt-2">
                {t.attachments.map((url: string, i: number) => (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                    <img src={url} alt={`Pièce jointe ${i + 1}`} className="w-12 h-12 object-cover rounded border border-border hover:opacity-80 transition-opacity" />
                  </a>
                ))}
              </div>
            )}
            <p className="text-[10px] text-muted-foreground mt-1">
              {new Date(t.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ============ Notes Section ============
function NotesSection({ clientId, activities }: { clientId: string; activities: any[] | undefined }) {
  const { user } = useAuth();
  const createActivity = useCreateActivity();
  const [note, setNote] = useState("");

  const { data: teamMembers } = useQuery({
    queryKey: ["team-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("user_id, full_name");
      if (error) throw error;
      return data;
    },
  });

  const handleAddNote = async () => {
    if (!note.trim()) return;
    try {
      await createActivity.mutateAsync({
        client_id: clientId, user_id: user!.id, activity_type: "note", description: note,
      });
      toast.success("Note ajoutée");
      setNote("");
    } catch { toast.error("Erreur"); }
  };

  const renderDescription = (text: string) => {
    if (!text || !teamMembers) return text;
    return text.replace(/@\[([^\]]+)\]/g, (_, name) => `@${name}`);
  };

  const handleMention = (member: { user_id: string; full_name: string | null }) => {
    setNote((prev) => prev + `@[${member.full_name || "Membre"}] `);
  };

  const noteActivities = activities?.filter((a) => a.activity_type === "note") || [];
  const statusActivities = activities?.filter((a) => a.activity_type !== "note") || [];

  return (
    <Card className="border-0 shadow-md shadow-primary/5">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <MessageSquare className="w-5 h-5" /> Notes & Commentaires
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ajouter une note..." rows={3} />
          <div className="flex items-center justify-between">
            <div className="flex gap-1 flex-wrap">
              {teamMembers?.slice(0, 5).map((m) => (
                <Button key={m.user_id} variant="ghost" size="sm" className="text-xs h-7 px-2" onClick={() => handleMention(m)}>
                  @{m.full_name?.split(" ")[0] || "?"}
                </Button>
              ))}
            </div>
            <Button size="sm" onClick={handleAddNote} disabled={createActivity.isPending || !note.trim()}>
              {createActivity.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        </div>
        {noteActivities.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-border">
            {noteActivities.map((activity) => {
              const authorName = teamMembers?.find((m) => m.user_id === activity.user_id)?.full_name || "Inconnu";
              return (
                <div key={activity.id} className="p-3 rounded-lg bg-muted/30">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-primary">{authorName}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(activity.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{renderDescription(activity.description || "")}</p>
                </div>
              );
            })}
          </div>
        )}
        {statusActivities.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-border">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Historique</p>
            {statusActivities.map((activity) => (
              <div key={activity.id} className="flex items-start gap-3 text-sm">
                <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                <div>
                  <p>{activity.description}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(activity.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============ Client Forms Section ============
function ClientFormsSection({ clientId, supportToken }: { clientId: string; supportToken?: string }) {
  const { user, hasRole } = useAuth();
  const { data: forms, isLoading } = useClientForms(clientId);
  const validateForm = useValidateForm();
  const [viewingForm, setViewingForm] = useState<any>(null);

  const FORM_TYPE_LABELS: Record<string, string> = { nfc: "Carte NFC", site: "Site Internet" };
  const STATUS_LABELS: Record<string, string> = { en_attente: "En attente", soumis: "Soumis", valide: "Validé" };
  const STATUS_COLORS: Record<string, string> = {
    en_attente: "bg-muted text-muted-foreground",
    soumis: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
    valide: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  };

  const nfcLink = supportToken ? `${PUBLISHED_URL}/f/${supportToken}/nfc` : null;
  const siteLink = supportToken ? `${PUBLISHED_URL}/f/${supportToken}/site` : null;

  const copyLink = (link: string, label: string) => {
    navigator.clipboard.writeText(link);
    toast.success(`Lien ${label} copié !`);
  };

  const handleValidate = async (formId: string) => {
    try {
      await validateForm.mutateAsync({ formId, userId: user!.id });
      toast.success("Formulaire validé");
    } catch { toast.error("Erreur"); }
  };

  return (
    <Card className="border-0 shadow-md shadow-primary/5">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <FileText className="w-5 h-5" /> Formulaires Client
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {supportToken && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { label: "Carte NFC", link: nfcLink!, icon: CreditCard },
              { label: "Site Internet", link: siteLink!, icon: Globe },
            ].map(({ label, link, icon: Icon }) => (
              <div key={label} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                <Icon className="w-5 h-5 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{label}</p>
                  <code className="text-[10px] text-muted-foreground block truncate">{link}</code>
                </div>
                <Button size="sm" variant="outline" onClick={() => copyLink(link, label)}>
                  <ClipboardCopy className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {isLoading ? (
          <Loader2 className="w-5 h-5 animate-spin mx-auto" />
        ) : !forms?.length ? (
          <p className="text-sm text-muted-foreground text-center py-2">
            Aucun formulaire soumis. Partagez les liens ci-dessus avec votre client.
          </p>
        ) : (
          <div className="space-y-3">
            {forms.map((form) => {
              const fd = form.form_data as ClientFormData;
              return (
                <div key={form.id} className="p-3 rounded-lg bg-muted/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{FORM_TYPE_LABELS[form.form_type] || form.form_type}</span>
                      <Badge className={`text-[10px] ${STATUS_COLORS[form.status] || ""}`}>
                        {STATUS_LABELS[form.status] || form.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="ghost" onClick={() => setViewingForm(viewingForm?.id === form.id ? null : form)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      {form.status === "soumis" && hasRole("admin") && (
                        <Button size="sm" variant="outline" onClick={() => handleValidate(form.id)} disabled={validateForm.isPending}>
                          <CheckCircle2 className="w-4 h-4 mr-1" /> Valider
                        </Button>
                      )}
                    </div>
                  </div>
                  {form.submitted_at && (
                    <p className="text-[11px] text-muted-foreground">
                      Soumis le {new Date(form.submitted_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  )}
                  {viewingForm?.id === form.id && fd && (
                    <div className="pt-2 border-t border-border mt-2 space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {Object.entries(fd).filter(([k, v]) => v && v.toString().trim() && k !== "extra_cards" && k !== "gallery_urls" && k !== "logo_url" && k !== "photo_url").map(([key, value]) => (
                          <div key={key} className="text-sm">
                            <span className="text-[11px] text-muted-foreground uppercase tracking-wider block">{key.replace(/_/g, " ")}</span>
                            <span className="font-medium">{Array.isArray(value) ? value.join(", ") : String(value)}</span>
                          </div>
                        ))}
                      </div>
                      {/* Show images */}
                      {((fd as any).logo_url || (fd as any).photo_url || (fd as any).gallery_urls?.length > 0) && (
                        <div className="space-y-2">
                          <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Images</p>
                          <div className="flex gap-2 flex-wrap">
                            {(fd as any).logo_url && (
                              <a href={(fd as any).logo_url} target="_blank" rel="noopener noreferrer">
                                <img src={(fd as any).logo_url} alt="Logo" className="w-20 h-20 object-cover rounded-lg border border-border" />
                              </a>
                            )}
                            {(fd as any).photo_url && (
                              <a href={(fd as any).photo_url} target="_blank" rel="noopener noreferrer">
                                <img src={(fd as any).photo_url} alt="Photo" className="w-20 h-20 object-cover rounded-lg border border-border" />
                              </a>
                            )}
                            {(fd as any).gallery_urls?.map((url: string, i: number) => (
                              <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                                <img src={url} alt={`Galerie ${i + 1}`} className="w-20 h-20 object-cover rounded-lg border border-border" />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                      {/* Show extra cards */}
                      {(fd as any).extra_cards?.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Cartes supplémentaires</p>
                          {(fd as any).extra_cards.map((card: any, i: number) => (
                            <div key={i} className="p-2 rounded bg-background/50 border border-border/50">
                              <p className="text-xs font-medium mb-1">Carte {i + 2}</p>
                              <div className="grid grid-cols-2 gap-1 text-xs">
                                {card.full_name && <span>Nom: {card.full_name}</span>}
                                {card.position && <span>Poste: {card.position}</span>}
                                {card.phone && <span>Tél: {card.phone}</span>}
                                {card.email && <span>Email: {card.email}</span>}
                                {card.address && <span className="col-span-2">Adresse: {card.address}</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============ Main Component ============
export default function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: client, isLoading } = useClient(id!);
  const { data: contacts } = useClientContacts(id!);
  const { data: activities } = useClientActivities(id!);
  const { data: salesTeam } = useSalesTeam();
  const updateClient = useUpdateClient();
  const createActivity = useCreateActivity();

  const handleStatusChange = async (newStatus: PipelineStatus) => {
    if (!client) return;
    const oldStatus = client.pipeline_status;
    try {
      await updateClient.mutateAsync({ id: client.id, pipeline_status: newStatus });
      await createActivity.mutateAsync({
        client_id: client.id, user_id: user!.id, activity_type: "status_change",
        description: `Statut changé de "${PIPELINE_LABELS[oldStatus]}" à "${PIPELINE_LABELS[newStatus]}"`,
        old_status: oldStatus, new_status: newStatus,
      });
      toast.success("Statut mis à jour");
    } catch { toast.error("Erreur"); }
  };

  const handleEditSave = async (updates: any) => {
    if (!client) return;
    await updateClient.mutateAsync({ id: client.id, ...updates });
  };

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  if (!client) {
    return <p className="text-muted-foreground">Client introuvable</p>;
  }

  const primaryContact = contacts?.find((c) => c.is_primary);
  const contactName = primaryContact ? `${primaryContact.first_name} ${primaryContact.last_name}` : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/clients")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">{client.company_name}</h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {(client as any).ndi && <Badge variant="outline" className="text-xs font-mono">{(client as any).ndi}</Badge>}
            {client.city && <span className="text-muted-foreground text-sm">{client.city}</span>}
            {contactName && <span className="text-muted-foreground text-sm">• Resp: {contactName}</span>}
            {client.pack_type && <Badge variant="secondary" className="text-xs">{PACK_LABELS[client.pack_type]}</Badge>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <EditClientDialog client={client} onSave={handleEditSave} />
          <Button
            variant="outline" size="sm"
            onClick={() => exportClientPDF({ client, contacts: contacts || [], activities: activities || [], salesTeam })}
          >
            <Download className="w-4 h-4 mr-1" /> PDF
          </Button>
          <Select value={client.pipeline_status} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PIPELINE_ORDER.map((status) => (
                <SelectItem key={status} value={status}>{PIPELINE_LABELS[status]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <ClientInfoSection client={client} salesTeam={salesTeam} />
          <ClientProjectsSection clientId={client.id} />
        </div>
        <Card className="border-0 shadow-md shadow-primary/5 h-fit">
          <CardHeader><CardTitle className="text-lg">Pipeline</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {PIPELINE_ORDER.map((status) => {
              const isCurrent = client.pipeline_status === status;
              const currentIdx = PIPELINE_ORDER.indexOf(client.pipeline_status);
              const statusIdx = PIPELINE_ORDER.indexOf(status);
              const isPast = statusIdx < currentIdx;
              return (
                <div
                  key={status}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                    isCurrent ? `${PIPELINE_COLORS[status]} border font-medium` : isPast ? "text-muted-foreground line-through opacity-50" : "text-muted-foreground"
                  }`}
                >
                  <div className={`w-2.5 h-2.5 rounded-full ${isCurrent ? "bg-current" : isPast ? "bg-muted-foreground/30" : "bg-muted"}`} />
                  {PIPELINE_LABELS[status]}
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <ContactsSection clientId={id!} contacts={contacts} />

      {/* Support section with link */}
      {(client as any).support_token && (
        <Card className="border-0 shadow-md shadow-primary/5">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageSquare className="w-5 h-5" /> Support Client
            </CardTitle>
            <Button
              size="sm" variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(`${PUBLISHED_URL}/s/${(client as any).support_token}`);
                toast.success("Lien de support copié !");
              }}
            >
              Copier le lien
            </Button>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Partagez ce lien avec le client :</p>
            <code className="text-xs bg-muted/50 p-2 rounded-lg block mt-2 break-all">
              {PUBLISHED_URL}/s/{(client as any).support_token}
            </code>
          </CardContent>
        </Card>
      )}

      <SupportTicketsSection clientId={id!} />
      <ClientFormsSection clientId={id!} supportToken={(client as any).support_token} />
      <SocialMediaSection clientId={id!} />
      <NotesSection clientId={id!} activities={activities} />
    </div>
  );
}
