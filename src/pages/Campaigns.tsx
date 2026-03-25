import { useState } from "react";
import { useClients } from "@/hooks/use-clients";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Mail, Send, Users, CheckCircle, AlertCircle, Loader2, History } from "lucide-react";
import CampaignHistory from "@/components/campaigns/CampaignHistory";

const EMAIL_TEMPLATES = [
  {
    id: "promo",
    label: "Offre promotionnelle",
    subject: "Offre spéciale AdamKom - Ne manquez pas !",
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#1E3A5F;padding:20px;text-align:center">
        <h1 style="color:#fff;margin:0">ADAMKOM by JJP</h1>
        <p style="color:#DAA520;margin:5px 0 0">Solutions digitales pour entreprises</p>
      </div>
      <div style="padding:30px">
        <h2 style="color:#1E3A5F">🎉 Offre spéciale pour vous !</h2>
        <p>Bonjour,</p>
        <p>[VOTRE MESSAGE ICI]</p>
        <div style="text-align:center;margin:30px 0">
          <a href="https://adamkom.com" style="background:#DAA520;color:#fff;padding:12px 30px;border-radius:5px;text-decoration:none;font-weight:bold">En savoir plus</a>
        </div>
        <p>Cordialement,<br>L'équipe AdamKom</p>
      </div>
      <div style="background:#1E3A5F;padding:15px;text-align:center">
        <p style="color:#fff;margin:0;font-size:12px">ADAMKOM by JJP — contact@adamkom.com — 0693 802 201</p>
      </div>
    </div>`,
  },
  {
    id: "news",
    label: "Newsletter",
    subject: "Les dernières actualités AdamKom",
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#1E3A5F;padding:20px;text-align:center">
        <h1 style="color:#fff;margin:0">ADAMKOM by JJP</h1>
        <p style="color:#DAA520;margin:5px 0 0">Newsletter</p>
      </div>
      <div style="padding:30px">
        <h2 style="color:#1E3A5F">📰 Actualités du mois</h2>
        <p>Bonjour,</p>
        <p>[VOTRE CONTENU ICI]</p>
        <p>Cordialement,<br>L'équipe AdamKom</p>
      </div>
      <div style="background:#1E3A5F;padding:15px;text-align:center">
        <p style="color:#fff;margin:0;font-size:12px">ADAMKOM by JJP — contact@adamkom.com — 0693 802 201</p>
      </div>
    </div>`,
  },
  {
    id: "custom",
    label: "Email personnalisé",
    subject: "",
    html: "",
  },
];

export default function Campaigns() {
  const { data: clients } = useClients();
  const { user } = useAuth();
  const [selectedTemplate, setSelectedTemplate] = useState("promo");
  const [subject, setSubject] = useState(EMAIL_TEMPLATES[0].subject);
  const [htmlContent, setHtmlContent] = useState(EMAIL_TEMPLATES[0].html);
  const [selectedClients, setSelectedClients] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState<{ sent: number; failed: number } | null>(null);
  const [selectAll, setSelectAll] = useState(false);

  const clientsWithEmail = clients?.filter((c) => c.email) || [];

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplate(templateId);
    const tpl = EMAIL_TEMPLATES.find((t) => t.id === templateId);
    if (tpl) {
      setSubject(tpl.subject);
      setHtmlContent(tpl.html);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    if (checked) {
      setSelectedClients(new Set(clientsWithEmail.map((c) => c.id)));
    } else {
      setSelectedClients(new Set());
    }
  };

  const toggleClient = (id: string) => {
    const next = new Set(selectedClients);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedClients(next);
    setSelectAll(next.size === clientsWithEmail.length);
  };

  const handleSend = async () => {
    if (!subject.trim() || !htmlContent.trim()) {
      toast.error("Veuillez remplir le sujet et le contenu de l'email");
      return;
    }
    if (selectedClients.size === 0) {
      toast.error("Veuillez sélectionner au moins un client");
      return;
    }

    setSending(true);
    setResults(null);

    const recipients = clientsWithEmail
      .filter((c) => selectedClients.has(c.id))
      .map((c) => ({ email: c.email!, name: c.company_name }));

    try {
      const { data, error } = await supabase.functions.invoke("send-brevo-campaign", {
        body: {
          action: "send_campaign",
          subject,
          htmlContent,
          senderName: "AdamKom",
          senderEmail: "contact@adamkom.com",
          recipients,
        },
      });

      if (error) throw error;

      setResults(data.results);
      if (data.results.sent > 0) {
        toast.success(`${data.results.sent} email(s) envoyé(s) avec succès !`);
      }
      if (data.results.failed > 0) {
        toast.error(`${data.results.failed} email(s) en échec`);
      }
    } catch (err: any) {
      toast.error("Erreur lors de l'envoi: " + (err.message || "Erreur inconnue"));
    } finally {
      setSending(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-[Space_Grotesk] flex items-center gap-2">
            <Mail className="w-6 h-6 text-primary" />
            Campagnes Email
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Envoyez des newsletters et promotions à vos clients via Brevo
          </p>
        </div>
        <Badge variant="outline" className="text-xs">
          {clientsWithEmail.length} clients avec email
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Template & Content */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Modèle d'email</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2 flex-wrap">
                {EMAIL_TEMPLATES.map((tpl) => (
                  <Button
                    key={tpl.id}
                    variant={selectedTemplate === tpl.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleTemplateChange(tpl.id)}
                  >
                    {tpl.label}
                  </Button>
                ))}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Objet de l'email</label>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Objet de votre email..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Contenu HTML</label>
                <Textarea
                  value={htmlContent}
                  onChange={(e) => setHtmlContent(e.target.value)}
                  placeholder="Contenu HTML de votre email..."
                  className="min-h-[300px] font-mono text-xs"
                />
              </div>
            </CardContent>
          </Card>

          {/* Preview */}
          {htmlContent && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Aperçu</CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className="border rounded-lg p-4 bg-white"
                  dangerouslySetInnerHTML={{ __html: htmlContent }}
                />
              </CardContent>
            </Card>
          )}
        </div>

        {/* Recipients */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4" />
                Destinataires ({selectedClients.size})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b">
                <Checkbox
                  checked={selectAll}
                  onCheckedChange={(checked) => handleSelectAll(!!checked)}
                />
                <span className="text-sm font-medium">
                  Tout sélectionner ({clientsWithEmail.length})
                </span>
              </div>

              <div className="max-h-[400px] overflow-y-auto space-y-2">
                {clientsWithEmail.map((client) => (
                  <label
                    key={client.id}
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                  >
                    <Checkbox
                      checked={selectedClients.has(client.id)}
                      onCheckedChange={() => toggleClient(client.id)}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{client.company_name}</p>
                      <p className="text-xs text-muted-foreground truncate">{client.email}</p>
                    </div>
                  </label>
                ))}
              </div>

              {clientsWithEmail.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Aucun client avec une adresse email
                </p>
              )}
            </CardContent>
          </Card>

          {/* Send */}
          <Button
            onClick={handleSend}
            disabled={sending || selectedClients.size === 0}
            className="w-full"
            size="lg"
          >
            {sending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Envoi en cours...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Envoyer à {selectedClients.size} client(s)
              </>
            )}
          </Button>

          {/* Results */}
          {results && (
            <Card>
              <CardContent className="pt-4 space-y-2">
                {results.sent > 0 && (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm">{results.sent} envoyé(s)</span>
                  </div>
                )}
                {results.failed > 0 && (
                  <div className="flex items-center gap-2 text-destructive">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-sm">{results.failed} en échec</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </motion.div>
  );
}
