import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { INVOICE_TEMPLATES, type InvoiceTemplateId } from "@/lib/invoice-templates";
import signatureImg from "@/assets/invoice-templates/signature.jpg";
import epureImg from "@/assets/invoice-templates/epure.jpg";
import prestigeImg from "@/assets/invoice-templates/prestige.jpg";
import auroreImg from "@/assets/invoice-templates/aurore.jpg";

const THUMBS: Record<InvoiceTemplateId, string> = {
  signature: signatureImg,
  epure: epureImg,
  prestige: prestigeImg,
  aurore: auroreImg,
};

interface Props {
  value: InvoiceTemplateId;
  onChange: (id: InvoiceTemplateId) => void;
}

export function InvoiceTemplatePicker({ value, onChange }: Props) {
  return (
    <div role="radiogroup" aria-label="Modèle de facture" className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {INVOICE_TEMPLATES.map((t) => {
        const selected = t.id === value;
        return (
          <button
            key={t.id}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={`Modèle ${t.name}`}
            onClick={() => onChange(t.id)}
            className={cn(
              "group relative rounded-lg border p-2 text-left transition-all",
              selected ? "border-primary ring-2 ring-primary/40 bg-primary/5" : "border-border/60 hover:border-primary/40",
            )}
          >
            <div className="overflow-hidden rounded-md border border-border/40">
              <img
                src={THUMBS[t.id]}
                alt={`Aperçu du modèle ${t.name}`}
                loading="lazy"
                className="w-full aspect-[210/297] object-cover object-top transition-transform group-hover:scale-[1.03]"
              />
            </div>
            <div className="mt-2 flex items-center justify-between gap-1">
              <span className="text-sm font-semibold">{t.name}</span>
              {selected && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Check className="h-3 w-3" />
                </span>
              )}
            </div>
            <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{t.description}</p>
          </button>
        );
      })}
    </div>
  );
}
