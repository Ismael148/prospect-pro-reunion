import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mail, CheckCircle2, Eye, MousePointerClick, AlertTriangle, XCircle, Clock } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Mail }> = {
  sent: { label: "Envoyé", color: "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300", icon: CheckCircle2 },
  delivered: { label: "Délivré", color: "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-300", icon: CheckCircle2 },
  opened: { label: "Ouvert", color: "bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-300", icon: Eye },
  clicked: { label: "Cliqué", color: "bg-violet-100 text-violet-700 border-violet-300 dark:bg-violet-900/30 dark:text-violet-300", icon: MousePointerClick },
  bounced: { label: "Rebondi", color: "bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900/30 dark:text-orange-300", icon: AlertTriangle },
  failed: { label: "Échoué", color: "bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-300", icon: XCircle },
  spam: { label: "Spam", color: "bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-300", icon: XCircle },
  blocked: { label: "Bloqué", color: "bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-300", icon: XCircle },
  unsubscribed: { label: "Désabonné", color: "bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-300", icon: AlertTriangle },
  pending: { label: "En attente", color: "bg-muted text-muted-foreground border-border", icon: Clock },
};

const TEMPLATE_LABELS: Record<string, string> = {
  campaign: "Campagne",
  design: "Livrable",
  client_email: "Email client",
  welcome: "Bienvenue",
  invoice: "Facture",
  support_confirmation: "Confirmation support",
  support_resolved: "Support résolu",
  form_reminder: "Relance formulaire",
  support_link: "Lien support",
};

interface ClientEmailHistoryProps {
  clientId: string;
  clientEmail: string | null;
}

export default function ClientEmailHistory({ clientId, clientEmail }: ClientEmailHistoryProps) {
  const { data: emails, isLoading } = useQuery({
    queryKey: ["client-email-history", clientId, clientEmail],
    queryFn: async () => {
      if (!clientEmail) return [];
      const { data, error } = await supabase
        .from("email_send_log")
        .select("*")
        .eq("recipient_email", clientEmail)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!clientEmail,
  });

  // Deduplicate by message_id, keep latest status
  const dedupedEmails = (() => {
    if (!emails) return [];
    const map = new Map<string, typeof emails[0]>();
    for (const e of emails) {
      const key = e.message_id || e.id;
      if (!map.has(key)) {
        map.set(key, e);
      }
    }
    return Array.from(map.values());
  })();

  if (!clientEmail) return null;

  return (
    <Card className="border-0 shadow-md shadow-primary/5">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Mail className="w-5 h-5" /> Historique des emails ({dedupedEmails.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Chargement...</p>
        ) : dedupedEmails.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun email envoyé à ce client.</p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {dedupedEmails.map((email) => {
              const cfg = STATUS_CONFIG[email.status] || STATUS_CONFIG.pending;
              const Icon = cfg.icon;
              return (
                <div key={email.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
                  <Icon className="w-4 h-4 mt-0.5 shrink-0 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium truncate">{email.subject || "(sans objet)"}</span>
                      <Badge variant="outline" className={`text-[10px] ${cfg.color}`}>
                        {cfg.label}
                      </Badge>
                      {email.template_name && (
                        <Badge variant="outline" className="text-[10px]">
                          {TEMPLATE_LABELS[email.template_name] || email.template_name}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <span>{format(new Date(email.created_at), "dd MMM yyyy 'à' HH:mm", { locale: fr })}</span>
                      {email.campaign_name && <span>• {email.campaign_name}</span>}
                    </div>
                    {email.error_message && (
                      <p className="text-xs text-destructive mt-1 truncate">{email.error_message}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
