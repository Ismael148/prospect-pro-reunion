/**
 * Tests automatisés des règles RLS / Storage.
 *
 * Vérifie, pour chaque rôle (anonyme, authentifié, admin), l'accès à :
 *  - le bucket `email-assets`
 *  - la table `profiles` (colonnes sensibles)
 *  - le journal d'audit `data_access_audit`
 *
 * Les rôles authentifié / admin ne sont testés que si des identifiants de test
 * sont fournis via les variables d'environnement :
 *   TEST_USER_EMAIL / TEST_USER_PASSWORD      (membre standard)
 *   TEST_ADMIN_EMAIL / TEST_ADMIN_PASSWORD    (administrateur)
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const URL = import.meta.env.VITE_SUPABASE_URL as string;
const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

const hasBackend = Boolean(URL && KEY);
const liveDescribe = hasBackend ? describe : describe.skip;

function makeClient(): SupabaseClient {
  return createClient(URL, KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function signedIn(email?: string, password?: string): Promise<SupabaseClient | null> {
  if (!email || !password) return null;
  const client = makeClient();
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) return null;
  return client;
}

liveDescribe("RLS · rôle anonyme", () => {
  const anon = makeClient();

  it("ne peut pas lister les fichiers du bucket email-assets", async () => {
    const { data, error } = await anon.storage.from("email-assets").list("", { limit: 5 });
    expect(error !== null || (data ?? []).length === 0).toBe(true);
  });

  it("ne peut pas envoyer de fichier dans email-assets", async () => {
    const file = new Blob(["rls-test"], { type: "text/plain" });
    const { error } = await anon.storage
      .from("email-assets")
      .upload(`rls-tests/anon-${Date.now()}.txt`, file);
    expect(error).not.toBeNull();
  });

  it("ne peut pas lire la table profiles", async () => {
    const { data, error } = await anon.from("profiles").select("id").limit(1);
    expect(error !== null || (data ?? []).length === 0).toBe(true);
  });

  it("ne peut pas lire les téléphones des profils", async () => {
    const { error } = await anon.from("profiles").select("phone").limit(1);
    expect(error).not.toBeNull();
  });

  it("ne peut pas lire le journal d'audit", async () => {
    const { data, error } = await anon.from("data_access_audit").select("id").limit(1);
    expect(error !== null || (data ?? []).length === 0).toBe(true);
  });

  it("ne peut pas écrire dans le journal d'audit", async () => {
    const { error } = await anon.from("data_access_audit").insert({
      action: "view",
      resource_type: "profile",
    } as never);
    expect(error).not.toBeNull();
  });
});

liveDescribe("RLS · rôle authentifié (membre)", () => {
  let client: SupabaseClient | null = null;
  const uploaded: string[] = [];

  beforeAll(async () => {
    client = await signedIn(process.env.TEST_USER_EMAIL, process.env.TEST_USER_PASSWORD);
  });

  afterAll(async () => {
    if (client) {
      if (uploaded.length) await client.storage.from("email-assets").remove(uploaded);
      await client.auth.signOut();
    }
  });

  it.runIf(process.env.TEST_USER_EMAIL)("peut déposer un fichier dans email-assets", async () => {
    if (!client) return;
    const path = `rls-tests/member-${Date.now()}.txt`;
    const { error } = await client.storage
      .from("email-assets")
      .upload(path, new Blob(["ok"], { type: "text/plain" }));
    expect(error).toBeNull();
    uploaded.push(path);
  });

  it.runIf(process.env.TEST_USER_EMAIL)("peut lire les champs publics des profils", async () => {
    if (!client) return;
    const { error } = await client.from("profiles").select("id, user_id, full_name, avatar_url").limit(1);
    expect(error).toBeNull();
  });

  it.runIf(process.env.TEST_USER_EMAIL)("ne peut pas lire les téléphones des autres membres", async () => {
    if (!client) return;
    const { error } = await client.from("profiles").select("phone").limit(1);
    expect(error).not.toBeNull();
  });

  it.runIf(process.env.TEST_USER_EMAIL)("ne peut pas consulter le journal d'audit", async () => {
    if (!client) return;
    const { data, error } = await client.from("data_access_audit").select("id").limit(1);
    expect(error !== null || (data ?? []).length === 0).toBe(true);
  });

  it.runIf(process.env.TEST_USER_EMAIL)("trace son propre accès via log_data_access", async () => {
    if (!client) return;
    const { error } = await client.rpc("log_data_access", {
      p_action: "view",
      p_resource_type: "profile",
      p_resource_id: "rls-test",
      p_resource_label: "test automatisé",
      p_details: {} as never,
    });
    expect(error).toBeNull();
  });
});

liveDescribe("RLS · rôle admin", () => {
  let client: SupabaseClient | null = null;

  beforeAll(async () => {
    client = await signedIn(process.env.TEST_ADMIN_EMAIL, process.env.TEST_ADMIN_PASSWORD);
  });

  afterAll(async () => {
    if (client) await client.auth.signOut();
  });

  it.runIf(process.env.TEST_ADMIN_EMAIL)("peut consulter le journal d'audit", async () => {
    if (!client) return;
    const { error } = await client.from("data_access_audit").select("*").limit(5);
    expect(error).toBeNull();
  });

  it.runIf(process.env.TEST_ADMIN_EMAIL)("peut récupérer les contacts équipe via get_team_contacts", async () => {
    if (!client) return;
    const { data, error } = await client.rpc("get_team_contacts");
    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
  });

  it.runIf(process.env.TEST_ADMIN_EMAIL)("peut gérer les fichiers email-assets", async () => {
    if (!client) return;
    const path = `rls-tests/admin-${Date.now()}.txt`;
    const up = await client.storage
      .from("email-assets")
      .upload(path, new Blob(["ok"], { type: "text/plain" }));
    expect(up.error).toBeNull();
    const del = await client.storage.from("email-assets").remove([path]);
    expect(del.error).toBeNull();
  });
});
