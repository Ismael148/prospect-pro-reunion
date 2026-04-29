import { useState, useEffect, useRef, useMemo } from "react";
import { useTicketComments, useAddTicketComment } from "@/hooks/use-ticket-comments";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { MentionTextarea, MentionMember } from "@/components/MentionTextarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, MessageCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { useSeenMarks } from "@/hooks/use-seen-marks";
import { SeenByButton } from "@/components/SeenByButton";

interface TicketCommentsProps {
  ticketId: string;
  ticketNumber: string;
  ticketSubject: string;
  assignedTo: string | null;
}

export function TicketComments({ ticketId, ticketNumber, ticketSubject, assignedTo }: TicketCommentsProps) {
  const { user, hasRole } = useAuth();
  const isAdmin = hasRole("admin");
  const { data: comments, isLoading } = useTicketComments(ticketId);
  const addComment = useAddTicketComment();
  const [content, setContent] = useState("");
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const commentIds = useMemo(() => comments?.map((c) => c.id) ?? [], [comments]);
  const { data: seenMap } = useSeenMarks("ticket_comment", commentIds);
  const profilesForSeen = useMemo(() => {
    const out: Record<string, { full_name: string }> = {};
    Object.entries(profiles).forEach(([uid, name]) => { out[uid] = { full_name: name }; });
    return out;
  }, [profiles]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [members, setMembers] = useState<MentionMember[]>([]);

  // Load members for @mentions (admins, webmasters, designers, agent_master, agent_support)
  useEffect(() => {
    (async () => {
      const { data: rolesData } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("role", ["admin", "webmaster", "designer", "agent_master", "agent_support"]);
      if (!rolesData?.length) return;
      const userIds = [...new Set(rolesData.map((r) => r.user_id))];
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", userIds);
      if (!profs) return;
      const rolesByUser: Record<string, string[]> = {};
      rolesData.forEach((r) => {
        rolesByUser[r.user_id] = [...(rolesByUser[r.user_id] ?? []), r.role];
      });
      setMembers(profs.map((p) => ({ user_id: p.user_id, full_name: p.full_name, roles: rolesByUser[p.user_id] })));
    })();
  }, []);

  // Load profiles for comment authors
  useEffect(() => {
    if (!comments?.length) return;
    const userIds = [...new Set(comments.map((c) => c.user_id))];
    const missing = userIds.filter((id) => !profiles[id]);
    if (!missing.length) return;

    supabase
      .from("profiles")
      .select("user_id, full_name")
      .in("user_id", missing)
      .then(({ data }) => {
        if (data) {
          setProfiles((prev) => {
            const next = { ...prev };
            data.forEach((p) => { next[p.user_id] = p.full_name || "Utilisateur"; });
            return next;
          });
        }
      });
  }, [comments]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [comments]);

  const getInitials = (name: string) => {
    return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
  };

  const handleSubmit = async () => {
    if (!content.trim() || !user) return;
    try {
      await addComment.mutateAsync({ ticket_id: ticketId, user_id: user.id, content: content.trim() });
      setContent("");
    } catch {
      toast.error("Erreur lors de l'envoi du commentaire");
    }
  };

  const isMe = (userId: string) => userId === user?.id;

  return (
    <div className="border-t pt-4 space-y-3">
      <p className="text-[11px] text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
        <MessageCircle className="h-3 w-3" />
        Fil de commentaires
        {comments?.length ? (
          <span className="bg-primary/10 text-primary text-[10px] font-bold px-1.5 py-0.5 rounded-full">{comments.length}</span>
        ) : null}
      </p>

      {/* Comments list */}
      <div ref={scrollRef} className="max-h-[250px] overflow-y-auto space-y-3 pr-1">
        {isLoading && <p className="text-xs text-muted-foreground text-center py-4">Chargement...</p>}
        {!isLoading && !comments?.length && (
          <p className="text-xs text-muted-foreground text-center py-4">Aucun commentaire pour le moment</p>
        )}
        {comments?.map((c) => {
          const name = profiles[c.user_id] || "...";
          const mine = isMe(c.user_id);
          return (
            <div key={c.id} className={`flex gap-2.5 ${mine ? "flex-row-reverse" : ""}`}>
              <Avatar className="h-7 w-7 shrink-0">
                <AvatarFallback className={`text-[10px] font-bold ${mine ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                  {getInitials(name)}
                </AvatarFallback>
              </Avatar>
              <div className={`max-w-[80%] ${mine ? "text-right" : ""}`}>
                <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                  <span className={`text-[11px] font-semibold ${mine ? "text-primary" : "text-foreground"}`}>{name}</span>
                  <span className="text-[10px] text-muted-foreground/60">
                    {formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: fr })}
                  </span>
                </div>
                <div className={`text-sm px-3 py-2 rounded-xl leading-relaxed ${
                  mine
                    ? "bg-primary text-primary-foreground rounded-tr-sm"
                    : "bg-muted/50 text-foreground rounded-tl-sm"
                }`}>
                  {c.content}
                </div>
                <div className={`mt-1 ${mine ? "flex justify-end" : ""}`}>
                  <SeenByButton
                    itemType="ticket_comment"
                    itemId={c.id}
                    marks={seenMap?.[c.id] ?? []}
                    authorId={c.user_id}
                    profiles={profilesForSeen}
                    compact
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Comment input */}
      <div className="flex gap-2">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Écrire un commentaire..."
          rows={2}
          className="resize-none text-sm"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
        />
        <Button
          size="icon"
          className="shrink-0 h-auto"
          disabled={!content.trim() || addComment.isPending}
          onClick={handleSubmit}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
