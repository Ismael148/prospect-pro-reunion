import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Copy, Loader2, Send, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useEmailBranding } from "@/hooks/use-email-branding";
import { wrapInBrandedTemplate } from "@/lib/email-template";
import { supportLink } from "@/lib/followup";
import { DECOLLAGE_SUPPORT_TRIGGER, DEFAULT_SUPPORT_INTRO, buildDecollageSupportEmail } from "@/lib/decollage-email";
import { isEmail, sendClientEmail } from "./send-client-email";
import type { DecollageClient } from "./DecollageEmailDialog";
import { toast } from "sonner";

const CATEGORIES: Record<string, string> = {
  question: "Question générale",
  modification_site: "Modification de la page de conversion",
  fiche_google: "Fiche Google",
  reseaux_sociaux: "Contenus réseaux",
  modification_carte_nfc: "Carte NFC",
  bug_technique: "Bug technique",
  autre: "Autre",
};

export default function DecollageSupportDialog({ client, open, onOpenChange }: { client: DecollageClient | null; open: boolean; onOpenChange: (v: boolean) => void }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { data: branding } = useEmailBranding();
  const [tab, setTab] = useState("mail");
  const [busy, setBusy] = useState(false);
  // The parent remounts this dialog per client (key), so state starts from the client's data on first render.
  const [to, setTo] = useState(client?.email || "");
  const [subject, setSubject] = useState("");
  const [name, setName] = useState(client?.manager_name || "");
  const [intro, setIntro] = useState(DEFAULT_SUPPORT_INTRO);
  const [note, setNote] = useState("");
  const [ticket, setTicket] = useState({ category: "question", priority: "normale", subject: "", message: "" });

  const link = supportLink(client?.support_token);
  const mail = useMemo(() => {
    const built = buildDecollageSupportEmail({ name, intro, note });
    return { subject: subject.trim() || built.subject, html: wrapInBrandedTemplate(built.body, link || undefined, branding || undefined) };
  }, [name, intro, note, subject, link, branding]);

  const sendMail = async () => {
    if (!client || !link || !isEmail(to) || !intro.trim() || busy) return;
    setBusy(true);
    try {
      await sendClientEmail({ to: to.trim(), name: client.manager_name || client.company_name, subject: mail.subject, html: mail.html, trigger: DECOLLAGE_SUPPORT_TRIGGER, clientId: client.id });
      toast.success("Lien support envoyé au client");
      await queryClient.invalidateQueries({ queryKey: ["client-email-history", client.id] });
      onOpenChange(false);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Impossible d'envoyer le mail."); }
    finally { setBusy(false); }
  };

  const createTicket = async () => {
    if (!client?.support_token || !ticket.subject.trim() || !ticket.message.trim() || busy) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc("create_support_ticket_public", {
        p_token: client.support_token, p_category: ticket.category, p_subject: ticket.subject.trim(),
        p_message: ticket.message.trim(), p_priority: ticket.priority, p_attachments: null as any,
      });
      if (error) throw error;
      const created = Array.isArray(data) ? data[0] : data;
      toast.success(`Ticket ${created?.ticket_number || ""} créé`.trim());
      queryClient.invalidateQueries({ queryKey: ["support_tickets"] });
      onOpenChange(false);
      if (created?.id) navigate(`/support?ticket=${created.id}`);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Impossible de créer le ticket."); }
    finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!busy) onOpenChange(v); }}>
      <DialogContent className="max-h-[92vh] max-w-5xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Ticket className="h-5 w-5 text-primary" /> Ticket support · {client?.company_name}</DialogTitle>
          <DialogDescription>Envoyez au client son lien personnel de ticket support, ou ouvrez un ticket pour lui.</DialogDescription>
        </DialogHeader>
        {!link ? <p className="text-sm text-destructive">Ce client n'a pas de lien support.</p> : (
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList><TabsTrigger value="mail">Envoyer le lien par mail</TabsTrigger><TabsTrigger value="ticket">Ouvrir un ticket pour le client</TabsTrigger></TabsList>
            <TabsContent value="mail" className="mt-4">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <div className="space-y-1.5"><Label>Destinataire</Label><Input type="email" value={to} onChange={(e) => setTo(e.target.value)} placeholder="client@exemple.com" /></div>
                  <div className="space-y-1.5"><Label>Objet du mail</Label><Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder={mail.subject} /></div>
                  <div className="space-y-1.5"><Label>Nom du gérant</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Laisser vide pour « Bonjour, »" /></div>
                  <div className="space-y-1.5"><Label>Message</Label><Textarea rows={5} value={intro} onChange={(e) => setIntro(e.target.value)} /></div>
                  <div className="space-y-1.5"><Label>Message complémentaire (facultatif)</Label><Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} /></div>
                  <div className="flex items-center gap-2 rounded-lg bg-muted/40 p-2 text-xs">
                    <code className="flex-1 break-all">{link}</code>
                    <Button type="button" size="icon" variant="ghost" className="h-7 w-7" aria-label="Copier le lien support" onClick={() => { navigator.clipboard.writeText(link); toast.success("Lien copié"); }}><Copy className="h-3.5 w-3.5" /></Button>
                  </div>
                  {(!isEmail(to) || !intro.trim()) && <p className="text-sm text-destructive">À compléter : {[!isEmail(to) && "adresse email valide", !intro.trim() && "message"].filter(Boolean).join(", ")}.</p>}
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Aperçu du mail</p>
                  <iframe title="Aperçu du mail support" srcDoc={mail.html} sandbox="" className="h-[55vh] w-full rounded-lg border border-border bg-background" />
                </div>
              </div>
              <DialogFooter className="mt-4">
                <Button variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>Annuler</Button>
                <Button disabled={busy || !isEmail(to) || !intro.trim()} onClick={sendMail}>{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />} Envoyer le lien</Button>
              </DialogFooter>
            </TabsContent>
            <TabsContent value="ticket" className="mt-4 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Catégorie</Label>
                  <Select value={ticket.category} onValueChange={(v) => setTicket({ ...ticket, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.entries(CATEGORIES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Priorité</Label>
                  <Select value={ticket.priority} onValueChange={(v) => setTicket({ ...ticket, priority: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="normale">Normale</SelectItem><SelectItem value="urgente">Urgente</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5"><Label>Objet</Label><Input value={ticket.subject} onChange={(e) => setTicket({ ...ticket, subject: e.target.value })} placeholder="Ex. : Mettre à jour l'offre du mois" maxLength={200} /></div>
              <div className="space-y-1.5"><Label>Demande du client</Label><Textarea rows={6} value={ticket.message} onChange={(e) => setTicket({ ...ticket, message: e.target.value })} placeholder="Décrivez la demande telle que le client l'a formulée…" maxLength={5000} /></div>
              <DialogFooter>
                <Button variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>Annuler</Button>
                <Button disabled={busy || !ticket.subject.trim() || !ticket.message.trim()} onClick={createTicket}>{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Ticket className="mr-2 h-4 w-4" />} Créer le ticket</Button>
              </DialogFooter>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
