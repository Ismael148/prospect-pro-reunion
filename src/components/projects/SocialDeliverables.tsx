import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Camera, Video, CheckCircle2, Clock, Upload, Plus, ChevronLeft, ChevronRight, Mail, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEmailBranding } from "@/hooks/use-email-branding";
import { wrapInBrandedTemplate } from "@/lib/email-template";
import { PUBLISHED_URL } from "@/lib/constants";
import {
  useSocialDeliverables,
  useCreateSocialDeliverable,
  useUpdateSocialDeliverable,
  type SocialDeliverable,
} from "@/hooks/use-social-deliverables";

const TYPE_CONFIG = {
  post_visuel: {
    label: "Post Visuel FB/IG",
    icon: Camera,
    color: "text-[#E1306C]",
    bg: "bg-[#E1306C]/10",
    description: "1 visuel pour Facebook & Instagram",
  },
  video_influenceur: {
    label: "Vidéo Influenceur",
    icon: Video,
    color: "text-[#FF6B00]",
    bg: "bg-[#FF6B00]/10",
    description: "1 vidéo réalisée par un influenceur",
  },
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  a_faire: { label: "À faire", color: "bg-muted text-muted-foreground" },
  en_cours: { label: "En cours", color: "bg-warning/10 text-warning" },
  livre: { label: "Livré", color: "bg-primary/10 text-primary" },
  valide: { label: "Validé ✓", color: "bg-success/10 text-success" },
};

const MONTHS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

function formatMonthYear(my: string) {
  const [y, m] = my.split("-");
  return `${MONTHS[parseInt(m, 10) - 1]} ${y}`;
}

function getCurrentMonthYear() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

interface Props {
  projectId: string;
  clientId: string;
}

