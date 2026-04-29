import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { HelpCircle } from "lucide-react";

export interface FAQItem {
  q: string;
  a: string;
}

interface Props {
  title?: string;
  items: FAQItem[];
  className?: string;
}

export function TutoFAQ({ title = "Questions fréquentes", items, className = "" }: Props) {
  if (!items?.length) return null;
  return (
    <section className={`max-w-3xl mx-auto ${className}`}>
      <div className="flex items-center gap-2 mb-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
          <HelpCircle className="h-5 w-5 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">{title}</h2>
      </div>
      <Accordion
        type="single"
        collapsible
        className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden divide-y divide-border"
      >
        {items.map((it, i) => (
          <AccordionItem key={i} value={`faq-${i}`} className="border-0 px-5">
            <AccordionTrigger className="text-left text-base font-semibold text-foreground hover:no-underline hover:text-primary py-5 [&[data-state=open]]:text-primary">
              {it.q}
            </AccordionTrigger>
            <AccordionContent className="text-[15px] text-foreground/80 leading-relaxed pb-5">
              <div
                className="space-y-2 [&_a]:text-primary [&_a]:underline [&_strong]:text-foreground [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
                dangerouslySetInnerHTML={{ __html: it.a }}
              />
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
