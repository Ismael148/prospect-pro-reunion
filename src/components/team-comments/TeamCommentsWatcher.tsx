import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useTeamComments, useTeamMembers } from "@/hooks/use-team-comments";
import { isUnreadTeamNote } from "@/lib/team-comments";

/** Pops an on-screen alert for the admin whenever a team member posts a new client comment. */
export function TeamCommentsWatcher() {
  const { user, hasRole } = useAuth();
  const navigate = useNavigate();
  const { data: notes } = useTeamComments();
  const { data: members } = useTeamMembers();
  const known = useRef<Set<string> | null>(null);

  useEffect(() => {
    if (!notes || !hasRole("admin")) return;
    const ids = new Set(notes.map((n) => n.id));
    if (known.current === null) { known.current = ids; return; }
    const fresh = notes.filter((n) => !known.current!.has(n.id) && isUnreadTeamNote(n, user?.id));
    known.current = ids;
    fresh.slice(0, 3).forEach((n) => {
      const who = members?.find((m) => m.user_id === n.user_id)?.full_name || "Un membre";
      const text = (n.description || "").replace(/@\[([^\]]+)\]/g, "@$1");
      toast(`💬 ${who} · ${n.client?.company_name || "Client"}`, {
        description: text.length > 120 ? text.slice(0, 120) + "…" : text,
        duration: 10_000,
        action: { label: "Ouvrir la fiche", onClick: () => navigate(`/clients/${n.client_id}`) },
      });
    });
  }, [notes, members, user?.id, hasRole, navigate]);

  return null;
}
