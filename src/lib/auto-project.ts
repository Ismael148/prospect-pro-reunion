import { supabase } from "@/integrations/supabase/client";
import { getPackModules, PACK_DEADLINE_DAYS, PACK_LABELS } from "@/lib/constants";

/** Insert all pack module tasks for a project (assignment is done by a DB trigger). */
export async function insertPackTasks(projectId: string, client: any, startDate: string) {
  const modules = getPackModules(
    client.pack_type, client.site_type || "vitrine", !!client.has_gmb,
    !!client.tuning_website_addon, !!client.tuning_skip_card,
  );
  if (!modules.length) return 0;
  const rows: any[] = [];
  let sort = 0;
  for (const mod of modules) {
    const due = new Date(new Date(startDate).getTime() + mod.deadlineDays * 86400000).toISOString().split("T")[0];
    for (const t of mod.tasks) {
      rows.push({
        project_id: projectId,
        title: t.title,
        description: `[${mod.id}] ${t.description || ""}`.trim(),
        priority: t.priority,
        due_date: due,
        sort_order: sort++,
      });
    }
  }
  const { error } = await supabase.from("project_tasks").insert(rows);
  if (error) throw error;
  return rows.length;
}

/** Create the client's project (if missing) and generate its pack tasks. */
export async function ensureProjectWithTasks(client: any) {
  if (!client?.id || !client.pack_type || client.pack_type === "autre") return;
  const { data: existing } = await supabase.from("projects").select("id").eq("client_id", client.id).limit(1);
  let projectId = existing?.[0]?.id as string | undefined;
  const start = new Date().toISOString().split("T")[0];
  if (!projectId) {
    const days = PACK_DEADLINE_DAYS[client.pack_type] ?? 15;
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase.from("projects").insert({
      name: `${client.company_name} - ${(PACK_LABELS as any)[client.pack_type] || "Projet"}`,
      client_id: client.id,
      pack_type: client.pack_type,
      created_by: user?.id,
      status: "en_attente",
      start_date: start,
      due_date: new Date(Date.now() + days * 86400000).toISOString().split("T")[0],
      site_type: client.site_type || "vitrine",
    } as any).select("id").single();
    if (error) throw error;
    projectId = data.id;
  }
  const { count } = await supabase.from("project_tasks").select("id", { count: "exact", head: true }).eq("project_id", projectId!);
  if (!count) await insertPackTasks(projectId!, client, start);
}
