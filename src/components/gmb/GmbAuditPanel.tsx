import { useMemo, useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useQueryClient } from "@tanstack/react-query";
import { ClipboardCopy, ExternalLink, Eye, History, Loader2, Save, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmailSupportOption, useEmailSupport } from "@/components/EmailSupportOption";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEmailBranding } from "@/hooks/use-email-branding";
import { useGmbAudits, useSaveGmbAudit, useUpsertClientGmb, type ClientGmbWithClient } from "@/hooks/use-client-gmb";
import {
  AUDIT_STATUS_LABELS,
  GMB_AUDIT_SECTIONS,
  auditCompletion,
  auditScoreLabel,
  computeAuditScore,
  isGoogleListingUrl,
  type AuditCriteria,
  type AuditStatus,
} from "@/lib/gmb-audit";
import { buildGmbAuditEmail, gmbReportUrl } from "@/lib/gmb-audit-email";
import { PUBLISHED_URL } from "@/lib/constants";
import { cn } from "@/lib/utils";

const STATUS_ORDER: AuditStatus[] = ["ok", "improve", "missing", "na"];
const STATUS_STYLE: Record<AuditStatus, string> = {
  ok: "border-success bg-success/15 text-success",
  improve: "border-warning bg-warning/15 text-warning",
  missing: "border-destructive bg-destructive/15 text-destructive",
  na: "border-border bg-muted text-muted-foreground",
};

