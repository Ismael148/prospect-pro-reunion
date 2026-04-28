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
    mutationFn: async ({ id, content }: { id: string; content: string }) => {
      const { data, error } = await supabase
        .from("module_notes")
        .update({ content })
        .eq("id", id)
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

export function useDeleteModuleNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, project_id }: { id: string; project_id: string }) => {
      const { error } = await supabase.from("module_notes").delete().eq("id", id);
      if (error) throw error;
      return { project_id };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["module-notes", data.project_id] });
    },
  });
}
