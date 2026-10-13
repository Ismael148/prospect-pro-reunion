import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEmailBranding } from "@/hooks/use-email-branding";
import { wrapInBrandedTemplate } from "@/lib/email-template";
import {
  CAMPAIGN_LABELS, CampaignStatus, FOLLOWUP_TRIGGER, campaignStatus, supportLink,
  buildReminderEmail, buildConfirmEmail, buildRescheduleEmail, buildCancelEmail,
} from "@/lib/followup";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { CalendarCheck, CalendarX, Loader2, RefreshCw, Send } from "lucide-react";

const fmt = (d?: string | Date | null) => (d ? new Date(d).toLocaleDateString("fr-FR", { timeZone: "Indian/Reunion" }) : "—");
const fmtDT = (d?: string | Date | null) =>
  d ? new Date(d).toLocaleString("fr-FR", { timeZone: "Indian/Reunion", weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }) : "—";

const STATUS_STYLE: Record<CampaignStatus, string> = {
  exclu_ticket: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  exclu_dispo: "bg-sky-500/15 text-sky-400 border-sky-500/30",
  rdv: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  a_relancer: "bg-primary/15 text-primary border-primary/30",
  attente: "bg-muted text-muted-foreground",
};
const REQ_LABEL: Record<string, string> = { en_attente: "En attente", confirme: "RDV confirmé", recale: "Recalé", annule: "Annulé" };

type Action = "confirm" | "recale" | "annule";