export default function SocialDeliverables({ projectId, clientId }: Props) {
  const { user, hasRole } = useAuth();
  const isAdmin = hasRole("admin");
  const { data: deliverables = [], isLoading } = useSocialDeliverables(projectId);
  const createDeliverable = useCreateSocialDeliverable();
  const updateDeliverable = useUpdateSocialDeliverable();
  const { data: branding } = useEmailBranding();

  // Fetch client info for email sending
  const { data: clientInfo } = useQuery({
    queryKey: ["client-email-info", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("company_name, email, support_token, manager_name")
        .eq("id", clientId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });

  // Month navigation
  const currentMonth = getCurrentMonthYear();
  const allMonths = [...new Set(deliverables.map((d) => d.month_year))].sort().reverse();
  if (!allMonths.includes(currentMonth)) allMonths.unshift(currentMonth);
  allMonths.sort().reverse();

  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const monthIndex = allMonths.indexOf(selectedMonth);

  const monthDeliverables = deliverables.filter((d) => d.month_year === selectedMonth);

  const handleCreateMonth = async () => {
    try {
      for (const type of ["post_visuel", "video_influenceur"] as const) {
        const exists = deliverables.find((d) => d.month_year === selectedMonth && d.type === type);
        if (!exists) {
          await createDeliverable.mutateAsync({
            project_id: projectId,
            client_id: clientId,
            month_year: selectedMonth,
            type,
          });
        }
      }
      toast.success("Livrables du mois créés");
    } catch {
      toast.error("Erreur lors de la création");
    }
  };

  const handleStatusChange = async (del: SocialDeliverable, status: string) => {
    try {
      const updates: any = { id: del.id, projectId, status };
      if (status === "livre") {
        updates.delivered_by = user?.id;
        updates.delivered_at = new Date().toISOString();
      }
      if (status === "valide") {
        updates.validated_by = user?.id;
        updates.validated_at = new Date().toISOString();
      }
      await updateDeliverable.mutateAsync(updates);
      toast.success("Statut mis à jour");
    } catch {
      toast.error("Erreur");
    }
  };

  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (del: SocialDeliverable, file: File) => {
    if (file.size > 500 * 1024 * 1024) {
      toast.error("Le fichier ne doit pas dépasser 500 Mo");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `social-deliverables/${del.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("email-assets")
        .upload(path, file, { upsert: true, contentType: file.type || undefined });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("email-assets").getPublicUrl(path);
      await updateDeliverable.mutateAsync({
        id: del.id,
        projectId,
        file_url: urlData.publicUrl,
        status: "livre",
        delivered_by: user?.id,
        delivered_at: new Date().toISOString(),
      } as any);
      toast.success("Fichier uploadé et livrable marqué comme livré");
    } catch (err: any) {
      console.error("Upload error:", err);
      toast.error(err?.message || "Erreur lors de l'upload");
    } finally {
      setUploading(false);
    }
  };

  const handleNotesUpdate = async (del: SocialDeliverable, notes: string) => {
    try {
      await updateDeliverable.mutateAsync({ id: del.id, projectId, notes } as any);
    } catch {
      toast.error("Erreur");
    }
  };

  const [sendingEmail, setSendingEmail] = useState<string | null>(null);

  const handleSendEmail = async (del: SocialDeliverable) => {
    if (!clientInfo?.email) {
      toast.error("Ce client n'a pas d'email configuré");
      return;
    }
    if (!del.file_url) {
      toast.error("Aucun fichier à envoyer");
      return;
    }

    setSendingEmail(del.id);
    try {
      const typeLabel = TYPE_CONFIG[del.type as keyof typeof TYPE_CONFIG]?.label || del.type;
      const supportLink = clientInfo.support_token
        ? `${PUBLISHED_URL}/s/${clientInfo.support_token}`
        : undefined;

      const greetingName = clientInfo.manager_name?.trim() || clientInfo.company_name;

      const introLine =
        del.type === "video_influenceur"
          ? `Nous avons le plaisir de vous envoyer votre <strong>vidéo influenceur</strong> à poster sur vos réseaux sociaux. Elle est optimisée pour Facebook, Instagram & TikTok.`
          : `Votre <strong>${typeLabel}</strong> est prêt ! Vous le trouverez via le lien ci-dessous, configuré pour une diffusion optimale sur vos réseaux sociaux.`;

      const bodyHtml = `
<p style="margin:0 0 20px">Bonjour <strong>${greetingName}</strong>,</p>

<p style="margin:0 0 20px">${introLine}</p>

<div style="margin:28px 0;text-align:center">
  <a href="${del.file_url}" style="display:inline-block;background:#ff006e;color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;box-shadow:0 4px 12px rgba(255,0,110,0.3)">📥 Télécharger le livrable</a>
</div>

<p style="margin:0 0 20px">Pour toute modification ou remarque, merci de passer par notre <strong>système de ticket support</strong> via le lien ci-dessous.</p>

<p style="margin:0">Cordialement,<br><strong style="color:#ff006e">L'équipe Adamkom</strong></p>`;

      const fullHtml = wrapInBrandedTemplate(bodyHtml, supportLink, branding || undefined);

      const subject = `${typeLabel} — ${formatMonthYear(del.month_year)} | ${clientInfo.company_name}`;

      const { error } = await supabase.functions.invoke("send-brevo-campaign", {
        body: {
          action: "send_client_email",
          to: clientInfo.email,
          recipientName: clientInfo.company_name,
          subject,
          htmlContent: fullHtml,
        },
      });

      if (error) throw error;

      // Log the send
      await supabase.from("email_send_log").insert({
        recipient_email: clientInfo.email,
        recipient_name: clientInfo.company_name,
        subject,
        status: "sent",
        template_name: "social_deliverable",
        project_id: projectId,
      } as any);

      toast.success(`Email envoyé à ${clientInfo.email}`);
    } catch (err: any) {
      console.error("Send email error:", err);
      toast.error(err?.message || "Erreur lors de l'envoi");
    } finally {
      setSendingEmail(null);
    }
  };

  const navigateMonth = (direction: number) => {
    const newIdx = monthIndex + direction;
    if (newIdx >= 0 && newIdx < allMonths.length) {
      setSelectedMonth(allMonths[newIdx]);
    }
  };

  if (isLoading) return null;

  return (
    <Card className="border-0 shadow-md shadow-primary/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            📱 Livrables Réseaux Sociaux
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigateMonth(1)} disabled={monthIndex >= allMonths.length - 1}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm font-medium min-w-[120px] text-center">{formatMonthYear(selectedMonth)}</span>
            <Button variant="ghost" size="icon" onClick={() => navigateMonth(-1)} disabled={monthIndex <= 0}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {monthDeliverables.length === 0 ? (
          <div className="text-center py-8 space-y-3">
            <p className="text-sm text-muted-foreground">Aucun livrable pour {formatMonthYear(selectedMonth)}</p>
            <Button onClick={handleCreateMonth} disabled={createDeliverable.isPending} size="sm" className="gap-2">
              <Plus className="w-4 h-4" /> Créer les livrables du mois
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(["post_visuel", "video_influenceur"] as const).map((type) => {
              const del = monthDeliverables.find((d) => d.type === type);
              if (!del) return null;
              const config = TYPE_CONFIG[type];
              const Icon = config.icon;
              const statusCfg = STATUS_CONFIG[del.status];

              return (
                <Card key={del.id} className="border shadow-sm">
                  <CardContent className="pt-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`p-2 rounded-lg ${config.bg}`}>
                          <Icon className={`w-5 h-5 ${config.color}`} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold">{config.label}</p>
                          <p className="text-xs text-muted-foreground">{config.description}</p>
                        </div>
                      </div>
                      <Badge className={statusCfg.color}>{statusCfg.label}</Badge>
                    </div>

                    {/* File preview */}
                    {del.file_url && (
                      <a href={del.file_url} target="_blank" rel="noopener noreferrer" className="block">
                        {del.file_url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                          <img src={del.file_url} alt={config.label} className="w-full h-32 object-cover rounded-lg border" />
                        ) : del.file_url.match(/\.(mp4|webm|mov)$/i) ? (
                          <video src={del.file_url} className="w-full h-32 object-cover rounded-lg border" controls />
                        ) : (
                          <div className="w-full h-16 rounded-lg border flex items-center justify-center text-xs text-muted-foreground">
                            📎 Voir le fichier
                          </div>
                        )}
                      </a>
                    )}

                    {/* Status selector */}
                    <Select value={del.status} onValueChange={(v) => handleStatusChange(del, v)}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="a_faire">À faire</SelectItem>
                        <SelectItem value="en_cours">En cours</SelectItem>
                        <SelectItem value="livre">Livré</SelectItem>
                        {isAdmin && <SelectItem value="valide">Validé ✓</SelectItem>}
                      </SelectContent>
                    </Select>

                    {/* File upload */}
                    {del.status !== "valide" && (
                      <label className={`flex items-center gap-2 cursor-pointer text-xs text-primary hover:underline ${uploading ? "opacity-50 pointer-events-none" : ""}`}>
                        <Upload className="w-3.5 h-3.5" />
                        {uploading ? "Upload en cours..." : del.file_url ? "Remplacer le fichier" : "Uploader le fichier"}
                        <input
                          type="file"
                          className="hidden"
                          accept="image/*,video/*,.pdf"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleFileUpload(del, f);
                            e.target.value = "";
                          }}
                        />
                      </label>
                    )}

                    {/* Send email button - visible when file is uploaded */}
                    {del.file_url && clientInfo?.email && (del.status === "livre" || del.status === "valide") && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full gap-2 text-xs"
                        disabled={sendingEmail === del.id}
                        onClick={() => handleSendEmail(del)}
                      >
                        {sendingEmail === del.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Mail className="w-3.5 h-3.5" />
                        )}
                        {sendingEmail === del.id ? "Envoi en cours..." : "Envoyer au client"}
                      </Button>
                    )}

                    {/* Notes */}
                    <Textarea
                      placeholder="Notes..."
                      value={del.notes || ""}
                      onChange={(e) => handleNotesUpdate(del, e.target.value)}
                      className="text-xs min-h-[60px] resize-none"
                    />

                    {/* Validation info */}
                    {del.validated_at && (
                      <p className="text-xs text-success flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Validé le {new Date(del.validated_at).toLocaleDateString("fr-FR", { timeZone: "Indian/Reunion" })}
                      </p>
                    )}
                    {del.delivered_at && del.status !== "valide" && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Livré le {new Date(del.delivered_at).toLocaleDateString("fr-FR", { timeZone: "Indian/Reunion" })}
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Monthly summary */}
        {allMonths.length > 1 && (
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground mb-2">Historique mensuel</p>
            <div className="flex flex-wrap gap-1.5">
              {allMonths.map((m) => {
                const mDels = deliverables.filter((d) => d.month_year === m);
                const allDone = mDels.length === 2 && mDels.every((d) => d.status === "valide");
                const someDelivered = mDels.some((d) => d.status === "livre" || d.status === "valide");
                return (
                  <Button
                    key={m}
                    variant={m === selectedMonth ? "default" : "outline"}
                    size="sm"
                    className={`text-xs h-7 ${allDone ? "border-success/50" : someDelivered ? "border-primary/50" : ""}`}
                    onClick={() => setSelectedMonth(m)}
                  >
                    {allDone && "✓ "}{formatMonthYear(m).slice(0, 3)} {m.split("-")[0].slice(2)}
                  </Button>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
