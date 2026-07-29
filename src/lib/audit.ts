import { supabase } from "@/integrations/supabase/client";

export type AuditAction = "view" | "download" | "export" | "update" | "delete" | "insert";
export type AuditResource = "client_form" | "profile" | "client" | "storage_object" | "audit_log";

/**
 * Enregistre un accès aux données sensibles dans le journal d'audit.
 * Silencieux en cas d'erreur : ne doit jamais bloquer l'action utilisateur.
 */
export async function logDataAccess(params: {
  action: AuditAction;
  resourceType: AuditResource;
  resourceId?: string | null;
  resourceLabel?: string | null;
  details?: Record<string, unknown>;
}): Promise<void> {
  try {
    await supabase.rpc("log_data_access", {
      p_action: params.action,
      p_resource_type: params.resourceType,
      p_resource_id: params.resourceId ?? null,
      p_resource_label: params.resourceLabel ?? null,
      p_details: (params.details ?? {}) as never,
    });
  } catch {
    // no-op
  }
}
