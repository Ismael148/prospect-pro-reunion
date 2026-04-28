import { useMemo } from "react";
import { Eye, EyeOff, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/contexts/AuthContext";
import { useToggleSeenMark, type SeenItemType, type SeenMark } from "@/hooks/use-seen-marks";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Props {
  itemType: SeenItemType;
  itemId: string;
  marks: SeenMark[];
  authorId?: string; // exclude author from "seen by" list
  profiles: Record<string, { full_name: string; avatar_url?: string | null }>;
  compact?: boolean;
}

const initials = (n: string) => n.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

export function SeenByButton({ itemType, itemId, marks, authorId, profiles, compact }: Props) {
  const { user } = useAuth();
  const toggle = useToggleSeenMark();

  const filtered = useMemo(
    () => marks.filter((m) => m.user_id !== authorId),
    [marks, authorId]
  );
  const seenByMe = !!user && filtered.some((m) => m.user_id === user.id);
  const isAuthor = user?.id === authorId;

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {/* Avatars of viewers */}
      {filtered.length > 0 && (
        <TooltipProvider>
          <div className="flex -space-x-1.5">
            {filtered.slice(0, 5).map((m) => {
              const p = profiles[m.user_id];
              const name = p?.full_name || "Membre";
              return (
                <Tooltip key={m.id}>
                  <TooltipTrigger asChild>
                    <Avatar className="h-5 w-5 border border-background ring-1 ring-primary/20">
                      <AvatarFallback className="text-[8px] font-bold bg-primary/10 text-primary">
                        {initials(name)}
                      </AvatarFallback>
                    </Avatar>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    <div className="flex items-center gap-1.5">
                      <Check className="h-3 w-3 text-green-500" />
                      <span className="font-semibold">{name}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Vu le {format(new Date(m.seen_at), "dd/MM/yyyy 'à' HH:mm", { locale: fr })}
                    </p>
                  </TooltipContent>
                </Tooltip>
              );
            })}
            {filtered.length > 5 && (
              <div className="h-5 w-5 rounded-full bg-muted border border-background flex items-center justify-center text-[8px] font-bold">
                +{filtered.length - 5}
              </div>
            )}
          </div>
        </TooltipProvider>
      )}

      {/* Toggle button (hidden for author) */}
      {!isAuthor && user && (
        <Button
          type="button"
          size="sm"
          variant={seenByMe ? "secondary" : "ghost"}
          className={`h-6 ${compact ? "px-1.5" : "px-2"} text-[10px] gap-1 rounded-full`}
          disabled={toggle.isPending}
          onClick={(e) => {
            e.stopPropagation();
            toggle.mutate({ itemType, itemId, seen: seenByMe });
          }}
        >
          {seenByMe ? <Eye className="h-3 w-3 text-green-500" /> : <EyeOff className="h-3 w-3" />}
          {compact ? null : <span>{seenByMe ? "Vu" : "Marquer vu"}</span>}
        </Button>
      )}

      {filtered.length === 0 && isAuthor && (
        <span className="text-[10px] text-muted-foreground italic">Pas encore vu</span>
      )}
    </div>
  );
}
