import { CheckCircle2, ExternalLink, Lightbulb, AlertCircle } from "lucide-react";

export interface BeginnerStep {
  title: string;
  description: string;
  link?: string;
  tip?: string;
  warning?: string;
  substeps?: string[];
}

interface Props {
  title?: string;
  intro?: string;
  steps: BeginnerStep[];
  accentColor?: string;
}

export function BeginnerGuide({ title = "Guide pas-à-pas pour débutants", intro, steps, accentColor = "#ff006e" }: Props) {
  return (
    <div className="rounded-2xl border bg-gradient-to-br from-background to-primary/5 p-5 md:p-6">
      <div className="flex items-center gap-2 mb-2">
        <Lightbulb className="h-5 w-5" style={{ color: accentColor }} />
        <h3 className="font-bold text-foreground">{title}</h3>
      </div>
      {intro && <p className="text-sm text-muted-foreground mb-4">{intro}</p>}

      <ol className="space-y-4">
        {steps.map((step, i) => (
          <li key={i} className="relative pl-12 group">
            {/* Number bubble */}
            <span
              className="absolute left-0 top-0 flex h-9 w-9 items-center justify-center rounded-full text-white font-bold text-sm shadow-md"
              style={{ background: accentColor }}
            >
              {i + 1}
            </span>
            {/* Vertical connector line */}
            {i < steps.length - 1 && (
              <span
                className="absolute left-[17px] top-9 bottom-[-16px] w-0.5 opacity-30"
                style={{ background: accentColor }}
              />
            )}

            <div className="space-y-2">
              <h4 className="font-semibold text-foreground">{step.title}</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>

              {step.substeps && step.substeps.length > 0 && (
                <ul className="mt-2 space-y-1.5 pl-1">
                  {step.substeps.map((s, j) => (
                    <li key={j} className="flex gap-2 text-xs text-muted-foreground">
                      <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0 text-success" />
                      <span dangerouslySetInnerHTML={{ __html: s }} />
                    </li>
                  ))}
                </ul>
              )}

              {step.tip && (
                <div className="flex gap-2 rounded-lg bg-info/10 border border-info/20 p-2.5 text-xs text-info">
                  <Lightbulb className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  <span><strong>Astuce :</strong> {step.tip}</span>
                </div>
              )}

              {step.warning && (
                <div className="flex gap-2 rounded-lg bg-warning/10 border border-warning/20 p-2.5 text-xs text-warning-foreground">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  <span><strong>Attention :</strong> {step.warning}</span>
                </div>
              )}

              {step.link && (
                <a
                  href={step.link}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium hover:underline"
                  style={{ color: accentColor }}
                >
                  <ExternalLink className="h-3 w-3" /> Ouvrir le site
                </a>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
