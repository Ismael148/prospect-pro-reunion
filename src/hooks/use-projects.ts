import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { triggerN8nWebhook } from "@/lib/n8n-webhook";

export type Project = Tables<"projects">;
export type ProjectTask = Tables<"project_tasks">;
export type Deliverable = Tables<"deliverables">;

export function useProjects() {
  return useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*, clients(company_name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useMyProjects(userId: string | undefined, isAdmin: boolean) {
  return useQuery({
    queryKey: ["projects", "my", userId],
    queryFn: async () => {
      if (isAdmin) {
        const { data, error } = await supabase
          .from("projects")
          .select("*, clients(company_name)")
          .order("created_at", { ascending: false });
        if (error) throw error;
        return data;
      }
      // Non-admin: only see projects assigned to them OR where they have assigned tasks
      const { data: assignedProjects, error: e1 } = await supabase
        .from("projects")
        .select("*, clients(company_name)")
        .eq("assigned_to", userId!)
        .order("created_at", { ascending: false });
      if (e1) throw e1;

      const { data: taskProjects, error: e2 } = await supabase
        .from("project_tasks")
        .select("project_id")
        .eq("assigned_to", userId!);
      if (e2) throw e2;

      const taskProjectIds = new Set(taskProjects?.map(t => t.project_id) || []);
      
      if (taskProjectIds.size === 0) return assignedProjects || [];

      const { data: extraProjects, error: e3 } = await supabase
        .from("projects")
        .select("*, clients(company_name)")
        .in("id", Array.from(taskProjectIds))
        .order("created_at", { ascending: false });
      if (e3) throw e3;

      // Merge and deduplicate
      const allProjects = [...(assignedProjects || [])];
      const existingIds = new Set(allProjects.map(p => p.id));
      for (const p of (extraProjects || [])) {
        if (!existingIds.has(p.id)) allProjects.push(p);
      }
      return allProjects;
    },
    enabled: !!userId,
  });
}

export function useProject(id: string) {
  return useQuery({
    queryKey: ["projects", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*, clients(company_name, city)")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useProjectTasks(projectId: string) {
  return useQuery({
    queryKey: ["project_tasks", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_tasks")
        .select("*")
        .eq("project_id", projectId)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });
}

export function useDeliverables(projectId: string) {
  return useQuery({
    queryKey: ["deliverables", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deliverables")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (project: TablesInsert<"projects">) => {
      const { data, error } = await supabase.from("projects").insert(project).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["projects"] }),
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<"projects"> & { id: string }) => {
      const { data, error } = await supabase.from("projects").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["projects", data.id] });
      
      if (variables.progress && variables.progress >= 80) {
        triggerN8nWebhook('project.progress', {
          project_name: data.name,
          progress: data.progress,
          client_id: data.client_id,
          project_id: data.id,
        });
      }
    },
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (task: TablesInsert<"project_tasks">) => {
      const { data, error } = await supabase.from("project_tasks").insert(task).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => queryClient.invalidateQueries({ queryKey: ["project_tasks", data.project_id] }),
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<"project_tasks"> & { id: string }) => {
      const { data, error } = await supabase.from("project_tasks").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => queryClient.invalidateQueries({ queryKey: ["project_tasks", data.project_id] }),
  });
}

export function useCreateDeliverable() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (deliverable: TablesInsert<"deliverables">) => {
      const { data, error } = await supabase.from("deliverables").insert(deliverable).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => queryClient.invalidateQueries({ queryKey: ["deliverables", data.project_id] }),
  });
}

export function useUpdateDeliverable() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<"deliverables"> & { id: string }) => {
      const { data, error } = await supabase.from("deliverables").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => queryClient.invalidateQueries({ queryKey: ["deliverables", data.project_id] }),
  });
}

export function useDeleteProjectTasks() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (projectId: string) => {
      const { error } = await supabase.from("project_tasks").delete().eq("project_id", projectId);
      if (error) throw error;
      return projectId;
    },
    onSuccess: (projectId) => queryClient.invalidateQueries({ queryKey: ["project_tasks", projectId] }),
  });
}
