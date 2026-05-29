import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Loader2, AlertTriangle, Palette } from "lucide-react";
import { toast } from "sonner";

export default function LogoValidation() {
  const { clientId } = useParams<{ clientId: string }>();
  const [params] = useSearchParams();
  const token = params.get("token");

  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    (async () => {
      if (!clientId || !token) {
        setError("Lien invalide");
        setLoading(false);
        return;
      }
      const { data, error } = await (supabase as any).rpc("get_client_logo_for_validation", {
        p_client_id: clientId,
        p_token: token,
      });
      const row = Array.isArray(data) ? data[0] : null;
      if (error || !row) {
        setError("Lien invalide ou expiré");
      } else {
        setClient(row);
        if (row.logo_validated_by_client) setDone(true);
      }
      setLoading(false);
    })();
  }, [clientId, token]);

  const validate = async () => {
    setValidating(true);
    try {
      const { data, error } = await (supabase as any).rpc("validate_logo_with_token", {
        p_client_id: clientId,
        p_token: token,
      });
      if (error) throw error;
      if (data !== true) throw new Error("Lien invalide ou expiré");
      setDone(true);
      toast.success("Merci ! Votre logo est validé");
    } catch (e: any) {
      toast.error(e.message || "Erreur");
    } finally {
      setValidating(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-3">
            <AlertTriangle className="w-12 h-12 text-destructive mx-auto" />
            <p className="text-lg font-semibold">{error}</p>
            <p className="text-sm text-muted-foreground">Contactez votre conseiller Adamkom.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isImage = client.logo_file_url && /\.(png|jpe?g|webp|gif|svg)$/i.test(client.logo_file_url);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-background to-muted">
      <Card className="max-w-lg w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Palette className="w-6 h-6 text-primary" />
            </div>
          </div>
          <CardTitle>Validation de votre logo</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">{client.company_name}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {client.logo_file_url && isImage && (
            <div className="rounded-lg border bg-white p-6 flex items-center justify-center">
              <img src={client.logo_file_url} alt="Votre logo" className="max-h-64 object-contain" />
            </div>
          )}
          {client.logo_file_url && !isImage && (
            <a href={client.logo_file_url} target="_blank" rel="noreferrer" className="block text-center text-primary underline">
              📎 Voir votre logo
            </a>
          )}
          {!client.logo_file_url && client.logo_drive_url && (
            <a href={client.logo_drive_url} target="_blank" rel="noreferrer" className="block text-center text-primary underline">
              📁 Voir votre logo sur Google Drive
            </a>
          )}
          {!client.logo_file_url && !client.logo_drive_url && (
            <p className="text-center text-sm text-muted-foreground">Logo en cours de finalisation par notre équipe.</p>
          )}

          {done ? (
            <div className="text-center p-4 rounded-lg bg-success/10 text-success">
              <CheckCircle2 className="w-8 h-8 mx-auto mb-2" />
              <p className="font-semibold">Merci ! Votre logo est validé.</p>
              <p className="text-xs mt-1">Notre équipe a été notifiée.</p>
            </div>
          ) : (
            <Button className="w-full" size="lg" onClick={validate} disabled={validating}>
              {validating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
              Je valide mon logo
            </Button>
          )}
          <p className="text-[11px] text-center text-muted-foreground">
            En validant, vous confirmez que ce logo correspond à votre entreprise et autorisez sa publication.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
