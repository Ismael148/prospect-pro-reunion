import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, CheckCircle, Send, Building2, HelpCircle, Upload, X, Link as LinkIcon } from "lucide-react";
import { motion } from "framer-motion";

const ALL_CATEGORY_LABELS: Record<string, string> = {
  modification_site: "Modification du site Internet",
  modification_carte_nfc: "Modification de la carte NFC",
  fiche_google: "Fiche Google My Business",
  reseaux_sociaux: "Réseaux sociaux",
  bug_technique: "Bug technique",
  question: "Question générale",
  autre: "Autre",
};

// Categories to hide for NFC-only clients
const SITE_ONLY_CATEGORIES = ["modification_site"];

export default function SupportForm() {
  const { token } = useParams<{ token: string }>();
  const [client, setClient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [attachments, setAttachments] = useState<string[]>([]);
  const [imageUrlInput, setImageUrlInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    category: "",
    subject: "",
    message: "",
    priority: "normale",
  });

  useEffect(() => {
    if (!token) return;
    const fetchClient = async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, company_name, email, support_token, pack_type")
        .eq("support_token", token)
        .single();
      if (error || !data) {
        setError("Lien invalide ou expiré");
      } else {
        setClient(data);
      }
      setLoading(false);
    };
    fetchClient();
  }, [token]);

  // Filter categories based on pack type
  const categoryLabels = (() => {
    if (!client?.pack_type) return ALL_CATEGORY_LABELS;
    if (client.pack_type === "star_bizness_nfc") {
      // NFC only: hide site modification
      return Object.fromEntries(
        Object.entries(ALL_CATEGORY_LABELS).filter(([k]) => !SITE_ONLY_CATEGORIES.includes(k))
      );
    }
    return ALL_CATEGORY_LABELS;
  })();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    if (attachments.length + files.length > 10) {
      toast.error("Maximum 10 pièces jointes");
      return;
    }

    setUploading(true);
    try {
      for (const file of files) {
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`${file.name} dépasse 10 Mo`);
          continue;
        }
        const ext = file.name.split(".").pop();
        const fileName = `support/${client.id}/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage
          .from("client-forms")
          .upload(fileName, file, { upsert: true });
        if (error) throw error;
        const { data: urlData } = supabase.storage
          .from("client-forms")
          .getPublicUrl(fileName);
        setAttachments((prev) => [...prev, urlData.publicUrl]);
      }
      toast.success("Fichier(s) uploadé(s) !");
    } catch (err: any) {
      toast.error("Erreur d'upload : " + (err.message || "Réessayez"));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleAddImageUrl = () => {
    const url = imageUrlInput.trim();
    if (!url) return;
    if (!/^https?:\/\/.+/i.test(url)) {
      toast.error("URL invalide");
      return;
    }
    if (attachments.length >= 10) {
      toast.error("Maximum 10 pièces jointes");
      return;
    }
    setAttachments((prev) => [...prev, url]);
    setImageUrlInput("");
    toast.success("Lien ajouté !");
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!form.category || !form.subject.trim() || !form.message.trim()) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }
    setSubmitting(true);
    try {
      const { data: ticket, error: ticketError } = await supabase
        .from("support_tickets")
        .insert([{
          client_id: client.id,
          category: form.category,
          subject: form.subject,
          message: form.message,
          priority: form.priority,
          attachments: attachments.length > 0 ? attachments : null,
          ticket_number: null,
        } as any])
        .select()
        .single();

      if (ticketError) throw ticketError;

      try {
        await supabase.functions.invoke("support-notification", {
          body: {
            ticket_id: ticket.id,
            client_name: client.company_name,
            client_email: client.email,
            category: categoryLabels[form.category] || form.category,
            subject: form.subject,
            message: form.message,
            ticket_number: ticket.ticket_number,
          },
        });
      } catch {
        console.warn("Notification email failed");
      }

      setSubmitted(true);
    } catch (err) {
      toast.error("Erreur lors de l'envoi du support");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="flex flex-col items-center py-12">
            <HelpCircle className="w-12 h-12 text-muted-foreground/30 mb-4" />
            <h2 className="text-lg font-semibold mb-2">Lien invalide</h2>
            <p className="text-muted-foreground text-sm text-center">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
          <Card className="max-w-md w-full">
            <CardContent className="flex flex-col items-center py-12">
              <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mb-4">
                <CheckCircle className="w-8 h-8 text-success" />
              </div>
              <h2 className="text-lg font-semibold mb-2">Demande envoyée !</h2>
              <p className="text-muted-foreground text-sm text-center">
                Votre demande de support a bien été enregistrée. Notre équipe reviendra vers vous dans les plus brefs délais.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div className="w-full max-w-lg" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Support Client</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {client.company_name} — Formulaire de demande de support
          </p>
        </div>

        <Card className="border-0 shadow-lg">
          <CardContent className="p-6 space-y-4">
            <div className="space-y-2">
              <Label>Catégorie *</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue placeholder="Sélectionnez une catégorie" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(categoryLabels).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Objet *</Label>
              <Input
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                placeholder="Ex: Mise à jour des horaires sur le site"
                maxLength={200}
              />
            </div>

            <div className="space-y-2">
              <Label>Description détaillée *</Label>
              <Textarea
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                placeholder="Décrivez votre demande en détail..."
                rows={5}
                maxLength={2000}
              />
              <p className="text-xs text-muted-foreground text-right">{form.message.length}/2000</p>
            </div>

            {/* Attachments */}
            <div className="space-y-2">
              <Label>Pièces jointes (captures d'écran, images)</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf"
                multiple
                className="hidden"
                onChange={handleFileUpload}
              />
              
              {/* Uploaded files preview */}
              {attachments.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mb-2">
                  {attachments.map((url, i) => (
                    <div key={i} className="relative group">
                      {url.match(/\.(jpg|jpeg|png|gif|webp)$/i) || url.includes("storage") ? (
                        <img src={url} alt={`Pièce jointe ${i + 1}`} className="w-full aspect-square object-cover rounded-lg border border-border" />
                      ) : (
                        <div className="w-full aspect-square rounded-lg border border-border bg-muted/30 flex items-center justify-center">
                          <span className="text-xs text-muted-foreground text-center px-1 break-all">{url.split("/").pop()?.substring(0, 20)}</span>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveAttachment(i)}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading || attachments.length >= 10}
                >
                  {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  Uploader
                </Button>
                <div className="flex flex-1 gap-1">
                  <Input
                    placeholder="Ou coller un lien d'image..."
                    value={imageUrlInput}
                    onChange={(e) => setImageUrlInput(e.target.value)}
                    className="h-8 text-xs"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddImageUrl}
                    disabled={!imageUrlInput.trim() || attachments.length >= 5}
                  >
                    <LinkIcon className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground">{attachments.length}/5 pièces jointes (max 10 Mo par fichier)</p>
            </div>

            <div className="space-y-2">
              <Label>Priorité</Label>
              <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="normale">Normale</SelectItem>
                  <SelectItem value="urgente">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button className="w-full gap-2" onClick={handleSubmit} disabled={submitting}>
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Envoyer la demande
            </Button>
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground text-center mt-4">
          Propulsé par Adamkom by JJP
        </p>
      </motion.div>
    </div>
  );
}
