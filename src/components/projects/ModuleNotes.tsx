import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageSquare, Send, Pencil, Trash2, Check, X, History, Loader2, FileDown, FileText, Archive, Download } from "lucide-react";
import {
  useModuleNotes,
  useAddModuleNote,
  useUpdateModuleNote,
  useDeleteModuleNote,
  useModuleNoteHistory,
} from "@/hooks/use-module-notes";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatDistanceToNow, format } from "date-fns";
import { fr } from "date-fns/locale";
import { diffLines } from "diff";
import jsPDF from "jspdf";
import type { TeamMember } from "./ProjectModules";
import { useSeenMarks } from "@/hooks/use-seen-marks";
import { SeenByButton } from "@/components/SeenByButton";

interface Props {
  projectId: string;
  moduleId: string;
  moduleName: string;
  teamMembers: TeamMember[];
}

type FilterMode = "all" | "me" | "team" | "admin";
type HistoryActionFilter = "all" | "update" | "delete";

interface ExportLogEntry {
  id: string;
  project_id: string;
  module_id: string;
  module_name: string | null;
  exported_by: string;
  format: string;
  scope: string;
  note_id: string | null;
  rows_count: number;
  file_name: string;
  file_data: string;
  mime_type: string;
  created_at: string;
}

// Rich rendering: mentions (clickable when matching project member), links, line breaks
function RichContent({
  text,
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
                  <a key={ui} href={part} target="_blank" rel="noopener noreferrer"
                    className="text-primary underline hover:opacity-80 break-all">
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
                    <span key={`${ui}-${mi}`}
                      className="inline-flex items-center bg-primary/15 text-primary text-xs font-semibold px-1.5 py-0.5 rounded-md mx-0.5">
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

// Line-based diff: clearer block view with line breaks preserved
function DiffViewLines({ previous, current }: { previous: string; current: string }) {
  const parts = useMemo(() => diffLines(previous || "", current || "", { newlineIsToken: false }), [previous, current]);
  return (
    <div className="text-xs leading-relaxed bg-background/60 rounded p-2 break-words font-mono space-y-0.5">
      {parts.map((p, i) => {
        const lines = p.value.split("\n");
        // remove trailing empty line caused by terminating \n
        if (lines.length > 1 && lines[lines.length - 1] === "") lines.pop();
        return lines.map((line, li) => {
          if (p.added) {
            return (
              <div key={`${i}-${li}`} className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 rounded px-1.5 py-0.5 border-l-2 border-emerald-500">
                <span className="opacity-60 mr-1.5">+</span>{line || "\u00A0"}
              </div>
            );
          }
          if (p.removed) {
            return (
              <div key={`${i}-${li}`} className="bg-red-500/15 text-red-700 dark:text-red-300 line-through rounded px-1.5 py-0.5 border-l-2 border-red-500">
                <span className="opacity-60 mr-1.5 no-underline inline-block">-</span>{line || "\u00A0"}
              </div>
            );
          }
          return (
            <div key={`${i}-${li}`} className="text-muted-foreground px-1.5 py-0.5">
              <span className="opacity-40 mr-1.5">·</span>{line || "\u00A0"}
            </div>
          );
        });
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
  const [historyActionFilter, setHistoryActionFilter] = useState<HistoryActionFilter>("all");
  const [historySort] = useState<"desc">("desc");
  const [exportLogs, setExportLogs] = useState<ExportLogEntry[]>([]);
  const [exportLogOpen, setExportLogOpen] = useState(false);
  const [allModuleHistory, setAllModuleHistory] = useState<any[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isAdmin = hasRole("admin");

  const { data: history } = useModuleNoteHistory(historyNoteId);

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

  const allModuleNotes = useMemo(
    () => (allNotes || []).filter((n) => n.module_id === moduleId),
    [allNotes, moduleId]
  );

  const notes = useMemo(() => {
    if (filter === "me") return allModuleNotes.filter((n) => n.user_id === user?.id);
    if (filter === "admin") return allModuleNotes.filter((n) => adminIds.has(n.user_id));
    if (filter === "team")
      return allModuleNotes.filter((n) => n.user_id !== user?.id && !adminIds.has(n.user_id));
    return allModuleNotes;
  }, [allModuleNotes, filter, user?.id, adminIds]);

  // Filtered + sorted history (already DESC from backend)
  const filteredHistory = useMemo(() => {
    if (!history) return [];
    let out = history;
    if (historyActionFilter !== "all") {
      out = out.filter((h) => h.action === historyActionFilter);
    }
    return [...out].sort((a, b) => {
      const da = new Date(a.edited_at).getTime();
      const db = new Date(b.edited_at).getTime();
      return historySort === "desc" ? db - da : da - db;
    });
  }, [history, historyActionFilter, historySort]);

  const visibleHistory = useMemo(
    () => filteredHistory.slice(0, historyVisible),
    [filteredHistory, historyVisible]
  );

  // Fetch profiles + admin ids
  useEffect(() => {
    const userIds = [...new Set(allModuleNotes.map((n) => n.user_id))];
    if (userIds.length === 0) return;
    supabase.from("profiles").select("user_id, full_name").in("user_id", userIds).then(({ data }) => {
      const map: Record<string, string> = {};
      data?.forEach((p) => { map[p.user_id] = p.full_name || "Utilisateur"; });
      setProfiles(map);
    });
    supabase.from("user_roles").select("user_id").eq("role", "admin").in("user_id", userIds).then(({ data }) => {
      setAdminIds(new Set((data || []).map((r) => r.user_id)));
    });
  }, [allModuleNotes]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [notes.length]);

  // Load export logs for this module
  const loadExportLogs = async () => {
    const { data, error } = await (supabase as any)
      .from("module_note_export_log")
      .select("*")
      .eq("project_id", projectId)
      .eq("module_id", moduleId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (!error) setExportLogs((data || []) as ExportLogEntry[]);
  };

  useEffect(() => {
    if (exportLogOpen) loadExportLogs();
  }, [exportLogOpen, projectId, moduleId]);

  // Load full module history when "Exporter tout" requested
  const fetchAllModuleHistory = async () => {
    const { data, error } = await (supabase as any)
      .from("module_note_history")
      .select("*")
      .eq("project_id", projectId)
      .eq("module_id", moduleId)
      .order("edited_at", { ascending: false });
    if (error) {
      toast.error("Erreur chargement historique");
      return [];
    }
    // Ensure profiles for these editors are loaded
    const editorIds = [...new Set((data || []).map((h: any) => h.edited_by))].filter(
      (id) => !profiles[id as string]
    );
    if (editorIds.length > 0) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", editorIds as string[]);
      const map = { ...profiles };
      profs?.forEach((p) => { map[p.user_id] = p.full_name || "Utilisateur"; });
      setProfiles(map);
    }
    setAllModuleHistory(data || []);
    return data || [];
  };

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
      const mentions = [...content.matchAll(mentionRegex)].map((m) => m[1].trim().toLowerCase());

      if (mentions.length > 0) {
        for (const member of teamMembers) {
          const name = (member.full_name || "").toLowerCase();
          if (mentions.some((m) => name.includes(m)) && member.user_id !== user.id) {
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

      const { data: admins } = await supabase.from("user_roles").select("user_id").eq("role", "admin");
      for (const admin of admins || []) {
        if (
          admin.user_id !== user.id &&
          !mentions.some((m) => {
            const member = teamMembers.find((tm) => tm.user_id === admin.user_id);
            return member && (member.full_name || "").toLowerCase().includes(m);
          })
        ) {
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
    setContent((prev) => prev + `@${name} `);
    setShowMentions(false);
  };

  const isUpdating = updateNote.isPending;
  const isDeleting = deleteNote.isPending;

  // Persist export to log + download
  const persistAndDownload = async (opts: {
    fileName: string;
    blob: Blob;
    mime: string;
    format: "csv" | "pdf";
    scope: "note" | "module";
    rowsCount: number;
    noteId: string | null;
  }) => {
    const url = URL.createObjectURL(opts.blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = opts.fileName;
    a.click();
    URL.revokeObjectURL(url);

    if (!user) return;
    try {
      const base64 = await blobToBase64(opts.blob);
      await (supabase as any).from("module_note_export_log").insert({
        project_id: projectId,
        module_id: moduleId,
        module_name: moduleName,
        exported_by: user.id,
        format: opts.format,
        scope: opts.scope,
        note_id: opts.noteId,
        rows_count: opts.rowsCount,
        file_name: opts.fileName,
        file_data: base64,
        mime_type: opts.mime,
      });
    } catch (e) {
      console.error("export log persist failed", e);
    }
  };

  const blobToBase64 = (blob: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        resolve(result.split(",")[1] || "");
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

  const buildCSV = (rows: any[]) => {
    const escape = (v: string) => `"${(v || "").replace(/"/g, '""')}"`;
    const lines = [
      ["Date", "Auteur", "Action", "Note ID", "Contenu précédent"].map(escape).join(","),
      ...rows.map((h) =>
        [
          format(new Date(h.edited_at), "dd/MM/yyyy HH:mm", { locale: fr }),
          profiles[h.edited_by] || "Utilisateur",
          h.action === "delete" ? "Supprimée" : "Modifiée",
          h.note_id || "",
          h.previous_content || "",
        ].map(escape).join(",")
      ),
    ];
    return new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
  };

  const buildPDF = (rows: any[], title: string) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 18;
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(title, 14, y);
    y += 6;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(120);
    doc.text(`Généré le ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: fr })}`, 14, y);
    y += 8;
    doc.setTextColor(0);

    rows.forEach((h, idx) => {
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
    return doc.output("blob");
  };

  const exportNoteCSV = async () => {
    const rows = filteredHistory;
    if (rows.length === 0) return toast.error("Aucun historique");
    const blob = buildCSV(rows);
    const fileName = `historique-${moduleName.replace(/\s+/g, "-")}-${format(new Date(), "yyyyMMdd-HHmm")}.csv`;
    await persistAndDownload({ fileName, blob, mime: "text/csv", format: "csv", scope: "note", rowsCount: rows.length, noteId: historyNoteId });
    toast.success("Export CSV téléchargé");
  };

  const exportNotePDF = async () => {
    const rows = filteredHistory;
    if (rows.length === 0) return toast.error("Aucun historique");
    const blob = buildPDF(rows, `Historique de la note — ${moduleName}`);
    const fileName = `historique-${moduleName.replace(/\s+/g, "-")}-${format(new Date(), "yyyyMMdd-HHmm")}.pdf`;
    await persistAndDownload({ fileName, blob, mime: "application/pdf", format: "pdf", scope: "note", rowsCount: rows.length, noteId: historyNoteId });
    toast.success("Export PDF téléchargé");
  };

  const exportModuleAll = async (fmt: "csv" | "pdf") => {
    const rows = await fetchAllModuleHistory();
    if (rows.length === 0) return toast.error("Aucun historique sur ce module");
    const blob = fmt === "csv" ? buildCSV(rows) : buildPDF(rows, `Historique complet — ${moduleName}`);
    const ext = fmt;
    const fileName = `historique-complet-${moduleName.replace(/\s+/g, "-")}-${format(new Date(), "yyyyMMdd-HHmm")}.${ext}`;
    const mime = fmt === "csv" ? "text/csv" : "application/pdf";
    await persistAndDownload({ fileName, blob, mime, format: fmt, scope: "module", rowsCount: rows.length, noteId: null });
    toast.success(`Export ${fmt.toUpperCase()} complet téléchargé`);
  };

  const downloadFromLog = (log: ExportLogEntry) => {
    try {
      const byteString = atob(log.file_data);
      const bytes = new Uint8Array(byteString.length);
      for (let i = 0; i < byteString.length; i++) bytes[i] = byteString.charCodeAt(i);
      const blob = new Blob([bytes], { type: log.mime_type });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = log.file_name;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Téléchargement impossible");
    }
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
          <div className="flex items-center gap-1">
            <Select value={filter} onValueChange={(v) => setFilter(v as FilterMode)}>
              <SelectTrigger className="h-7 w-[100px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">Toutes</SelectItem>
                <SelectItem value="me" className="text-xs">Moi</SelectItem>
                <SelectItem value="team" className="text-xs">Équipe</SelectItem>
                <SelectItem value="admin" className="text-xs">Admin</SelectItem>
              </SelectContent>
            </Select>
            <Button
              size="sm" variant="ghost" className="h-7 w-7 p-0"
              title="Journal d'exports"
              onClick={() => setExportLogOpen(true)}
            >
              <Archive className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        <div ref={scrollRef} className="max-h-72 overflow-y-auto p-3 space-y-3">
          {notes.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">Aucune note</p>
          )}
          {notes.map((note) => {
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
                    <Button size="sm" variant="ghost" className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Historique" onClick={() => { setHistoryNoteId(note.id); setHistoryVisible(5); setHistoryActionFilter("all"); }}>
                      <History className="w-3 h-3" />
                    </Button>
                    {canModify && !isEditing && (
                      <>
                        <Button size="sm" variant="ghost"
                          className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          disabled={busy}
                          onClick={() => { setEditingId(note.id); setEditingContent(note.content); setEditingOriginal(note.content); }}>
                          <Pencil className="w-3 h-3" />
                        </Button>
                        <Button size="sm" variant="ghost"
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
                          }}>
                          {busy && deletingId === note.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                {isEditing ? (
                  <div className="space-y-1.5">
                    <Textarea value={editingContent} onChange={(e) => setEditingContent(e.target.value)}
                      className="text-xs min-h-[50px] resize-none" autoFocus disabled={isUpdating} />
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" disabled={isUpdating}
                        onClick={() => { setEditingId(null); setEditingContent(""); setEditingOriginal(""); }}>
                        <X className="w-3 h-3 mr-1" /> Annuler
                      </Button>
                      <Button size="sm" className="h-6 px-2 text-xs"
                        disabled={!editingContent.trim() || isUpdating || editingContent.trim() === editingOriginal}
                        onClick={async () => {
                          try {
                            await updateNote.mutateAsync({ id: note.id, content: editingContent.trim(), previousContent: editingOriginal });
                            setEditingId(null); setEditingContent(""); setEditingOriginal("");
                            toast.success("Note modifiée");
                          } catch { toast.error("Erreur"); }
                        }}>
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
            <Button size="sm" variant="ghost" className="absolute bottom-1 right-1 h-7 w-7 p-0"
              onClick={handleSubmit} disabled={!content.trim() || addNote.isPending}>
              {addNote.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            </Button>
          </div>
          {showMentions && teamMembers.length > 0 && (
            <div className="bg-popover border rounded-md shadow-md p-1 space-y-0.5 max-h-32 overflow-y-auto">
              {teamMembers.map((m) => (
                <button key={m.user_id}
                  className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-muted transition-colors"
                  onClick={() => insertMention(m.full_name || m.user_id.slice(0, 8))}>
                  @{m.full_name || m.user_id.slice(0, 8)}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* History Dialog */}
        <Dialog open={!!historyNoteId} onOpenChange={(o) => {
          if (!o) { setHistoryNoteId(null); setHistoryVisible(5); setHistoryActionFilter("all"); }
        }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <History className="w-4 h-4" /> Historique de la note
              </DialogTitle>
            </DialogHeader>

            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-border/50">
              <Select value={historyActionFilter} onValueChange={(v) => { setHistoryActionFilter(v as HistoryActionFilter); setHistoryVisible(5); }}>
                <SelectTrigger className="h-7 w-[140px] text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">Toutes les actions</SelectItem>
                  <SelectItem value="update" className="text-xs">Modifiée</SelectItem>
                  <SelectItem value="delete" className="text-xs">Supprimée</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-1 flex-wrap">
                <Button size="sm" variant="outline" className="h-7 px-2 text-xs gap-1" onClick={exportNoteCSV} disabled={!filteredHistory.length}>
                  <FileDown className="w-3 h-3" /> CSV
                </Button>
                <Button size="sm" variant="outline" className="h-7 px-2 text-xs gap-1" onClick={exportNotePDF} disabled={!filteredHistory.length}>
                  <FileText className="w-3 h-3" /> PDF
                </Button>
                <Button size="sm" variant="default" className="h-7 px-2 text-xs gap-1" onClick={() => exportModuleAll("csv")}>
                  <Archive className="w-3 h-3" /> Tout (CSV)
                </Button>
                <Button size="sm" variant="default" className="h-7 px-2 text-xs gap-1" onClick={() => exportModuleAll("pdf")}>
                  <Archive className="w-3 h-3" /> Tout (PDF)
                </Button>
              </div>
            </div>

            <div className="max-h-[55vh] overflow-y-auto space-y-3 pt-2">
              {filteredHistory.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-6">Aucune modification enregistrée</p>
              )}
              {visibleHistory.map((h, idx) => {
                const currentNote = allModuleNotes.find((n) => n.id === historyNoteId);
                // After-content: chronologically newer entry's previous_content; if first in DESC sort, current note content
                const sortedDesc = filteredHistory;
                const sortedIdx = sortedDesc.indexOf(h);
                const afterContent = sortedIdx === 0
                  ? (currentNote?.content ?? "")
                  : (sortedDesc[sortedIdx - 1]?.previous_content ?? "");
                return (
                  <div key={h.id} className="border border-border/50 rounded-lg p-3 bg-muted/30 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold">
                        {profiles[h.edited_by] || "Utilisateur"}
                        <span className={`ml-2 text-[10px] uppercase px-1.5 py-0.5 rounded ${
                          h.action === "delete" ? "bg-red-500/20 text-red-700 dark:text-red-300" : "bg-amber-500/20 text-amber-700 dark:text-amber-300"
                        }`}>
                          {h.action === "delete" ? "Supprimée" : "Modifiée"}
                        </span>
                      </span>
                      <span className="text-muted-foreground text-[10px]">
                        {format(new Date(h.edited_at), "dd/MM/yyyy HH:mm", { locale: fr })}
                      </span>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground mb-1">Différences (ligne par ligne) :</p>
                      {/* Lazy render: only computed for visible (we already only render visibleHistory) */}
                      <DiffViewLines previous={h.previous_content || ""} current={afterContent} />
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
              {filteredHistory.length > historyVisible && (
                <div className="flex justify-center pt-2">
                  <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => setHistoryVisible((v) => v + 5)}>
                    Charger plus ({filteredHistory.length - historyVisible} restantes)
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Export Log Dialog */}
        <Dialog open={exportLogOpen} onOpenChange={setExportLogOpen}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <Archive className="w-4 h-4" /> Journal d'exports — {moduleName}
              </DialogTitle>
            </DialogHeader>
            <div className="max-h-[60vh] overflow-y-auto space-y-2">
              {exportLogs.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-6">Aucun export pour ce module</p>
              )}
              {exportLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between gap-3 border border-border/50 rounded-lg p-2.5 bg-muted/30">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                        log.format === "pdf" ? "bg-red-500/20 text-red-700 dark:text-red-300" : "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                      }`}>
                        {log.format}
                      </span>
                      <span className={`text-[10px] uppercase px-1.5 py-0.5 rounded ${
                        log.scope === "module" ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                      }`}>
                        {log.scope === "module" ? "Module entier" : "Note"}
                      </span>
                      <span className="text-[10px] text-muted-foreground">{log.rows_count} ligne(s)</span>
                    </div>
                    <p className="text-xs font-semibold truncate mt-1">{log.file_name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {profiles[log.exported_by] || "Utilisateur"} • {format(new Date(log.created_at), "dd/MM/yyyy HH:mm", { locale: fr })}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" className="h-8 px-2 text-xs gap-1 shrink-0"
                    onClick={() => downloadFromLog(log)}>
                    <Download className="w-3 h-3" /> Re-télécharger
                  </Button>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </PopoverContent>
    </Popover>
  );
}
