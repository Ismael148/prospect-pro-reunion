import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow, format } from "date-fns";
import { fr } from "date-fns/locale";
import { CheckCheck, Check, ExternalLink, MessageSquare, Reply, Search, Inbox, Send } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { useCreateActivity } from "@/hooks/use-clients";
import {
  useTeamComments, useTeamMembers, useMarkTeamCommentsSeen, ROLE_LABELS, type TeamCommentRow,
} from "@/hooks/use-team-comments";
import { buildTeamThreads, isUnreadTeamNote, type TeamThread } from "@/lib/team-comments";
import { NoteText } from "@/components/team-comments/NoteText";
import { MentionTextarea, buildMentionOptions } from "@/components/MentionTextarea";

const initials = (name?: string | null) =>
  (name || "?").split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

export default function CommentairesEquipe() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: notes, isLoading } = useTeamComments();
  const { data: members } = useTeamMembers();
  const markSeen = useMarkTeamCommentsSeen();
  const createActivity = useCreateActivity();

  const [tab, setTab] = useState<"unread" | "all">("unread");
  const [author, setAuthor] = useState("all");
  const [search, setSearch] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  const mentionOptions = useMemo(() => buildMentionOptions(members, user?.id), [members, user?.id]);
  const memberById = useMemo(() => new Map((members || []).map((m) => [m.user_id, m])), [members]);
  const threads = useMemo(() => buildTeamThreads<TeamCommentRow>(notes || [], user?.id), [notes, user?.id]);
  const unreadTotal = threads.reduce((s, t) => s + t.unreadIds.length, 0);

  const authors = useMemo(() => {
    const ids = new Set((notes || []).filter((n) => n.user_id !== user?.id).map((n) => n.user_id));
    return Array.from(ids).map((id) => memberById.get(id) || { user_id: id, full_name: "Membre", roles: [] })
      .sort((a, b) => (a.full_name || "").localeCompare(b.full_name || ""));
  }, [notes, memberById, user?.id]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return threads.filter((t) => {
      if (tab === "unread" && t.unreadIds.length === 0) return false;
      const items = [t.root, ...t.replies];
      if (author !== "all" && !items.some((n) => n.user_id === author)) return false;
      if (q) {
        const hay = [t.root.client?.company_name, t.root.client?.ndi, t.root.client?.manager_name, ...items.map((n) => n.description)]
          .filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [threads, tab, author, search]);

  const visibleUnreadIds = visible.flatMap((t) => t.unreadIds);

  const handleMarkAll = async () => {
    try {
      await markSeen.mutateAsync(visibleUnreadIds);
      toast.success(`${visibleUnreadIds.length} commentaire(s) marqué(s) comme lu(s)`);
    } catch {
      toast.error("Impossible de marquer comme lu");
    }
  };

  const handleReply = async (t: TeamThread<TeamCommentRow>) => {
    if (!replyText.trim() || !user) return;
    try {
      await createActivity.mutateAsync({
        client_id: t.root.client_id, user_id: user.id, activity_type: "note",
        description: replyText.trim(), parent_id: t.root.id,
      } as any);
      if (t.unreadIds.length) await markSeen.mutateAsync(t.unreadIds);
      setReplyText("");
      setReplyTo(null);
      toast.success("Réponse envoyée");
    } catch {
      toast.error("Erreur lors de l'envoi de la réponse");
    }
  };

  const renderNote = (n: TeamCommentRow, isReply = false) => {
    const m = memberById.get(n.user_id);
    const unread = isUnreadTeamNote(n, user?.id);
    const role = m?.roles.map((r) => ROLE_LABELS[r] || r)[0];
    return (
      <div key={n.id} className={`flex gap-3 ${isReply ? "ml-10 mt-3 border-l-2 border-border pl-4" : ""}`}>
        <Avatar className={isReply ? "h-7 w-7" : "h-9 w-9"}>
          <AvatarFallback className="bg-primary/10 text-[11px] font-bold text-primary">{initials(m?.full_name)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-sm font-semibold">{n.user_id === user?.id ? "Vous" : m?.full_name || "Membre"}</span>
            {role && n.user_id !== user?.id && <Badge variant="secondary" className="text-[10px]">{role}</Badge>}
            {unread && <Badge className="text-[10px]">Nouveau</Badge>}
            <span className="text-xs text-muted-foreground" title={format(new Date(n.created_at), "dd/MM/yyyy HH:mm")}>
              {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: fr })}
            </span>
          </div>
          <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed"><NoteText text={n.description} /></p>
        </div>
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <MessageSquare className="h-6 w-6 text-primary" /> Commentaires équipe
          </h1>
          <p className="text-sm text-muted-foreground">Tous les commentaires laissés par votre équipe sur les fiches clients, au même endroit.</p>
        </div>
        <Button onClick={handleMarkAll} disabled={visibleUnreadIds.length === 0 || markSeen.isPending} variant="outline">
          <CheckCheck className="mr-2 h-4 w-4" /> Tout marquer comme lu{visibleUnreadIds.length ? ` (${visibleUnreadIds.length})` : ""}
        </Button>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList>
            <TabsTrigger value="unread">À lire {unreadTotal > 0 && <Badge className="ml-2 h-5 px-1.5 text-[10px]">{unreadTotal}</Badge>}</TabsTrigger>
            <TabsTrigger value="all">Tous</TabsTrigger>
          </TabsList>
        </Tabs>
        <Select value={author} onValueChange={setAuthor}>
          <SelectTrigger className="md:w-56"><SelectValue placeholder="Auteur" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toute l'équipe</SelectItem>
            {authors.map((a) => <SelectItem key={a.user_id} value={a.user_id}>{a.full_name || "Membre"}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un client ou un mot…" className="pl-9" />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-28 w-full" />)}</div>
      ) : visible.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <Inbox className="h-10 w-10 text-muted-foreground" />
            <p className="font-medium">{tab === "unread" ? "Vous êtes à jour 🎉" : "Aucun commentaire trouvé"}</p>
            <p className="text-sm text-muted-foreground">
              {tab === "unread" ? "Aucun nouveau commentaire de l'équipe à lire." : "Essayez une autre recherche ou un autre auteur."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {visible.map((t) => (
            <Card key={t.root.id} className={`shadow-sm ${t.unreadIds.length ? "border-primary/40" : ""}`}>
              <CardContent className="space-y-3 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2">
                  <button
                    onClick={() => navigate(`/clients/${t.root.client_id}`)}
                    className="flex min-w-0 items-center gap-2 text-left hover:text-primary"
                  >
                    <span className="truncate font-semibold">{t.root.client?.company_name || "Client"}</span>
                    {t.root.client?.ndi && <span className="text-xs text-muted-foreground">{t.root.client.ndi}</span>}
                  </button>
                  <div className="flex items-center gap-1">
                    {t.unreadIds.length > 0 && (
                      <Button size="sm" variant="ghost" className="h-8" onClick={() => markSeen.mutate(t.unreadIds)}>
                        <Check className="mr-1 h-4 w-4" /> Lu
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" className="h-8" onClick={() => { setReplyTo(replyTo === t.root.id ? null : t.root.id); setReplyText(""); }}>
                      <Reply className="mr-1 h-4 w-4" /> Répondre
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8" onClick={() => {
                      if (t.unreadIds.length) markSeen.mutate(t.unreadIds);
                      navigate(`/clients/${t.root.client_id}`);
                    }}>
                      <ExternalLink className="mr-1 h-4 w-4" /> Fiche
                    </Button>
                  </div>
                </div>
                {renderNote(t.root)}
                {t.replies.map((r) => renderNote(r, true))}
                {replyTo === t.root.id && (
                  <div className="ml-10 space-y-2">
                    <MentionTextarea autoFocus rows={2} value={replyText} onChange={setReplyText} members={mentionOptions} placeholder="Votre réponse… Tapez @ pour mentionner un agent, un webmaster ou un groupe (visible sur la fiche client)" />
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="ghost" onClick={() => setReplyTo(null)}>Annuler</Button>
                      <Button size="sm" onClick={() => handleReply(t)} disabled={!replyText.trim() || createActivity.isPending}>
                        <Send className="mr-1 h-4 w-4" /> Envoyer
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
