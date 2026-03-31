import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Navigate, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Users, Phone, LifeBuoy, Calendar, TrendingUp, Clock, CheckCircle2, AlertTriangle,
  ArrowRight, Ticket, Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

// IDs of agents supervised by agent_master
const SUPERVISED_ROLES: Array<"agent_telephonique"> = ["agent_telephonique"];

export default function AgentMasterDashboard() {
  const { hasRole } = useAuth();
  const navigate = useNavigate();
  const isAllowed = hasRole("agent_master") || hasRole("admin");

  // Get all agents (agent_telephonique)
  const { data: agents } = useQuery({
    queryKey: ["agent-master-agents"],
    queryFn: async () => {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("role", SUPERVISED_ROLES);
      if (!roles?.length) return [];
      const agentIds = roles.map((r) => r.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url, phone")
        .in("user_id", agentIds);
      return profiles || [];
    },
  });

  const agentIds = agents?.map((a) => a.user_id) || [];

  // Prospects by agents
  const { data: prospects } = useQuery({
    queryKey: ["agent-master-prospects", agentIds],
    queryFn: async () => {
      if (!agentIds.length) return [];
      const { data } = await supabase
        .from("prospects")
        .select("*")
        .in("assigned_to", agentIds)
        .order("created_at", { ascending: false })
        .limit(100);
      return data || [];
    },
    enabled: agentIds.length > 0,
  });

  // Support tickets
  const { data: tickets } = useQuery({
    queryKey: ["agent-master-tickets"],
    queryFn: async () => {
      const { data } = await supabase
        .from("support_tickets")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      return data || [];
    },
  });

  // Recent activities by agents
  const { data: activities } = useQuery({
    queryKey: ["agent-master-activities", agentIds],
    queryFn: async () => {
      if (!agentIds.length) return [];
      const { data } = await supabase
        .from("client_activities")
        .select("*")
        .in("user_id", agentIds)
        .order("created_at", { ascending: false })
        .limit(50);
      return data || [];
    },
    enabled: agentIds.length > 0,
  });

  const getAgentName = (userId: string) =>
    agents?.find((a) => a.user_id === userId)?.full_name || "Inconnu";

  // Stats
  const totalProspects = prospects?.length || 0;
  const rdvPlanifies = prospects?.filter((p) => p.status === "rdv_planifie").length || 0;
  const convertis = prospects?.filter((p) => p.status === "converti").length || 0;
  const ticketsOuverts = tickets?.filter((t) => t.status === "ouvert" || t.status === "en_cours").length || 0;
  const ticketsResolus = tickets?.filter((t) => t.status === "resolu").length || 0;

  // Per-agent stats
  const agentStats = agents?.map((agent) => {
    const agentProspects = prospects?.filter((p) => p.assigned_to === agent.user_id) || [];
    const agentRdv = agentProspects.filter((p) => p.status === "rdv_planifie").length;
    const agentConverted = agentProspects.filter((p) => p.status === "converti").length;
    const agentActivities = activities?.filter((a) => a.user_id === agent.user_id).length || 0;
    return {
      ...agent,
      prospects: agentProspects.length,
      rdv: agentRdv,
      converted: agentConverted,
      activities: agentActivities,
    };
  }) || [];

  const TICKET_STATUS_LABELS: Record<string, string> = {
    ouvert: "Ouvert", en_cours: "En cours", resolu: "Résolu", ferme: "Fermé",
  };
  const TICKET_STATUS_COLORS: Record<string, string> = {
    ouvert: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
    en_cours: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
    resolu: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
    ferme: "bg-muted text-muted-foreground",
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item}>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Users className="w-8 h-8 text-violet-600" />
          Tableau de bord Agent Master
        </h1>
        <p className="text-muted-foreground mt-1">Supervision des agents téléphoniques et support client</p>
      </motion.div>

      {/* KPI Cards */}
      <motion.div variants={item} className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: "Agents supervisés", value: agents?.length || 0, icon: Users, color: "text-violet-600" },
          { label: "Prospects gérés", value: totalProspects, icon: Search, color: "text-blue-600" },
          { label: "RDV planifiés", value: rdvPlanifies, icon: Calendar, color: "text-amber-600" },
          { label: "Tickets ouverts", value: ticketsOuverts, icon: Ticket, color: "text-rose-600" },
          { label: "Tickets résolus", value: ticketsResolus, icon: CheckCircle2, color: "text-emerald-600" },
        ].map((kpi) => (
          <Card key={kpi.label} className="border-0 shadow-md shadow-primary/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
                <span className="text-2xl font-bold">{kpi.value}</span>
              </div>
              <p className="text-xs text-muted-foreground">{kpi.label}</p>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Agent Performance */}
        <motion.div variants={item}>
          <Card className="border-0 shadow-md shadow-primary/5">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-violet-600" />
                Performance des agents
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {agentStats.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Aucun agent assigné</p>
              ) : (
                agentStats.map((agent) => {
                  const conversionRate = agent.prospects > 0
                    ? Math.round((agent.converted / agent.prospects) * 100)
                    : 0;
                  return (
                    <div key={agent.user_id} className="p-4 rounded-xl border border-border bg-muted/20 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center">
                            <span className="text-sm font-bold text-violet-700 dark:text-violet-300">
                              {agent.full_name?.charAt(0) || "?"}
                            </span>
                          </div>
                          <div>
                            <p className="font-semibold text-sm">{agent.full_name}</p>
                            <p className="text-[11px] text-muted-foreground">{agent.activities} activités récentes</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {agent.prospects} prospects
                        </Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-3 text-center">
                        <div className="p-2 rounded-lg bg-background">
                          <p className="text-lg font-bold text-blue-600">{agent.prospects}</p>
                          <p className="text-[10px] text-muted-foreground">Prospects</p>
                        </div>
                        <div className="p-2 rounded-lg bg-background">
                          <p className="text-lg font-bold text-amber-600">{agent.rdv}</p>
                          <p className="text-[10px] text-muted-foreground">RDV</p>
                        </div>
                        <div className="p-2 rounded-lg bg-background">
                          <p className="text-lg font-bold text-emerald-600">{agent.converted}</p>
                          <p className="text-[10px] text-muted-foreground">Convertis</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress value={conversionRate} className="flex-1 h-2" />
                        <span className="text-xs font-medium text-muted-foreground">{conversionRate}%</span>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Tickets */}
        <motion.div variants={item}>
          <Card className="border-0 shadow-md shadow-primary/5">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <LifeBuoy className="w-5 h-5 text-rose-600" />
                Tickets Support récents
              </CardTitle>
              <Button size="sm" variant="outline" onClick={() => navigate("/support")} className="gap-1">
                Voir tout <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {!tickets?.length ? (
                <p className="text-sm text-muted-foreground text-center py-4">Aucun ticket</p>
              ) : (
                tickets.slice(0, 8).map((t) => (
                  <div
                    key={t.id}
                    onClick={() => navigate("/support")}
                    className={`p-3 rounded-lg border cursor-pointer transition-all hover:shadow-sm ${
                      t.status === "ouvert" ? "border-amber-200 bg-amber-50/30 dark:bg-amber-950/10 dark:border-amber-800" : "border-border bg-muted/10"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-muted-foreground">{t.ticket_number}</span>
                        <Badge className={`text-[10px] ${TICKET_STATUS_COLORS[t.status] || ""}`}>
                          {TICKET_STATUS_LABELS[t.status] || t.status}
                        </Badge>
                        {t.priority === "urgente" && <Badge className="bg-rose-100 text-rose-700 text-[10px]">🔴 Urgent</Badge>}
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(t.created_at), { addSuffix: true, locale: fr })}
                      </span>
                    </div>
                    <p className="text-sm font-medium truncate">{t.subject}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Recent Activity Feed */}
      <motion.div variants={item}>
        <Card className="border-0 shadow-md shadow-primary/5">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Activité récente des agents
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!activities?.length ? (
              <p className="text-sm text-muted-foreground text-center py-4">Aucune activité récente</p>
            ) : (
              <div className="space-y-2">
                {activities.slice(0, 15).map((a) => (
                  <div key={a.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/30 transition-colors">
                    <div className="w-2 h-2 rounded-full bg-violet-500 mt-2 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        <span className="font-medium text-violet-600">{getAgentName(a.user_id)}</span>
                        {" — "}{a.description || a.activity_type}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(a.created_at), { addSuffix: true, locale: fr })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
