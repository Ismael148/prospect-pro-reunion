import { useAuth } from "@/contexts/AuthContext";
import { useClients } from "@/hooks/use-clients";
import { useProspects } from "@/hooks/use-prospects";
import { useProjects } from "@/hooks/use-projects";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, TrendingUp, Radar, Briefcase, ArrowRight } from "lucide-react";
import { PIPELINE_LABELS, PIPELINE_COLORS, PIPELINE_ORDER } from "@/lib/constants";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0, 0, 0.2, 1] as const } },
};

export default function Dashboard() {
  const { profile, roles } = useAuth();
  const { data: clients } = useClients();
  const { data: prospects } = useProspects();
  const { data: projects } = useProjects();
  const navigate = useNavigate();

  const totalClients = clients?.length || 0;
  const totalProspects = prospects?.length || 0;
  const activeProjects = projects?.filter((p: any) => p.status === "en_cours").length || 0;
  const signedContracts = clients?.filter((c) => c.pipeline_status === "contrat_signe").length || 0;
  const conversionRate = totalClients > 0 ? Math.round((signedContracts / totalClients) * 100) : 0;

  const roleLabel = roles.includes("admin")
    ? "Administrateur"
    : roles.includes("commercial_terrain")
    ? "Commercial terrain"
    : roles.includes("agent_telephonique")
    ? "Agent téléphonique"
    : "Utilisateur";

  const stats = [
    { title: "Clients", value: totalClients, icon: Users, gradient: "from-primary to-primary/70", path: "/clients" },
    { title: "Prospects", value: totalProspects, icon: Radar, gradient: "from-info to-info/70", path: "/prospection" },
    { title: "Projets actifs", value: activeProjects, icon: Briefcase, gradient: "from-success to-success/70", path: "/projets" },
    { title: "Conversion", value: `${conversionRate}%`, icon: TrendingUp, gradient: "from-warning to-warning/70", path: "/pipeline" },
  ];

  const pipelineSummary = PIPELINE_ORDER.map((status) => ({
    status,
    label: PIPELINE_LABELS[status],
    count: clients?.filter((c) => c.pipeline_status === status).length || 0,
    colors: PIPELINE_COLORS[status],
  }));

  return (
    <motion.div className="space-y-8" variants={container} initial="hidden" animate="show">
      <motion.div variants={item}>
        <h1 className="text-3xl font-bold tracking-tight">
          Bonjour, {profile?.full_name?.split(" ")[0] || "là"} 👋
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">{roleLabel} — Vue d'ensemble</p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <motion.div key={stat.title} variants={item}>
            <Card
              className="group relative overflow-hidden border-0 shadow-soft hover:shadow-medium cursor-pointer transition-all duration-300"
              onClick={() => navigate(stat.path)}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-[0.04] group-hover:opacity-[0.08] transition-opacity duration-300`} />
              <CardContent className="p-5 relative">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{stat.title}</span>
                  <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center`}>
                    <stat.icon className="w-4 h-4 text-white" />
                  </div>
                </div>
                <p className="text-3xl font-bold tracking-tight">{stat.value}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div variants={item}>
          <Card className="border-0 shadow-soft">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">Pipeline</CardTitle>
                <button onClick={() => navigate("/pipeline")} className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 transition-colors">
                  Voir tout <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {pipelineSummary.map((p) => (
                <div key={p.status} className="flex items-center gap-3">
                  <div className={`px-2.5 py-1 rounded-md text-[11px] border font-medium min-w-[130px] ${p.colors}`}>
                    {p.label}
                  </div>
                  <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary/50 transition-all duration-500"
                      style={{ width: totalClients > 0 ? `${(p.count / totalClients) * 100}%` : "0%" }}
                    />
                  </div>
                  <span className="text-xs font-semibold w-6 text-right tabular-nums">{p.count}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="border-0 shadow-soft">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">Derniers clients</CardTitle>
                <button onClick={() => navigate("/clients")} className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 transition-colors">
                  Voir tout <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </CardHeader>
            <CardContent>
              {!clients?.length ? (
                <p className="text-muted-foreground text-sm py-4 text-center">Aucun client</p>
              ) : (
                <div className="space-y-1">
                  {clients.slice(0, 5).map((client) => (
                    <div
                      key={client.id}
                      className="flex items-center gap-3 cursor-pointer hover:bg-muted/60 rounded-xl p-2.5 -mx-1 transition-colors duration-200"
                      onClick={() => navigate(`/clients/${client.id}`)}
                    >
                      <div className="w-9 h-9 rounded-xl bg-primary/8 flex items-center justify-center text-primary text-xs font-bold">
                        {client.company_name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{client.company_name}</p>
                        <p className="text-[11px] text-muted-foreground">{client.city}</p>
                      </div>
                      <span className={`text-[11px] border px-2 py-0.5 rounded-md ${PIPELINE_COLORS[client.pipeline_status]}`}>
                        {PIPELINE_LABELS[client.pipeline_status]}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
