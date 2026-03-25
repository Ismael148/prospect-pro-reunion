import { ChangeEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useProject, useDeliverables } from "@/hooks/use-projects";
import { supabase } from "@/integrations/supabase/client";
import { triggerN8nWebhook } from "@/lib/n8n-webhook";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ArrowLeft, Code, FileText, Loader2, Mail, Paperclip, Send, TriangleAlert } from "lucide-react";
import DOMPurify from "dompurify";

type UploadedAttachment = {
  content: string;
  name: string;
  type: string;
  size: number;
};

const VARIABLES = [
  { code: "{{nom_entreprise}}", label: "Nom entreprise", description: "Le nom de l'entreprise du client" },
  { code: "{{nom_livrable}}", label: "Nom livrable", description: "Le nom du livrable" },
  { code: "{{lien_livrable}}", label: "Lien livrable", description: "L'URL du livrable" },
] as const;

const DEFAULT_TEXT_MESSAGE = `Bonjour {{nom_entreprise}},

Voici le livrable "{{nom_livrable}}". Vous pouvez le consulter ci-dessous.

Dites-moi si vous souhaitez des ajustements avant validation.

Cordialement,
L'équipe AdamKom`;

const DEFAULT_HTML_MESSAGE = `<div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;background:#ffffff;color:#0f172a">
  <div style="background:#1E3A5F;padding:24px;text-align:center">
    <h1 style="color:#ffffff;margin:0;font-size:28px">ADAMKOM by JJP</h1>
    <p style="color:#DAA520;margin:8px 0 0">Envoi de livrable</p>
  </div>
  <div style="padding:32px 24px">
    <p style="margin-top:0">Bonjour <strong>{{nom_entreprise}}</strong>,</p>
    <p style="line-height:1.7;font-size:15px">
      Voici le livrable <strong>{{nom_livrable}}</strong>. Vous pouvez le consulter ci-dessous.
    </p>
    <div style="margin:28px 0;text-align:center">
      <a href="{{lien_livrable}}" style="display:inline-block;background:#1E3A5F;color:#ffffff;padding:14px 24px;border-radius:999px;text-decoration:none;font-weight:700">
        Ouvrir {{nom_livrable}}
      </a>
    </div>
    <p>N'hésitez pas à nous contacter pour toute remarque.</p>
    <p>Cordialement,<br>L'équipe AdamKom</p>
  </div>
  <div style="background:#f8fafc;padding:18px 24px;border-top:1px solid #e2e8f0">
    <p style="margin:0;font-size:12px;color:#475569">ADAMKOM by JJP — contact@adamkom.com — 0693 802 201</p>
  </div>
</div>`;

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

