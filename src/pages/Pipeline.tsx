import { useState } from "react";
import { useClients, useUpdateClient, useCreateActivity } from "@/hooks/use-clients";
import { useAuth } from "@/contexts/AuthContext";
import { PIPELINE_LABELS, PIPELINE_COLORS, PIPELINE_ORDER } from "@/lib/constants";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Building2, Phone, Mail, MapPin, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import type { Database } from "@/integrations/supabase/types";

type PipelineStatus = Database["public"]["Enums"]["pipeline_status"];

const ACTIVE_PIPELINE: PipelineStatus[] = PIPELINE_ORDER.filter((s) => s !== "perdu");

export default function Pipeline() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: clients, isLoading } = useClients();
  const updateClient = useUpdateClient();
  const createActivity = useCreateActivity();
  const [activeTab, setActiveTab] = useState<PipelineStatus>("nouveau");

  const handleStatusChange = async (clientId: string, newStatus: PipelineStatus) => {
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

  const activeClients = clients?.filter((c) => c.pipeline_status === activeTab) || [];
  const lostClients = clients?.filter((c) => c.pipeline_status === "perdu") || [];

  // Count per status
  const countByStatus = (status: PipelineStatus) =>
    clients?.filter((c) => c.pipeline_status === status).length || 0;

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Pipeline</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Suivez l'avancement de vos clients dans le processus commercial
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {ACTIVE_PIPELINE.map((status) => {
          const count = countByStatus(status);
          const isActive = activeTab === status;
          return (
            <motion.button
              key={status}
              onClick={() => setActiveTab(status)}
              className={`relative rounded-xl p-3 text-left transition-all duration-200 border ${
                isActive
                  ? "border-primary/30 bg-primary/5 shadow-md shadow-primary/10"
                  : "border-border/50 bg-card hover:border-primary/20 hover:bg-muted/30"
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {isActive && (
                <motion.div
                  layoutId="pipeline-indicator"
                  className="absolute inset-0 rounded-xl border-2 border-primary/40"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <p className="text-2xl font-bold tabular-nums">{count}</p>
              <p className={`text-[11px] font-medium mt-0.5 ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                {PIPELINE_LABELS[status]}
              </p>
            </motion.button>
          );
        })}
      </div>

      {/* Tag pills row */}
      <div className="flex flex-wrap gap-2">
        {ACTIVE_PIPELINE.map((status) => {
          const isActive = activeTab === status;
          const count = countByStatus(status);
          return (
            <motion.button
              key={status}
              onClick={() => setActiveTab(status)}
              className={`relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                isActive
                  ? "text-primary-foreground"
                  : `border ${PIPELINE_COLORS[status]} hover:opacity-80`
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {isActive && (
                <motion.div
                  layoutId="pipeline-pill"
                  className="absolute inset-0 rounded-full bg-primary"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative z-10">{PIPELINE_LABELS[status]}</span>
              <span className={`relative z-10 tabular-nums ${isActive ? "bg-primary-foreground/20 text-primary-foreground" : "bg-foreground/5"} px-1.5 py-0.5 rounded-full text-[10px]`}>
                {count}
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* Client list with animated transitions */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.25, ease: "easeInOut" }}
        >
          {activeClients.length === 0 ? (
            <Card className="border-dashed border-border/60">
              <CardContent className="py-16 text-center">
                <Building2 className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  Aucun client en "{PIPELINE_LABELS[activeTab]}"
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {activeClients.map((client, idx) => (
                <motion.div
                  key={client.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04, duration: 0.25 }}
                >
                  <Card
                    className="border border-border/50 hover:border-primary/20 shadow-soft hover:shadow-medium transition-all duration-200 cursor-pointer group"
                    onClick={() => navigate(`/clients/${client.id}`)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/8 text-primary shrink-0 group-hover:bg-primary/12 transition-colors">
                          <Building2 className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="font-semibold text-sm truncate">{client.company_name}</p>
                            <ChevronRight className="w-4 h-4 text-muted-foreground/40 shrink-0 group-hover:text-primary transition-colors" />
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-[11px] text-muted-foreground">
                            {client.city && (
                              <span className="inline-flex items-center gap-1">
                                <MapPin className="w-3 h-3" /> {client.city}
                              </span>
                            )}
                            {client.phone && (
                              <span className="inline-flex items-center gap-1">
                                <Phone className="w-3 h-3" /> {client.phone}
                              </span>
                            )}
                            {client.email && (
                              <span className="inline-flex items-center gap-1">
                                <Mail className="w-3 h-3" /> {client.email}
                              </span>
                            )}
                          </div>
                          {/* Quick status change */}
                          <div className="flex flex-wrap gap-1 mt-2.5">
                            {ACTIVE_PIPELINE.filter((s) => s !== activeTab).map((status) => (
                              <button
                                key={status}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStatusChange(client.id, status);
                                }}
                                className={`text-[10px] px-2 py-0.5 rounded-full border transition-all hover:scale-105 ${PIPELINE_COLORS[status]}`}
                              >
                                → {PIPELINE_LABELS[status]}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Lost clients */}
      {lostClients.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
          <h2 className="text-sm font-semibold mb-2 text-destructive flex items-center gap-2">
            Perdus
            <span className="text-[10px] font-normal bg-destructive/10 text-destructive px-2 py-0.5 rounded-full">
              {lostClients.length}
            </span>
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {lostClients.map((client) => (
              <Card
                key={client.id}
                className="border-destructive/20 cursor-pointer opacity-50 hover:opacity-90 transition-all duration-200"
                onClick={() => navigate(`/clients/${client.id}`)}
              >
                <CardContent className="p-3">
                  <p className="font-medium text-sm truncate">{client.company_name}</p>
                  {client.city && <p className="text-[10px] text-muted-foreground">{client.city}</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
