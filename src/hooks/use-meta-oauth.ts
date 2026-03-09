import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

const REDIRECT_URI = `${window.location.origin}/meta-callback`;

export function useMetaOAuth() {
  const startOAuth = useCallback(async (clientId: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Non authentifié");

    const res = await supabase.functions.invoke("meta-oauth", {
      body: { redirect_uri: REDIRECT_URI, client_id: clientId },
      headers: { "x-action": "get_auth_url" },
    });

    // The edge function uses query param, let's call with fetch directly
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/meta-oauth?action=get_auth_url`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ redirect_uri: REDIRECT_URI, client_id: clientId }),
      }
    );

    const data = await response.json();
    if (data.error) throw new Error(data.error);

    // Store clientId for callback
    localStorage.setItem("meta_oauth_client_id", clientId);
    window.location.href = data.auth_url;
  }, []);

  const exchangeCode = useCallback(async (code: string, clientId: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Non authentifié");

    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/meta-oauth?action=exchange_token`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ code, redirect_uri: REDIRECT_URI, client_id: clientId }),
      }
    );

    const data = await response.json();
    if (data.error) throw new Error(data.error);
    return data; // { pages, user_token, expires_in }
  }, []);

  const savePage = useCallback(
    async (clientId: string, page: any, platform: "facebook" | "instagram", expiresIn: number) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Non authentifié");

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/meta-oauth?action=save_page`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ client_id: clientId, page, platform, expires_in: expiresIn }),
        }
      );

      const data = await response.json();
      if (data.error) throw new Error(data.error);
      return data;
    },
    []
  );

  return { startOAuth, exchangeCode, savePage, REDIRECT_URI };
}
