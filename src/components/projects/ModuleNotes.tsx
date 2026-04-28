import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageSquare, Send, Pencil, Trash2, Check, X, History, Loader2, FileDown, FileText } from "lucide-react";
import { useModuleNotes, useAddModuleNote, useUpdateModuleNote, useDeleteModuleNote, useModuleNoteHistory } from "@/hooks/use-module-notes";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatDistanceToNow, format } from "date-fns";
import { fr } from "date-fns/locale";
import { diffWords } from "diff";
import jsPDF from "jspdf";
import type { TeamMember } from "./ProjectModules";

interface Props {
  projectId: string;
  moduleId: string;
  moduleName: string;
  teamMembers: TeamMember[];
}

type FilterMode = "all" | "me" | "team" | "admin";

// Rich rendering: mentions (clickable when matching project member), links, line breaks
function RichContent({
  text,
  adminIds,
  memberByName,
  onMentionClick,
}: {
  text: string;
  adminIds: Set<string>;
  memberByName: Map<string, TeamMember>;
  onMentionClick: (member: TeamMember) => void;
}) {
  const lines = text.split("\n");
  const urlRegex = /(https?:\/\/[^\s]+)/g;

  const findMember = (mention: string): TeamMember | null => {
    const key = mention.replace(/^@/, "").trim().toLowerCase();
    if (!key) return null;
    // exact then prefix
    if (memberByName.has(key)) return memberByName.get(key)!;
    for (const [name, m] of memberByName.entries()) {
      if (name.startsWith(key) || key.startsWith(name)) return m;
    }
    return null;
  };

  return (
    <>
      {lines.map((line, li) => {
        const urlParts = line.split(urlRegex);
        return (
          <div key={li} className="break-words">
            {urlParts.map((part, ui) => {
              if (urlRegex.test(part)) {
                return (
                  <a
                    key={ui}
                    href={part}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline hover:opacity-80 break-all"
                  >
                    {part}
                  </a>
                );
              }
              const mentionParts = part.split(/(@\w[\w\s]*?)(?=\s@|$|\s[^@]|[.,!?])/);
              return mentionParts.map((mp, mi) => {
                if (mp.startsWith("@")) {
                  const member = findMember(mp);
                  if (member) {
                    return (
                      <button
                        key={`${ui}-${mi}`}
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onMentionClick(member); }}
                        className="inline-flex items-center bg-primary/20 hover:bg-primary/30 text-primary text-xs font-semibold px-1.5 py-0.5 rounded-md mx-0.5 cursor-pointer transition-colors"
                        title={`Voir ${member.full_name || ""}`}
                      >
                        {mp}
                      </button>
                    );
                  }
                  return (
                    <span
                      key={`${ui}-${mi}`}
                      className="inline-flex items-center bg-primary/15 text-primary text-xs font-semibold px-1.5 py-0.5 rounded-md mx-0.5"
                    >
                      {mp}
                    </span>
                  );
                }
                return <span key={`${ui}-${mi}`}>{mp}</span>;
              });
            })}
            {line === "" && <br />}
          </div>
        );
      })}
    </>
  );
}

// Word-level diff between previous and current
function DiffView({ previous, current }: { previous: string; current: string }) {
  const parts = diffWords(previous || "", current || "");
  return (
    <div className="text-xs leading-relaxed bg-background/60 rounded p-2 break-words whitespace-pre-wrap">
      {parts.map((p, i) => {
        if (p.added) return <span key={i} className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 rounded px-0.5">{p.value}</span>;
        if (p.removed) return <span key={i} className="bg-red-500/20 text-red-700 dark:text-red-300 line-through rounded px-0.5">{p.value}</span>;
        return <span key={i} className="text-muted-foreground">{p.value}</span>;
      })}
    </div>
  );
}

