import { useState, useEffect, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MessageSquare, Send, Pencil, Trash2, Check, X } from "lucide-react";
import { useModuleNotes, useAddModuleNote, useUpdateModuleNote, useDeleteModuleNote } from "@/hooks/use-module-notes";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import type { TeamMember } from "./ProjectModules";

interface Props {
  projectId: string;
  moduleId: string;
  moduleName: string;
  teamMembers: TeamMember[];
}

export default function ModuleNotes({ projectId, moduleId, moduleName, teamMembers }: Props) {
  const { user, hasRole } = useAuth();
  const { data: allNotes } = useModuleNotes(projectId);
  const addNote = useAddModuleNote();
  const updateNote = useUpdateModuleNote();
  const deleteNote = useDeleteModuleNote();
  const [content, setContent] = useState("");
  const [showMentions, setShowMentions] = useState(false);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const isAdmin = hasRole("admin");

  const notes = useMemo(() => 
    (allNotes || []).filter(n => n.module_id === moduleId),
    [allNotes, moduleId]
  );

  // Fetch profiles for authors
  useEffect(() => {
    const userIds = [...new Set(notes.map(n => n.user_id))];
    if (userIds.length === 0) return;
    supabase.from("profiles").select("user_id, full_name").in("user_id", userIds)
      .then(({ data }) => {
        const map: Record<string, string> = {};
        data?.forEach(p => { map[p.user_id] = p.full_name || "Utilisateur"; });
        setProfiles(map);
      });
  }, [notes]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [notes.length]);

  const handleSubmit = async () => {
    if (!content.trim() || !user) return;
    try {
      await addNote.mutateAsync({
        project_id: projectId,
        module_id: moduleId,
        user_id: user.id,
        content: content.trim(),
      });

      // Extract @mentions and notify
      const mentionRegex = /@(\w[\w\s]*?)(?=\s@|$|\s[^@])/g;
      const mentions = [...content.matchAll(mentionRegex)].map(m => m[1].trim().toLowerCase());
      
      if (mentions.length > 0) {
        for (const member of teamMembers) {
          const name = (member.full_name || "").toLowerCase();
          if (mentions.some(m => name.includes(m)) && member.user_id !== user.id) {
            await supabase.from("notifications").insert({
              user_id: member.user_id,
              title: `💬 Mention sur le module "${moduleName}"`,
              message: content.trim().slice(0, 200),
              type: "module_note",
              link: `/projets/${projectId}`,
            });
          }
        }
      }

      // Notify admins
      const { data: admins } = await supabase
        .from("user_roles").select("user_id").eq("role", "admin");
      for (const admin of admins || []) {
        if (admin.user_id !== user.id && !mentions.some(m => {
          const member = teamMembers.find(tm => tm.user_id === admin.user_id);
          return member && (member.full_name || "").toLowerCase().includes(m);
        })) {
          await supabase.from("notifications").insert({
            user_id: admin.user_id,
            title: `📝 Note sur le module "${moduleName}"`,
            message: content.trim().slice(0, 200),
            type: "module_note",
            link: `/projets/${projectId}`,
          });
        }
      }

      setContent("");
      toast.success("Note ajoutée");
    } catch {
      toast.error("Erreur");
    }
  };

  const insertMention = (name: string) => {
    setContent(prev => prev + `@${name} `);
    setShowMentions(false);
  };

  const renderContent = (text: string) => {
    return text.split(/(@\w[\w\s]*?)(?=\s@|$|\s[^@])/).map((part, i) => {
      if (part.startsWith("@")) {
        return (
          <span key={i} className="inline-flex items-center bg-primary/15 text-primary text-xs font-semibold px-1.5 py-0.5 rounded-md">
            {part}
          </span>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs relative">
          <MessageSquare className="w-4 h-4" />
          {notes.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
              {notes.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-3 border-b border-border/50">
          <p className="text-sm font-semibold">Notes — {moduleName}</p>
          <p className="text-xs text-muted-foreground">Feedback et mentions</p>
        </div>

        <div ref={scrollRef} className="max-h-60 overflow-y-auto p-3 space-y-3">
          {notes.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">Aucune note</p>
          )}
          {notes.map(note => (
            <div key={note.id} className={`rounded-lg p-2.5 text-sm ${
              note.user_id === user?.id ? "bg-primary/10 ml-4" : "bg-muted/50 mr-4"
            }`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold">{profiles[note.user_id] || "..."}</span>
                <span className="text-[10px] text-muted-foreground">
                  {formatDistanceToNow(new Date(note.created_at), { addSuffix: true, locale: fr })}
                </span>
              </div>
              <div className="text-xs leading-relaxed">{renderContent(note.content)}</div>
            </div>
          ))}
        </div>

        <div className="p-3 border-t border-border/50 space-y-2">
          <div className="relative">
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Ajouter une note... (@nom pour mentionner)"
              className="text-sm min-h-[60px] resize-none pr-10"
              onKeyDown={(e) => {
                if (e.key === "@") setShowMentions(true);
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
              }}
            />
            <Button
              size="sm"
              variant="ghost"
              className="absolute bottom-1 right-1 h-7 w-7 p-0"
              onClick={handleSubmit}
              disabled={!content.trim() || addNote.isPending}
            >
              <Send className="w-3.5 h-3.5" />
            </Button>
          </div>
          {showMentions && teamMembers.length > 0 && (
            <div className="bg-popover border rounded-md shadow-md p-1 space-y-0.5">
              {teamMembers.map(m => (
                <button
                  key={m.user_id}
                  className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-muted transition-colors"
                  onClick={() => insertMention(m.full_name || m.user_id.slice(0, 8))}
                >
                  @{m.full_name || m.user_id.slice(0, 8)}
                </button>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
