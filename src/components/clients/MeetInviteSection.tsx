import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CalendarClock, Loader2, Send, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { EmailSupportOption, useEmailSupport } from "@/components/EmailSupportOption";
import { useEmailBranding } from "@/hooks/use-email-branding";
import { supabase } from "@/integrations/supabase/client";
import { wrapInBrandedTemplate } from "@/lib/email-template";
import { supportLink } from "@/lib/followup";
import {
  DEFAULT_MEET_LINK, MEET_INVITE_TRIGGER, MEET_MOTIFS, type MeetMotifId,
  buildMeetInviteEmail, meetMotifLabel, reunionLocalToDate,
} from "@/lib/meet-invite";
import { toast } from "sonner";

interface Props { clientId: string; companyName: string; managerName?: string | null; email?: string | null; supportToken?: string | null }

const DURATIONS = [15, 30, 45, 60, 90];

export default function MeetInviteSection({ clientId, companyName, managerName, email, supportToken }: Props) {
  const queryClient = useQueryClient();
  const { data: branding } = useEmailBranding();
  const { includeSupport, setIncludeSupport, applySupport } = useEmailSupport();
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [to, setTo] = useState(email || "");
  const [motifId, setMotifId] = useState<MeetMotifId>("carte_bizness");
  const [customMotif, setCustomMotif] = useState("");
  const [when, setWhen] = useState("");
  const [duration, setDuration] = useState(30);
  const [meet, setMeet] = useState(DEFAULT_MEET_LINK);
  const [note, setNote] = useState("");
  const [subject, setSubject] = useState("");
  const [addToCalendar, setAddToCalendar] = useState(true);

  const motif = meetMotifLabel(motifId, customMotif);
  const start = when ? reunionLocalToDate(when) : null;
  const startValid = !!start && !Number.isNaN(start.getTime()) && start.getTime() > Date.now();
  const meetValid = /^https:\/\/meet\.google\.com\/\S+$/.test(meet.trim());
  const toValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to.trim());

  const mail = useMemo(() => {
    const built = buildMeetInviteEmail({
      name: managerName, motif: motif || "[motif]", start: startValid ? start! : new Date(Date.now() + 86_400_000),
      durationMin: duration, meet: meet.trim() || DEFAULT_MEET_LINK, note,
    });
    const link = supportLink(supportToken);
    return { subject: subject.trim() || built.subject, html: applySupport(wrapInBrandedTemplate(built.body, link || undefined, branding || undefined), link, branding || undefined) };
  }, [managerName, motif, start, startValid, duration, meet, note, subject, supportToken, branding, applySupport]);

  const problems = [
    !toValid && "adresse email valide",
    !motif && "motif",
    !startValid && "date et heure à venir",
    !meetValid && "lien Google Meet",
  ].filter(Boolean) as string[];

  const openDialog = () => { setTo(email || ""); setSubject(""); setOpen(true); };

  const send = async () => {
    if (problems.length || sending) return;
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-brevo-campaign", { body: {
        action: "send_client_email", recipientEmail: to.trim(), recipientName: managerName || companyName,
        subject: mail.subject, htmlContent: mail.html, trigger: MEET_INVITE_TRIGGER, client_id: clientId,
      } });
      if (error) {
        const response = "context" in error ? error.context : null;
        const detail = response instanceof Response ? await response.json().catch(() => null) : null;
        throw new Error(detail?.error || error.message);
      }
      if (!data?.success) throw new Error(data?.error || "L'envoi n'a pas été confirmé.");
      toast.success("Invitation visio envoyée");
      if (addToCalendar) {
        const { data: u } = await supabase.auth.getUser();
        const { error: calError } = await supabase.from("calendar_events").insert({
          title: `Visio ${companyName} – ${motif}`, description: note.trim() || null, event_type: "visio",
          start_at: start!.toISOString(), end_at: new Date(start!.getTime() + duration * 60_000).toISOString(),
          meet_link: meet.trim(), client_id: clientId, created_by: u.user?.id, email_sent_to_client: true,
          email_sent_at: new Date().toISOString(),
        } as any);
        if (calError) toast.warning("Mail envoyé, mais le rendez-vous n'a pas pu être ajouté à l'agenda (droits insuffisants).");
        else queryClient.invalidateQueries({ queryKey: ["calendar_events"] });
      }
      await queryClient.invalidateQueries({ queryKey: ["client-email-history", clientId] });
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Impossible d'envoyer l'invitation.");
    } finally { setSending(false); }
  };

  return <Card>
    <CardHeader><CardTitle className="flex items-start gap-2 text-lg"><Video className="mt-0.5 h-5 w-5 shrink-0 text-primary" /> Rendez-vous visio Google Meet</CardTitle></CardHeader>
    <CardContent className="space-y-3">
      <p className="text-sm leading-6 text-muted-foreground">Envoyez au client une invitation avec la date, l'heure, le motif et le lien Meet de l'agence.</p>
      <Button size="sm" onClick={openDialog}><CalendarClock className="mr-2 h-4 w-4" /> Envoyer un RDV visio</Button>
      <Dialog open={open} onOpenChange={(v) => { if (!sending) setOpen(v); }}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader><DialogTitle>Rendez-vous visio · {companyName}</DialogTitle></DialogHeader>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <div className="space-y-1.5"><Label>Destinataire</Label><Input type="email" value={to} onChange={(e) => setTo(e.target.value)} placeholder="client@exemple.com" /></div>
              <div className="space-y-1.5">
                <Label>Motif</Label>
                <Select value={motifId} onValueChange={(v) => setMotifId(v as MeetMotifId)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{MEET_MOTIFS.map((m) => <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>)}</SelectContent>
                </Select>
                {motifId === "autre" && <Input value={customMotif} onChange={(e) => setCustomMotif(e.target.value)} placeholder="Ex. : Fiche Google, réseaux sociaux…" maxLength={80} />}
              </div>
              <div className="grid grid-cols-[1fr_auto] gap-3">
                <div className="space-y-1.5"><Label>Date et heure (Réunion)</Label><Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} step={300} /></div>
                <div className="space-y-1.5">
                  <Label>Durée</Label>
                  <Select value={String(duration)} onValueChange={(v) => setDuration(Number(v))}>
                    <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                    <SelectContent>{DURATIONS.map((d) => <SelectItem key={d} value={String(d)}>{d} min</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5"><Label>Lien Google Meet</Label><Input value={meet} onChange={(e) => setMeet(e.target.value)} /></div>
              <div className="space-y-1.5"><Label>Objet du mail</Label><Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder={mail.subject} /></div>
              <div className="space-y-1.5"><Label>Message complémentaire (facultatif)</Label><Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="Ex. : Pensez à préparer vos photos et vos textes." /></div>
              <EmailSupportOption checked={includeSupport} onChange={setIncludeSupport} />
              <div className="flex items-center gap-2">
                <Checkbox id="meet-calendar" checked={addToCalendar} onCheckedChange={(v) => setAddToCalendar(v === true)} />
                <Label htmlFor="meet-calendar" className="cursor-pointer">Ajouter le rendez-vous à l'agenda</Label>
              </div>
              {problems.length > 0 && <p className="text-sm text-destructive">À compléter : {problems.join(", ")}.</p>}
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Aperçu du mail</p>
              <p className="break-words text-xs text-muted-foreground">{mail.subject}</p>
              <iframe title="Aperçu de l'invitation visio" srcDoc={mail.html} sandbox="" className="h-[60vh] w-full rounded-lg border border-border bg-background" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={sending} onClick={() => setOpen(false)}>Annuler</Button>
            <Button disabled={problems.length > 0 || sending} onClick={send}>{sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />} Envoyer l'invitation</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CardContent>
  </Card>;
}