export default function ModuleNotes({ projectId, moduleId, moduleName, teamMembers }: Props) {
  const navigate = useNavigate();
  const { user, hasRole } = useAuth();
  const { data: allNotes } = useModuleNotes(projectId);
  const addNote = useAddModuleNote();
  const updateNote = useUpdateModuleNote();
  const deleteNote = useDeleteModuleNote();
  const [content, setContent] = useState("");
  const [showMentions, setShowMentions] = useState(false);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [adminIds, setAdminIds] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [editingOriginal, setEditingOriginal] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterMode>("all");
  const [historyNoteId, setHistoryNoteId] = useState<string | null>(null);
  const [historyVisible, setHistoryVisible] = useState(5);
  const [exportOpen, setExportOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isAdmin = hasRole("admin");

  const { data: history } = useModuleNoteHistory(historyNoteId);

  // Member lookup map for mention click
  const memberByName = useMemo(() => {
    const map = new Map<string, TeamMember>();
    teamMembers.forEach((m) => {
      const name = (m.full_name || "").trim().toLowerCase();
      if (name) map.set(name, m);
    });
    return map;
  }, [teamMembers]);

  const handleMentionClick = (member: TeamMember) => {
    navigate(`/equipe?member=${member.user_id}`);
  };

  const allModuleNotes = useMemo(() =>
    (allNotes || []).filter(n => n.module_id === moduleId),
    [allNotes, moduleId]
  );

  const notes = useMemo(() => {
    if (filter === "me") return allModuleNotes.filter(n => n.user_id === user?.id);
    if (filter === "admin") return allModuleNotes.filter(n => adminIds.has(n.user_id));
    if (filter === "team") return allModuleNotes.filter(n => n.user_id !== user?.id && !adminIds.has(n.user_id));
    return allModuleNotes;
  }, [allModuleNotes, filter, user?.id, adminIds]);

  // Fetch profiles + admin ids
  useEffect(() => {
    const userIds = [...new Set(allModuleNotes.map(n => n.user_id))];
    if (userIds.length === 0) return;
    supabase.from("profiles").select("user_id, full_name").in("user_id", userIds)
      .then(({ data }) => {
        const map: Record<string, string> = {};
        data?.forEach(p => { map[p.user_id] = p.full_name || "Utilisateur"; });
        setProfiles(map);
      });
    supabase.from("user_roles").select("user_id").eq("role", "admin").in("user_id", userIds)
      .then(({ data }) => {
        setAdminIds(new Set((data || []).map(r => r.user_id)));
      });
  }, [allModuleNotes]);

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

  const isUpdating = updateNote.isPending;
  const isDeleting = deleteNote.isPending;

  const exportHistoryCSV = () => {
    if (!history || history.length === 0) {
      toast.error("Aucun historique à exporter");
      return;
    }
    const escape = (v: string) => `"${(v || "").replace(/"/g, '""')}"`;
    const rows = [
      ["Date", "Auteur", "Action", "Contenu précédent"].map(escape).join(","),
      ...history.map((h) => [
        format(new Date(h.edited_at), "dd/MM/yyyy HH:mm", { locale: fr }),
        profiles[h.edited_by] || "Utilisateur",
        h.action === "delete" ? "Supprimée" : "Modifiée",
        h.previous_content || "",
      ].map(escape).join(",")),
    ];
    const blob = new Blob(["\uFEFF" + rows.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `historique-notes-${moduleName.replace(/\s+/g, "-")}-${format(new Date(), "yyyyMMdd-HHmm")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Export CSV téléchargé");
  };

  const exportHistoryPDF = () => {
    if (!history || history.length === 0) {
      toast.error("Aucun historique à exporter");
      return;
    }
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 18;
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(`Historique des notes — ${moduleName}`, 14, y);
    y += 6;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(120);
    doc.text(`Généré le ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: fr })}`, 14, y);
    y += 8;
    doc.setTextColor(0);

    history.forEach((h, idx) => {
      if (y > 270) { doc.addPage(); y = 18; }
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(
        `${idx + 1}. ${profiles[h.edited_by] || "Utilisateur"} — ${h.action === "delete" ? "Supprimée" : "Modifiée"}`,
        14, y
      );
      y += 5;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(120);
      doc.text(format(new Date(h.edited_at), "dd/MM/yyyy HH:mm", { locale: fr }), 14, y);
      y += 5;
      doc.setTextColor(0);
      doc.setFontSize(9);
      const lines = doc.splitTextToSize(h.previous_content || "(vide)", pageWidth - 28);
      lines.forEach((line: string) => {
        if (y > 280) { doc.addPage(); y = 18; }
        doc.text(line, 18, y);
        y += 4;
      });
      y += 4;
    });
    doc.save(`historique-notes-${moduleName.replace(/\s+/g, "-")}-${format(new Date(), "yyyyMMdd-HHmm")}.pdf`);
    toast.success("Export PDF téléchargé");
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs relative">
          <MessageSquare className="w-4 h-4" />
          {allModuleNotes.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
              {allModuleNotes.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="p-3 border-b border-border/50 flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-semibold">Notes — {moduleName}</p>
            <p className="text-xs text-muted-foreground">Feedback et mentions</p>
          </div>
          <Select value={filter} onValueChange={(v) => setFilter(v as FilterMode)}>
            <SelectTrigger className="h-7 w-[110px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">Toutes</SelectItem>
              <SelectItem value="me" className="text-xs">Moi</SelectItem>
              <SelectItem value="team" className="text-xs">Équipe</SelectItem>
              <SelectItem value="admin" className="text-xs">Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div ref={scrollRef} className="max-h-72 overflow-y-auto p-3 space-y-3">
          {notes.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">Aucune note</p>
          )}
          {notes.map(note => {
            const canModify = note.user_id === user?.id || isAdmin;
            const isEditing = editingId === note.id;
            const busy = (isUpdating && isEditing) || (isDeleting && deletingId === note.id);
            return (
              <div key={note.id} className={`group rounded-lg p-2.5 text-sm ${
                note.user_id === user?.id ? "bg-primary/10 ml-4" : "bg-muted/50 mr-4"
              }`}>
                <div className="flex items-center justify-between mb-1 gap-2">
                  <span className="text-xs font-semibold truncate flex items-center gap-1">
                    {profiles[note.user_id] || "..."}
                    {adminIds.has(note.user_id) && (
                      <span className="text-[9px] bg-primary/20 text-primary px-1 rounded">ADMIN</span>
                    )}
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(note.created_at), { addSuffix: true, locale: fr })}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Historique"
                      onClick={() => setHistoryNoteId(note.id)}
                    >
                      <History className="w-3 h-3" />
                    </Button>
                    {canModify && !isEditing && (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          disabled={busy}
                          onClick={() => { setEditingId(note.id); setEditingContent(note.content); setEditingOriginal(note.content); }}
                        >
                          <Pencil className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                          disabled={busy}
                          onClick={async () => {
                            if (!confirm("Supprimer cette note ?")) return;
                            setDeletingId(note.id);
                            try {
                              await deleteNote.mutateAsync({ id: note.id, project_id: projectId });
                              toast.success("Note supprimée");
                            } catch { toast.error("Erreur"); }
                            finally { setDeletingId(null); }
                          }}
                        >
                          {busy && deletingId === note.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                {isEditing ? (
                  <div className="space-y-1.5">
                    <Textarea
                      value={editingContent}
                      onChange={(e) => setEditingContent(e.target.value)}
                      className="text-xs min-h-[50px] resize-none"
                      autoFocus
                      disabled={isUpdating}
                    />
                    <div className="flex justify-end gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2 text-xs"
                        disabled={isUpdating}
                        onClick={() => { setEditingId(null); setEditingContent(""); setEditingOriginal(""); }}
                      >
                        <X className="w-3 h-3 mr-1" /> Annuler
                      </Button>
                      <Button
                        size="sm"
                        className="h-6 px-2 text-xs"
                        disabled={!editingContent.trim() || isUpdating || editingContent.trim() === editingOriginal}
                        onClick={async () => {
                          try {
                            await updateNote.mutateAsync({
                              id: note.id,
                              content: editingContent.trim(),
                              previousContent: editingOriginal,
                            });
                            setEditingId(null);
                            setEditingContent("");
                            setEditingOriginal("");
                            toast.success("Note modifiée");
                          } catch { toast.error("Erreur"); }
                        }}
                      >
                        {isUpdating ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Check className="w-3 h-3 mr-1" />}
                        Enregistrer
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs leading-relaxed space-y-0.5">
                    <RichContent text={note.content} adminIds={adminIds} memberByName={memberByName} onMentionClick={handleMentionClick} />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="p-3 border-t border-border/50 space-y-2">
          <div className="relative">
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Ajouter une note... (@nom, liens, retours à la ligne)"
              className="text-sm min-h-[60px] resize-none pr-10"
              disabled={addNote.isPending}
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
              {addNote.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            </Button>
          </div>
          {showMentions && teamMembers.length > 0 && (
            <div className="bg-popover border rounded-md shadow-md p-1 space-y-0.5 max-h-32 overflow-y-auto">
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

        {/* History Dialog */}
        <Dialog
          open={!!historyNoteId}
          onOpenChange={(o) => {
            if (!o) { setHistoryNoteId(null); setHistoryVisible(5); }
          }}
        >
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between gap-2 text-base">
                <span className="flex items-center gap-2">
                  <History className="w-4 h-4" /> Historique de la note
                </span>
                <div className="flex items-center gap-1 mr-6">
                  <Button size="sm" variant="outline" className="h-7 px-2 text-xs gap-1" onClick={exportHistoryCSV} disabled={!history?.length}>
                    <FileDown className="w-3 h-3" /> CSV
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 px-2 text-xs gap-1" onClick={exportHistoryPDF} disabled={!history?.length}>
                    <FileText className="w-3 h-3" /> PDF
                  </Button>
                </div>
              </DialogTitle>
            </DialogHeader>
            <div className="max-h-[60vh] overflow-y-auto space-y-3">
              {(!history || history.length === 0) && (
                <p className="text-xs text-muted-foreground text-center py-6">
                  Aucune modification enregistrée
                </p>
              )}
              {history?.slice(0, historyVisible).map((h, idx, arr) => {
                // current = previous version's content (next entry chronologically newer = arr[idx-1].previous_content)
                // history is ordered DESC; arr[idx-1] is more recent. The "after" content for entry idx is arr[idx-1]?.previous_content
                // OR if idx === 0: the current note content
                const currentNote = allModuleNotes.find(n => n.id === historyNoteId);
                const afterContent = idx === 0
                  ? (currentNote?.content ?? "")
                  : (arr[idx - 1]?.previous_content ?? "");
                return (
                  <div key={h.id} className="border border-border/50 rounded-lg p-3 bg-muted/30 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold">
                        {profiles[h.edited_by] || "Utilisateur"}
                        <span className="ml-2 text-[10px] uppercase text-muted-foreground">
                          {h.action === "delete" ? "Supprimée" : "Modifiée"}
                        </span>
                      </span>
                      <span className="text-muted-foreground text-[10px]">
                        {format(new Date(h.edited_at), "dd/MM/yyyy HH:mm", { locale: fr })}
                      </span>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground mb-1">Différences :</p>
                      <DiffView previous={h.previous_content || ""} current={afterContent} />
                    </div>
                    <details className="text-[11px]">
                      <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Voir le contenu précédent brut</summary>
                      <div className="mt-1 text-xs bg-background/60 rounded p-2 whitespace-pre-wrap break-words">
                        {h.previous_content}
                      </div>
                    </details>
                  </div>
                );
              })}
              {history && history.length > historyVisible && (
                <div className="flex justify-center pt-2">
                  <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => setHistoryVisible(v => v + 5)}>
                    Charger plus ({history.length - historyVisible} restantes)
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </PopoverContent>
    </Popover>
  );
}
