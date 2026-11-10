import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { InvoiceTemplateId } from "@/lib/invoice-templates";

/** Enregistre le modèle de facture préféré d'un client (null = modèle par défaut de l'agence). */
export function useSetClientInvoiceTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ clientId, template }: { clientId: string; template: InvoiceTemplateId | null }) => {
      const { error } = await supabase.from("clients").update({ invoice_template: template }).eq("id", clientId);
      if (error) throw error;
      return { clientId, template };
    },
    onSuccess: ({ clientId }) => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["clients", clientId] });
    },
  });
}
