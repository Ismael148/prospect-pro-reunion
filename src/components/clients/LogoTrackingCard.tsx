import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Palette, MapPin, CheckCircle2, Clock, Upload, Link2, ExternalLink, Copy, Trash2, Loader2, PowerOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PUBLISHED_URL } from "@/lib/constants";

interface Props {
  client: {
    id: string;
    company_name: string;
    logo_tracking_enabled?: boolean | null;
    logo_created?: boolean | null;
    logo_created_at?: string | null;
    logo_published_gmb?: boolean | null;
    logo_published_gmb_at?: string | null;
    logo_validated_by_client?: boolean | null;
    logo_validated_at?: string | null;
    logo_file_url?: string | null;
    logo_drive_url?: string | null;
    logo_validation_token?: string | null;
  };
}

const fmt = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString("fr-FR", { timeZone: "Indian/Reunion", day: "2-digit", month: "2-digit", year: "numeric" }) : "";

export default function LogoTrackingCard({ client }: Props) {
  const qc = useQueryClient();
  const [saving, setSaving] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [driveUrl, setDriveUrl] = useState(client.logo_drive_url || "");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const update = async (updates: Record<string, any>) => {
    const { error } = await (supabase.from("clients") as any).update(updates).eq("id", client.id);
    if (error) throw error;
    qc.invalidateQueries({ queryKey: ["client", client.id] });
  };

  const handleStep = async (field: "logo_created" | "logo_published_gmb" | "logo_validated_by_client", value: boolean) => {
    setSaving(field);
    try {
      const updates: Record<string, any> = { [field]: value };
      // Cascade ascendante (cocher haut)
      if (value && field === "logo_published_gmb" && !client.logo_created) updates.logo_created = true;
      if (value && field === "logo_validated_by_client") {
        if (!client.logo_created) updates.logo_created = true;
        if (!client.logo_published_gmb) updates.logo_published_gmb = true;
      }
      await update(updates);
      toast.success(value ? "Étape validée" : "Étape réinitialisée (cascade appliquée)");
    } catch (e: any) {
      toast.error(e.message || "Erreur");
    } finally {
      setSaving(null);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Fichier trop volumineux (max 10MB)");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${client.id}/logo-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("client-logos").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from("client-logos").getPublicUrl(path);
      const updates: any = { logo_file_url: publicUrl };
      if (!client.logo_created) updates.logo_created = true;
      await update(updates);
      toast.success("Logo uploadé");
    } catch (e: any) {
      toast.error(e.message || "Erreur upload");
    } finally {
      setUploading(false);
    }
  };

  const handleSaveDriveUrl = async () => {
    setSaving("drive");
    try {
      await update({ logo_drive_url: driveUrl || null });
      toast.success("Lien Drive enregistré");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(null);
    }
  };

  const handleRemoveFile = async () => {
    setSaving("remove");
    try {
      await update({ logo_file_url: null });
      toast.success("Fichier retiré");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(null);
    }
  };

  const validationLink = client.logo_validation_token
    ? `${PUBLISHED_URL}/valider-logo/${client.id}?token=${client.logo_validation_token}`
    : null;

  const copyValidationLink = () => {
    if (!validationLink) return;
    navigator.clipboard.writeText(validationLink);
    toast.success("Lien de validation copié");
  };

  const enabled = !!client.logo_tracking_enabled;
  const validated = !!client.logo_validated_by_client;
  const isImage = client.logo_file_url && /\.(png|jpe?g|webp|gif|svg)$/i.test(client.logo_file_url);

  const toggleTracking = async (value: boolean) => {
    setSaving("toggle");
    try {
      await update({ logo_tracking_enabled: value });
      toast.success(value ? "Suivi logo activé" : "Suivi logo désactivé (étapes réinitialisées)");
    } catch (e: any) {
      toast.error(e.message || "Erreur");
    } finally {
      setSaving(null);
    }
  };

  // Card "off" state — just the toggle
  if (!enabled) {
    return (
      <Card className="border-0 shadow-md shadow-primary/5 border-dashed">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                <PowerOff className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium text-sm">Création de logo</p>
                <p className="text-xs text-muted-foreground">
                  Activer pour ce client uniquement si une création de logo est prévue.
                </p>
              </div>
            </div>
            <Switch checked={false} disabled={saving === "toggle"} onCheckedChange={toggleTracking} />
          </div>
        </CardContent>
      </Card>
    );
  }

  const steps = [
    { key: "logo_created" as const, label: "Logo créé", checked: !!client.logo_created, date: client.logo_created_at, icon: Palette },
    { key: "logo_published_gmb" as const, label: "Publié sur la fiche Google", checked: !!client.logo_published_gmb, date: client.logo_published_gmb_at, icon: MapPin },
    { key: "logo_validated_by_client" as const, label: "Validé par le client", checked: validated, date: client.logo_validated_at, icon: CheckCircle2 },
  ];

  return (
    <Card className="border-0 shadow-md shadow-primary/5">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg flex items-center gap-2">
          <Palette className="w-5 h-5" /> Création de logo
        </CardTitle>
        <div className="flex items-center gap-2">
          {validated ? (
            <Badge className="bg-success/15 text-success border-success/30">Validé client</Badge>
          ) : (
            <Badge variant="outline" className="gap-1"><Clock className="w-3 h-3" /> En attente</Badge>
          )}
          <Switch checked={true} disabled={saving === "toggle"} onCheckedChange={toggleTracking} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Steps */}
        <div className="space-y-2">
          {steps.map((s) => (
            <label key={s.key} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer">
              <Checkbox checked={s.checked} disabled={saving !== null} onCheckedChange={(v) => handleStep(s.key, !!v)} />
              <s.icon className={`w-4 h-4 ${s.checked ? "text-success" : "text-muted-foreground"}`} />
              <div className="flex-1">
                <p className={`text-sm font-medium ${s.checked ? "" : "text-muted-foreground"}`}>{s.label}</p>
                {s.checked && s.date && <p className="text-[11px] text-muted-foreground">le {fmt(s.date)}</p>}
              </div>
            </label>
          ))}
        </div>

        {/* File upload */}
        <div className="space-y-2 pt-2 border-t">
          <Label className="text-xs font-semibold text-muted-foreground uppercase">Fichier logo</Label>
          {client.logo_file_url ? (
            <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/20">
              {isImage && (
                <img src={client.logo_file_url} alt="Logo" className="w-16 h-16 object-contain rounded bg-white" />
              )}
              <div className="flex-1 min-w-0">
                <a href={client.logo_file_url} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline flex items-center gap-1 truncate">
                  <ExternalLink className="w-3 h-3 shrink-0" /> Voir le fichier
                </a>
                <p className="text-[11px] text-muted-foreground truncate">{client.logo_file_url.split("/").pop()}</p>
              </div>
              <Button size="sm" variant="ghost" onClick={handleRemoveFile} disabled={saving === "remove"}>
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </div>
          ) : (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf"
                hidden
                onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
              />
              <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                Uploader (PNG/JPG/SVG/PDF, max 10MB)
              </Button>
            </div>
          )}
        </div>

        {/* Drive link */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1"><Link2 className="w-3 h-3" /> Lien Google Drive</Label>
          <div className="flex gap-2">
            <Input placeholder="https://drive.google.com/..." value={driveUrl} onChange={(e) => setDriveUrl(e.target.value)} />
            <Button size="sm" onClick={handleSaveDriveUrl} disabled={saving === "drive" || driveUrl === (client.logo_drive_url || "")}>
              Enregistrer
            </Button>
          </div>
          {client.logo_drive_url && (
            <a href={client.logo_drive_url} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
              <ExternalLink className="w-3 h-3" /> Ouvrir le lien Drive
            </a>
          )}
        </div>

        {/* Public validation link */}
        {!validated && validationLink && (
          <div className="space-y-2 pt-2 border-t">
            <Label className="text-xs font-semibold text-muted-foreground uppercase">Lien validation client</Label>
            <div className="flex gap-2">
              <Input value={validationLink} readOnly className="text-xs font-mono" />
              <Button size="sm" variant="outline" onClick={copyValidationLink}><Copy className="w-3 h-3" /></Button>
            </div>
            <p className="text-[11px] text-muted-foreground">Envoie ce lien au client : il pourra valider son logo en un clic, sans connexion.</p>
          </div>
        )}

        {!validated && (
          <p className="text-xs text-muted-foreground">
            🔔 Relance automatique tous les 2 jours à l'équipe tant que le logo n'est pas validé.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
