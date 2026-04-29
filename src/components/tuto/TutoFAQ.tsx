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
      <div className="flex items-center gap-2 mb-4">
        <HelpCircle className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-bold text-foreground">{title}</h2>
      </div>
      <Accordion type="single" collapsible className="rounded-2xl border bg-background/60 backdrop-blur divide-y">
        {items.map((it, i) => (
          <AccordionItem key={i} value={`faq-${i}`} className="border-0 px-4">
            <AccordionTrigger className="text-left text-sm font-semibold hover:no-underline py-4">
              {it.q}
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-4">
              <div dangerouslySetInnerHTML={{ __html: it.a }} />
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
