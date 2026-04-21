import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, RotateCcw, Building2, Calendar, User } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";

interface DeletedClient {
  id: string;
  original_client_id: string;
  client_data: any;
  contacts_data: any[];
  activities_data: any[];
  deleted_by: string | null;
  deleted_at: string;
  restored_at: string | null;
  restored_by: string | null;
}

export default function DeletedClients() {
  const { user, hasRole, loading } = useAuth();
  const queryClient = useQueryClient();

  const { data: deleted, isLoading } = useQuery({
    queryKey: ["deleted-clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deleted_clients_log" as any)
        .select("*")
        .is("restored_at", null)
        .order("deleted_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as DeletedClient[];
    },
    enabled: !!user,
  });

  const restore = useMutation({
    mutationFn: async (item: DeletedClient) => {
      const c = item.client_data;
      // Reinsert client (let DB regenerate ndi/timestamps)
      const { id, ndi, created_at, updated_at, support_token, ...clientFields } = c;
      const { data: newClient, error: e1 } = await supabase
        .from("clients")
        .insert({ ...clientFields, created_by: user!.id })
        .select("id")
        .single();
      if (e1) throw e1;

      // Restore contacts
      if (item.contacts_data?.length) {
        const contacts = item.contacts_data.map((ct: any) => {
          const { id, created_at, updated_at, ...rest } = ct;
          return { ...rest, client_id: newClient.id };
        });
        await supabase.from("contacts").insert(contacts);
      }

      // Restore activities
      if (item.activities_data?.length) {
        const activities = item.activities_data.map((a: any) => {
          const { id, created_at, parent_id, ...rest } = a;
          return { ...rest, client_id: newClient.id, user_id: user!.id };
        });
        await supabase.from("client_activities").insert(activities);
      }

      // Mark as restored
      await supabase
        .from("deleted_clients_log" as any)
        .update({ restored_at: new Date().toISOString(), restored_by: user!.id })
        .eq("id", item.id);

      return newClient.id;
    },
    onSuccess: () => {
      toast.success("Client restauré avec succès");
      queryClient.invalidateQueries({ queryKey: ["deleted-clients"] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
    onError: (e: any) => toast.error("Erreur restauration : " + e.message),
  });

  if (loading) return null;
  if (!hasRole("admin")) return <Navigate to="/" replace />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Trash2 className="w-7 h-7 text-destructive" />
          Corbeille — Clients supprimés
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Restaurez les clients supprimés avec leur historique complet.
        </p>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Chargement…</p>
      ) : !deleted?.length ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <Trash2 className="w-12 h-12 mx-auto mb-3 opacity-20" />
            Aucun client supprimé.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {deleted.map((item) => {
            const c = item.client_data;
            return (
              <Card key={item.id} className="border-l-4 border-l-destructive/60">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Building2 className="w-5 h-5" />
                        {c.company_name}
                        {c.ndi && <Badge variant="outline">{c.ndi}</Badge>}
                      </CardTitle>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-2">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Supprimé {formatDistanceToNow(new Date(item.deleted_at), { addSuffix: true, locale: fr })}
                        </span>
                        {c.manager_name && (
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {c.manager_name}
                          </span>
                        )}
                        {c.email && <span>{c.email}</span>}
                        {c.phone && <span>{c.phone}</span>}
                      </div>
                    </div>
                    <Button
                      onClick={() => restore.mutate(item)}
                      disabled={restore.isPending}
                      className="gap-2"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Restaurer
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground flex gap-4">
                  <span>📇 {item.contacts_data?.length || 0} contact(s)</span>
                  <span>📝 {item.activities_data?.length || 0} activité(s)</span>
                  {c.pack_type && <span>📦 {c.pack_type}</span>}
                  {c.pipeline_status && <Badge variant="secondary" className="text-[10px]">{c.pipeline_status}</Badge>}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
