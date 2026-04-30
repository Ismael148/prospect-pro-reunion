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
      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 border border-primary/30">
          <HelpCircle className="h-5 w-5 text-primary" />
        </div>
        <h2 className="text-2xl md:text-3xl font-bold text-zinc-900">{title}</h2>
      </div>
      <Accordion
        type="single"
        collapsible
        className="rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden divide-y divide-zinc-200"
      >
        {items.map((it, i) => (
          <AccordionItem key={i} value={`faq-${i}`} className="border-0 px-5">
            <AccordionTrigger className="text-left text-base font-semibold text-zinc-900 hover:no-underline hover:text-primary py-5 [&[data-state=open]]:text-primary [&>svg]:text-zinc-700">
              {it.q}
            </AccordionTrigger>
            <AccordionContent className="text-[15px] text-zinc-700 leading-relaxed pb-5">
              <div
                className="space-y-2 [&_a]:text-primary [&_a]:underline [&_strong]:text-zinc-900 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-2"
                dangerouslySetInnerHTML={{ __html: it.a }}
              />
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