export default function SuiviTuning() {
  const qc = useQueryClient();
  const { data: branding } = useEmailBranding();

  const { data, isLoading } = useQuery({
    queryKey: ["suivi-tuning"],
    queryFn: async () => {
      const [clients, tickets, reqs, logs] = await Promise.all([
        supabase.from("clients").select("id, company_name, manager_name, email, support_token").eq("pack_type", "star_bizness_tuning" as any).order("company_name"),
        supabase.from("support_tickets").select("client_id, status, ticket_number").in("status", ["ouvert", "en_cours"]),
        supabase.from("followup_requests").select("*").order("created_at", { ascending: false }),
        supabase.from("email_send_log").select("created_at, metadata").eq("metadata->>trigger", FOLLOWUP_TRIGGER).order("created_at", { ascending: false }),
      ]);
      if (clients.error) throw clients.error;
      return { clients: clients.data || [], tickets: (tickets.data || []) as any[], reqs: (reqs.data || []) as any[], logs: (logs.data || []) as any[] };
    },
  });

  const rows = useMemo(() => {
    if (!data) return [];
    return data.clients.map((c: any) => {
      const ticket = data.tickets.find((t) => t.client_id === c.id);
      const reqs = data.reqs.filter((r) => r.client_id === c.id);
      const pending = reqs.find((r) => r.status === "en_attente");
      const rdv = reqs.filter((r) => r.status === "confirme" && r.rdv_at).map((r) => new Date(r.rdv_at)).sort((a, b) => b.getTime() - a.getTime())[0] || null;
      const last = data.logs.find((l) => l.metadata?.client_id === c.id);
      const lastReminder = last ? new Date(last.created_at) : null;
      const st = campaignStatus({ hasOpenTicket: !!ticket, hasPendingRequest: !!pending, nextRdv: rdv, lastReminder });
      const lastAction = ticket ? `Ticket ${ticket.ticket_number || ""} ouvert` : pending ? "Formulaire dispo soumis" : rdv ? "Visio confirmée" : reqs[0] ? REQ_LABEL[reqs[0].status] : "Aucun retour";
      const nextAction = st.status === "exclu_ticket" ? "Traité par l'agent support" : st.status === "exclu_dispo" ? "En attente validation admin"
        : st.status === "rdv" ? `RDV prévu ${fmtDT(rdv)}` : st.status === "a_relancer" ? "Relance à envoyer" : `Prochaine relance le ${fmt(st.nextSend)}`;
      return { c, status: st.status, lastReminder, lastAction, nextAction };
    });
  }, [data]);

  // ---- campagne
  const [selected, setSelected] = useState<string[]>([]);
  const [campaignOpen, setCampaignOpen] = useState(false);
  const [sendingCampaign, setSendingCampaign] = useState(false);
  const toRelance = rows.filter((r) => r.status === "a_relancer");
  const selectedRows = rows.filter((r) => selected.includes(r.c.id));
  const sample = selectedRows[0] ? buildReminderEmail(selectedRows[0].c.manager_name || selectedRows[0].c.company_name, selectedRows[0].c.support_token) : null;

  const send = (c: any, subject: string, body: string, trigger: string) =>
    supabase.functions.invoke("send-brevo-campaign", {
      body: {
        action: "send_client_email", recipientEmail: c.email, recipientName: c.manager_name || c.company_name,
        subject, htmlContent: wrapInBrandedTemplate(body, supportLink(c.support_token) || undefined, branding || undefined),
        trigger, client_id: c.id,
      },
    });

  const sendCampaign = async () => {
    setSendingCampaign(true);
    let ok = 0, ko = 0;
    for (const r of selectedRows) {
      if (!r.c.email) { ko++; continue; }
      const e = buildReminderEmail(r.c.manager_name || r.c.company_name, r.c.support_token);
      const { error } = await send(r.c, e.subject, e.body, FOLLOWUP_TRIGGER);
      error ? ko++ : ok++;
    }
    setSendingCampaign(false);
    setCampaignOpen(false);
    setSelected([]);
    toast[ko ? "warning" : "success"](`${ok} relance(s) envoyée(s)${ko ? `, ${ko} échec(s) (email manquant ou invalide)` : ""}`);
    qc.invalidateQueries({ queryKey: ["suivi-tuning"] });
  };

  // ---- actions demandes
  const [act, setAct] = useState<{ type: Action; req: any } | null>(null);
  const [rdvAt, setRdvAt] = useState("");
  const [meet, setMeet] = useState("");
  const [extra, setExtra] = useState("");
  const [subject, setSubject] = useState("");
  const [busy, setBusy] = useState(false);
  const actClient = act ? data?.clients.find((c: any) => c.id === act.req.client_id) : null;
  const actName = actClient ? actClient.manager_name || act?.req.contact_name || actClient.company_name : "";

  const actEmail = useMemo(() => {
    if (!act || !actClient) return null;
    if (act.type === "confirm") return buildConfirmEmail(actName, rdvAt ? fmtDT(new Date(rdvAt + ":00+04:00")) : "[date à choisir]", meet || "https://meet.google.com/…", extra);
    if (act.type === "recale") return buildRescheduleEmail(actName, actClient.support_token, extra);
    return buildCancelEmail(actName, extra);
  }, [act, actClient, actName, rdvAt, meet, extra]);

  const openAct = (type: Action, req: any) => {
    setAct({ type, req }); setRdvAt(""); setMeet(req.meet_link || ""); setExtra("");
    setSubject(type === "confirm" ? buildConfirmEmail("", "", "").subject : type === "recale" ? buildRescheduleEmail("").subject : buildCancelEmail("").subject);
  };

  const confirmAct = async () => {
    if (!act || !actClient || !actEmail) return;
    if (!actClient.email) return toast.error("Ce client n'a pas d'email");
    if (act.type === "confirm" && (!rdvAt || !/^https:\/\/meet\.google\.com\//.test(meet.trim()))) return toast.error("Choisissez la date et collez un lien Google Meet valide");
    setBusy(true);
    const { error } = await send(actClient, subject, actEmail.body, `followup_${act.type}`);
    if (error) { setBusy(false); return toast.error(error.message || "Erreur d'envoi"); }
    const { data: u } = await supabase.auth.getUser();
    await supabase.from("followup_requests").update({
      status: act.type === "confirm" ? "confirme" : act.type === "recale" ? "recale" : "annule",
      rdv_at: act.type === "confirm" ? new Date(rdvAt + ":00+04:00").toISOString() : act.req.rdv_at,
      meet_link: act.type === "confirm" ? meet.trim() : act.req.meet_link,
      handled_by: u.user?.id ?? null, handled_at: new Date().toISOString(),
    }).eq("id", act.req.id);
    setBusy(false); setAct(null);
    toast.success("Mail envoyé et dossier mis à jour");
    qc.invalidateQueries({ queryKey: ["suivi-tuning"] });
  };

  const preview = (body: string) => wrapInBrandedTemplate(body, undefined, branding || undefined);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Suivi & Relance Chip Tuning</h1>
        <p className="text-muted-foreground text-sm">Relance tous les 15 jours, exclusion automatique et gestion des demandes de visio.</p>
      </div>

      <Tabs defaultValue="campagne">
        <TabsList>
          <TabsTrigger value="campagne">Campagne ({toRelance.length} à relancer)</TabsTrigger>
          <TabsTrigger value="demandes">Demandes de dispo ({data?.reqs.filter((r) => r.status === "en_attente").length || 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="campagne">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
              <CardTitle className="text-lg">Clients Chip Tuning</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setSelected(toRelance.map((r) => r.c.id))}>Sélectionner les clients à relancer</Button>
                <Button size="sm" disabled={!selected.length} onClick={() => setCampaignOpen(true)}><Send className="w-4 h-4 mr-1" />Relire & envoyer ({selected.length})</Button>
              </div>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                <table className="w-full text-sm">
                  <thead className="text-left text-muted-foreground border-b border-border">
                    <tr><th className="p-2 w-8" /><th className="p-2">Client</th><th className="p-2">Statut campagne</th><th className="p-2">Dernière relance</th><th className="p-2">Dernier retour</th><th className="p-2">Prochaine action</th></tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.c.id} className="border-b border-border/50">
                        <td className="p-2"><Checkbox disabled={r.status.startsWith("exclu") || r.status === "rdv"} checked={selected.includes(r.c.id)}
                          onCheckedChange={(v) => setSelected((s) => (v ? [...s, r.c.id] : s.filter((x) => x !== r.c.id)))} /></td>
                        <td className="p-2 font-medium">{r.c.company_name}{!r.c.email && <span className="block text-xs text-destructive">Pas d'email</span>}</td>
                        <td className="p-2"><Badge variant="outline" className={STATUS_STYLE[r.status]}>{CAMPAIGN_LABELS[r.status]}</Badge></td>
                        <td className="p-2">{fmt(r.lastReminder)}</td>
                        <td className="p-2">{r.lastAction}</td>
                        <td className="p-2">{r.nextAction}</td>
                      </tr>
                    ))}
                    {!rows.length && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Aucun client Chip Tuning</td></tr>}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="demandes">
          <Card>
            <CardHeader><CardTitle className="text-lg">Historique des demandes</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {(data?.reqs || []).map((r) => {
                const c = data?.clients.find((x: any) => x.id === r.client_id);
                return (
                  <div key={r.id} className="rounded-lg border border-border p-4 flex flex-col md:flex-row md:items-center gap-3 justify-between">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold">{c?.company_name || "Client"}</span>
                        <Badge variant="outline">{REQ_LABEL[r.status]}</Badge>
                        <span className="text-xs text-muted-foreground">reçu le {fmtDT(r.created_at)}</span>
                      </div>
                      <p className="text-sm"><span className="text-muted-foreground">Créneaux : </span>{r.slots}</p>
                      {r.message && <p className="text-sm text-muted-foreground">{r.message}</p>}
                      {r.status === "confirme" && <p className="text-sm text-emerald-400">RDV {fmtDT(r.rdv_at)}</p>}
                    </div>
                    {r.status !== "annule" && (
                      <div className="flex gap-2 shrink-0">
                        <Button size="sm" onClick={() => openAct("confirm", r)}><CalendarCheck className="w-4 h-4 mr-1" />Confirmer RDV</Button>
                        <Button size="sm" variant="outline" onClick={() => openAct("recale", r)}><RefreshCw className="w-4 h-4 mr-1" />Recaler</Button>
                        <Button size="sm" variant="outline" onClick={() => openAct("annule", r)}><CalendarX className="w-4 h-4 mr-1" />Annuler</Button>
                      </div>
                    )}
                  </div>
                );
              })}
              {!data?.reqs.length && <p className="text-center text-muted-foreground py-6">Aucune demande pour le moment</p>}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={campaignOpen} onOpenChange={setCampaignOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Relance à {selectedRows.length} client(s)</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">{selectedRows.map((r) => r.c.company_name).join(", ")}</p>
          {sample && <><p className="text-sm"><strong>Objet :</strong> {sample.subject}</p>
            <iframe title="aperçu" srcDoc={preview(sample.body)} className="w-full h-[460px] rounded border border-border bg-white" /></>}
          <DialogFooter><Button onClick={sendCampaign} disabled={sendingCampaign}>{sendingCampaign && <Loader2 className="w-4 h-4 animate-spin mr-2" />}Confirmer l'envoi</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!act} onOpenChange={(o) => !o && setAct(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{act?.type === "confirm" ? "Confirmer le RDV" : act?.type === "recale" ? "Recaler / Re-demander" : "Annuler la demande"}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <p className="text-sm"><strong>Destinataire :</strong> {actClient?.email || "—"}</p>
            <div><Label>Objet</Label><Input value={subject} onChange={(e) => setSubject(e.target.value)} /></div>
            {act?.type === "confirm" && (
              <div className="grid sm:grid-cols-2 gap-3">
                <div><Label>Date et heure (La Réunion)</Label><Input type="datetime-local" value={rdvAt} onChange={(e) => setRdvAt(e.target.value)} /></div>
                <div><Label>Lien Google Meet</Label><Input value={meet} onChange={(e) => setMeet(e.target.value)} placeholder="https://meet.google.com/abc-defg-hij" /></div>
              </div>
            )}
            <div><Label>{act?.type === "annule" ? "Motif de l'annulation" : "Note personnalisée (facultatif)"}</Label>
              <Textarea value={extra} onChange={(e) => setExtra(e.target.value)} rows={3} /></div>
            {actEmail && <iframe title="aperçu" srcDoc={preview(actEmail.body)} className="w-full h-[420px] rounded border border-border bg-white" />}
          </div>
          <DialogFooter><Button onClick={confirmAct} disabled={busy}>{busy && <Loader2 className="w-4 h-4 animate-spin mr-2" />}Envoyer le mail au client</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
