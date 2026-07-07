import { useEffect, useState } from "react";
import { Target, Star, Camera, MessageSquare } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  useGmbGoal,
  useUpsertGmbGoal,
  currentMonthYear,
  goalProgressColor,
} from "@/hooks/use-gmb-goals";

interface Props {
  clientGmbId: string;
  clientId: string;
}

export function GmbMonthlyGoals({ clientGmbId, clientId }: Props) {
  const month = currentMonthYear();
  const { data: goal, isLoading } = useGmbGoal(clientGmbId, month);
  const upsert = useUpsertGmbGoal();

  const [form, setForm] = useState({
    posts_target: 4,
    posts_done: 0,
    reviews_reply_target_pct: 100,
    reviews_replied: 0,
    reviews_received: 0,
    photos_target: 8,
    photos_done: 0,
  });

  useEffect(() => {
    if (goal) {
      setForm({
        posts_target: goal.posts_target,
        posts_done: goal.posts_done,
        reviews_reply_target_pct: goal.reviews_reply_target_pct,
        reviews_replied: goal.reviews_replied,
        reviews_received: goal.reviews_received,
        photos_target: goal.photos_target,
        photos_done: goal.photos_done,
      });
    }
  }, [goal?.id]);

  const save = async () => {
    await upsert.mutateAsync({
      id: goal?.id,
      client_gmb_id: clientGmbId,
      client_id: clientId,
      month_year: month,
      ...form,
    });
  };

  const pctPosts = form.posts_target > 0 ? Math.round((form.posts_done / form.posts_target) * 100) : 0;
  const pctPhotos = form.photos_target > 0 ? Math.round((form.photos_done / form.photos_target) * 100) : 0;
  const pctReviews =
    form.reviews_received > 0 ? Math.round((form.reviews_replied / form.reviews_received) * 100) : 100;

  if (isLoading) return <p className="text-sm text-muted-foreground">Chargement…</p>;

  return (
    <div className="space-y-4">
      <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent p-4">
        <div className="flex items-start gap-3">
          <Target className="h-5 w-5 text-primary" />
          <div className="flex-1">
            <h3 className="font-bold">Objectifs de {month}</h3>
            <p className="text-xs text-muted-foreground">
              Fixe les cibles mensuelles et incrémente les compteurs quand tu réalises une action.
            </p>
          </div>
        </div>
      </Card>

      <GoalRow
        icon={<MessageSquare className="h-4 w-4" />}
        label="Posts publiés"
        done={form.posts_done}
        target={form.posts_target}
        pct={pctPosts}
        onDoneChange={(v) => setForm({ ...form, posts_done: v })}
        onTargetChange={(v) => setForm({ ...form, posts_target: v })}
      />

      <GoalRow
        icon={<Camera className="h-4 w-4" />}
        label="Photos ajoutées"
        done={form.photos_done}
        target={form.photos_target}
        pct={pctPhotos}
        onDoneChange={(v) => setForm({ ...form, photos_done: v })}
        onTargetChange={(v) => setForm({ ...form, photos_target: v })}
      />

      <Card className="p-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm font-semibold">
            <Star className="h-4 w-4" /> Avis répondus
          </span>
          <span className="text-xs font-bold">{pctReviews}%</span>
        </div>
        <div className="mb-3 h-2 overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full transition-all ${goalProgressColor(pctReviews)}`}
            style={{ width: `${Math.min(pctReviews, 100)}%` }}
          />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <Label className="text-xs">Reçus</Label>
            <Input
              type="number"
              min={0}
              value={form.reviews_received}
              onChange={(e) => setForm({ ...form, reviews_received: Number(e.target.value) || 0 })}
            />
          </div>
          <div>
            <Label className="text-xs">Répondus</Label>
            <Input
              type="number"
              min={0}
              value={form.reviews_replied}
              onChange={(e) => setForm({ ...form, reviews_replied: Number(e.target.value) || 0 })}
            />
          </div>
          <div>
            <Label className="text-xs">Cible (%)</Label>
            <Input
              type="number"
              min={0}
              max={100}
              value={form.reviews_reply_target_pct}
              onChange={(e) =>
                setForm({ ...form, reviews_reply_target_pct: Number(e.target.value) || 0 })
              }
            />
          </div>
        </div>
      </Card>

      <Button onClick={save} disabled={upsert.isPending} className="w-full">
        Enregistrer les objectifs
      </Button>
    </div>
  );
}

function GoalRow({
  icon,
  label,
  done,
  target,
  pct,
  onDoneChange,
  onTargetChange,
}: {
  icon: React.ReactNode;
  label: string;
  done: number;
  target: number;
  pct: number;
  onDoneChange: (v: number) => void;
  onTargetChange: (v: number) => void;
}) {
  return (
    <Card className="p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm font-semibold">
          {icon} {label}
        </span>
        <span className="text-xs font-bold">
          {done} / {target} · {pct}%
        </span>
      </div>
      <div className="mb-3 h-2 overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full transition-all ${goalProgressColor(pct)}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">Réalisés</Label>
          <Input
            type="number"
            min={0}
            value={done}
            onChange={(e) => onDoneChange(Number(e.target.value) || 0)}
          />
        </div>
        <div>
          <Label className="text-xs">Cible</Label>
          <Input
            type="number"
            min={0}
            value={target}
            onChange={(e) => onTargetChange(Number(e.target.value) || 0)}
          />
        </div>
      </div>
    </Card>
  );
}
