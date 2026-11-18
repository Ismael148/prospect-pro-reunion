import { useMemo } from "react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { BellRing, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useMarkTeamCommentsSeen, useTeamMembers, ROLE_LABELS } from "@/hooks/use-team-comments";
import { isUnreadTeamNote, type TeamNote } from "@/lib/team-comments";
import { NoteText } from "./NoteText";
import { useQueryClient } from "@tanstack/react-query";

/** Banner at the top of a client file listing team comments the admin has not read yet. */
export function ClientCommentAlert({ clientId, activities }: { clientId: string; activities: any[] | undefined }) {
  const { user, hasRole } = useAuth();
  const { data: members } = useTeamMembers();
  const markSeen = useMarkTeamCommentsSeen();
  const qc = useQueryClient();

  const unread = useMemo(
    () => ((activities || []) as TeamNote[])
      .filter((a: any) => a.activity_type === "note" && isUnreadTeamNote(a, user?.id))
      .sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [activities, user?.id],
  );

  if (!hasRole("admin") || unread.length === 0) return null;

  const names = Array.from(new Set(unread.map((n) => members?.find((m) => m.user_id === n.user_id)?.full_name || "Un membre")));

  const markAll = async () => {
    try {
      await markSeen.mutateAsync(unread.map((n) => n.id));
      qc.invalidateQueries({ queryKey: ["activities", clientId] });
      toast.success("Commentaires marqués comme lus");
    } catch {
      toast.error("Impossible de marquer comme lu");
    }
  };

  return (
    <div role="alert" className="rounded-xl border border-primary/40 bg-primary/5 p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <BellRing className="h-5 w-5 text-primary" />
          <p className="font-semibold">
            {unread.length === 1 ? "Nouveau commentaire" : `${unread.length} nouveaux commentaires`} de {names.join(", ")}
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => document.getElementById("client-notes")?.scrollIntoView({ behavior: "smooth" })}>
            Voir les notes
          </Button>
          <Button size="sm" onClick={markAll} disabled={markSeen.isPending}>
            <Check className="mr-1 h-4 w-4" /> Marquer comme lu
          </Button>
        </div>
      </div>
      <ul className="mt-3 space-y-2">
        {unread.slice(0, 3).map((n) => {
          const m = members?.find((x) => x.user_id === n.user_id);
          const role = m?.roles.map((r) => ROLE_LABELS[r] || r)[0];
          return (
            <li key={n.id} className="rounded-lg bg-background p-3 text-sm">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <span className="font-semibold">{m?.full_name || "Un membre"}</span>
                {role && <Badge variant="secondary" className="text-[10px]">{role}</Badge>}
                <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: fr })}</span>
              </div>
              <p className="line-clamp-3 whitespace-pre-wrap break-words"><NoteText text={n.description} /></p>
            </li>
          );
        })}
        {unread.length > 3 && <li className="text-xs text-muted-foreground">… et {unread.length - 3} autre(s) dans les notes ci-dessous.</li>}
      </ul>
    </div>
  );
}
