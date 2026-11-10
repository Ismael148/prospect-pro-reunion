import { useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CheckCircle2, Circle, ExternalLink, Lightbulb, AlertTriangle, Clock, ChevronDown, StickyNote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { GMB_PLAYBOOK, type GmbPlaybookPhase, type GmbPlaybookStep } from "@/lib/gmb-playbook";
import { computeStepsProgress, getStepEntry, isRecurringPhase, reunionMonth, stepKey } from "@/lib/gmb-steps";
import { useToggleGmbStep, type ClientGmbWithClient } from "@/hooks/use-client-gmb";
import { useCreateGmbActivity } from "@/hooks/use-gmb-activities";
import { useAuth } from "@/contexts/AuthContext";
import { GmbAiAssistant } from "./GmbAiAssistant";

interface Props {
  row: ClientGmbWithClient;
}

const monthLabel = (month: string) =>
  format(new Date(`${month}-01T12:00:00`), "MMMM yyyy", { locale: fr });

export function GmbWebmasterPlaybook({ row }: Props) {
  const toggle = useToggleGmbStep();
  const createActivity = useCreateGmbActivity();
  const { user, profile } = useAuth();
  const [openPhase, setOpenPhase] = useState<string>("creation");
  const [noteOpen, setNoteOpen] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const month = reunionMonth();

  const gbpUrl = (template?: string) => {
    if (!template) return null;
    if (template.includes("{locationId}")) {
      if (!row.gmb_location_id) return "https://business.google.com";
      return template.replace("{locationId}", row.gmb_location_id);
    }
    return template;
  };

  const who = { id: user?.id ?? null, name: profile?.full_name ?? user?.email ?? null };

  const setDone = async (phase: GmbPlaybookPhase, step: GmbPlaybookStep, done: boolean) => {
    await toggle.mutateAsync({
      id: row.id,
      key: stepKey(phase, step, month),
      done,
      checklistKey: isRecurringPhase(phase) ? undefined : step.checklistKey,
      who,
    });
    if (done) {
      createActivity.mutate({
        client_gmb_id: row.id,
        client_id: row.client_id,
        action_type: "checklist_maj",
        description: `✅ ${step.title}${isRecurringPhase(phase) ? ` (${monthLabel(month)})` : ""}`,
        visible_to_client: true,
      });
    }
  };

  const saveNote = async (phase: GmbPlaybookPhase, step: GmbPlaybookStep) => {
    const entry = getStepEntry(phase, step, row, month);
    await toggle.mutateAsync({
      id: row.id,
      key: stepKey(phase, step, month),
      done: Boolean(entry?.done),
      checklistKey: isRecurringPhase(phase) ? undefined : step.checklistKey,
      who,
      note: noteDraft.trim() || null,
    });
    setNoteOpen(null);
  };

  return (
    <div className="space-y-4">
      <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent p-4">
        <div className="flex items-start gap-3">
          <div className="text-2xl">🎯</div>
          <div className="flex-1">
            <h3 className="font-bold">Guide Webmaster GMB</h3>
            <p className="text-sm text-muted-foreground">
              Coche chaque étape une fois vérifiée sur la fiche : la date et ton nom sont enregistrés, et le client voit
              l'avancement sur son lien. L'entretien mensuel repart à zéro chaque mois.
            </p>
          </div>
          <GmbAiAssistant row={row} />
        </div>
      </Card>

      {GMB_PLAYBOOK.map((phase) => {
        const progress = computeStepsProgress([phase], row, month);
        const isOpen = openPhase === phase.key;
        const recurring = isRecurringPhase(phase);
        return (
          <Card key={phase.key} className="overflow-hidden">
            <button
              onClick={() => setOpenPhase(isOpen ? "" : phase.key)}
              className="flex w-full items-center gap-4 p-4 text-left transition hover:bg-accent/40"
            >
              <span className="text-2xl">{phase.emoji}</span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="font-semibold">{phase.title}</h4>
                  <span className="text-xs font-semibold text-muted-foreground">
                    {progress.done}/{progress.total}
                  </span>
                  {recurring && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold capitalize text-primary">
                      {monthLabel(month)}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{phase.description}</p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-primary/70 transition-all"
                    style={{ width: `${progress.pct}%` }}
                  />
                </div>
              </div>
              <ChevronDown className={`h-4 w-4 shrink-0 transition ${isOpen ? "rotate-180" : ""}`} />
            </button>

            {isOpen && (
              <div className="space-y-3 border-t bg-muted/20 p-4">
                {phase.steps.map((step, idx) => {
                  const entry = getStepEntry(phase, step, row, month);
                  const checked = Boolean(entry?.done);
                  const link = gbpUrl(step.linkTemplate);
                  const key = stepKey(phase, step, month);
                  return (
                    <div
                      key={step.id}
                      className={`flex gap-3 rounded-lg border bg-background p-3 shadow-sm ${checked ? "border-success/40" : ""}`}
                    >
                      <div className="flex flex-col items-center gap-1.5">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                          {idx + 1}
                        </span>
                        <Checkbox
                          aria-label={`Étape faite : ${step.title}`}
                          checked={checked}
                          disabled={toggle.isPending}
                          onCheckedChange={(v) => setDone(phase, step, Boolean(v))}
                        />
                      </div>
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold">{step.title}</p>
                          {step.eta && (
                            <span className="flex shrink-0 items-center gap-1 text-[10px] text-muted-foreground">
                              <Clock className="h-3 w-3" /> {step.eta} min
                            </span>
                          )}
                        </div>
                        <p className={`flex items-center gap-1 text-[11px] font-medium ${checked ? "text-success" : "text-muted-foreground"}`}>
                          {checked ? <CheckCircle2 className="h-3 w-3" /> : <Circle className="h-3 w-3" />}
                          {checked
                            ? entry?.at
                              ? `Fait le ${format(new Date(entry.at), "d MMM yyyy 'à' HH:mm", { locale: fr })}${entry.by_name ? ` par ${entry.by_name}` : ""}`
                              : "Fait"
                            : "Pas encore fait"}
                        </p>
                        <p className="text-xs leading-relaxed text-muted-foreground">{step.description}</p>
                        {step.tip && (
                          <div className="flex gap-1.5 rounded-md bg-primary/5 p-2 text-[11px] text-foreground/80">
                            <Lightbulb className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
                            <span>
                              <strong>Astuce :</strong> {step.tip}
                            </span>
                          </div>
                        )}
                        {step.warning && (
                          <div className="flex gap-1.5 rounded-md bg-warning/10 p-2 text-[11px] text-foreground/80">
                            <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-warning" />
                            <span>
                              <strong>Attention :</strong> {step.warning}
                            </span>
                          </div>
                        )}
                        {entry?.note && noteOpen !== key && (
                          <p className="rounded-md bg-muted/60 p-2 text-[11px] text-foreground/80">
                            <StickyNote className="mr-1 inline h-3 w-3" /> {entry.note}
                          </p>
                        )}
                        {noteOpen === key ? (
                          <div className="space-y-2">
                            <Textarea
                              rows={2}
                              value={noteDraft}
                              onChange={(e) => setNoteDraft(e.target.value)}
                              placeholder="Note interne : ce qui a été vérifié, ce qui manque…"
                            />
                            <div className="flex gap-2">
                              <Button size="sm" className="h-7 text-xs" disabled={toggle.isPending} onClick={() => saveNote(phase, step)}>
                                Enregistrer la note
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setNoteOpen(null)}>
                                Annuler
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {link && (
                              <Button asChild size="sm" variant="outline" className="h-7 text-xs">
                                <a href={link} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="mr-1 h-3 w-3" />
                                  {step.linkLabel || "Ouvrir"}
                                </a>
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs"
                              onClick={() => {
                                setNoteDraft(entry?.note || "");
                                setNoteOpen(key);
                              }}
                            >
                              <StickyNote className="mr-1 h-3 w-3" /> {entry?.note ? "Modifier la note" : "Ajouter une note"}
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
