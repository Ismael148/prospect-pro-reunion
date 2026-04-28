import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ModuleNote {
  id: string;
  project_id: string;
  module_id: string;
  user_id: string;
  content: string;
  created_at: string;
}

export interface ModuleNoteHistory {
  id: string;
  note_id: string;
  project_id: string;
  module_id: string;
  previous_content: string;
  edited_by: string;
  edited_at: string;
  action: string;
}

export function useModuleNotes(projectId: string) {
  const queryClient = useQueryClient();
  const channelInstanceRef = useRef(
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2)
  );

  useEffect(() => {
    if (!projectId) return;

    const channel = supabase
      .channel(`module-notes-${projectId}-${channelInstanceRef.current}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "module_notes", filter: `project_id=eq.${projectId}` },
        () => queryClient.invalidateQueries({ queryKey: ["module-notes", projectId] })
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [projectId, queryClient]);

  return useQuery({
    queryKey: ["module-notes", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("module_notes")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as ModuleNote[];
    },
  });
}

export function useModuleNoteHistory(noteId: string | null) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!noteId) return;
    const channel = supabase
      .channel(`module-note-history-${noteId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "module_note_history", filter: `note_id=eq.${noteId}` },
        () => queryClient.invalidateQueries({ queryKey: ["module-note-history", noteId] })
      )
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [noteId, queryClient]);

  return useQuery({
    queryKey: ["module-note-history", noteId],
    enabled: !!noteId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("module_note_history")
        .select("*")
        .eq("note_id", noteId)
        .order("edited_at", { ascending: false });
      if (error) throw error;
      return (data || []) as ModuleNoteHistory[];
    },
  });
}

async function notifyNoteChange(opts: {
  projectId: string;
  moduleId: string;
  authorId: string;
  action: "modifiée" | "supprimée";
  contentSnippet: string;
}) {
  // Fetch project + members
  const { data: project } = await supabase
    .from("projects")
    .select("name, assigned_to, created_by")
    .eq("id", opts.projectId)
    .maybeSingle();

  if (!project) return;

  const recipients = new Set<string>();
  if (project.assigned_to && project.assigned_to !== opts.authorId) recipients.add(project.assigned_to);
  if (project.created_by && project.created_by !== opts.authorId) recipients.add(project.created_by);

  // Add admins
  const { data: admins } = await supabase.from("user_roles").select("user_id").eq("role", "admin");
  admins?.forEach((a) => { if (a.user_id !== opts.authorId) recipients.add(a.user_id); });

  // Add other authors of notes on this module
  const { data: otherAuthors } = await supabase
    .from("module_notes")
    .select("user_id")
    .eq("project_id", opts.projectId)
    .eq("module_id", opts.moduleId);
  otherAuthors?.forEach((n) => { if (n.user_id !== opts.authorId) recipients.add(n.user_id); });

  const icon = opts.action === "modifiée" ? "✏️" : "🗑️";
  const inserts = Array.from(recipients).map((uid) => ({
    user_id: uid,
    title: `${icon} Note ${opts.action} — ${project.name}`,
    message: opts.contentSnippet.slice(0, 200),
    type: "module_note",
    link: `/projets/${opts.projectId}`,
  }));
  if (inserts.length > 0) {
    await supabase.from("notifications").insert(inserts);
  }
}

export function useAddModuleNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ project_id, module_id, user_id, content }: {
      project_id: string; module_id: string; user_id: string; content: string;
    }) => {
      const { data, error } = await supabase
        .from("module_notes")
        .insert({ project_id, module_id, user_id, content })
        .select()
        .single();
      if (error) throw error;
      return data as ModuleNote;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["module-notes", data.project_id] });
    },
  });
}

export function useUpdateModuleNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, content, previousContent }: { id: string; content: string; previousContent: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Fetch existing note for project/module info + history
      const { data: existing, error: fetchErr } = await supabase
        .from("module_notes")
        .select("*")
        .eq("id", id)
        .single();
      if (fetchErr) throw fetchErr;

      // Insert history
      await (supabase as any).from("module_note_history").insert({
        note_id: id,
        project_id: existing.project_id,
        module_id: existing.module_id,
        previous_content: previousContent,
        edited_by: user.id,
        action: "update",
      });

      const { data, error } = await supabase
        .from("module_notes")
        .update({ content })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;

      // Notify
      await notifyNoteChange({
        projectId: existing.project_id,
        moduleId: existing.module_id,
        authorId: user.id,
        action: "modifiée",
        contentSnippet: content,
      });

      return data as ModuleNote;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["module-notes", data.project_id] });
      queryClient.invalidateQueries({ queryKey: ["module-note-history", data.id] });
    },
  });
}

export function useDeleteModuleNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, project_id }: { id: string; project_id: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: existing } = await supabase
        .from("module_notes")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (existing) {
        await (supabase as any).from("module_note_history").insert({
          note_id: id,
          project_id: existing.project_id,
          module_id: existing.module_id,
          previous_content: existing.content,
          edited_by: user.id,
          action: "delete",
        });
      }

      const { error } = await supabase.from("module_notes").delete().eq("id", id);
      if (error) throw error;

      if (existing) {
        await notifyNoteChange({
          projectId: existing.project_id,
          moduleId: existing.module_id,
          authorId: user.id,
          action: "supprimée",
          contentSnippet: existing.content,
        });
      }
      return { project_id };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["module-notes", data.project_id] });
    },
  });
}
