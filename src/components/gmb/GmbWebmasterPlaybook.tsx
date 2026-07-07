import { useState } from "react";
import { CheckCircle2, ExternalLink, Lightbulb, AlertTriangle, Clock, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { GMB_PLAYBOOK, computePhaseProgress, type GmbPlaybookPhase } from "@/lib/gmb-playbook";
import { useUpsertClientGmb, type ClientGmbWithClient } from "@/hooks/use-client-gmb";
import { useCreateGmbActivity } from "@/hooks/use-gmb-activities";
import { GmbAiAssistant } from "./GmbAiAssistant";

interface Props {
  row: ClientGmbWithClient;
}

export function GmbWebmasterPlaybook({ row }: Props) {
  const upsert = useUpsertClientGmb();
  const createActivity = useCreateGmbActivity();
  const [openPhase, setOpenPhase] = useState<string>("creation");

  const gbpUrl = (template?: string) => {
    if (!template) return null;
    if (template.includes("{locationId}")) {
      if (!row.gmb_location_id) return "https://business.google.com";
      return template.replace("{locationId}", row.gmb_location_id);
    }
    return template;
  };

  const toggleCheck = async (key: string, checked: boolean, stepTitle: string) => {
    await upsert.mutateAsync({
      id: row.id,
      client_id: row.client_id,
      [key]: checked,
    } as any);
    if (checked) {
      createActivity.mutate({
        client_gmb_id: row.id,
        client_id: row.client_id,
        action_type: "checklist_maj",
        description: `✅ ${stepTitle}`,
        visible_to_client: true,
      });
    }
  };

  return (
    <div className="space-y-4">
      <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent p-4">
        <div className="flex items-start gap-3">
          <div className="text-2xl">🎯</div>
          <div className="flex-1">
            <h3 className="font-bold">Guide Webmaster GMB</h3>
            <p className="text-sm text-muted-foreground">
              Chaque étape cochée est loggée dans le journal et visible par le client.
              Suis les 4 phases dans l'ordre pour une fiche performante.
            </p>
          </div>
        </div>
      </Card>

      {GMB_PLAYBOOK.map((phase) => {
        const progress = computePhaseProgress(phase, row as any);
        const isOpen = openPhase === phase.key;
        return (
          <Card key={phase.key} className="overflow-hidden">
            <button
              onClick={() => setOpenPhase(isOpen ? "" : phase.key)}
              className="flex w-full items-center gap-4 p-4 text-left transition hover:bg-accent/40"
            >
              <span className="text-2xl">{phase.emoji}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold">{phase.title}</h4>
                  {progress.total > 0 && (
                    <span className="text-xs font-semibold text-muted-foreground">
                      {progress.done}/{progress.total}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{phase.description}</p>
                {progress.total > 0 && (
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-primary/70 transition-all"
                      style={{ width: `${progress.pct}%` }}
                    />
                  </div>
                )}
              </div>
              <ChevronDown className={`h-4 w-4 shrink-0 transition ${isOpen ? "rotate-180" : ""}`} />
            </button>

            {isOpen && (
              <div className="space-y-3 border-t bg-muted/20 p-4">
                {phase.steps.map((step, idx) => {
                  const checked = step.checklistKey
                    ? Boolean((row as any)[step.checklistKey])
                    : false;
                  const link = gbpUrl(step.linkTemplate);
                  return (
                    <div
                      key={step.id}
                      className="flex gap-3 rounded-lg border bg-background p-3 shadow-sm"
                    >
                      <div className="flex flex-col items-center gap-1">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                          {idx + 1}
                        </span>
                        {step.checklistKey && (
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(v) =>
                              toggleCheck(step.checklistKey!, Boolean(v), step.title)
                            }
                          />
                        )}
                      </div>
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold">
                            {step.title}
                            {checked && (
                              <CheckCircle2 className="ml-1.5 inline h-3.5 w-3.5 text-emerald-500" />
                            )}
                          </p>
                          {step.eta && (
                            <span className="flex shrink-0 items-center gap-1 text-[10px] text-muted-foreground">
                              <Clock className="h-3 w-3" /> {step.eta} min
                            </span>
                          )}
                        </div>
                        <p className="text-xs leading-relaxed text-muted-foreground">
                          {step.description}
                        </p>
                        {step.tip && (
                          <div className="flex gap-1.5 rounded-md bg-blue-500/10 p-2 text-[11px] text-blue-700 dark:text-blue-300">
                            <Lightbulb className="h-3 w-3 shrink-0 mt-0.5" />
                            <span>
                              <strong>Astuce :</strong> {step.tip}
                            </span>
                          </div>
                        )}
                        {step.warning && (
                          <div className="flex gap-1.5 rounded-md bg-amber-500/10 p-2 text-[11px] text-amber-800 dark:text-amber-200">
                            <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />
                            <span>
                              <strong>Attention :</strong> {step.warning}
                            </span>
                          </div>
                        )}
                        {link && (
                          <Button asChild size="sm" variant="outline" className="h-7 text-xs">
                            <a href={link} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="mr-1 h-3 w-3" />
                              {step.linkLabel || "Ouvrir"}
                            </a>
                          </Button>
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
