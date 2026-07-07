import { useState } from "react";
import { Star, Plus, Copy, Check, Loader2, Wand2, Trash2, CheckCircle2, Clock, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  useGmbReviews,
  useGmbReviewReplies,
  useCreateGmbReview,
  useSaveGmbReviewReply,
  useMarkReplyAsFinal,
  useUpdateGmbReviewStatus,
  useDeleteGmbReview,
  type GmbReview,
} from "@/hooks/use-gmb-reviews";

interface Props {
  clientId: string;
  clientGmbId?: string | null;
}

function Stars({ n }: { n: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${i < n ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`}
        />
      ))}
    </span>
  );
}

function AddReviewDialog({ clientId, clientGmbId }: Props) {
  const [open, setOpen] = useState(false);
  const [author, setAuthor] = useState("");
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");
  const create = useCreateGmbReview();

  const submit = async () => {
    if (!author.trim()) return toast.error("Nom de l'auteur requis");
    await create.mutateAsync({
      client_id: clientId,
      client_gmb_id: clientGmbId ?? null,
      author_name: author.trim(),
      rating,
      review_text: text.trim() || null,
    });
    setAuthor(""); setRating(5); setText("");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" /> Nouvel avis reçu
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enregistrer un nouvel avis Google</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Auteur (nom affiché sur Google)</Label>
            <Input value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="Ex : Marie D." />
          </div>
          <div>
            <Label className="text-xs">Note</Label>
            <div className="flex gap-1.5 mt-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n)}
                  className="focus:outline-none"
                >
                  <Star className={`h-6 w-6 transition ${n <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label className="text-xs">Texte de l'avis (colle-le depuis Google)</Label>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Colle ici le texte exact de l'avis..."
              className="min-h-[120px]"
            />
          </div>
          <Button onClick={submit} disabled={create.isPending} className="w-full">
            {create.isPending ? <><Loader2 className="mr-1 h-3 w-3 animate-spin" /> Enregistrement...</> : "Enregistrer l'avis"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ReviewCard({ review }: { review: GmbReview }) {
  const { data: replies = [] } = useGmbReviewReplies(review.id);
  const save = useSaveGmbReviewReply();
  const markFinal = useMarkReplyAsFinal();
  const updateStatus = useUpdateGmbReviewStatus();
  const del = useDeleteGmbReview();

  const [tone, setTone] = useState("professionnel");
  const [formality, setFormality] = useState("vouvoiement");
  const [length, setLength] = useState("moyenne");
  const [generating, setGenerating] = useState(false);
  const [lastGenerated, setLastGenerated] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const generate = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("gmb-ai-assistant", {
        body: {
          client_id: review.client_id,
          action: "avis_avance",
          extra: JSON.stringify({
            author: review.author_name,
            rating: review.rating,
            text: review.review_text || "",
            tone, formality, length,
          }),
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const content = data.content as string;
      setLastGenerated(content);
      await save.mutateAsync({
        review_id: review.id,
        client_id: review.client_id,
        content,
        tone, formality, length,
      });
      if (review.status === "nouveau") {
        await updateStatus.mutateAsync({ id: review.id, status: "en_cours", client_id: review.client_id });
      }
      toast.success("Réponse générée ✨");
    } catch (e: any) {
      toast.error(e.message || "Erreur de génération");
    } finally {
      setGenerating(false);
    }
  };

  const copy = async (content: string, id: string) => {
    // Extract from code block if present
    const match = content.match(/```[a-z]*\n?([\s\S]*?)```/);
    const clean = match ? match[1].trim() : content;
    await navigator.clipboard.writeText(clean);
    setCopiedId(id);
    toast.success("Réponse copiée — colle-la sur Google");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const statusBadge =
    review.status === "repondu" ? { label: "✅ Répondu", cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" } :
    review.status === "en_cours" ? { label: "🕐 En cours", cls: "bg-amber-500/15 text-amber-700 dark:text-amber-300" } :
    review.status === "ignore" ? { label: "Ignoré", cls: "bg-muted text-muted-foreground" } :
    { label: "🆕 Nouveau", cls: "bg-blue-500/15 text-blue-700 dark:text-blue-300" };

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm">{review.author_name}</span>
            <Stars n={review.rating} />
            <Badge variant="secondary" className={`text-[10px] ${statusBadge.cls}`}>{statusBadge.label}</Badge>
            <span className="text-[11px] text-muted-foreground">
              {new Date(review.received_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}
            </span>
          </div>
          {review.review_text && (
            <p className="text-sm text-muted-foreground italic whitespace-pre-wrap">"{review.review_text}"</p>
          )}
        </div>
        <Button size="icon" variant="ghost" onClick={() => del.mutate({ id: review.id, client_id: review.client_id })}>
          <Trash2 className="h-3.5 w-3.5 text-destructive" />
        </Button>
      </div>

      <div className="border-t pt-3 space-y-3">
        <div className="grid grid-cols-3 gap-2">
          <div>
            <Label className="text-[10px] uppercase text-muted-foreground">Ton</Label>
            <Select value={tone} onValueChange={setTone}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="chaleureux">Chaleureux</SelectItem>
                <SelectItem value="professionnel">Professionnel</SelectItem>
                <SelectItem value="empathique">Empathique</SelectItem>
                <SelectItem value="ferme">Ferme mais courtois</SelectItem>
                <SelectItem value="humoristique">Humoristique</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[10px] uppercase text-muted-foreground">Politesse</Label>
            <Select value={formality} onValueChange={setFormality}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="vouvoiement">Vouvoiement</SelectItem>
                <SelectItem value="tutoiement">Tutoiement</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[10px] uppercase text-muted-foreground">Longueur</Label>
            <Select value={length} onValueChange={setLength}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="courte">Courte</SelectItem>
                <SelectItem value="moyenne">Moyenne</SelectItem>
                <SelectItem value="longue">Longue</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button onClick={generate} disabled={generating} className="w-full bg-gradient-to-r from-primary to-primary/70">
          {generating ? (
            <><Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> Génération...</>
          ) : (
            <><Wand2 className="mr-1 h-3.5 w-3.5" /> {replies.length > 0 ? "Régénérer une variante" : "Générer la réponse"}</>
          )}
        </Button>

        {replies.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
              <MessageSquare className="h-3 w-3" /> Variantes générées ({replies.length})
            </div>
            {replies.map((r) => {
              const match = r.content.match(/```[a-z]*\n?([\s\S]*?)```/);
              const preview = match ? match[1].trim() : r.content;
              return (
                <Card key={r.id} className={`p-3 space-y-2 ${r.is_final ? "border-emerald-500/50 bg-emerald-500/5" : "bg-muted/30"}`}>
                  <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
                    {r.tone && <Badge variant="outline" className="text-[10px]">{r.tone}</Badge>}
                    {r.formality && <Badge variant="outline" className="text-[10px]">{r.formality}</Badge>}
                    {r.length && <Badge variant="outline" className="text-[10px]">{r.length}</Badge>}
                    {r.is_final && <Badge className="text-[10px] bg-emerald-500">✅ Publié sur Google</Badge>}
                    <span className="text-muted-foreground ml-auto">
                      {new Date(r.created_at).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <Textarea value={preview} readOnly onFocus={(e) => e.currentTarget.select()} className="text-xs font-mono min-h-[100px] bg-background" />
                  <div className="flex gap-2">
                    <Button size="sm" variant="default" onClick={() => copy(r.content, r.id)} className="flex-1">
                      {copiedId === r.id ? <><Check className="mr-1 h-3 w-3" /> Copié</> : <><Copy className="mr-1 h-3 w-3" /> Copier</>}
                    </Button>
                    {!r.is_final && (
                      <Button size="sm" variant="outline" onClick={() => markFinal.mutate({ reply_id: r.id, review_id: review.id, client_id: review.client_id })}>
                        <CheckCircle2 className="mr-1 h-3 w-3" /> Marquer publié
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </Card>
  );
}

export function GmbReviewsManager({ clientId, clientGmbId }: Props) {
  const { data: reviews = [], isLoading } = useGmbReviews(clientId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h3 className="font-semibold text-sm flex items-center gap-1.5">
            <Star className="h-4 w-4 text-amber-500" />
            Gestion des avis Google
          </h3>
          <p className="text-xs text-muted-foreground">
            Enregistre chaque nouvel avis, génère et ajuste la réponse, garde tout l'historique.
          </p>
        </div>
        <AddReviewDialog clientId={clientId} clientGmbId={clientGmbId} />
      </div>

      {isLoading && <p className="text-xs text-muted-foreground">Chargement...</p>}

      {!isLoading && reviews.length === 0 && (
        <Card className="p-6 text-center border-dashed">
          <Star className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
          <p className="text-sm font-medium">Aucun avis enregistré</p>
          <p className="text-xs text-muted-foreground">Clique sur "Nouvel avis reçu" dès qu'un client publie un avis sur Google.</p>
        </Card>
      )}

      {reviews.map((r) => <ReviewCard key={r.id} review={r} />)}
    </div>
  );
}
