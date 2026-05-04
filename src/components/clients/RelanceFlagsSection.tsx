import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Megaphone, Facebook, MapPin, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  clientId: string;
  client: any;
}

export default function RelanceFlagsSection({ clientId, client }: Props) {
  const { user, hasRole } = useAuth();
  const qc = useQueryClient();
  const canEdit = hasRole("admin") || hasRole("agent_master");

  const [fbOn, setFbOn] = useState(!!client.relance_facebook_needed);
  const [gmbOn, setGmbOn] = useState(!!client.relance_gmb_needed);
  const [fbNote, setFbNote] = useState(client.relance_facebook_note || "");
  const [gmbNote, setGmbNote] = useState(client.relance_gmb_note || "");

  useEffect(() => {
    setFbOn(!!client.relance_facebook_needed);
    setGmbOn(!!client.relance_gmb_needed);
    setFbNote(client.relance_facebook_note || "");
    setGmbNote(client.relance_gmb_note || "");
  }, [client.id, client.relance_facebook_needed, client.relance_gmb_needed]);

  const update = useMutation({
    mutationFn: async (payload: Record<string, any>) => {
      const { error } = await supabase
        .from("clients")
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq("id", clientId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client", clientId] });
      qc.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Relance mise à jour — équipes notifiées");
    },
    onError: (e: any) => toast.error(e.message || "Erreur"),
  });

  const toggleFb = (v: boolean) => {
    setFbOn(v);
    update.mutate({
      relance_facebook_needed: v,
      relance_facebook_by: v ? user?.id : null,
      relance_facebook_note: v ? fbNote || null : null,
    });
  };

  const toggleGmb = (v: boolean) => {
    setGmbOn(v);
    update.mutate({
      relance_gmb_needed: v,
      relance_gmb_by: v ? user?.id : null,
      relance_gmb_note: v ? gmbNote || null : null,
    });
  };

  const saveNote = (kind: "fb" | "gmb") => {
    update.mutate(
      kind === "fb"
        ? { relance_facebook_note: fbNote || null }
        : { relance_gmb_note: gmbNote || null }
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Megaphone className="w-4 h-4 text-primary" />
          Relances Facebook & GMB
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Coche un drapeau pour alerter instantanément les agents (support, master, téléphonique) qu'un client doit être rappelé.
        </p>

        {/* Facebook */}
        <div className={`p-3 rounded-lg border ${fbOn ? "border-blue-500/40 bg-blue-500/5" : "bg-muted/20"}`}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Facebook className="w-4 h-4 text-blue-600" />
              <Label htmlFor="fb-relance" className="font-medium">Relancer pour Business Manager Facebook</Label>
              {fbOn && <Badge className="bg-blue-500/15 text-blue-600 border-blue-500/30">À rappeler</Badge>}
            </div>
            <Switch id="fb-relance" checked={fbOn} onCheckedChange={toggleFb} disabled={!canEdit || update.isPending} />
          </div>
          {fbOn && (
            <div className="mt-2 space-y-1">
              <Textarea
                value={fbNote}
                onChange={(e) => setFbNote(e.target.value)}
                onBlur={() => saveNote("fb")}
                rows={2}
                placeholder="Note interne (ex: client n'a pas encore créé son BM, à relancer cette semaine…)"
                disabled={!canEdit}
                className="text-sm"
              />
              {client.relance_facebook_at && (
                <p className="text-[11px] text-muted-foreground">
                  Activé le {new Date(client.relance_facebook_at).toLocaleString("fr-FR", { timeZone: "Indian/Reunion" })}
                </p>
              )}
            </div>
          )}
        </div>

        {/* GMB */}
        <div className={`p-3 rounded-lg border ${gmbOn ? "border-amber-500/40 bg-amber-500/5" : "bg-muted/20"}`}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-amber-600" />
              <Label htmlFor="gmb-relance" className="font-medium">Relancer pour Google My Business</Label>
              {gmbOn && <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30">À rappeler</Badge>}
            </div>
            <Switch id="gmb-relance" checked={gmbOn} onCheckedChange={toggleGmb} disabled={!canEdit || update.isPending} />
          </div>
          {gmbOn && (
            <div className="mt-2 space-y-1">
              <Textarea
                value={gmbNote}
                onChange={(e) => setGmbNote(e.target.value)}
                onBlur={() => saveNote("gmb")}
                rows={2}
                placeholder="Note interne (ex: code postal pas reçu, fiche à finaliser…)"
                disabled={!canEdit}
                className="text-sm"
              />
              {client.relance_gmb_at && (
                <p className="text-[11px] text-muted-foreground">
                  Activé le {new Date(client.relance_gmb_at).toLocaleString("fr-FR", { timeZone: "Indian/Reunion" })}
                </p>
              )}
            </div>
          )}
        </div>

        {!canEdit && (
          <p className="text-[11px] text-muted-foreground italic">
            Lecture seule — seul un admin ou agent master peut activer une relance.
          </p>
        )}
        {update.isPending && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="w-3 h-3 animate-spin" /> Envoi des notifications…
          </div>
        )}
      </CardContent>
    </Card>
  );
}
