import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { Eye, EyeOff, Trash2, ExternalLink, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useGmbActivities,
  useCreateGmbActivity,
  useDeleteGmbActivity,
  useToggleActivityVisibility,
  GMB_ACTIVITY_LABELS,
  GMB_ACTIVITY_ICONS,
  type GmbActivityType,
} from "@/hooks/use-gmb-activities";

interface Props {
  clientGmbId: string;
  clientId: string;
}

const LOGGABLE_TYPES: GmbActivityType[] = [
  "post_publie",
  "photo_ajoutee",
  "avis_repondu",
  "description_maj",
  "horaires_maj",
  "produit_ajoute",
  "qa_repondue",
  "autre",
];

export function GmbActivityTimeline({ clientGmbId, clientId }: Props) {
  const { data: activities = [], isLoading } = useGmbActivities(clientGmbId);
  const create = useCreateGmbActivity();
  const del = useDeleteGmbActivity();
  const toggleVis = useToggleActivityVisibility();

  const [form, setForm] = useState<{
    action_type: GmbActivityType;
    description: string;
    link: string;
    visible_to_client: boolean;
  }>({
    action_type: "post_publie",
    description: "",
    link: "",
    visible_to_client: true,
  });

  const handleAdd = async () => {
    if (!form.description.trim()) return;
    await create.mutateAsync({
      client_gmb_id: clientGmbId,
      client_id: clientId,
      action_type: form.action_type,
      description: form.description.trim(),
      link: form.link.trim() || null,
      visible_to_client: form.visible_to_client,
    });
    setForm({ ...form, description: "", link: "" });
  };

  return (
    <div className="space-y-4">
      <Card className="border-primary/30 bg-primary/5 p-4">
        <h4 className="mb-3 flex items-center gap-2 font-semibold">
          <Plus className="h-4 w-4" /> Logger une action
        </h4>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <Label>Type d'action</Label>
            <Select
              value={form.action_type}
              onValueChange={(v) => setForm({ ...form, action_type: v as GmbActivityType })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LOGGABLE_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {GMB_ACTIVITY_ICONS[t]} {GMB_ACTIVITY_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Lien (optionnel)</Label>
            <Input
              placeholder="URL post, photo, avis…"
              value={form.link}
              onChange={(e) => setForm({ ...form, link: e.target.value })}
            />
          </div>
          <div className="md:col-span-2">
            <Label>Description</Label>
            <Textarea
              rows={2}
              placeholder="Ex : Post publié sur la carte de printemps"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <Checkbox
              checked={form.visible_to_client}
              onCheckedChange={(v) => setForm({ ...form, visible_to_client: Boolean(v) })}
            />
            <span>Visible par le client</span>
          </label>
          <Button size="sm" onClick={handleAdd} disabled={!form.description.trim() || create.isPending}>
            Ajouter
          </Button>
        </div>
      </Card>

      <div>
        <h4 className="mb-2 text-sm font-semibold">Journal ({activities.length})</h4>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Chargement…</p>
        ) : activities.length === 0 ? (
          <p className="rounded-lg border bg-muted/40 p-6 text-center text-sm text-muted-foreground">
            Aucune action loggée. Commence par ajouter la première ci-dessus.
          </p>
        ) : (
          <ol className="relative space-y-3 border-l-2 border-muted pl-6">
            {activities.map((a) => (
              <li key={a.id} className="relative">
                <span className="absolute -left-[33px] flex h-7 w-7 items-center justify-center rounded-full border-2 border-background bg-primary text-sm">
                  {GMB_ACTIVITY_ICONS[a.action_type]}
                </span>
                <Card className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          {GMB_ACTIVITY_LABELS[a.action_type]}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {formatDistanceToNow(new Date(a.performed_at), {
                            addSuffix: true,
                            locale: fr,
                          })}
                        </span>
                        {!a.visible_to_client && (
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium">
                            🔒 interne
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm">{a.description}</p>
                      {a.link && (
                        <a
                          href={a.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" /> Voir
                        </a>
                      )}
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        title={a.visible_to_client ? "Masquer au client" : "Rendre visible"}
                        onClick={() =>
                          toggleVis.mutate({
                            id: a.id,
                            visible_to_client: !a.visible_to_client,
                            client_gmb_id: clientGmbId,
                          })
                        }
                      >
                        {a.visible_to_client ? (
                          <Eye className="h-3.5 w-3.5" />
                        ) : (
                          <EyeOff className="h-3.5 w-3.5" />
                        )}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive"
                        onClick={() => del.mutate({ id: a.id, client_gmb_id: clientGmbId })}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </Card>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
