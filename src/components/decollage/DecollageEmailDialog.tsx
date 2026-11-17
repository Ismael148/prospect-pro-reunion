import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Code2, Loader2, RotateCcw, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EmailSupportOption, useEmailSupport } from "@/components/EmailSupportOption";
import { useEmailBranding } from "@/hooks/use-email-branding";
import { supportLink } from "@/lib/followup";
import {
  DECOLLAGE_DEFAULTS, DECOLLAGE_EMAIL_TRIGGER, buildDecollageEmail, defaultDecollageSubject, type DecollageEmailFields,
} from "@/lib/decollage-email";
import { isEmail, sendClientEmail } from "./send-client-email";
import { toast } from "sonner";

export interface DecollageClient { id: string; company_name: string; manager_name?: string | null; email?: string | null; support_token?: string | null }

export default function DecollageEmailDialog({ client, open, onOpenChange }: { client: DecollageClient | null; open: boolean; onOpenChange: (v: boolean) => void }) {
  const queryClient = useQueryClient();
  const { data: branding } = useEmailBranding();
  const { includeSupport, setIncludeSupport } = useEmailSupport();
  const [to, setTo] = useState("");
  const [fields, setFields] = useState<DecollageEmailFields>({ ...DECOLLAGE_DEFAULTS });
  const [htmlOverride, setHtmlOverride] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open || !client) return;
    setTo(client.email || "");
    setFields({ ...DECOLLAGE_DEFAULTS, name: client.manager_name || "", subject: "" });
    setHtmlOverride(null);
  }, [open, client]);

  const link = supportLink(client?.support_token);
  const built = useMemo(
    () => buildDecollageEmail(fields, { supportLink: link, includeSupport, branding: branding || undefined }),
    [fields, link, includeSupport, branding],
  );
  const html = htmlOverride ?? built.html;
  const set = (patch: Partial<DecollageEmailFields>) => setFields((f) => ({ ...f, ...patch }));

  const problems = [
    !isEmail(to) && "adresse email valide",
    !html.trim() && "contenu du mail",
    !fields.intro.trim() && htmlOverride === null && "texte d'introduction",
  ].filter(Boolean) as string[];

  const send = async () => {
    if (!client || problems.length || sending) return;
    setSending(true);
    try {
      await sendClientEmail({ to: to.trim(), name: client.manager_name || client.company_name, subject: built.subject, html, trigger: DECOLLAGE_EMAIL_TRIGGER, clientId: client.id });
      toast.success("Présentation Pack Décollage envoyée");
      await queryClient.invalidateQueries({ queryKey: ["client-email-history", client.id] });
      await queryClient.invalidateQueries({ queryKey: ["decollage-emails"] });
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Impossible d'envoyer le mail.");
    } finally { setSending(false); }
  };

  const field = (label: string, key: keyof DecollageEmailFields, rows = 0, placeholder?: string) => (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {rows ? <Textarea rows={rows} value={(fields[key] as string) || ""} placeholder={placeholder} onChange={(e) => set({ [key]: e.target.value } as any)} />
        : <Input value={(fields[key] as string) || ""} placeholder={placeholder} onChange={(e) => set({ [key]: e.target.value } as any)} />}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!sending) onOpenChange(v); }}>
      <DialogContent className="max-h-[92vh] max-w-6xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Présentation Pack Décollage · {client?.company_name}</DialogTitle>
          <DialogDescription>Modifiez le mail à gauche ; l'aperçu à droite est exactement ce que le client recevra.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <div className="space-y-4">
            <div className="space-y-1.5"><Label>Destinataire</Label><Input type="email" value={to} onChange={(e) => setTo(e.target.value)} placeholder="client@exemple.com" /></div>
            {field("Objet du mail", "subject", 0, defaultDecollageSubject(fields.name))}
            {htmlOverride === null ? (
              <>
                {field("Nom du gérant (après « Bonjour »)", "name", 0, "Laisser vide pour « Bonjour, »")}
                {field("Petit titre", "kicker")}
                {field("Texte d'introduction", "intro", 5)}
                {field("Message complémentaire (facultatif)", "note", 3, "Ex. : Suite à notre échange de ce matin…")}
                <div className="grid gap-3 sm:grid-cols-2">
                  {field("Texte du bouton", "ctaLabel")}
                  {field("Lien de la présentation", "presentationUrl")}
                </div>
                <div className="grid gap-3 sm:grid-cols-[140px_1fr]">
                  {field("Prix TTC", "price")}
                  {field("Texte sous le prix", "priceText", 2)}
                </div>
                {field("Texte avant les boutons de contact", "questions", 3)}
                {field("Mention en bas du mail", "footer", 2)}
                <div className="flex items-center gap-2">
                  <Checkbox id="decollage-wa" checked={!!fields.includeWhatsapp} onCheckedChange={(v) => set({ includeWhatsapp: v === true })} />
                  <Label htmlFor="decollage-wa" className="cursor-pointer">Afficher le bouton WhatsApp 06 93 80 22 01</Label>
                </div>
                <EmailSupportOption checked={includeSupport} onChange={setIncludeSupport} disabled={!link} />
                {!link && <p className="text-xs text-muted-foreground">Ce client n'a pas encore de lien support.</p>}
                <Button type="button" variant="outline" size="sm" onClick={() => setHtmlOverride(built.html)}>
                  <Code2 className="mr-2 h-4 w-4" /> Modifier directement le code HTML
                </Button>
              </>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label>Code HTML et CSS du mail</Label>
                  <Button type="button" variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => setHtmlOverride(null)}>
                    <RotateCcw className="mr-1 h-3 w-3" /> Revenir au modèle
                  </Button>
                </div>
                <Textarea value={htmlOverride} onChange={(e) => setHtmlOverride(e.target.value)} rows={24} className="font-mono text-xs" spellCheck={false} />
                <p className="text-xs text-muted-foreground">Le mail est envoyé tel quel. Revenir au modèle annule vos modifications du code.</p>
              </div>
            )}
            {problems.length > 0 && <p className="text-sm text-destructive">À compléter : {problems.join(", ")}.</p>}
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Aperçu du mail</p>
            <p className="break-words text-xs text-muted-foreground">{built.subject}</p>
            <iframe title="Aperçu de la présentation Pack Décollage" srcDoc={html} sandbox="" className="h-[70vh] w-full rounded-lg border border-border bg-background" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" disabled={sending} onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button disabled={problems.length > 0 || sending} onClick={send}>
            {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />} Envoyer au client
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
