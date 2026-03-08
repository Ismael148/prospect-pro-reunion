import { useClients, useUpdateClient, useCreateActivity } from "@/hooks/use-clients";
import { useAuth } from "@/contexts/AuthContext";
import { PIPELINE_LABELS, PIPELINE_COLORS, PIPELINE_ORDER } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Building2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type PipelineStatus = Database["public"]["Enums"]["pipeline_status"];

// Only show active pipeline columns (not "perdu")
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
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const lostClients = clients?.filter((c) => c.pipeline_status === "perdu") || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Pipeline commercial</h1>
        <p className="text-muted-foreground mt-1">
          Glissez les clients entre les colonnes pour mettre à jour leur statut
        </p>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {ACTIVE_PIPELINE.map((status) => {
          const statusClients = clients?.filter((c) => c.pipeline_status === status) || [];
          return (
            <div
              key={status}
              className="flex-shrink-0 w-64"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const clientId = e.dataTransfer.getData("clientId");
                if (clientId) handleDrop(clientId, status);
              }}
            >
              <div className="flex items-center gap-2 mb-3 px-1">
                <Badge className={`text-xs border ${PIPELINE_COLORS[status]}`} variant="outline">
                  {PIPELINE_LABELS[status]}
                </Badge>
                <span className="text-xs text-muted-foreground">{statusClients.length}</span>
              </div>

              <div className="space-y-2 min-h-[200px] p-2 rounded-xl bg-muted/30 border border-dashed border-border">
                {statusClients.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-8">
                    Aucun client
                  </p>
                ) : (
                  statusClients.map((client) => (
                    <Card
                      key={client.id}
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData("clientId", client.id)}
                      className="cursor-grab active:cursor-grabbing border-0 shadow-sm hover:shadow-md transition-all"
                      onClick={() => navigate(`/clients/${client.id}`)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start gap-2">
                          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 text-primary shrink-0">
                            <Building2 className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{client.company_name}</p>
                            {client.city && (
                              <p className="text-xs text-muted-foreground">{client.city}</p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {lostClients.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3 text-destructive">Perdus ({lostClients.length})</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {lostClients.map((client) => (
              <Card
                key={client.id}
                className="border-destructive/20 cursor-pointer opacity-60 hover:opacity-100 transition-opacity"
                onClick={() => navigate(`/clients/${client.id}`)}
              >
                <CardContent className="p-3">
                  <p className="font-medium text-sm truncate">{client.company_name}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
