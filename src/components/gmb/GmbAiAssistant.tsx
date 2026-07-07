import { useState } from "react";
import { Sparkles, Copy, Check, Loader2, History, Wand2, Eye, Code2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useGmbAi, getHistory, type GmbAiAction } from "@/hooks/use-gmb-ai";
import type { ClientGmbWithClient } from "@/hooks/use-client-gmb";

interface Props {
  row: ClientGmbWithClient;
}

interface Generator {
  action: GmbAiAction;
  title: string;
  description: string;
  emoji: string;
  needsExtra?: string;
  extraMultiline?: boolean;
}

const PHASES: { key: string; label: string; emoji: string; generators: Generator[] }[] = [
  {
    key: "phase1",
    label: "Phase 1 — Création",
    emoji: "🏗️",
    generators: [
      { action: "categories", title: "Catégories GMB", description: "Catégorie principale + secondaires (officielles Google)", emoji: "🏷️" },
      { action: "description", title: "Description entreprise", description: "750 caractères SEO local", emoji: "📝" },
    ],
  },
  {
    key: "phase2",
    label: "Phase 2 — Optimisation",
    emoji: "🎨",
    generators: [
      { action: "prompt_couverture", title: "Prompt photo de couverture", description: "Anti-détection IA, style DSLR naturel", emoji: "🖼️" },
      { action: "prompts_photos", title: "Pack 10 prompts photos", description: "Extérieur, intérieur, équipe, produits...", emoji: "📸" },
      { action: "seo_long", title: "Description SEO longue", description: "1500-2000 car géolocalisés Réunion", emoji: "🔍" },
      { action: "attributs", title: "Attributs & services", description: "Liste GMB + produits avec prix €", emoji: "⚙️" },
    ],
  },
  {
    key: "phase3",
    label: "Phase 3 — Engagement",
    emoji: "🚀",
    generators: [
      { action: "post", title: "Post GMB complet", description: "Titre, description, prix, CTA + prompt image", emoji: "📣", needsExtra: "Ex: nouvelle offre pack coiffure -20%" },
      { action: "posts_saisonniers", title: "5 posts saisonniers", description: "Adaptés calendrier Réunion (Fet Kaf, Dipavali...)", emoji: "🌺" },
      { action: "faq", title: "FAQ anticipées", description: "8-10 Q/R optimisées SEO", emoji: "❓" },
      { action: "reponses_avis", title: "Modèles réponses avis", description: "5★ / 3★ / 1★ personnalisés", emoji: "⭐" },
      {
        action: "repondre_avis",
        title: "Répondre à un avis (colle-le)",
        description: "Colle l'avis client → réponse personnalisée prête à coller sur Google",
        emoji: "💬",
        needsExtra: "Colle ici l'avis client tel qu'il apparaît sur Google...",
        extraMultiline: true,
      },
    ],
  },
];

function GeneratorCard({ gen, clientId }: { gen: Generator; clientId: string }) {
  const mutate = useGmbAi(clientId);
  const [extra, setExtra] = useState("");
  const [result, setResult] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [rawMode, setRawMode] = useState(true);

  const run = async () => {
    setResult("");
    try {
      const data = await mutate.mutateAsync({ action: gen.action, extra: extra || undefined });
      setResult(data.content);
      toast.success("Contenu généré ✨");
    } catch {
      // toast handled in hook
    }
  };

  const copy = async () => {
    await navigator.clipboard.writeText(result);
    setCopied(true);
    toast.success("Copié dans le presse-papier");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <p className="font-semibold flex items-center gap-2">
            <span>{gen.emoji}</span> {gen.title}
          </p>
          <p className="text-xs text-muted-foreground">{gen.description}</p>
        </div>
        <Button size="sm" onClick={run} disabled={mutate.isPending} className="shrink-0">
          {mutate.isPending ? (
            <><Loader2 className="mr-1 h-3 w-3 animate-spin" /> Génération...</>
          ) : (
            <><Wand2 className="mr-1 h-3 w-3" /> Générer</>
          )}
        </Button>
      </div>

      {gen.needsExtra && (
        gen.extraMultiline ? (
          <Textarea
            placeholder={gen.needsExtra}
            value={extra}
            onChange={(e) => setExtra(e.target.value)}
            className="text-xs min-h-[100px]"
          />
        ) : (
          <Input
            placeholder={gen.needsExtra}
            value={extra}
            onChange={(e) => setExtra(e.target.value)}
            className="text-xs h-9"
          />
        )
      )}

      {result && (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setRawMode((v) => !v)}
              className="h-7 text-xs"
            >
              {rawMode ? <><Eye className="mr-1 h-3 w-3" /> Aperçu</> : <><Code2 className="mr-1 h-3 w-3" /> Texte brut</>}
            </Button>
            <Button size="sm" variant="default" onClick={copy} className="h-7 text-xs">
              {copied ? <><Check className="mr-1 h-3 w-3" /> Copié</> : <><Copy className="mr-1 h-3 w-3" /> Tout copier</>}
            </Button>
          </div>
          {rawMode ? (
            <Textarea
              value={result}
              readOnly
              onFocus={(e) => e.currentTarget.select()}
              className="font-mono text-xs min-h-[300px] bg-muted/30"
            />
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none rounded-md border bg-muted/30 p-3 text-sm whitespace-pre-wrap break-words">
              <ReactMarkdown>{result}</ReactMarkdown>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

export function GmbAiAssistant({ row }: Props) {
  const [open, setOpen] = useState(false);
  const clientId = row.client_id;
  const client = row.clients;
  const history = open ? getHistory(clientId) : [];

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="sm" className="gap-1.5 bg-gradient-to-r from-primary to-primary/70 hover:opacity-90">
          <Sparkles className="h-4 w-4" />
          Assistant IA
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-3xl lg:max-w-4xl p-0 flex flex-col h-full">
        <SheetHeader className="border-b p-4 space-y-2 shrink-0">
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Assistant IA GMB
          </SheetTitle>
          <SheetDescription asChild>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <Badge variant="secondary">{client?.company_name || "Client"}</Badge>
              {client?.sector && <Badge variant="outline">{client.sector}</Badge>}
              {client?.city && <Badge variant="outline">{client.city}</Badge>}
            </div>
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-4">
          <Tabs defaultValue="phase1">
            <TabsList className="grid grid-cols-3 w-full sticky top-0 z-10">
              {PHASES.map((p) => (
                <TabsTrigger key={p.key} value={p.key} className="text-xs">
                  <span className="mr-1">{p.emoji}</span> {p.label.split("—")[0].trim()}
                </TabsTrigger>
              ))}
            </TabsList>

            {PHASES.map((phase) => (
              <TabsContent key={phase.key} value={phase.key} className="space-y-3 mt-4">
                {phase.generators.map((gen) => (
                  <GeneratorCard key={gen.action} gen={gen} clientId={clientId} />
                ))}
              </TabsContent>
            ))}
          </Tabs>

          {history.length > 0 && (
            <div className="mt-6 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                <History className="h-3 w-3" />
                Historique récent ({history.length})
              </div>
              {history.map((h, i) => (
                <details key={i} className="rounded-md border bg-muted/20 p-2 text-xs">
                  <summary className="cursor-pointer font-medium">
                    {h.action} — {new Date(h.generatedAt).toLocaleString("fr-FR")}
                  </summary>
                  <div className="prose prose-sm dark:prose-invert max-w-none mt-2 whitespace-pre-wrap">
                    <ReactMarkdown>{h.content}</ReactMarkdown>
                  </div>
                </details>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
