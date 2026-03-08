import { useParams, useNavigate } from "react-router-dom";
import { useClient, useClientContacts, useClientActivities, useUpdateClient, useCreateContact, useCreateActivity } from "@/hooks/use-clients";
import { useAuth } from "@/contexts/AuthContext";
import { PIPELINE_LABELS, PIPELINE_COLORS, PIPELINE_ORDER, PACK_LABELS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Plus, User, Phone, Mail, Briefcase, Building2, Loader2, Clock } from "lucide-react";
import { useState } from "react";
import type { Database } from "@/integrations/supabase/types";

type PipelineStatus = Database["public"]["Enums"]["pipeline_status"];

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: client, isLoading } = useClient(id!);
  const { data: contacts } = useClientContacts(id!);
  const { data: activities } = useClientActivities(id!);
  const updateClient = useUpdateClient();
  const createContact = useCreateContact();
  const createActivity = useCreateActivity();

  const [contactOpen, setContactOpen] = useState(false);
  const [contactForm, setContactForm] = useState({
    first_name: "", last_name: "", email: "", phone: "", position: "",
  });

  const handleStatusChange = async (newStatus: PipelineStatus) => {
    if (!client) return;
    const oldStatus = client.pipeline_status;
    try {
      await updateClient.mutateAsync({ id: client.id, pipeline_status: newStatus });
      await createActivity.mutateAsync({
        client_id: client.id,
        user_id: user!.id,
        activity_type: "status_change",
        description: `Statut changé de "${PIPELINE_LABELS[oldStatus]}" à "${PIPELINE_LABELS[newStatus]}"`,
        old_status: oldStatus,
        new_status: newStatus,
      });
      toast.success("Statut mis à jour");
    } catch {
      toast.error("Erreur lors de la mise à jour");
    }
  };

  const handleAddContact = async () => {
    if (!contactForm.first_name.trim() || !contactForm.last_name.trim()) {
      toast.error("Prénom et nom requis");
      return;
    }
    try {
      await createContact.mutateAsync({
        ...contactForm,
        client_id: id!,
        is_primary: (contacts?.length || 0) === 0,
      });
      toast.success("Contact ajouté");
      setContactOpen(false);
      setContactForm({ first_name: "", last_name: "", email: "", phone: "", position: "" });
    } catch {
      toast.error("Erreur lors de l'ajout du contact");
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!client) {
    return <p className="text-muted-foreground">Client introuvable</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/clients")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">{client.company_name}</h1>
          <div className="flex items-center gap-2 mt-1">
            {client.city && <span className="text-muted-foreground text-sm">{client.city}</span>}
            {client.pack_type && (
              <Badge variant="secondary" className="text-xs">{PACK_LABELS[client.pack_type]}</Badge>
            )}
          </div>
        </div>
        <Select value={client.pipeline_status} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PIPELINE_ORDER.map((status) => (
              <SelectItem key={status} value={status}>{PIPELINE_LABELS[status]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Client Info */}
        <Card className="lg:col-span-2 border-0 shadow-md shadow-primary/5">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Building2 className="w-5 h-5" /> Informations
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 text-sm">
            {client.siret && (
              <div><span className="text-muted-foreground">SIRET</span><p className="font-medium">{client.siret}</p></div>
            )}
            {client.sector && (
              <div><span className="text-muted-foreground">Secteur</span><p className="font-medium">{client.sector}</p></div>
            )}
            {client.address && (
              <div><span className="text-muted-foreground">Adresse</span><p className="font-medium">{client.address}</p></div>
            )}
            {client.postal_code && (
              <div><span className="text-muted-foreground">Code postal</span><p className="font-medium">{client.postal_code}</p></div>
            )}
            {client.website && (
              <div><span className="text-muted-foreground">Site web</span><p className="font-medium">{client.website}</p></div>
            )}
            {client.notes && (
              <div className="col-span-2">
                <span className="text-muted-foreground">Notes</span>
                <p className="font-medium whitespace-pre-wrap">{client.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pipeline Progress */}
        <Card className="border-0 shadow-md shadow-primary/5">
          <CardHeader>
            <CardTitle className="text-lg">Pipeline</CardTitle>
          </CardHeader>
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
                    isCurrent
                      ? `${PIPELINE_COLORS[status]} border font-medium`
                      : isPast
                      ? "text-muted-foreground line-through opacity-50"
                      : "text-muted-foreground"
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

      {/* Contacts Section */}
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
                  <div className="space-y-2">
                    <Label>Prénom *</Label>
                    <Input value={contactForm.first_name} onChange={(e) => setContactForm({ ...contactForm, first_name: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Nom *</Label>
                    <Input value={contactForm.last_name} onChange={(e) => setContactForm({ ...contactForm, last_name: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input type="email" value={contactForm.email} onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Téléphone</Label>
                    <Input value={contactForm.phone} onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Poste</Label>
                  <Input value={contactForm.position} onChange={(e) => setContactForm({ ...contactForm, position: e.target.value })} placeholder="Ex: Gérant" />
                </div>
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

      {/* Activities */}
      <Card className="border-0 shadow-md shadow-primary/5">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="w-5 h-5" /> Historique
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!activities?.length ? (
            <p className="text-muted-foreground text-sm">Aucune activité</p>
          ) : (
            <div className="space-y-3">
              {activities.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3 text-sm">
                  <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                  <div>
                    <p>{activity.description}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(activity.created_at).toLocaleDateString("fr-FR", {
                        day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
