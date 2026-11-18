import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DONE_TASK_STATUS, isAgendaTask } from "@/lib/task-tracking";

export type AgendaTask = {
  id: string;
  title: string;
  status: string;
  priority: string | null;
  due_date: string | null;
  assigned_to: string | null;
  project_id: string;
  project_status: string | null;
  project_name: string | null;
  client_id: string | null;
  client_name: string | null;
  client_ndi: string | null;
};

const PAGE = 1000;

/** Fetches every row of a query, page by page (the API returns at most 1 000 rows per call). */
export async function fetchAllPages<T>(build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: any }>): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await build(from, from + PAGE - 1);
    if (error) throw error;
    out.push(...(data || []));
    if (!data || data.length < PAGE) break;
  }
  return out;
}

const toAgendaTask = (r: any): AgendaTask => ({
  id: r.id,
  title: r.title,
  status: r.status,
  priority: r.priority,
  due_date: r.due_date,
  assigned_to: r.assigned_to,
  project_id: r.project_id,
  project_status: r.projects?.status ?? null,
  project_name: r.projects?.name ?? null,
  client_id: r.projects?.client_id ?? null,
  client_name: r.projects?.clients?.company_name ?? null,
  client_ndi: r.projects?.clients?.ndi ?? null,
});

const SELECT = "id, title, status, priority, due_date, assigned_to, project_id, projects(name, status, client_id, clients(company_name, ndi))";

/** All open tasks of active projects (the agenda's content). */
export function useOpenTasks(queryKey: string = "agenda-tasks") {
  return useQuery({
    queryKey: [queryKey],
    staleTime: 30_000,
    queryFn: async () => {
      const rows = await fetchAllPages<any>((from, to) =>
        supabase.from("project_tasks").select(SELECT).neq("status", DONE_TASK_STATUS)
          .order("due_date", { ascending: true, nullsFirst: false }).order("id").range(from, to),
      );
      return rows.map(toAgendaTask).filter(isAgendaTask);
    },
  });
}

/** Every task of one client's projects, done or not. */
export function useClientTasks(clientId: string | undefined) {
  return useQuery({
    queryKey: ["client-task-stats", clientId],
    enabled: !!clientId,
    queryFn: async () => {
      const { data: projects, error: pErr } = await supabase.from("projects").select("id").eq("client_id", clientId!);
      if (pErr) throw pErr;
      const ids = (projects || []).map((p) => p.id);
      if (!ids.length) return [] as AgendaTask[];
      const rows = await fetchAllPages<any>((from, to) =>
        supabase.from("project_tasks").select(SELECT).in("project_id", ids)
          .order("due_date", { ascending: true, nullsFirst: false }).order("id").range(from, to),
      );
      return rows.map(toAgendaTask);
    },
  });
}

export function useSetTaskStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { data, error } = await supabase.from("project_tasks").update({ status: status as any }).eq("id", id).select("id");
      if (error) throw error;
      if (!data?.length) throw new Error("not-allowed");
    },
    onSuccess: () => {
      ["agenda-tasks", "clients-status", "client-task-stats", "overdue-tasks-dashboard", "all_project_tasks_full", "project_tasks"].forEach((k) =>
        qc.invalidateQueries({ queryKey: [k] }),
      );
    },
  });
}
