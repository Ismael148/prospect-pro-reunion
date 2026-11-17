import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, Eye, Loader2, MailCheck, MousePointerClick, RefreshCw, Send, TriangleAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  clickedLinks, EMAIL_TYPE_LABELS, summarizeTracking, TRACKING_STATUS, type TrackedEmail,
} from "@/lib/email-tracking";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

const TONE: Record<string, string> = {
  muted: "border-border bg-muted text-muted-foreground",
  info: "border-info/30 bg-info/10 text-info",
  success: "border-success/30 bg-success/10 text-success",
  primary: "border-primary/30 bg-primary/10 text-primary",
  danger: "border-destructive/30 bg-destructive/10 text-destructive",
};
const fmt = (d: string | null) => (d ? new Date(d).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Indian/Reunion" }) : "—");

export function TrackingBadge({ email }: { email: Pick<TrackedEmail, "status" | "open_count" | "click_count"> }) {
  const s = TRACKING_STATUS[email.status] || TRACKING_STATUS.sent;
  const extra = email.click_count ? ` · ${email.click_count} clic${email.click_count > 1 ? "s" : ""}` : email.open_count ? ` · ${email.open_count}×` : "";
  return <Badge variant="outline" className={`whitespace-nowrap text-[10px] ${TONE[s.tone]}`}>{s.label}{extra}</Badge>;
}

/** Tracking of every email sent to the given clients; refreshed from the email service when the page opens. */
export function useDecollageTracking(clientIds: string[]) {
  const queryClient = useQueryClient();
  const key = clientIds.slice().sort().join(",");
  const query = useQuery({
    queryKey: ["decollage-tracking", key],
    enabled: clientIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.from("email_tracking").select("*").in("client_id", clientIds).order("sent_at", { ascending: false }).limit(500);
      if (error) throw error;
      return (data || []) as TrackedEmail[];
    },
  });
  const sync = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("send-brevo-campaign", { body: { action: "sync_tracking", client_ids: clientIds } });
      if (error) {
        const response = "context" in error ? (error as any).context : null;
        const detail = response instanceof Response ? await response.json().catch(() => null) : null;
        throw new Error(detail?.error || error.message);
      }
      if (!data?.success) throw new Error(data?.error || "Actualisation impossible");
      return data as { synced: number; total: number };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["decollage-tracking"] }),
  });
  const synced = useRef("");
  useEffect(() => {
    if (!key || synced.current === key) return;
    synced.current = key;
    sync.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return { emails: query.data || [], isLoading: query.isLoading, sync };
}

export default function DecollageEmailTracking({ tracking, clientNames }: {
  tracking: ReturnType<typeof useDecollageTracking>;
  clientNames: Record<string, string>;
}) {
  const { emails, isLoading, sync } = tracking;
  const [showAll, setShowAll] = useState(false);
  const summary = useMemo(() => summarizeTracking(emails), [emails]);
  const lastSync = emails.reduce<string | null>((m, e) => (!m || e.last_synced_at > m ? e.last_synced_at : m), null);
  const visible = showAll ? emails : emails.slice(0, 8);

  const stats = [
    { label: "Envoyés", value: summary.sent, icon: Send },
    { label: "Délivrés", value: summary.delivered, icon: MailCheck },
    { label: "Ouverts", value: summary.opened, icon: Eye },
    { label: "Cliqués", value: summary.clicked, icon: MousePointerClick },
    { label: "Taux d'ouverture", value: summary.openRate === null ? "—" : `${summary.openRate} %`, icon: Eye, highlight: true },
    { label: "Taux de clic", value: summary.clickRate === null ? "—" : `${summary.clickRate} %`, icon: MousePointerClick, highlight: true },
  ];

  return (
    <Card className="border-0 shadow-md shadow-primary/5">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 pb-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-base"><MailCheck className="h-5 w-5 text-primary" /> Suivi des mails envoyés</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Tous les mails envoyés aux clients Décollage (90 derniers jours){lastSync ? ` · actualisé le ${fmt(lastSync)}` : ""}
          </p>
        </div>
        <Button size="sm" variant="outline" disabled={sync.isPending}
          onClick={() => sync.mutate(undefined, { onSuccess: () => toast.success("Suivi actualisé"), onError: (e: any) => toast.error("Suivi : " + e.message) })}>
          {sync.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />} Actualiser
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {stats.map((s) => (
            <div key={s.label} className={`rounded-lg border px-3 py-2 ${s.highlight ? "border-primary/20 bg-primary/5" : "border-border/60 bg-muted/20"}`}>
              <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><s.icon className="h-3.5 w-3.5" /> {s.label}</p>
              <p className={`text-xl font-bold ${s.highlight ? "text-primary" : ""}`}>{s.value}</p>
            </div>
          ))}
        </div>
        {summary.failed > 0 && (
          <p className="flex items-center gap-2 text-xs text-destructive"><TriangleAlert className="h-4 w-4" /> {summary.failed} mail{summary.failed > 1 ? "s" : ""} non délivré{summary.failed > 1 ? "s" : ""} : vérifiez l'adresse du client.</p>
        )}

        {isLoading || (sync.isPending && !emails.length) ? (
          <div className="flex justify-center p-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : !emails.length ? (
          <p className="p-4 text-center text-sm text-muted-foreground">Aucun mail suivi pour le moment. Envoyez une présentation pour commencer.</p>
        ) : (
          <>
            <div className="overflow-x-auto rounded-lg border border-border/60">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Envoyé le</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Mail</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Ouvertures</TableHead>
                    <TableHead>Clics</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visible.map((e) => {
                    const links = clickedLinks(e.clicked_links);
                    return (
                      <TableRow key={e.message_id} className="align-top text-xs">
                        <TableCell className="whitespace-nowrap">{fmt(e.sent_at)}</TableCell>
                        <TableCell>
                          <div className="font-medium">{(e.client_id && clientNames[e.client_id]) || "—"}</div>
                          <div className="text-muted-foreground">{e.recipient_email}</div>
                        </TableCell>
                        <TableCell className="max-w-[260px]">
                          <div className="font-medium">{EMAIL_TYPE_LABELS[e.template_name || ""] || e.template_name || "Mail"}</div>
                          <div className="truncate text-muted-foreground" title={e.subject || ""}>{e.subject}</div>
                        </TableCell>
                        <TableCell>
                          <TrackingBadge email={e} />
                          {e.failure_reason && <div className="mt-1 text-destructive">{e.failure_reason}</div>}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {e.open_count ? <><div className="font-medium">{e.open_count}×</div><div className="text-muted-foreground">1re : {fmt(e.first_opened_at)}</div>{e.open_count > 1 && <div className="text-muted-foreground">Dern. : {fmt(e.last_opened_at)}</div>}</> : <span className="text-muted-foreground">Pas encore</span>}
                        </TableCell>
                        <TableCell className="max-w-[200px]">
                          {e.click_count ? (
                            <>
                              <div className="font-medium">{e.click_count}×</div><div className="whitespace-nowrap text-muted-foreground">Dern. : {fmt(e.last_clicked_at)}</div>
                              {links.map((l) => <a key={l} href={l} target="_blank" rel="noreferrer" className="block truncate text-primary hover:underline" title={l}>{l.replace(/^https?:\/\//, "")}</a>)}
                            </>
                          ) : <span className="text-muted-foreground">Aucun</span>}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            {emails.length > 8 && (
              <Button variant="ghost" size="sm" className="w-full" onClick={() => setShowAll(!showAll)}>
                {showAll ? <><ChevronUp className="mr-2 h-4 w-4" /> Réduire</> : <><ChevronDown className="mr-2 h-4 w-4" /> Voir les {emails.length} mails</>}
              </Button>
            )}
            <p className="text-[11px] text-muted-foreground">
              Les ouvertures sont détectées quand les images du mail s'affichent : un client qui bloque les images peut lire le mail sans être compté.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
