import { useAuth } from "@/contexts/AuthContext";
import { useClients } from "@/hooks/use-clients";
import { useProspects } from "@/hooks/use-prospects";
import { useProjects } from "@/hooks/use-projects";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, FolderKanban, TrendingUp, Radar, Briefcase } from "lucide-react";
import { PIPELINE_LABELS, PIPELINE_COLORS, PIPELINE_ORDER } from "@/lib/constants";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const { profile, roles } = useAuth();
  const { data: clients } = useClients();
  const { data: prospects } = useProspects();
  const { data: projects } = useProjects();
  const navigate = useNavigate();

  const totalClients = clients?.length || 0;
  const totalProspects = prospects?.length || 0;
  const totalProjects = projects?.length || 0;
  const activeProjects = projects?.filter((p: any) => p.status === "en_cours").length || 0;
  const signedContracts = clients?.filter((c) => c.pipeline_status === "contrat_signe").length || 0;
  const conversionRate = totalClients > 0
    ? Math.round((signedContracts / totalClients) * 100)
    : 0;

  const roleLabel = roles.includes("admin")
    ? "Administrateur"
    : roles.includes("commercial_terrain")
    ? "Commercial terrain"
    : roles.includes("agent_telephonique")
    ? "Agent téléphonique"
    : "Utilisateur";

  const stats = [
    { title: "Clients", value: totalClients.toString(), icon: Users, color: "text-primary", path: "/clients" },
    { title: "Prospects", value: totalProspects.toString(), icon: Radar, color: "text-info", path: "/prospection" },
    { title: "Projets actifs", value: activeProjects.toString(), icon: Briefcase, color: "text-success", path: "/projets" },
    { title: "Taux conversion", value: `${conversionRate}%`, icon: TrendingUp, color: "text-warning", path: "/pipeline" },
  ];

  // Pipeline summary
  const pipelineSummary = PIPELINE_ORDER.map((status) => ({
    status,
    label: PIPELINE_LABELS[status],
    count: clients?.filter((c) => c.pipeline_status === status).length || 0,
    colors: PIPELINE_COLORS[status],
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Bonjour, {profile?.full_name?.split(" ")[0] || "là"} 👋
        </h1>
        <p className="text-muted-foreground mt-1">
          {roleLabel} — Voici votre tableau de bord
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card
            key={stat.title}
            className="border-0 shadow-md shadow-primary/5 cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => navigate(stat.path)}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold tracking-tight">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-md shadow-primary/5">
          <CardHeader>
            <CardTitle className="text-lg">Pipeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pipelineSummary.map((item) => (
              <div key={item.status} className="flex items-center gap-3">
                <div className={`px-2.5 py-1 rounded text-xs border font-medium min-w-[140px] ${item.colors}`}>
                  {item.label}
                </div>
                <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary/60 transition-all"
                    style={{ width: totalClients > 0 ? `${(item.count / totalClients) * 100}%` : "0%" }}
                  />
                </div>
                <span className="text-sm font-medium w-8 text-right">{item.count}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md shadow-primary/5">
          <CardHeader>
            <CardTitle className="text-lg">Derniers clients</CardTitle>
          </CardHeader>
          <CardContent>
            {!clients?.length ? (
              <p className="text-muted-foreground text-sm">
                Aucun client. Commencez par en ajouter un !
              </p>
            ) : (
              <div className="space-y-3">
                {clients.slice(0, 5).map((client) => (
                  <div
                    key={client.id}
                    className="flex items-center gap-3 cursor-pointer hover:bg-muted/50 rounded-lg p-2 -mx-2 transition-colors"
                    onClick={() => navigate(`/clients/${client.id}`)}
                  >
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                      {client.company_name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{client.company_name}</p>
                      <p className="text-xs text-muted-foreground">{client.city}</p>
                    </div>
                    <span className={`text-xs border px-2 py-0.5 rounded ${PIPELINE_COLORS[client.pipeline_status]}`}>
                      {PIPELINE_LABELS[client.pipeline_status]}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
