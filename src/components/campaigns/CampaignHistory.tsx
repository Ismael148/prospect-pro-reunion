import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, XCircle, Mail, MousePointerClick, Eye, AlertTriangle, History, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  sent: { label: "Envoyé", color: "bg-blue-100 text-blue-800", icon: Mail },
  delivered: { label: "Délivré", color: "bg-green-100 text-green-800", icon: CheckCircle },
  opened: { label: "Ouvert", color: "bg-emerald-100 text-emerald-800", icon: Eye },
  clicked: { label: "Cliqué", color: "bg-purple-100 text-purple-800", icon: MousePointerClick },
  bounced: { label: "Rebond", color: "bg-orange-100 text-orange-800", icon: AlertTriangle },
  failed: { label: "Échoué", color: "bg-red-100 text-red-800", icon: XCircle },
  spam: { label: "Spam", color: "bg-red-100 text-red-800", icon: AlertTriangle },
  blocked: { label: "Bloqué", color: "bg-gray-100 text-gray-800", icon: XCircle },
  unsubscribed: { label: "Désabonné", color: "bg-yellow-100 text-yellow-800", icon: AlertTriangle },
};

const PAGE_SIZE = 20;

export default function CampaignHistory() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(0);

  const { data: logs, isLoading } = useQuery({
    queryKey: ["campaign-email-logs", statusFilter, page],
    queryFn: async () => {
      let query = supabase
        .from("email_send_log")
        .select("*", { count: "exact" })
        .eq("template_name", "campaign")
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error, count } = await query;
      if (error) throw error;
      return { data: data || [], count: count || 0 };
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["campaign-email-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_send_log")
        .select("status")
        .eq("template_name", "campaign");

      if (error) throw error;

      const counts: Record<string, number> = {};
      (data || []).forEach((row) => {
        counts[row.status] = (counts[row.status] || 0) + 1;
      });
      return counts;
    },
  });

  const totalPages = Math.ceil((logs?.count || 0) / PAGE_SIZE);
  const totalSent = (stats?.sent || 0) + (stats?.delivered || 0) + (stats?.opened || 0) + (stats?.clicked || 0);

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Envoyés", value: totalSent, color: "text-blue-600" },
          { label: "Ouverts", value: stats?.opened || 0, color: "text-emerald-600" },
          { label: "Cliqués", value: stats?.clicked || 0, color: "text-purple-600" },
          { label: "Rebonds", value: stats?.bounced || 0, color: "text-orange-600" },
          { label: "Échoués", value: stats?.failed || 0, color: "text-destructive" },
        ].map((s) => (
          <Card key={s.label} className="border-0 shadow-sm">
            <CardContent className="p-3 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter */}
      <Card className="border-0 shadow-md shadow-primary/5">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <History className="w-4 h-4" />
            Historique des envois
          </CardTitle>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
            <SelectTrigger className="w-36 h-8 text-xs">
              <SelectValue placeholder="Filtrer" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="sent">Envoyé</SelectItem>
              <SelectItem value="delivered">Délivré</SelectItem>
              <SelectItem value="opened">Ouvert</SelectItem>
              <SelectItem value="clicked">Cliqué</SelectItem>
              <SelectItem value="bounced">Rebond</SelectItem>
              <SelectItem value="failed">Échoué</SelectItem>
              <SelectItem value="spam">Spam</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-8">Chargement...</p>
          ) : !logs?.data.length ? (
            <p className="text-sm text-muted-foreground text-center py-8">Aucun envoi enregistré</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Destinataire</TableHead>
                    <TableHead>Campagne</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Erreur</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.data.map((log) => {
                    const cfg = STATUS_CONFIG[log.status] || STATUS_CONFIG.sent;
                    const Icon = cfg.icon;
                    return (
                      <TableRow key={log.id}>
                        <TableCell>
                          <div>
                            <p className="text-sm font-medium">{log.recipient_name || "—"}</p>
                            <p className="text-xs text-muted-foreground">{log.recipient_email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm truncate max-w-[200px]">{(log as any).campaign_name || log.subject || "—"}</p>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`gap-1 ${cfg.color}`}>
                            <Icon className="w-3 h-3" />
                            {cfg.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {format(new Date(log.created_at), "dd MMM yyyy HH:mm", { locale: fr })}
                        </TableCell>
                        <TableCell>
                          {log.error_message && (
                            <p className="text-xs text-destructive truncate max-w-[150px]" title={log.error_message}>
                              {log.error_message}
                            </p>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-xs text-muted-foreground">
                    Page {page + 1} / {totalPages} ({logs.count} résultat{logs.count > 1 ? "s" : ""})
                  </p>
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
