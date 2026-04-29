import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { Bot, Sparkles, AlertTriangle, MessageSquare, RefreshCw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { useAuth } from "@/contexts/AuthContext";

interface Props {
  clientId: string;
  clientCompany?: string;
}

export default function ChatbotConfigSection({ clientId, clientCompany }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: config, isLoading } = useQuery({
    queryKey: ["chatbot-config", clientId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("chatbot_configs")
        .select("*")
        .eq("client_id", clientId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: conversations } = useQuery({
    queryKey: ["chatbot-conv", clientId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("chatbot_conversations")
        .select("*")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
  });

  const [form, setForm] = useState({
    enabled: false,
    platforms: ["facebook", "instagram"],
    system_prompt: "",
    business_info: "",
    fallback_message: "",
    escalation_keywords: "",
  });

  useEffect(() => {
    if (config) {
      setForm({
        enabled: config.enabled,
        platforms: config.platforms || [],
        system_prompt: config.system_prompt || "",
        business_info: config.business_info || "",
        fallback_message: config.fallback_message || "",
        escalation_keywords: (config.escalation_keywords || []).join(", "),
      });
    } else if (clientCompany) {
      setForm((p) => ({
        ...p,
        system_prompt: `Tu es l'assistant virtuel de ${clientCompany}. Réponds aux clients de manière polie, professionnelle et concise. Utilise les informations fournies pour répondre aux questions.`,
        fallback_message: `Merci pour votre message ! L'équipe de ${clientCompany} vous répondra dans les plus brefs délais.`,
      }));
    }
  }, [config, clientCompany]);

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        client_id: clientId,
        enabled: form.enabled,
        platforms: form.platforms,
        system_prompt: form.system_prompt,
        business_info: form.business_info || null,
        fallback_message: form.fallback_message,
        escalation_keywords: form.escalation_keywords
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        created_by: user?.id || null,
      };
      const { error } = await (supabase as any)
        .from("chatbot_configs")
        .upsert(payload, { onConflict: "client_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Configuration chatbot enregistrée");
      qc.invalidateQueries({ queryKey: ["chatbot-config", clientId] });
    },
    onError: (e: any) => toast.error(e.message || "Erreur"),
  });

  const togglePlatform = (p: string) => {
    setForm((f) => ({
      ...f,
      platforms: f.platforms.includes(p) ? f.platforms.filter((x) => x !== p) : [...f.platforms, p],
    }));
  };

  if (isLoading) {
    return <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">Chargement...</CardContent></Card>;
  }

  return (
    <Card className="border-violet-200 bg-gradient-to-br from-violet-50/30 to-transparent">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Bot className="w-5 h-5 text-violet-600" /> Chatbot IA — Messenger & Instagram
          {form.enabled && <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300">Actif</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="border-amber-300 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-xs">
            <strong>⚠️ Activation conditionnelle :</strong> le chatbot ne fonctionnera réellement qu'une fois la
            vérification business Meta validée et la page connectée via OAuth (avec permissions <code>pages_messaging</code>
            et <code>instagram_manage_messages</code>). La configuration ci-dessous est sauvegardée et prête à être activée.
          </AlertDescription>
        </Alert>

        {/* Activation */}
        <div className="flex items-center justify-between p-3 rounded-lg border bg-background">
          <div>
            <Label className="text-sm font-semibold">Activer le chatbot IA</Label>
            <p className="text-xs text-muted-foreground">Réponses automatiques aux messages reçus</p>
          </div>
          <Switch checked={form.enabled} onCheckedChange={(v) => setForm((f) => ({ ...f, enabled: v }))} />
        </div>

        {/* Plateformes */}
        <div>
          <Label className="text-sm font-semibold mb-2 block">Plateformes activées</Label>
          <div className="flex gap-2">
            {["facebook", "instagram"].map((p) => (
              <Button
                key={p}
                size="sm"
                variant={form.platforms.includes(p) ? "default" : "outline"}
                onClick={() => togglePlatform(p)}
                className="capitalize"
              >
                {p}
              </Button>
            ))}
          </div>
        </div>

        {/* Personnalité IA */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" /> Rôle & ton du chatbot
          </Label>
          <Textarea
            rows={3}
            value={form.system_prompt}
            onChange={(e) => setForm((f) => ({ ...f, system_prompt: e.target.value }))}
            placeholder="Tu es l'assistant virtuel de... Réponds de manière..."
          />
        </div>

        {/* Infos business */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold">Informations entreprise (FAQ, horaires, services)</Label>
          <Textarea
            rows={6}
            value={form.business_info}
            onChange={(e) => setForm((f) => ({ ...f, business_info: e.target.value }))}
            placeholder="Horaires : lun-ven 9h-18h&#10;Services : développement web, SEO, social media&#10;Tarifs : à partir de 1490€&#10;Adresse : ..."
          />
          <p className="text-[10px] text-muted-foreground">Ces infos seront injectées dans chaque réponse du chatbot.</p>
        </div>

        {/* Fallback */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold">Message de secours (escalade humaine)</Label>
          <Textarea
            rows={2}
            value={form.fallback_message}
            onChange={(e) => setForm((f) => ({ ...f, fallback_message: e.target.value }))}
          />
        </div>

        {/* Escalation keywords */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold">Mots-clés d'escalade humaine</Label>
          <Input
            value={form.escalation_keywords}
            onChange={(e) => setForm((f) => ({ ...f, escalation_keywords: e.target.value }))}
            placeholder="humain, conseiller, rdv, urgent, plainte, remboursement"
          />
          <p className="text-[10px] text-muted-foreground">Séparés par des virgules. Si détectés, le bot envoie le message de secours.</p>
        </div>

        <Button onClick={() => save.mutate()} disabled={save.isPending} className="w-full">
          {save.isPending ? "Enregistrement..." : "Enregistrer la configuration"}
        </Button>

        {/* Conversations récentes */}
        <div className="pt-4 border-t">
          <div className="flex items-center justify-between mb-2">
            <Label className="text-sm font-semibold flex items-center gap-1">
              <MessageSquare className="w-3.5 h-3.5" /> Dernières conversations ({conversations?.length || 0})
            </Label>
            <Button size="sm" variant="ghost" onClick={() => qc.invalidateQueries({ queryKey: ["chatbot-conv", clientId] })}>
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
          </div>
          {!conversations || conversations.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">Aucune conversation enregistrée pour le moment.</p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {conversations.map((c: any) => (
                <div key={c.id} className="p-2 rounded border text-xs bg-background/60">
                  <div className="flex items-center justify-between mb-1">
                    <Badge variant="outline" className="text-[9px]">{c.platform}</Badge>
                    <span className="text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: fr })}
                    </span>
                  </div>
                  <p className="text-muted-foreground"><strong>👤</strong> {c.incoming_message}</p>
                  <p className="mt-1"><strong>🤖</strong> {c.ai_response || "(pas de réponse)"}</p>
                  {c.error_message && <p className="text-red-600 mt-1">⚠ {c.error_message}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