export function GmbAuditPanel({ row }: { row: ClientGmbWithClient }) {
  const { user, profile } = useAuth();
  const { data: audits = [] } = useGmbAudits(row.id);
  const saveAudit = useSaveGmbAudit();
  const upsert = useUpsertClientGmb();
  const queryClient = useQueryClient();
  const { data: branding } = useEmailBranding();
  const { includeSupport, setIncludeSupport, applySupport } = useEmailSupport();
  const latest = audits[0];
  const client = row.clients;

  const [mapsUrl, setMapsUrl] = useState<string>(latest?.maps_url || row.gmb_url || "");
  const [criteria, setCriteria] = useState<AuditCriteria>(latest?.criteria || {});
  const [summary, setSummary] = useState<string>(latest?.summary || "");
  const [loadedFrom, setLoadedFrom] = useState<string | null>(latest?.id ?? null);
  const [mailOpen, setMailOpen] = useState(false);
  const [sending, setSending] = useState(false);

  // Charge la dernière analyse dès qu'elle arrive (premier affichage).
  if (latest && loadedFrom === null) {
    setLoadedFrom(latest.id);
    setMapsUrl(latest.maps_url || row.gmb_url || "");
    setCriteria(latest.criteria || {});
    setSummary(latest.summary || "");
  }

  const score = computeAuditScore(criteria);
  const completion = auditCompletion(criteria);
  const urlValid = isGoogleListingUrl(mapsUrl);
  const reportUrl = gmbReportUrl(client?.gmb_public_token);

  const setStatus = (id: string, status: AuditStatus) =>
    setCriteria((prev) => ({ ...prev, [id]: { ...prev[id], status } }));
  const setNote = (id: string, note: string) =>
    setCriteria((prev) => ({ ...prev, [id]: { ...prev[id], status: prev[id]?.status ?? "missing", note } }));

  const handleSave = async () => {
    if (!urlValid) return toast.error("Collez le lien de la fiche Google (Google Maps ou maps.app.goo.gl)");
    if (!completion.complete) return toast.error(`Évaluez tous les critères (${completion.rated}/${completion.total})`);
    const saved = await saveAudit.mutateAsync({
      client_gmb_id: row.id,
      client_id: row.client_id,
      maps_url: mapsUrl.trim(),
      criteria,
      summary: summary.trim() || null,
      created_by_name: profile?.full_name ?? user?.email ?? null,
    });
    setLoadedFrom(saved.id);
    if (!row.gmb_url) upsert.mutate({ id: row.id, client_id: row.client_id, gmb_url: mapsUrl.trim() });
    toast.success(`Analyse enregistrée — note ${saved.score}/100`);
  };

  const mail = useMemo(() => {
    if (!latest || !reportUrl || !client) return null;
    const built = buildGmbAuditEmail({
      company: client.company_name,
      managerName: client.manager_name,
      score: latest.score,
      criteria: latest.criteria,
      summary: latest.summary,
      reportUrl,
      branding: branding || undefined,
    });
    return {
      ...built,
      html: applySupport(built.html, client.support_token ? `${PUBLISHED_URL}/s/${client.support_token}` : undefined, branding || undefined),
    };
  }, [latest, reportUrl, client, branding, applySupport]);

  const send = async () => {
    if (!mail || !client?.email || sending) return;
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-brevo-campaign", {
        body: {
          action: "send_client_email",
          recipientEmail: client.email,
          recipientName: client.manager_name || client.company_name,
          subject: mail.subject,
          htmlContent: mail.html,
          trigger: "gmb_audit",
          client_id: row.client_id,
        },
      });
      if (error) {
        const response = "context" in error ? (error as any).context : null;
        const detail = response instanceof Response ? await response.json().catch(() => null) : null;
        throw new Error(detail?.error || error.message);
      }
      if (!data?.success) throw new Error(data?.error || "L'envoi n'a pas été confirmé.");
      await queryClient.invalidateQueries({ queryKey: ["client-email-history", row.client_id] });
      toast.success("Rapport envoyé au client");
      setMailOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Impossible d'envoyer le rapport.");
    } finally {
      setSending(false);
    }
  };

  const dirty = !latest || JSON.stringify(latest.criteria) !== JSON.stringify(criteria) || (latest.summary || "") !== summary || (latest.maps_url || "") !== mapsUrl;

  return (
    <div className="space-y-4">
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="space-y-3 p-4">
          <div>
            <p className="font-semibold">🔎 Analyse de la fiche Google</p>
            <p className="text-xs text-muted-foreground">
              Ouvre la fiche à partir de son lien, vérifie chaque critère un par un, puis enregistre l'analyse. Le client
              voit la note et le détail sur son lien de suivi.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="gmb-audit-url">Lien de la fiche Google</Label>
            <div className="flex flex-wrap gap-2">
              <Input
                id="gmb-audit-url"
                className="min-w-[240px] flex-1"
                placeholder="https://maps.app.goo.gl/…"
                value={mapsUrl}
                onChange={(e) => setMapsUrl(e.target.value)}
              />
              <Button asChild variant="outline" size="sm" className="h-10" disabled={!urlValid}>
                <a href={urlValid ? mapsUrl.trim() : undefined} target="_blank" rel="noopener noreferrer" aria-disabled={!urlValid}>
                  <ExternalLink className="mr-1 h-3.5 w-3.5" /> Ouvrir la fiche
                </a>
              </Button>
            </div>
            {mapsUrl && !urlValid && (
              <p className="text-xs text-destructive">Ce lien ne ressemble pas à une fiche Google (Google Maps, maps.app.goo.gl, g.page).</p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3 rounded-md bg-background/70 p-3">
            <div>
              <p className="text-2xl font-bold">{score}<span className="text-sm text-muted-foreground">/100</span></p>
              <p className="text-xs text-muted-foreground">{auditScoreLabel(score)}</p>
            </div>
            <div className="min-w-[160px] flex-1">
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-primary transition-all" style={{ width: `${score}%` }} />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {completion.rated}/{completion.total} critères évalués
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {GMB_AUDIT_SECTIONS.map((section) => (
        <Card key={section.key}>
          <CardContent className="space-y-3 p-4">
            <p className="text-sm font-semibold">{section.title}</p>
            {section.criteria.map((c) => {
              const entry = criteria[c.id];
              return (
                <div key={c.id} className="space-y-2 rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">{c.label}</p>
                    <p className="text-xs text-muted-foreground">{c.hint}</p>
                  </div>
                  <div role="radiogroup" aria-label={c.label} className="flex flex-wrap gap-1.5">
                    {STATUS_ORDER.map((s) => (
                      <button
                        key={s}
                        type="button"
                        role="radio"
                        aria-checked={entry?.status === s}
                        onClick={() => setStatus(c.id, s)}
                        className={cn(
                          "rounded-full border px-2.5 py-1 text-xs font-medium transition",
                          entry?.status === s ? STATUS_STYLE[s] : "border-border text-muted-foreground hover:bg-accent/40",
                        )}
                      >
                        {AUDIT_STATUS_LABELS[s]}
                      </button>
                    ))}
                  </div>
                  {entry?.status && entry.status !== "ok" && entry.status !== "na" && (
                    <Input
                      className="h-8 text-xs"
                      placeholder="Ce qu'il faut corriger (visible par le client)"
                      value={entry.note || ""}
                      onChange={(e) => setNote(c.id, e.target.value)}
                    />
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}

      <div className="space-y-1.5">
        <Label htmlFor="gmb-audit-summary">Recommandations pour le client</Label>
        <Textarea
          id="gmb-audit-summary"
          rows={3}
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="Ex. : ajouter 6 photos récentes et répondre aux 4 avis sans réponse."
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={handleSave} disabled={saveAudit.isPending || !dirty}>
          {saveAudit.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Enregistrer l'analyse
        </Button>
        {reportUrl && (
          <Button
            variant="outline"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(reportUrl);
                toast.success("Lien du rapport copié");
              } catch {
                toast.error("La copie du lien a échoué.");
              }
            }}
          >
            <ClipboardCopy className="mr-2 h-4 w-4" /> Copier le lien du rapport
          </Button>
        )}
        <Button variant="outline" disabled={!mail} onClick={() => setMailOpen(true)}>
          <Eye className="mr-2 h-4 w-4" /> Aperçu et envoi au client
        </Button>
      </div>
      {!latest && <p className="text-xs text-muted-foreground">Enregistrez une première analyse pour pouvoir l'envoyer au client.</p>}
      {latest && dirty && <p className="text-xs text-muted-foreground">Modifications non enregistrées : le mail envoie la dernière analyse enregistrée.</p>}
      {!client?.email && <p className="text-xs text-muted-foreground">Ajoutez une adresse email sur la fiche client pour envoyer le rapport.</p>}

      {audits.length > 0 && (
        <Card>
          <CardContent className="space-y-2 p-4">
            <p className="flex items-center gap-1.5 text-sm font-semibold"><History className="h-4 w-4" /> Historique des analyses</p>
            {audits.map((a, i) => {
              const prev = audits[i + 1];
              const diff = prev ? a.score - prev.score : null;
              return (
                <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-xs">
                  <span>
                    {format(new Date(a.created_at), "d MMM yyyy 'à' HH:mm", { locale: fr })}
                    {a.created_by_name ? ` · ${a.created_by_name}` : ""}
                  </span>
                  <span className="font-semibold">
                    {a.score}/100
                    {diff !== null && diff !== 0 && (
                      <span className={diff > 0 ? "ml-1 text-success" : "ml-1 text-destructive"}>
                        ({diff > 0 ? "+" : ""}{diff})
                      </span>
                    )}
                  </span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <Dialog open={mailOpen} onOpenChange={(v) => { if (!sending) setMailOpen(v); }}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader><DialogTitle>Aperçu · Rapport d'analyse de la fiche Google</DialogTitle></DialogHeader>
          <p className="break-words text-sm">À : {client?.email || "Adresse email manquante"}</p>
          <p className="break-words text-sm font-medium">{mail?.subject}</p>
          <EmailSupportOption checked={includeSupport} onChange={setIncludeSupport} disabled={sending} />
          {mail && <iframe title="Aperçu du mail d'analyse Google" srcDoc={mail.html} sandbox="" className="h-[50vh] w-full rounded-lg border border-border" />}
          <DialogFooter>
            <Button variant="outline" disabled={sending} onClick={() => setMailOpen(false)}>Fermer</Button>
            <Button disabled={!client?.email || !mail || sending} onClick={send}>
              {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />} Confirmer l'envoi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
