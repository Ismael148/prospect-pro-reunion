import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ListChecks } from "lucide-react";

const ROLES = [
  { id: "webmaster", label: "Webmasters" },
  { id: "designer", label: "Designers" },
  { id: "agent_master", label: "Agents master" },
] as const;

const STATUS: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  a_faire: { label: "À faire", variant: "outline" },
  en_cours: { label: "En cours", variant: "secondary" },
  en_revision: { label: "En révision", variant: "secondary" },
  termine: { label: "Terminé", variant: "default" },
};

const fmt = (d?: string | null) => (d ? new Date(d).toLocaleDateString("fr-FR") : "—");

export default function TachesEquipe() {
  const [statusFilter, setStatusFilter] = useState("ouvertes");

  const { data, isLoading } = useQuery({
    queryKey: ["taches-equipe"],
    queryFn: async () => {
      const [{ data: roles }, { data: profiles }, { data: tasks, error }] = await Promise.all([
        supabase.from("user_roles").select("user_id, role").in("role", ["webmaster", "designer", "agent_master"]),
        supabase.from("profiles").select("user_id, full_name"),
        supabase
          .from("project_tasks")
          .select("id, title, status, due_date, created_at, updated_at, assigned_to, project_id, projects(name)")
          .not("assigned_to", "is", null)
          .order("due_date", { ascending: true, nullsFirst: false })
          .limit(5000),
      ]);
      if (error) throw error;
      return { roles: roles || [], profiles: profiles || [], tasks: (tasks || []) as any[] };
    },
  });

  const grouped = useMemo(() => {
    if (!data) return {} as Record<string, { userId: string; name: string; tasks: any[] }[]>;
    const name = (id: string) => data.profiles.find((p) => p.user_id === id)?.full_name || "Sans nom";
    const tasks = data.tasks.filter((t) =>
      statusFilter === "toutes" ? true : statusFilter === "ouvertes" ? t.status !== "termine" : t.status === statusFilter,
    );
    const out: Record<string, { userId: string; name: string; tasks: any[] }[]> = {};
    for (const r of ROLES) {
      out[r.id] = data.roles
        .filter((x) => x.role === r.id)
        .map((x) => ({ userId: x.user_id, name: name(x.user_id), tasks: tasks.filter((t) => t.assigned_to === x.user_id) }));
    }
    return out;
  }, [data, statusFilter]);

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold flex items-center gap-2"><ListChecks className="w-6 h-6 text-primary" /> Tâches par rôle</h1>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ouvertes">Non terminées</SelectItem>
            <SelectItem value="toutes">Toutes</SelectItem>
            {Object.entries(STATUS).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      ) : (
        <Tabs defaultValue="webmaster">
          <TabsList>
            {ROLES.map((r) => (
              <TabsTrigger key={r.id} value={r.id}>
                {r.label} ({grouped[r.id]?.reduce((s, u) => s + u.tasks.length, 0) || 0})
              </TabsTrigger>
            ))}
          </TabsList>
          {ROLES.map((r) => (
            <TabsContent key={r.id} value={r.id} className="space-y-4">
              {!grouped[r.id]?.length && <p className="text-muted-foreground text-sm">Aucune personne avec ce rôle pour l'instant.</p>}
              {grouped[r.id]?.map((u) => (
                <Card key={u.userId}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex justify-between">
                      <span>{u.name}</span>
                      <span className="text-sm text-muted-foreground">{u.tasks.length} tâche(s)</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="max-h-96 overflow-auto">
                    {!u.tasks.length ? (
                      <p className="text-sm text-muted-foreground">Aucune tâche.</p>
                    ) : (
                      <table className="w-full text-sm">
                        <thead className="text-left text-muted-foreground">
                          <tr><th className="py-1">Tâche</th><th>Projet</th><th>Statut</th><th>Créée</th><th>Échéance</th><th>Mise à jour</th></tr>
                        </thead>
                        <tbody>
                          {u.tasks.map((t) => {
                            const late = t.due_date && t.due_date < today && t.status !== "termine";
                            return (
                              <tr key={t.id} className="border-t border-border">
                                <td className="py-1.5 pr-2">{t.title}</td>
                                <td className="pr-2"><Link className="text-primary hover:underline" to={`/projets/${t.project_id}`}>{t.projects?.name || "Projet"}</Link></td>
                                <td><Badge variant={STATUS[t.status]?.variant || "outline"}>{STATUS[t.status]?.label || t.status}</Badge></td>
                                <td>{fmt(t.created_at)}</td>
                                <td className={late ? "text-destructive font-medium" : ""}>{fmt(t.due_date)}</td>
                                <td>{fmt(t.updated_at)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}
