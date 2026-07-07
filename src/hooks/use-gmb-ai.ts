import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type GmbAiAction =
  | "categories"
  | "description"
  | "prompt_couverture"
  | "prompts_photos"
  | "seo_long"
  | "attributs"
  | "post"
  | "posts_saisonniers"
  | "faq"
  | "reponses_avis"
  | "repondre_avis";

export interface GmbAiGeneration {
  action: GmbAiAction;
  content: string;
  generatedAt: string;
}

const STORAGE_KEY = "gmb-ai-history";
const MAX_HISTORY = 5;

export function getHistory(clientId: string): GmbAiGeneration[] {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}-${clientId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveHistory(clientId: string, gen: GmbAiGeneration) {
  const prev = getHistory(clientId);
  const next = [gen, ...prev].slice(0, MAX_HISTORY);
  localStorage.setItem(`${STORAGE_KEY}-${clientId}`, JSON.stringify(next));
}

export function useGmbAi(clientId: string) {
  return useMutation({
    mutationFn: async ({ action, extra }: { action: GmbAiAction; extra?: string }) => {
      const { data, error } = await supabase.functions.invoke("gmb-ai-assistant", {
        body: { client_id: clientId, action, extra },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as { content: string; action: GmbAiAction };
    },
    onSuccess: (data) => {
      saveHistory(clientId, {
        action: data.action,
        content: data.content,
        generatedAt: new Date().toISOString(),
      });
    },
    onError: (e: any) => toast.error(e.message || "Erreur de génération"),
  });
}
