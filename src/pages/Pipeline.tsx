import { useClients, useUpdateClient, useCreateActivity } from "@/hooks/use-clients";
import { useAuth } from "@/contexts/AuthContext";
import { PIPELINE_LABELS, PIPELINE_COLORS, PIPELINE_ORDER } from "@/lib/constants";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Building2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { motion } from "framer-motion";
import type { Database } from "@/integrations/supabase/types";

type PipelineStatus = Database["public"]["Enums"]["pipeline_status"];

const ACTIVE_PIPELINE: PipelineStatus[] = PIPELINE_ORDER.filter((s) => s !== "perdu");

export default function Pipeline() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: clients, isLoading } = useClients();
  const updateClient = useUpdateClient();
  const createActivity = useCreateActivity();

  const handleDrop = async (clientId: string, newStatus: PipelineStatus) => {
    const client = clients?.find((c) => c.id === clientId);
    if (!client || client.pipeline_status === newStatus) return;
    const oldStatus = client.pipeline_status;
    try {
      await updateClient.mutateAsync({ id: clientId, pipeline_status: newStatus });
      await createActivity.mutateAsync({
        client_id: clientId,
        user_id: user!.id,
        activity_type: "status_change",
        description: `Statut changé de "${PIPELINE_LABELS[oldStatus]}" à "${PIPELINE_LABELS[newStatus]}"`,
        old_status: oldStatus,
        new_status: newStatus,
      });
      toast.success("Statut mis à jour");
    } catch {
      toast.error("Erreur");
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const lostClients = clients?.filter((c) => c.pipeline_status === "perdu") || [];

  return (
    <motion.div className="space-y-6" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Pipeline</h1>
        <p className="text-muted-foreground text-sm mt-1">Glissez-déposez pour mettre à jour les statuts</p>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-4 -mx-1 px-1">
        {ACTIVE_PIPELINE.map((status, colIdx) => {
          const statusClients = clients?.filter((c) => c.pipeline_status === status) || [];
          return (
            <motion.div
              key={status}
              className="flex-shrink-0 w-60"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: colIdx * 0.05, duration: 0.3 }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const clientId = e.dataTransfer.getData("clientId");
                if (clientId) handleDrop(clientId, status);
              }}
            >
              <div className="flex items-center gap-2 mb-2.5 px-0.5">
                <Badge className={`text-[11px] border ${PIPELINE_COLORS[status]}`} variant="outline">
                  {PIPELINE_LABELS[status]}
                </Badge>
                <span className="text-[11px] font-semibold text-muted-foreground tabular-nums">{statusClients.length}</span>
              </div>

              <div className="space-y-2 min-h-[200px] p-2 rounded-2xl bg-muted/30 border border-dashed border-border/60">
                {statusClients.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground/60 text-center py-10">Vide</p>
                ) : (
                  statusClients.map((client) => (
                    <Card
                      key={client.id}
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData("clientId", client.id)}
                      className="cursor-grab active:cursor-grabbing border-0 shadow-soft hover:shadow-medium transition-all duration-200 group"
                      onClick={() => navigate(`/clients/${client.id}`)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start gap-2.5">
                          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/8 text-primary shrink-0 group-hover:bg-primary/12 transition-colors">
                            <Building2 className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{client.company_name}</p>
                            {client.city && <p className="text-[11px] text-muted-foreground">{client.city}</p>}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {lostClients.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
          <h2 className="text-sm font-semibold mb-2 text-destructive">Perdus ({lostClients.length})</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {lostClients.map((client) => (
              <Card
                key={client.id}
                className="border-destructive/20 cursor-pointer opacity-50 hover:opacity-90 transition-all duration-200"
                onClick={() => navigate(`/clients/${client.id}`)}
              >
                <CardContent className="p-3">
                  <p className="font-medium text-sm truncate">{client.company_name}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