export default function ProjectDeliverableEmail() {
  const navigate = useNavigate();
  const { id: projectId, deliverableId } = useParams<{ id: string; deliverableId: string }>();
  const { data: project, isLoading: isProjectLoading } = useProject(projectId || "");
  const { data: deliverables, isLoading: isDeliverablesLoading } = useDeliverables(projectId || "");
  const deliverable = useMemo(
    () => deliverables?.find((item) => item.id === deliverableId),
    [deliverables, deliverableId],
  );

  const client = (project as any)?.clients;
  const clientName = client?.company_name || "client";
  const clientEmail = client?.email || "";

  const [recipientEmail, setRecipientEmail] = useState(clientEmail);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [editorMode, setEditorMode] = useState<"text" | "html">("text");
  const [linkUrl, setLinkUrl] = useState("");
  const [uploadedAttachment, setUploadedAttachment] = useState<UploadedAttachment | null>(null);
  const [attachDeliverableLink, setAttachDeliverableLink] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!deliverable) return;
    setSubject((current) => current || `Votre livrable est prêt - ${deliverable.name}`);
    setMessage((current) => current || DEFAULT_TEXT_MESSAGE);
    setLinkUrl((current) => current || deliverable.file_url || "");
  }, [deliverable, clientName]);

  const replaceVariables = useCallback(
    (text: string) => {
      if (!deliverable) return text;
      return text
        .replace(/\{\{nom_entreprise\}\}/g, clientName)
        .replace(/\{\{nom_livrable\}\}/g, deliverable.name)
        .replace(/\{\{lien_livrable\}\}/g, linkUrl.trim());
    },
    [clientName, deliverable, linkUrl],
  );

  const resolvedHtmlContent = useMemo(() => {
    if (!deliverable) return "";
    const resolved = replaceVariables(message);
    if (editorMode === "html") {
      return DOMPurify.sanitize(resolved, { ADD_TAGS: ["style"], ADD_ATTR: ["style"] });
    }
    // Text mode: wrap in the branded template
    const escapedMsg = resolved
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\n/g, "<br />");
    const safeLinkUrl = linkUrl.trim();
    const safeName = deliverable.name
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    return `
      <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;background:#ffffff;color:#0f172a">
        <div style="background:#1E3A5F;padding:24px;text-align:center">
          <h1 style="color:#ffffff;margin:0;font-size:28px">ADAMKOM by JJP</h1>
          <p style="color:#DAA520;margin:8px 0 0">Envoi de livrable</p>
        </div>
        <div style="padding:32px 24px;line-height:1.7;font-size:15px">${escapedMsg}
          ${safeLinkUrl ? `
            <div style="margin:28px 0;text-align:center">
              <a href="${safeLinkUrl}" style="display:inline-block;background:#1E3A5F;color:#ffffff;padding:14px 24px;border-radius:999px;text-decoration:none;font-weight:700">
                Ouvrir ${safeName}
              </a>
            </div>
          ` : ""}
        </div>
        <div style="background:#f8fafc;padding:18px 24px;border-top:1px solid #e2e8f0">
          <p style="margin:0;font-size:12px;color:#475569">ADAMKOM by JJP — contact@adamkom.com — 0693 802 201</p>
        </div>
      </div>
    `;
  }, [deliverable, editorMode, linkUrl, message, replaceVariables]);

  const handleInsertVariable = (varCode: string) => {
    setMessage((prev) => prev + varCode);
  };

  const handleSwitchMode = (mode: string) => {
    if (mode === "html" && editorMode === "text") {
      setMessage(DEFAULT_HTML_MESSAGE);
      setEditorMode("html");
    } else if (mode === "text" && editorMode === "html") {
      setMessage(DEFAULT_TEXT_MESSAGE);
      setEditorMode("text");
    }
  };

  const handleAttachmentChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      toast.error("Le fichier joint ne doit pas dépasser 15 Mo");
      return;
    }

    try {
      const content = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result;
          if (typeof result !== "string") {
            reject(new Error("Lecture du fichier impossible"));
            return;
          }
          resolve(result.split(",")[1] || "");
        };
        reader.onerror = () => reject(reader.error || new Error("Lecture du fichier impossible"));
        reader.readAsDataURL(file);
      });

      setUploadedAttachment({
        content,
        name: file.name,
        type: file.type || "application/octet-stream",
        size: file.size,
      });
      toast.success("Pièce jointe ajoutée");
    } catch (error: any) {
      toast.error(error.message || "Impossible d'ajouter la pièce jointe");
    } finally {
      event.target.value = "";
    }
  };

  const handleSend = async () => {
    if (!deliverable) return;
    if (!recipientEmail.trim()) {
      toast.error("Ajoutez un email destinataire");
      return;
    }
    if (!subject.trim() || !message.trim()) {
      toast.error("Complétez l'objet et le message avant l'envoi");
      return;
    }

    setSending(true);
    try {
      const attachments = [
        ...(attachDeliverableLink && linkUrl.trim()
          ? [{ url: linkUrl.trim(), name: `${deliverable.name}.url` }]
          : []),
        ...(uploadedAttachment
          ? [{ content: uploadedAttachment.content, name: uploadedAttachment.name, type: uploadedAttachment.type }]
          : []),
      ];

      const { error } = await supabase.functions.invoke("send-brevo-campaign", {
        body: {
          action: "send_design",
          recipientEmail: recipientEmail.trim(),
          recipientName: clientName,
          clientName,
          designUrl: linkUrl.trim(),
          designName: deliverable.name,
          subject: subject.trim(),
          htmlContent: resolvedHtmlContent,
          attachment: attachments,
        },
      });

      if (error) throw error;

      await triggerN8nWebhook("design.sent", {
        project_id: projectId,
        deliverable_id: deliverable.id,
        deliverable_name: deliverable.name,
        client_name: clientName,
        client_email: recipientEmail.trim(),
        deliverable_url: linkUrl.trim() || null,
      });

      toast.success(`Email prêt envoyé pour ${deliverable.name}`);
      navigate(`/projets/${projectId}`);
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de l'envoi");
    } finally {
      setSending(false);
    }
  };

  if (isProjectLoading || isDeliverablesLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!project || !deliverable) {
    return (
      <Alert variant="destructive">
        <TriangleAlert className="h-4 w-4" />
        <AlertTitle>Livrable introuvable</AlertTitle>
        <AlertDescription>Impossible d'ouvrir ce composer d'email.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Button variant="ghost" className="mb-2 px-0" asChild>
            <Link to={`/projets/${projectId}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour au projet
            </Link>
          </Button>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Mail className="h-6 w-6 text-primary" />
            Envoyer {deliverable.name}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Préparez un email spécifique à ce livrable avant envoi à {clientName}.
          </p>
        </div>
      </div>

      {!clientEmail && (
        <Alert>
          <TriangleAlert className="h-4 w-4" />
          <AlertTitle>Email client manquant</AlertTitle>
          <AlertDescription>Ajoutez ou corrigez l'email du destinataire ici avant l'envoi.</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-0 shadow-md shadow-primary/5">
          <CardHeader>
            <CardTitle>Composer l'email</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="recipientEmail">Destinataire</Label>
              <Input id="recipientEmail" value={recipientEmail} onChange={(e) => setRecipientEmail(e.target.value)} placeholder="client@exemple.com" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">Objet</Label>
              <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Objet du mail" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="linkUrl">Lien du livrable</Label>
              <Input
                id="linkUrl"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://..."
              />
              <p className="text-xs text-muted-foreground">Lien du site, chatbot, vidéo, etc. Utilisable dans le message via <code className="rounded bg-muted px-1">{"{{lien_livrable}}"}</code></p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="message">Contenu du message</Label>
                <Tabs value={editorMode} onValueChange={handleSwitchMode}>
                  <TabsList className="h-7">
                    <TabsTrigger value="text" className="gap-1 text-xs px-2 py-0.5"><FileText className="h-3 w-3" />Texte</TabsTrigger>
                    <TabsTrigger value="html" className="gap-1 text-xs px-2 py-0.5"><Code className="h-3 w-3" />HTML</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              <div className="flex flex-wrap gap-1.5 pb-1">
                <span className="text-xs text-muted-foreground mr-1 self-center">Variables :</span>
                {VARIABLES.map((v) => (
                  <Badge
                    key={v.code}
                    variant="secondary"
                    className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors text-xs"
                    onClick={() => handleInsertVariable(v.code)}
                    title={v.description}
                  >
                    {v.code}
                  </Badge>
                ))}
              </div>

              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className={editorMode === "html" ? "min-h-[320px] font-mono text-xs" : "min-h-[220px]"}
                placeholder={editorMode === "html" ? "<div>Votre contenu HTML ici...</div>" : "Votre message texte..."}
              />
              {editorMode === "html" && (
                <p className="text-xs text-muted-foreground">Écrivez directement du HTML/CSS. Les variables <code className="rounded bg-muted px-1">{"{{...}}"}</code> seront remplacées automatiquement.</p>
              )}
            </div>

            <div className="space-y-3 rounded-xl border border-border p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">Pièces jointes</p>
                  <p className="text-xs text-muted-foreground">Ajoutez un fichier, une image, un PDF ou une vidéo avant l'envoi.</p>
                </div>
                <Button type="button" variant="outline" asChild>
                  <label htmlFor="attachment-upload" className="cursor-pointer">
                    <Paperclip className="mr-2 h-4 w-4" />
                    Ajouter un fichier
                  </label>
                </Button>
              </div>

              <input id="attachment-upload" type="file" className="hidden" onChange={handleAttachmentChange} />

              <label className="flex items-start gap-3 rounded-lg border border-border p-3 text-sm">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={attachDeliverableLink}
                  onChange={(e) => setAttachDeliverableLink(e.target.checked)}
                />
                <span>
                  Joindre automatiquement le lien du livrable dans le mail
                  <span className="mt-1 block text-xs text-muted-foreground">Pratique pour les sites internet, chatbots, vidéos ou pages de présentation.</span>
                </span>
              </label>

              {uploadedAttachment && (
                <div className="rounded-lg bg-muted/50 p-3 text-sm">
                  <p className="font-medium">{uploadedAttachment.name}</p>
                  <p className="text-xs text-muted-foreground">{formatBytes(uploadedAttachment.size)}</p>
                  <Button type="button" variant="link" className="h-auto p-0 text-xs" onClick={() => setUploadedAttachment(null)}>
                    Retirer la pièce jointe
                  </Button>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-3">
              <Button onClick={handleSend} disabled={sending} className="gap-2">
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Envoyer le mail
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate(`/projets/${projectId}`)}>
                Annuler
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md shadow-primary/5">
          <CardHeader>
            <CardTitle>Aperçu</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Objet</p>
              <p className="mt-1 text-sm font-medium">{subject || "Aucun objet"}</p>
            </div>

            <div className="overflow-hidden rounded-xl border border-border bg-background">
              <div className="border-b border-border px-4 py-3 text-sm text-muted-foreground">Prévisualisation du message</div>
              <div className="max-h-[560px] overflow-auto p-4">
                <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(resolvedHtmlContent, { ADD_TAGS: ["style"], ADD_ATTR: ["style"] }) }} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}