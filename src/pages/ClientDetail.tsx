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
import { MentionTextarea } from "@/components/MentionTextarea";
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
  LifeBuoy,
} from "lucide-react";
import { exportClientPDF } from "@/lib/export-client-pdf";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import SocialMediaSection from "@/components/clients/SocialMediaSection";
import ChatbotConfigSection from "@/components/clients/ChatbotConfigSection";
import LogoTrackingCard from "@/components/clients/LogoTrackingCard";
import PaymentTutoSection from "@/components/clients/PaymentTutoSection";
import ReservationSyncSection from "@/components/clients/ReservationSyncSection";
import ClientEmailActions from "@/components/clients/ClientEmailActions";
import DomainRenewalInvoice from "@/components/clients/DomainRenewalInvoice";
import ClientEmailHistory from "@/components/clients/ClientEmailHistory";
import ClientRemindersSection from "@/components/clients/ClientRemindersSection";
import RelanceFlagsSection from "@/components/clients/RelanceFlagsSection";
import { useClientForms, useValidateForm, ClientFormData } from "@/hooks/use-client-forms";
import { triggerN8nWebhook } from "@/lib/n8n-webhook";
import { motion } from "framer-motion";

type PipelineStatus = Database["public"]["Enums"]["pipeline_status"];
type PackType = Database["public"]["Enums"]["pack_type"];
// ============ Edit Client Dialog ============
function EditClientDialog({ client, onSave, salesTeam }: { client: any; onSave: (updates: any) => Promise<void>; salesTeam?: { agents: any[]; commercials: any[]; externalCommercials?: any[] } }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    company_name: client.company_name || "",
    manager_name: (client as any).manager_name || "",
    phone: client.phone || "",
    email: client.email || "",
    website: client.website || "",
    address: client.address || "",
    city: client.city || "",
    postal_code: client.postal_code || "",
    sector: client.sector || "",
    siret: client.siret || "",
    notes: client.notes || "",
    nfc_quantity: String((client as any).nfc_quantity || 1),
    pack_amount: client.pack_amount != null ? String(client.pack_amount) : "",
    payment_method: client.payment_method || "",
    has_gmb: client.has_gmb || false,
    site_type: (client as any).site_type || "vitrine",
    assigned_to: client.assigned_to || "",
    signed_by: client.signed_by || "",
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      // Only send writable fields with proper types — avoid sending empty strings
      const updates: Record<string, any> = {};
      if (form.company_name) updates.company_name = form.company_name.trim();
      if (form.manager_name !== undefined) updates.manager_name = form.manager_name.trim() || null;
      if (form.phone !== undefined) updates.phone = form.phone.trim() || null;
      if (form.email !== undefined) updates.email = form.email.trim() || null;
      if (form.website !== undefined) updates.website = form.website.trim() || null;
      if (form.address !== undefined) updates.address = form.address.trim() || null;
      if (form.city !== undefined) updates.city = form.city.trim() || null;
      if (form.postal_code !== undefined) updates.postal_code = form.postal_code.trim() || null;
      if (form.sector !== undefined) updates.sector = form.sector.trim() || null;
      if (form.siret !== undefined) updates.siret = form.siret.trim() || null;
      if (form.notes !== undefined) updates.notes = form.notes.trim() || null;
      if (form.site_type !== undefined) updates.site_type = form.site_type || null;
      if (form.has_gmb !== undefined) updates.has_gmb = form.has_gmb;
      updates.payment_method = form.payment_method || null;
      updates.pack_amount = form.pack_amount ? parseFloat(String(form.pack_amount)) : null;
      updates.nfc_quantity = Number.parseInt(String(form.nfc_quantity), 10) || 1;
      updates.assigned_to = form.assigned_to || null;
      updates.signed_by = form.signed_by || null;
      updates.signed_by_commercial = null;

      await onSave(updates);
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
              <Label>Nom du gérant</Label>
              <Input value={form.manager_name} onChange={(e) => setForm({ ...form, manager_name: e.target.value })} placeholder="Ex: Jean Dupont" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>SIRET</Label>
            <Input value={form.siret} onChange={(e) => setForm({ ...form, siret: e.target.value })} />
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
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Agent téléphonique</Label>
              <Select value={form.assigned_to} onValueChange={(v) => setForm({ ...form, assigned_to: v === "none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="— Aucun —" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Aucun —</SelectItem>
                  {salesTeam?.agents.map((a) => (
                    <SelectItem key={a.user_id} value={a.user_id}>{a.full_name || "Sans nom"}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
              <div className="space-y-1.5">
                <Label>Commercial signataire</Label>
                <Select value={form.signed_by} onValueChange={(v) => setForm({ ...form, signed_by: v === "none" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="— Aucun —" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Aucun —</SelectItem>
                    {salesTeam?.commercials?.map((c) => (
                      <SelectItem key={c.user_id} value={c.user_id}>{c.full_name || "Sans nom"}</SelectItem>
                    ))}
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
function ClientInfoSection({ client, salesTeam }: { client: any; salesTeam?: { agents: any[]; commercials: any[]; externalCommercials?: any[] } }) {
  const PAYMENT_LABELS: Record<string, string> = {
    especes: "Espèces", virement: "Virement bancaire", cheque: "Chèque",
    cb: "Carte bancaire", prelevement: "Prélèvement",
  };

  const signedByName = salesTeam?.commercials?.find((c) => c.user_id === client.signed_by)?.full_name;
  const assignedToName = salesTeam?.agents.find((a) => a.user_id === client.assigned_to)?.full_name
    || salesTeam?.commercials.find((c) => c.user_id === client.assigned_to)?.full_name;

  const fields = [
    { label: "NDI Client", value: client.ndi, icon: Hash },
    { label: "Gérant", value: (client as any).manager_name, icon: User },
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
    { label: "Date signature", value: client.signature_date ? new Date(client.signature_date).toLocaleDateString("fr-FR", { timeZone: "Indian/Reunion" }) : null, icon: FileText },
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
  const navigate = useNavigate();
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

  const TICKET_STATUS: Record<string, { label: string; color: string; icon: string }> = {
    ouvert: { label: "Ouvert", color: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700", icon: "🟡" },
    en_cours: { label: "En cours", color: "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700", icon: "🔵" },
    resolu: { label: "Résolu", color: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700", icon: "🟢" },
    ferme: { label: "Fermé", color: "bg-muted text-muted-foreground border-border", icon: "⚫" },
  };

  const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
    urgente: { label: "🔴 Urgent", color: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300" },
    haute: { label: "🟠 Haute", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300" },
    normale: { label: "🟢 Normale", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" },
  };

  const CATEGORY_LABELS: Record<string, string> = {
    modification_site: "🌐 Modification site",
    modification_carte_nfc: "💳 Modification carte NFC",
    fiche_google: "📍 Fiche Google",
    reseaux_sociaux: "📱 Réseaux sociaux",
    bug_technique: "🐛 Bug technique",
    question: "❓ Question",
    autre: "📋 Autre",
  };

  const openCount = tickets?.filter((t) => t.status === "ouvert" || t.status === "en_cours").length || 0;

  if (isLoading) return null;

  return (
    <Card className={`border-0 shadow-lg ${openCount > 0 ? "shadow-rose-200/50 dark:shadow-rose-900/30 ring-1 ring-rose-200 dark:ring-rose-800" : "shadow-primary/5"}`}>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg flex items-center gap-2">
          <Ticket className="w-5 h-5 text-rose-600" />
          Tickets Support
          {tickets && tickets.length > 0 && (
            <Badge variant="secondary" className="ml-1">{tickets.length}</Badge>
          )}
          {openCount > 0 && (
            <Badge className="bg-rose-500 text-white text-[10px] animate-pulse ml-1">
              {openCount} en attente
            </Badge>
          )}
        </CardTitle>
        <Button size="sm" variant="outline" onClick={() => navigate("/support")} className="gap-1">
          <Eye className="w-3.5 h-3.5" /> Voir tout
        </Button>
      </CardHeader>
      <CardContent>
        {!tickets?.length ? (
          <div className="text-center py-6">
            <Ticket className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Aucun ticket support</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tickets.map((t) => {
              const status = TICKET_STATUS[t.status] || TICKET_STATUS.ferme;
              const priority = PRIORITY_CONFIG[t.priority] || PRIORITY_CONFIG.normale;
              const category = CATEGORY_LABELS[t.category] || t.category;
              return (
                <div
                  key={t.id}
                  onClick={() => navigate("/support")}
                  className={`p-4 rounded-xl border cursor-pointer transition-all hover:shadow-md hover:scale-[1.01] ${
                    t.status === "ouvert" ? "border-amber-300 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-800" :
                    t.status === "en_cours" ? "border-blue-300 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-800" :
                    "border-border bg-muted/20"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded">{t.ticket_number}</span>
                      <Badge className={`text-[10px] border ${status.color}`}>
                        {status.icon} {status.label}
                      </Badge>
                      <Badge className={`text-[10px] ${priority.color}`}>
                        {priority.label}
                      </Badge>
                    </div>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                      {new Date(t.created_at).toLocaleDateString("fr-FR", { timeZone: "Indian/Reunion", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <p className="font-semibold text-sm mb-1">{t.subject}</p>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[11px] text-muted-foreground">{category}</span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{t.message}</p>
                  {t.attachments && t.attachments.length > 0 && (
                    <div className="flex gap-1.5 mt-3">
                      {t.attachments.slice(0, 5).map((url: string, i: number) => (
                        <a key={i} href={url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                          <img src={url} alt={`PJ ${i + 1}`} className="w-14 h-14 object-cover rounded-lg border-2 border-border hover:border-primary transition-colors" />
                        </a>
                      ))}
                      {t.attachments.length > 5 && (
                        <span className="w-14 h-14 flex items-center justify-center rounded-lg bg-muted text-xs font-medium text-muted-foreground">
                          +{t.attachments.length - 5}
                        </span>
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

const SUPPORT_CATEGORIES: Record<string, string> = {
  modification_site: "Site Internet",
  modification_carte_nfc: "Carte NFC",
  fiche_google: "Fiche Google",
  reseaux_sociaux: "Réseaux sociaux",
  bug_technique: "Bug technique",
  question: "Question",
  autre: "Autre",
};

// ============ Notes Section ============
function NotesSection({ clientId, activities }: { clientId: string; activities: any[] | undefined }) {
  const { user, hasRole } = useAuth();
  const isAdmin = hasRole("admin");
  const createActivity = useCreateActivity();
  const [note, setNote] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [ticketDialog, setTicketDialog] = useState<{ open: boolean; noteContent: string; authorName: string }>({ open: false, noteContent: "", authorName: "" });
  const [ticketForm, setTicketForm] = useState({ subject: "", message: "", category: "autre", priority: "normale", assigned_to: "" });
  const [creatingTicket, setCreatingTicket] = useState(false);

  const handleSendReply = async (parentId: string) => {
    if (!replyContent.trim() || !user) return;
    try {
      await createActivity.mutateAsync({
        client_id: clientId,
        user_id: user.id,
        activity_type: "note",
        description: replyContent,
        parent_id: parentId,
      } as any);
      toast.success("Réponse envoyée");
      setReplyContent("");
      setReplyingTo(null);
    } catch {
      toast.error("Erreur lors de l'envoi de la réponse");
    }
  };

  const { data: teamWithRoles } = useQuery({
    queryKey: ["team-with-roles"],
    queryFn: async () => {
      const { data: roles } = await supabase.from("user_roles").select("user_id, role");
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name");
      if (!roles || !profiles) return [];
      return profiles.map((p) => ({
        ...p,
        roles: roles.filter((r) => r.user_id === p.user_id).map((r) => r.role),
      }));
    },
  });

  const teamMembers = teamWithRoles;

  const openTicketFromNote = (noteContent: string, authorName: string) => {
    const cleanContent = noteContent.replace(/#(ticket|resolu|en_cours)/gi, "").replace(/@\[[^\]]+\]/g, "").trim();
    setTicketForm({
      subject: cleanContent.length > 80 ? cleanContent.substring(0, 80) + "..." : cleanContent || "Demande client",
      message: cleanContent || "Demande client",
      category: "autre",
      priority: "normale",
      assigned_to: "",
    });
    setTicketDialog({ open: true, noteContent: cleanContent, authorName });
  };

  const handleCreateTicketFromDialog = async () => {
    if (!ticketForm.subject.trim()) return;
    setCreatingTicket(true);
    try {
      const insertData: any = {
          client_id: clientId,
          subject: ticketForm.subject,
          message: `[Note de ${ticketDialog.authorName}]\n\n${ticketForm.message}`,
          category: ticketForm.category,
          priority: ticketForm.priority,
        };
      if (ticketForm.assigned_to) {
        insertData.assigned_to = ticketForm.assigned_to;
      }
      const { data: newTicket, error } = await supabase
        .from("support_tickets")
        .insert(insertData)
        .select("id, ticket_number")
        .single();
      if (error) throw error;
      const { data: clientInfo } = await supabase
        .from("clients")
        .select("company_name, email, support_token")
        .eq("id", clientId)
        .single();
      await supabase.functions.invoke("support-notification", {
        body: {
          ticket_id: newTicket?.id,
          ticket_number: newTicket?.ticket_number,
          client_name: clientInfo?.company_name || "",
          client_email: clientInfo?.email || "",
          company_name: clientInfo?.company_name || "",
          category: ticketForm.category,
          subject: ticketForm.subject,
          message: ticketForm.message,
          priority: ticketForm.priority,
          support_link: clientInfo?.support_token ? `${PUBLISHED_URL}/s/${clientInfo.support_token}` : "",
        },
      });
      toast.success(`🎫 Ticket ${newTicket?.ticket_number} créé avec succès !`);
      setTicketDialog({ open: false, noteContent: "", authorName: "" });
    } catch (e: any) {
      console.error("Create ticket error:", e);
      toast.error("Erreur lors de la création du ticket");
    } finally {
      setCreatingTicket(false);
    }
  };

  const qClient = useQueryClient();

  const handleMarkNoteSeen = async (activityId: string) => {
    try {
      await supabase
        .from("client_activities")
        .update({ admin_seen: true, admin_seen_at: new Date().toISOString() } as any)
        .eq("id", activityId);
      toast.success("Note marquée comme vue ✓");
      qClient.invalidateQueries({ queryKey: ["client-activities", clientId] });
    } catch {
      toast.error("Erreur");
    }
  };

  const handleAddNote = async () => {
    if (!note.trim()) return;
    try {
      await createActivity.mutateAsync({
        client_id: clientId, user_id: user!.id, activity_type: "note", description: note,
      });
      toast.success("Note ajoutée");

      // Detect #resolu tag → auto-resolve open tickets for this client
      if (/#resolu/i.test(note)) {
        try {
          const { data: openTickets } = await supabase
            .from("support_tickets")
            .select("id, ticket_number, subject, message, category, priority")
            .eq("client_id", clientId)
            .in("status", ["ouvert", "en_cours"]);

          if (openTickets && openTickets.length > 0) {
            const { data: client } = await supabase
              .from("clients")
              .select("company_name, email, support_token")
              .eq("id", clientId)
              .single();

            for (const ticket of openTickets) {
              await supabase
                .from("support_tickets")
                .update({ status: "resolu", resolved_at: new Date().toISOString(), resolved_by: user!.id })
                .eq("id", ticket.id);

              await triggerN8nWebhook("support.resolved", {
                ticket_id: ticket.id,
                ticket_number: ticket.ticket_number,
                subject: ticket.subject,
                message: ticket.message,
                category: ticket.category,
                priority: ticket.priority,
                company_name: client?.company_name || "",
                client_name: client?.company_name || "",
                client_email: client?.email || "",
                support_link: client?.support_token ? `${PUBLISHED_URL}/s/${client.support_token}` : "",
              });
            }
            toast.success(`${openTickets.length} ticket(s) marqué(s) résolu(s) — email envoyé au client`);
          } else {
            toast.info("Aucun ticket ouvert à résoudre pour ce client");
          }
        } catch (e) {
          console.warn("Auto-resolve tickets error:", e);
          toast.error("Erreur lors de la résolution automatique des tickets");
        }
      }

      // Detect #en_cours tag → mark open tickets as en_cours
      if (/#en_cours/i.test(note)) {
        try {
          const { data: openTickets } = await supabase
            .from("support_tickets")
            .select("id, ticket_number")
            .eq("client_id", clientId)
            .eq("status", "ouvert");

          if (openTickets && openTickets.length > 0) {
            for (const ticket of openTickets) {
              await supabase
                .from("support_tickets")
                .update({ status: "en_cours", assigned_to: user!.id })
                .eq("id", ticket.id);
            }
            toast.success(`${openTickets.length} ticket(s) passé(s) en cours de traitement`);
          } else {
            toast.info("Aucun ticket ouvert à passer en cours");
          }
        } catch (e) {
          console.warn("Auto en_cours tickets error:", e);
        }
      }

      // Detect #ticket tag → create a support ticket from the note
      if (/#ticket/i.test(note)) {
        try {
          const { data: client } = await supabase
            .from("clients")
            .select("company_name, email, support_token")
            .eq("id", clientId)
            .single();

          // Extract the note content without tags as the ticket subject/message
          const cleanNote = note.replace(/#(ticket|resolu|en_cours)/gi, "").replace(/@\[[^\]]+\]/g, "").trim();
          const subject = cleanNote.length > 80 ? cleanNote.substring(0, 80) + "..." : cleanNote || "Demande client";

          const ticketInsert: any = {
              client_id: clientId,
              subject,
              message: cleanNote || "Ticket créé depuis les notes client",
              category: "autre",
              priority: "normale",
            };
          const { data: newTicket, error: ticketError } = await supabase
            .from("support_tickets")
            .insert(ticketInsert)
            .select("ticket_number")
            .single();

          if (ticketError) throw ticketError;
          toast.success(`🎫 Ticket ${newTicket?.ticket_number} créé ! Rendez-vous dans Support pour l'assigner.`);
        } catch (e) {
          console.warn("Auto-create ticket error:", e);
          toast.error("Erreur lors de la création du ticket");
        }
      }

      setNote("");
    } catch { toast.error("Erreur"); }
  };

  const renderDescription = (text: string) => {
    if (!text) return null;
    // Parse tags and mentions into styled elements
    const parts = text.split(/(#resolu|#en_cours|#ticket|@\[[^\]]+\])/gi);
    return parts.map((part, i) => {
      if (/#resolu/i.test(part)) {
        return <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-semibold"><CheckCircle2 className="w-3 h-3" />Résolu</span>;
      }
      if (/#en_cours/i.test(part)) {
        return <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold"><Clock className="w-3 h-3" />En cours</span>;
      }
      if (/#ticket/i.test(part)) {
        return <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-xs font-semibold"><LifeBuoy className="w-3 h-3" />Ticket créé</span>;
      }
      const mentionMatch = part.match(/@\[([^\]]+)\]/);
      if (mentionMatch) {
        return <span key={i} className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-semibold">@{mentionMatch[1]}</span>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  const handleMention = (member: { user_id: string; full_name: string | null }) => {
    setNote((prev) => prev + `@[${member.full_name || "Membre"}] `);
  };

  const allNotes = activities?.filter((a) => a.activity_type === "note") || [];
  const noteActivities = allNotes.filter((a) => !a.parent_id);
  const repliesByParent = allNotes.reduce((acc: Record<string, any[]>, a) => {
    if (a.parent_id) {
      (acc[a.parent_id] = acc[a.parent_id] || []).push(a);
    }
    return acc;
  }, {});
  const statusActivities = activities?.filter((a) => a.activity_type !== "note") || [];

  return (
    <Card className="border-0 shadow-md shadow-primary/5">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <MessageSquare className="w-5 h-5" /> Notes & Commentaires
          {noteActivities.length > 0 && (
            <Badge variant="secondary" className="text-xs">{noteActivities.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <MentionTextarea
            value={note}
            onChange={setNote}
            members={teamMembers || []}
            placeholder="Ajouter une note... (tapez @ pour mentionner, #resolu #en_cours #ticket)"
            rows={3}
          />
          <div className="flex items-center justify-between">
            <div className="flex gap-1 flex-wrap">
              {teamMembers?.slice(0, 5).map((m) => (
                <Button key={m.user_id} variant="ghost" size="sm" className="text-xs h-7 px-2" onClick={() => handleMention(m)}>
                  @{m.full_name?.split(" ")[0] || "?"}
                </Button>
              ))}
              <Button variant="outline" size="sm" className="text-xs h-7 px-2 text-blue-600 border-blue-200 hover:bg-blue-50" onClick={() => setNote((prev) => prev + "#en_cours ")}>
                <Clock className="w-3 h-3 mr-1" /> #en_cours
              </Button>
              <Button variant="outline" size="sm" className="text-xs h-7 px-2 text-green-600 border-green-200 hover:bg-green-50" onClick={() => setNote((prev) => prev + "#resolu ")}>
                <CheckCircle2 className="w-3 h-3 mr-1" /> #resolu
              </Button>
              <Button variant="outline" size="sm" className="text-xs h-7 px-2 text-orange-600 border-orange-200 hover:bg-orange-50" onClick={() => setNote((prev) => prev + "#ticket ")}>
                <LifeBuoy className="w-3 h-3 mr-1" /> #ticket
              </Button>
            </div>
            <Button size="sm" onClick={handleAddNote} disabled={createActivity.isPending || !note.trim()}>
              {createActivity.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        </div>
        {noteActivities.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-3 pt-3 border-t border-border"
          >
            {noteActivities.map((activity, index) => {
              const authorName = teamMembers?.find((m) => m.user_id === activity.user_id)?.full_name || "Inconnu";
              const hasResolu = /#resolu/i.test(activity.description || "");
              const hasEnCours = /#en_cours/i.test(activity.description || "");
              const hasTicket = /#ticket/i.test(activity.description || "");
              return (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05, duration: 0.3 }}
                  className={`p-4 rounded-xl border transition-all ${
                    hasResolu
                      ? "bg-green-50/60 border-green-200/60 dark:bg-green-950/20 dark:border-green-800/30"
                      : hasTicket
                      ? "bg-orange-50/60 border-orange-200/60 dark:bg-orange-950/20 dark:border-orange-800/30"
                      : hasEnCours
                      ? "bg-blue-50/60 border-blue-200/60 dark:bg-blue-950/20 dark:border-blue-800/30"
                      : "bg-card border-border/50 hover:border-border"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-xs font-bold text-primary">{authorName.charAt(0).toUpperCase()}</span>
                      </div>
                      <span className="text-sm font-semibold text-foreground">{authorName}</span>
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      {new Date(activity.created_at).toLocaleDateString("fr-FR", { timeZone: "Indian/Reunion", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <div className="text-sm whitespace-pre-wrap leading-relaxed text-foreground/90">
                    {renderDescription(activity.description || "")}
                  </div>
                  {/* Admin seen status - visible to everyone */}
                  {(activity as any).admin_seen && !isAdmin && (
                    <div className="mt-1.5">
                      <span className="inline-flex items-center gap-1 text-[11px] text-green-600 dark:text-green-400 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Vu par l'admin
                      </span>
                    </div>
                  )}
                  {isAdmin && (
                    <div className="mt-2 flex items-center justify-between">
                      <div>
                        {(activity as any).admin_seen ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-green-600 dark:text-green-400 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Vu par l'admin
                          </span>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs h-7 gap-1 text-muted-foreground hover:text-green-600"
                            onClick={() => handleMarkNoteSeen(activity.id)}
                          >
                            <Eye className="w-3.5 h-3.5" /> Marquer comme vu
                          </Button>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-7 gap-1 text-orange-600 border-orange-200 hover:bg-orange-50 dark:border-orange-800 dark:hover:bg-orange-950"
                        onClick={() => openTicketFromNote(activity.description || "", authorName)}
                      >
                        <LifeBuoy className="w-3 h-3" /> Créer un ticket
                      </Button>
                    </div>
                  )}

                  {/* Bouton Répondre + zone de réponse + réponses imbriquées */}
                  <div className="mt-3 pt-3 border-t border-border/40 space-y-2">
                    {(repliesByParent[activity.id] || []).map((reply: any) => {
                      const replyAuthor = teamMembers?.find((m) => m.user_id === reply.user_id)?.full_name || "Inconnu";
                      return (
                        <div key={reply.id} className="flex gap-2 pl-3 border-l-2 border-primary/30">
                          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <span className="text-[10px] font-bold text-primary">{replyAuthor.charAt(0).toUpperCase()}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-xs font-semibold text-foreground">{replyAuthor}</span>
                              <span className="text-[10px] text-muted-foreground">
                                {new Date(reply.created_at).toLocaleDateString("fr-FR", { timeZone: "Indian/Reunion", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </div>
                            <div className="text-xs whitespace-pre-wrap text-foreground/85 leading-relaxed">
                              {renderDescription(reply.description || "")}
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {replyingTo === activity.id ? (
                      <div className="space-y-2 pl-3 border-l-2 border-primary/30">
                        <MentionTextarea
                          value={replyContent}
                          onChange={setReplyContent}
                          members={teamMembers || []}
                          placeholder={`Répondre à ${authorName}... (tapez @ pour mentionner)`}
                          rows={2}
                          className="text-sm"
                          autoFocus
                        />
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex flex-wrap gap-1">
                            {teamMembers?.slice(0, 4).map((m) => (
                              <Button
                                key={m.user_id}
                                variant="ghost"
                                size="sm"
                                className="text-[10px] h-6 px-1.5"
                                onClick={() => setReplyContent((p) => p + `@[${m.full_name || "Membre"}] `)}
                              >
                                @{m.full_name?.split(" ")[0] || "?"}
                              </Button>
                            ))}
                          </div>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setReplyingTo(null); setReplyContent(""); }}>
                              Annuler
                            </Button>
                            <Button size="sm" className="h-7 text-xs" onClick={() => handleSendReply(activity.id)} disabled={!replyContent.trim() || createActivity.isPending}>
                              {createActivity.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-muted-foreground hover:text-primary gap-1"
                        onClick={() => { setReplyingTo(activity.id); setReplyContent(""); }}
                      >
                        <MessageSquare className="w-3 h-3" /> Répondre
                      </Button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
        {statusActivities.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="space-y-2 pt-3 border-t border-border"
          >
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Historique</p>
            {statusActivities.map((activity, index) => (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.03, duration: 0.25 }}
                className="flex items-start gap-3 text-sm"
              >
                <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                <div>
                  <p className="text-foreground/80">{activity.description}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(activity.created_at).toLocaleDateString("fr-FR", { timeZone: "Indian/Reunion", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </CardContent>

      {/* Dialog de création de ticket depuis une note */}
      <Dialog open={ticketDialog.open} onOpenChange={(open) => setTicketDialog((prev) => ({ ...prev, open }))}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LifeBuoy className="w-5 h-5 text-orange-500" /> Créer un ticket support
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-muted/50 border text-sm">
              <p className="text-xs font-medium text-muted-foreground mb-1">Note de {ticketDialog.authorName} :</p>
              <p className="text-foreground/80 whitespace-pre-wrap">{ticketDialog.noteContent}</p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Sujet du ticket</Label>
              <Input
                value={ticketForm.subject}
                onChange={(e) => setTicketForm((prev) => ({ ...prev, subject: e.target.value }))}
                placeholder="Sujet..."
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Message</Label>
              <Textarea
                value={ticketForm.message}
                onChange={(e) => setTicketForm((prev) => ({ ...prev, message: e.target.value }))}
                rows={3}
                className="resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Catégorie</Label>
                <Select value={ticketForm.category} onValueChange={(v) => setTicketForm((prev) => ({ ...prev, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(SUPPORT_CATEGORIES).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Priorité</Label>
                <Select value={ticketForm.priority} onValueChange={(v) => setTicketForm((prev) => ({ ...prev, priority: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normale">Normale</SelectItem>
                    <SelectItem value="haute">Haute</SelectItem>
                    <SelectItem value="urgente">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Assigner à</Label>
              <Select value={ticketForm.assigned_to} onValueChange={(v) => setTicketForm((prev) => ({ ...prev, assigned_to: v }))}>
                <SelectTrigger><SelectValue placeholder="Non assigné" /></SelectTrigger>
                <SelectContent>
                  {teamWithRoles?.filter((m) =>
                    m.roles.some((r: string) => ["admin", "webmaster", "designer", "agent_support"].includes(r))
                  ).map((m) => (
                    <SelectItem key={m.user_id} value={m.user_id}>
                      {m.full_name || "Inconnu"} — {m.roles.join(", ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setTicketDialog({ open: false, noteContent: "", authorName: "" })}>
                Annuler
              </Button>
              <Button
                onClick={handleCreateTicketFromDialog}
                disabled={creatingTicket || !ticketForm.subject.trim()}
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                {creatingTicket ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <LifeBuoy className="w-4 h-4 mr-1" />}
                Créer le ticket
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ============ Client Forms Section ============
function ClientFormsSection({ clientId, supportToken, packType, companyName }: { clientId: string; supportToken?: string; packType?: string; companyName: string }) {
  const { user, hasRole } = useAuth();
  const { data: forms, isLoading } = useClientForms(clientId);
  const validateForm = useValidateForm();
  const [viewingForm, setViewingForm] = useState<any>(null);
  const [mentionOpen, setMentionOpen] = useState<string | null>(null);

  const { data: webmasters } = useQuery({
    queryKey: ["webmaster-members"],
    queryFn: async () => {
      const { data: roles } = await supabase.from("user_roles").select("user_id").in("role", ["webmaster", "designer"]);
      if (!roles?.length) return [];
      const userIds = roles.map(r => r.user_id);
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", userIds);
      return profiles || [];
    },
  });

  const notifyWebmaster = async (formId: string, formType: string, webmasterUserId: string, webmasterName: string) => {
    try {
      await supabase.from("notifications").insert({
        user_id: webmasterUserId,
        title: `📋 Formulaire ${formType === "nfc" ? "Carte NFC" : "Site"} à traiter`,
        message: `Un client a rempli le formulaire ${formType === "nfc" ? "Carte NFC" : "Site Internet"}. Consultez les informations pour démarrer le travail.`,
        type: "form_submission",
        link: `/clients/${clientId}`,
      });
      toast.success(`${webmasterName} a été notifié(e)`);
      setMentionOpen(null);
    } catch { toast.error("Erreur"); }
  };

  const FORM_TYPE_LABELS: Record<string, { label: string; icon: string }> = {
    nfc: { label: "Carte NFC", icon: "💳" },
    site: { label: "Site Internet", icon: "🌐" },
  };
  const STATUS_LABELS: Record<string, string> = { en_attente: "En attente", soumis: "Soumis", valide: "Validé" };
  const STATUS_COLORS: Record<string, string> = {
    en_attente: "bg-muted text-muted-foreground border-border",
    soumis: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700",
    valide: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-700",
  };
  const STATUS_ICONS: Record<string, string> = { en_attente: "⏳", soumis: "📤", valide: "✅" };

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

  const submittedCount = forms?.filter((f) => f.status === "soumis").length || 0;

  return (
    <Card className={`border-0 shadow-lg ${submittedCount > 0 ? "shadow-amber-200/50 dark:shadow-amber-900/30 ring-1 ring-amber-200 dark:ring-amber-800" : "shadow-primary/5"}`}>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <FileText className="w-5 h-5 text-emerald-600" />
          Formulaires Client
          {forms && forms.length > 0 && (
            <Badge variant="secondary" className="ml-1">{forms.length}</Badge>
          )}
          {submittedCount > 0 && (
            <Badge className="bg-amber-500 text-white text-[10px] animate-pulse ml-1">
              {submittedCount} à valider
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {supportToken && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { label: "Carte NFC", link: nfcLink!, icon: CreditCard },
              ...(packType !== "star_bizness_nfc" ? [{ label: "Site Internet", link: siteLink!, icon: Globe }] : []),
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
                <div key={form.id} className={`p-4 rounded-xl border space-y-2 transition-all ${
                  form.status === "soumis" ? "border-amber-300 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-800" : "border-border bg-muted/20"
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{FORM_TYPE_LABELS[form.form_type]?.icon} {FORM_TYPE_LABELS[form.form_type]?.label || form.form_type}</span>
                      <Badge className={`text-[10px] border ${STATUS_COLORS[form.status] || ""}`}>
                        {STATUS_ICONS[form.status]} {STATUS_LABELS[form.status] || form.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="ghost" onClick={() => setViewingForm(viewingForm?.id === form.id ? null : form)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      {form.status === "soumis" && hasRole("admin") && (
                        <>
                          <div className="relative">
                            <Button size="sm" variant="ghost" onClick={() => setMentionOpen(mentionOpen === form.id ? null : form.id)} title="Notifier un webmaster">
                              <UserCheck className="w-4 h-4" />
                            </Button>
                            {mentionOpen === form.id && webmasters && webmasters.length > 0 && (
                              <div className="absolute right-0 top-full mt-1 z-50 bg-popover border rounded-md shadow-lg p-1 min-w-[180px]">
                                {webmasters.map(w => (
                                  <button
                                    key={w.user_id}
                                    className="w-full text-left text-xs px-3 py-2 rounded hover:bg-muted transition-colors"
                                    onClick={() => notifyWebmaster(form.id, form.form_type, w.user_id, w.full_name || "Webmaster")}
                                  >
                                    @{w.full_name || w.user_id.slice(0, 8)}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                          <Button size="sm" variant="outline" onClick={() => handleValidate(form.id)} disabled={validateForm.isPending}>
                            <CheckCircle2 className="w-4 h-4 mr-1" /> Valider
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                  {form.submitted_at && (
                    <p className="text-[11px] text-muted-foreground">
                      Soumis le {new Date(form.submitted_at).toLocaleDateString("fr-FR", { timeZone: "Indian/Reunion", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
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
  const deleteClient = useDeleteClient();
  const createActivity = useCreateActivity();
  const { hasRole } = useAuth();

  // Check if emails have been sent to this client
  const { data: emailCount } = useQuery({
    queryKey: ["client-email-count", id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("email_send_log")
        .select("*", { count: "exact", head: true })
        .or(`recipient_email.eq.${client?.email},metadata->>client_id.eq.${id}`);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!id && !!client,
  });

  const handleDelete = async () => {
    try {
      await deleteClient.mutateAsync(id!);
      toast.success("Client supprimé");
      navigate("/clients");
    } catch {
      toast.error("Erreur lors de la suppression");
    }
  };

  const handleStatusChange = async (newStatus: PipelineStatus) => {
    if (!client) return;
    const oldStatus = client.pipeline_status;
    try {
      await updateClient.mutateAsync({ id: client.id, pipeline_status: newStatus, _previousStatus: oldStatus });
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

  // Detect pending "appel livraison de site" — open if there's a livraison_site activity
  // and no follow-up note marked as #resolu after it
  const livraisonActivity = activities?.find((a) => a.activity_type === "livraison_site");
  const livraisonResolved = livraisonActivity && activities?.some(
    (a) => a.activity_type === "note"
      && new Date(a.created_at) > new Date(livraisonActivity.created_at)
      && /#(resolu|résolu|livraison_ok)/i.test(a.description || "")
  );
  const hasPendingDeliveryCall = !!livraisonActivity && !livraisonResolved;

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
            {hasPendingDeliveryCall && (
              <Badge className="bg-primary/10 text-primary border-primary/30 text-[10px] gap-1 animate-pulse" variant="outline">
                📞 Appel livraison de site à faire
              </Badge>
            )}
            {emailCount && emailCount > 0 ? (
              <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700 text-[10px] gap-1" variant="outline">
                <Mail className="w-3 h-3" /> {emailCount} email{emailCount > 1 ? "s" : ""} envoyé{emailCount > 1 ? "s" : ""}
              </Badge>
            ) : (
              <Badge className="bg-muted text-muted-foreground border-border text-[10px] gap-1" variant="outline">
                <Mail className="w-3 h-3" /> Aucun email
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Quick pack type change */}
          {hasRole("admin") && (
            <Select
              value={client.pack_type || ""}
              onValueChange={async (val) => {
                try {
                  await updateClient.mutateAsync({ id: client.id, pack_type: val as any });
                  await createActivity.mutateAsync({
                    client_id: client.id, user_id: user!.id, activity_type: "pack_change",
                    description: `Pack changé en "${PACK_LABELS[val as PackType] || val}"`,
                  });
                  toast.success(`Pack changé en ${PACK_LABELS[val as PackType] || val}`);
                } catch { toast.error("Erreur lors du changement de pack"); }
              }}
            >
              <SelectTrigger className="w-48 h-8 text-xs">
                <CreditCard className="w-3.5 h-3.5 mr-1.5 text-primary" />
                <SelectValue placeholder="Changer de pack" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="star_bizness_numerik">STAR BIZNESS NUMERIK</SelectItem>
                <SelectItem value="star_bizness_nfc">STAR BIZNESS NFC</SelectItem>
                <SelectItem value="autre">Autre</SelectItem>
              </SelectContent>
            </Select>
          )}
          <EditClientDialog client={client} onSave={handleEditSave} salesTeam={salesTeam} />
          <Button
            variant="outline" size="sm"
            onClick={() => exportClientPDF({ client, contacts: contacts || [], activities: activities || [], salesTeam })}
          >
            <Download className="w-4 h-4 mr-1" /> PDF
          </Button>
          {hasRole("admin") && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Trash2 className="w-4 h-4 mr-1" /> Supprimer
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Supprimer ce client ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Cette action est irréversible. Toutes les données associées à {client.company_name} seront supprimées.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Supprimer
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
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
          <RelanceFlagsSection clientId={client.id} client={client} />
          <ClientRemindersSection clientId={client.id} />
          <LogoTrackingCard client={client as any} />
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

      <ClientEmailActions client={{
        id: client.id,
        company_name: client.company_name,
        email: client.email,
        support_token: (client as any).support_token,
        pack_type: client.pack_type,
        manager_name: client.manager_name,
        sector: client.sector,
        ndi: client.ndi,
      }} />
      <DomainRenewalInvoice client={{
        id: client.id,
        company_name: client.company_name,
        email: client.email,
        address: client.address,
        postal_code: client.postal_code,
        city: client.city,
        phone: client.phone,
        siret: client.siret,
        payment_method: client.payment_method,
      }} />
      <SupportTicketsSection clientId={id!} />
      <ClientEmailHistory clientId={id!} clientEmail={client.email} />
      <ClientFormsSection clientId={id!} supportToken={(client as any).support_token} packType={client.pack_type ?? undefined} />
      {client.pack_type !== "star_bizness_nfc" && <SocialMediaSection clientId={id!} clientNdi={(client as any).ndi} clientEmail={(client as any).email} clientCompany={(client as any).company_name} clientManager={(client as any).manager_name} />}
      {/* {client.pack_type !== "star_bizness_nfc" && <ChatbotConfigSection clientId={id!} clientCompany={(client as any).company_name} />} */}
      {client.pack_type !== "star_bizness_nfc" && <PaymentTutoSection clientId={id!} clientNdi={(client as any).ndi} clientEmail={(client as any).email} clientCompany={(client as any).company_name} clientManager={(client as any).manager_name} />}
      {client.pack_type !== "star_bizness_nfc" && <ReservationSyncSection clientId={id!} clientEmail={(client as any).email} clientCompany={(client as any).company_name} clientManager={(client as any).manager_name} clientToken={(client as any).support_token} />}
      <NotesSection clientId={id!} activities={activities} />
    </div>
  );
}
