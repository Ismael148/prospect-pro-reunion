import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

const sessionPath = process.env.LOVABLE_TEST_SESSION_FILE;

describe.runIf(Boolean(sessionPath))("manual task assignment · live", () => {
  it("leaves newly generated module tasks unassigned without changing existing assignments", async () => {
    if (!sessionPath) throw new Error("An authorized test session is required");
    const { session } = JSON.parse(readFileSync(sessionPath, "utf8"));
    const client = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${session.access_token}` } },
    });
    const existing = await client.from("project_tasks").select("id, assigned_to").not("assigned_to", "is", null).order("id").limit(20);
    expect(existing.error).toBeNull();
    expect(existing.data?.length).toBeGreaterThan(0);
    const testClient = await client.from("clients").select("id").eq("company_name", "ISMA DEV").limit(1).single();
    expect(testClient.error).toBeNull();
    if (!testClient.data) throw new Error("Test client not found");
    const project = await client.from("projects").insert({
      client_id: testClient.data.id, name: "Vérification temporaire attribution manuelle",
      pack_type: "star_bizness_tuning", created_by: session.user.id,
    }).select("id").single();
    expect(project.error).toBeNull();
    if (!project.data) throw new Error("Test project not created");
    const projectId = project.data.id;
    try {
      const tasks = await client.from("project_tasks").insert(
        ["site", "carte_business", "formation"].map((module, index) => ({
          project_id: projectId, title: `Test ${module}`, description: `[${module}]`, sort_order: index,
        })),
      ).select("assigned_to");
      expect(tasks.error).toBeNull();
      expect(tasks.data).toEqual([{ assigned_to: null }, { assigned_to: null }, { assigned_to: null }]);
      const ids = (existing.data || []).map((task) => task.id);
      const unchanged = await client.from("project_tasks").select("id, assigned_to").in("id", ids).order("id");
      expect(unchanged.error).toBeNull();
      expect(unchanged.data).toEqual(existing.data);
    } finally {
      const tasksCleanup = await client.from("project_tasks").delete().eq("project_id", projectId);
      const projectCleanup = await client.from("projects").delete().eq("id", projectId);
      expect(tasksCleanup.error).toBeNull();
      expect(projectCleanup.error).toBeNull();
    }
  }, 30000);
});