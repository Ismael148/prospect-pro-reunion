import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Palette, MapPin, CheckCircle2, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface Props {
  client: {
    id: string;
    company_name: string;
    logo_created?: boolean | null;
    logo_created_at?: string | null;
    logo_published_gmb?: boolean | null;
    logo_published_gmb_at?: string | null;
    logo_validated_by_client?: boolean | null;
    logo_validated_at?: string | null;
  };
}

const fmt = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString("fr-FR", { timeZone: "Indian/Reunion", day: "2-digit", month: "2-digit", year: "numeric" }) : "";

export default function LogoTrackingCard({ client }: Props) {
  const qc = useQueryClient();
  const [saving, setSaving] = useState<string | null>(null);

  const update = async (field: "logo_created" | "logo_published_gmb" | "logo_validated_by_client", value: boolean) => {
    setSaving(field);
    try {
      const updates: Record<string, any> = { [field]: value };
      // Auto-cascade: si on coche "publié" sans "créé", on coche aussi créé
      if (value && field === "logo_published_gmb" && !client.logo_created) updates.logo_created = true;
      if (value && field === "logo_validated_by_client") {
        if (!client.logo_created) updates.logo_created = true;
        if (!client.logo_published_gmb) updates.logo_published_gmb = true;
      }
      const { error } = await (supabase.from("clients") as any).update(updates).eq("id", client.id);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["client", client.id] });
      toast.success("Suivi logo mis à jour");
    } catch (e: any) {
      toast.error(e.message || "Erreur");
    } finally {
      setSaving(null);
    }
  };

  const validated = !!client.logo_validated_by_client;
  const steps = [
    {
      key: "logo_created" as const,
      label: "Logo créé",
      checked: !!client.logo_created,
      date: client.logo_created_at,
      icon: Palette,
    },
    {
      key: "logo_published_gmb" as const,
      label: "Publié sur la fiche Google",
      checked: !!client.logo_published_gmb,
      date: client.logo_published_gmb_at,
      icon: MapPin,
    },
    {
      key: "logo_validated_by_client" as const,
      label: "Validé par le client",
      checked: validated,
      date: client.logo_validated_at,
      icon: CheckCircle2,
    },
  ];

  return (
    <Card className="border-0 shadow-md shadow-primary/5">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg flex items-center gap-2">
          <Palette className="w-5 h-5" /> Création de logo
        </CardTitle>
        {validated ? (
          <Badge className="bg-success/15 text-success border-success/30">Validé client</Badge>
        ) : (
          <Badge variant="outline" className="gap-1">
            <Clock className="w-3 h-3" /> En attente
          </Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        {steps.map((s) => (
          <label
            key={s.key}
            className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
          >
            <Checkbox
              checked={s.checked}
              disabled={saving !== null}
              onCheckedChange={(v) => update(s.key, !!v)}
            />
            <s.icon className={`w-4 h-4 ${s.checked ? "text-success" : "text-muted-foreground"}`} />
            <div className="flex-1">
              <p className={`text-sm font-medium ${s.checked ? "" : "text-muted-foreground"}`}>{s.label}</p>
              {s.checked && s.date && (
                <p className="text-[11px] text-muted-foreground">le {fmt(s.date)}</p>
              )}
            </div>
          </label>
        ))}
        {!validated && (
          <p className="text-xs text-muted-foreground pt-1">
            🔔 Une relance automatique est envoyée tous les 2 jours à l'équipe tant que le logo n'est pas validé par le client.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
