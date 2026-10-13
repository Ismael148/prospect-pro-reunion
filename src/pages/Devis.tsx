import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useClients } from "@/hooks/use-clients";
import { ClientCombobox } from "@/components/ClientCombobox";
import { QUOTE_TEMPLATES, computeQuoteTotals, type QuoteItem } from "@/lib/quote-templates";
import { exportQuotePDF } from "@/lib/export-quote-pdf";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { FileSignature, Plus, Trash2, Download, Send, Save, Loader2, Search } from "lucide-react";

const STATUS: Record<string, string> = { brouillon: "Brouillon", envoye: "Envoyé", accepte: "Accepté", refuse: "Refusé" };
const eur = (n: number) => `${Number(n).toFixed(2).replace(".", ",")} €`;
const emptyClient = { company_name: "", contact_name: "", email: "", phone: "", address: "", postal_code: "", city: "", siret: "" };

export default function Devis() {
  const qc = useQueryClient();
  const { data: clients = [] } = useClients();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [quoteNumber, setQuoteNumber] = useState<string | null>(null);
  const [templateKey, setTemplateKey] = useState("tuning");
  const [clientId, setClientId] = useState("");
  const [client, setClient] = useState({ ...emptyClient });
  const [items, setItems] = useState<QuoteItem[]>(QUOTE_TEMPLATES[0].items.map((i) => ({ ...i })));
  const [notes, setNotes] = useState(QUOTE_TEMPLATES[0].notes);
  const [discount, setDiscount] = useState("0");
  const [taxRate, setTaxRate] = useState("0");
  const [validity, setValidity] = useState("30");
  const [busy, setBusy] = useState<"save" | "send" | null>(null);
  const [search, setSearch] = useState("");

  const { data: quotes = [] } = useQuery({
    queryKey: ["quotes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("quotes").select("*").order("created_at", { ascending: false }).limit(300);
      if (error) throw error;
      return data;
    },
  });

  const totals = useMemo(() => computeQuoteTotals(items, parseFloat(discount) || 0, parseFloat(taxRate) || 0), [items, discount, taxRate]);

  const pickTemplate = (key: string) => {
    const t = QUOTE_TEMPLATES.find((x) => x.key === key)!;
    setTemplateKey(key);
    setItems(t.items.map((i) => ({ ...i })));
    setNotes(t.notes);
  };

  const pickClient = (id: string) => {
    setClientId(id);
    const c: any = clients.find((x: any) => x.id === id);
    if (!c) return;
    setClient({
      company_name: c.company_name || "", contact_name: c.manager_name || c.contact_name || "", email: c.email || "",
      phone: c.phone || "", address: c.address || "", postal_code: c.postal_code || "", city: c.city || "", siret: c.siret || "",
    });
    if (c.pack_type === "star_bizness_tuning") pickTemplate("tuning");
    else if (c.pack_type === "star_bizness_nfc") pickTemplate("nfc");
  };

  const updateItem = (i: number, patch: Partial<QuoteItem>) =>
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch, total: (patch.quantity ?? it.quantity) * (patch.unit_price ?? it.unit_price) } : it)));

  const reset = () => {
    setEditingId(null); setQuoteNumber(null); setClientId(""); setClient({ ...emptyClient });
    setDiscount("0"); setTaxRate("0"); setValidity("30"); pickTemplate("tuning");
  };

  const loadQuote = (q: any) => {
    setEditingId(q.id); setQuoteNumber(q.quote_number); setTemplateKey(q.template_key); setClientId(q.client_id || "");
    setClient({ company_name: q.company_name || "", contact_name: q.contact_name || "", email: q.email || "", phone: q.phone || "", address: q.address || "", postal_code: q.postal_code || "", city: q.city || "", siret: q.siret || "" });
    setItems(q.items || []); setNotes(q.notes || ""); setDiscount(String(q.discount_amount ?? 0)); setTaxRate(String(q.tax_rate ?? 0)); setValidity(String(q.validity_days ?? 30));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const payload = () => ({
    client_id: clientId || null, template_key: templateKey,
    company_name: client.company_name.trim(),
    contact_name: client.contact_name.trim() || null, email: client.email.trim() || null, phone: client.phone.trim() || null,
    address: client.address.trim() || null, postal_code: client.postal_code.trim() || null, city: client.city.trim() || null, siret: client.siret.trim() || null,
    items: items as any, discount_amount: parseFloat(discount) || 0, tax_rate: parseFloat(taxRate) || 0,
    amount: totals.amount, tax_amount: totals.tax_amount, total_amount: totals.total_amount,
    notes: notes.trim() || null, validity_days: parseInt(validity) || 30,
  });

  const save = async (): Promise<any | null> => {
    if (!client.company_name.trim()) { toast.error("Indiquez le nom du client"); return null; }
    const body = payload();
    const res = editingId
      ? await supabase.from("quotes").update(body).eq("id", editingId).select().single()
      : await supabase.from("quotes").insert(body).select().single();
    if (res.error) { toast.error(res.error.message); return null; }
    setEditingId(res.data.id); setQuoteNumber(res.data.quote_number);
    qc.invalidateQueries({ queryKey: ["quotes"] });
    return res.data;
  };

  const pdfData = (q: any) => ({
    quote_number: q.quote_number, created_at: q.created_at, validity_days: q.validity_days, items: q.items,
    discount_amount: Number(q.discount_amount), tax_rate: Number(q.tax_rate), amount: Number(q.amount), tax_amount: Number(q.tax_amount), total_amount: Number(q.total_amount), notes: q.notes,
    client: { company_name: q.company_name, contact_name: q.contact_name, address: q.address, postal_code: q.postal_code, city: q.city, email: q.email, phone: q.phone, siret: q.siret },
  });

  const handleSave = async () => { setBusy("save"); const q = await save(); setBusy(null); if (q) toast.success(`Devis ${q.quote_number} enregistré`); };
  const handleDownload = async () => { setBusy("save"); const q = await save(); setBusy(null); if (q) exportQuotePDF(pdfData(q)); };

  const sendQuote = async (q: any) => {
    if (!q.email) { toast.error("Ajoutez l'email du client"); return; }
    const base64 = exportQuotePDF(pdfData(q), { returnBase64: true });
    const name = q.contact_name || q.company_name;
    const html = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;color:#0d0d0d">
<div style="background:#0d0d0d;padding:24px;text-align:center;border-bottom:4px solid #ff006e"><img src="https://qaxlpmxekcvbrcnqopbp.supabase.co/storage/v1/object/public/email-assets/logo-adamkom-black.png" alt="Adamkom by JJP" style="height:48px;filter:invert(1)"/></div>
<div style="padding:28px">
<p>Bonjour ${name},</p>
<p>Suite à notre échange, vous trouverez ci-joint votre devis <strong>n° ${q.quote_number}</strong> d'un montant de <strong style="color:#ff006e">${eur(q.total_amount)}</strong>.</p>
<p>Ce devis est valable ${q.validity_days} jours. Pour l'accepter, il vous suffit de nous le retourner signé avec la mention « Bon pour accord », ou de répondre simplement à cet email.</p>
<p>Nous restons à votre disposition pour toute question au <strong>0262 66 68 76</strong>.</p>
<p>Belle journée,<br/><strong>L'équipe Adamkom by JJP</strong></p>
</div>
<div style="background:#0d0d0d;color:#ffffff;padding:16px;text-align:center;font-size:12px">Adamkom by JJP — La performance digitale · contact@adamkom.com · 0262 66 68 76</div></div>`;
    const { data, error } = await supabase.functions.invoke("send-brevo-campaign", {
      body: {
        action: "send_client_email", recipientEmail: q.email, recipientName: name,
        subject: `Votre devis Adamkom by JJP n° ${q.quote_number}`, htmlContent: html, trigger: "quote_sent", client_id: q.client_id,
        attachment: [{ name: `Devis_${q.quote_number}.pdf`, content: base64 }],
      },
    });
    if (error || (data as any)?.error) { toast.error((data as any)?.error || "Échec de l'envoi"); return; }
    await supabase.from("quotes").update({ status: "envoye", sent_at: new Date().toISOString() }).eq("id", q.id);
    qc.invalidateQueries({ queryKey: ["quotes"] });
    toast.success(`Devis envoyé à ${q.email}`);
  };

  const handleSend = async () => { setBusy("send"); const q = await save(); if (q) await sendQuote(q); setBusy(null); };

  const setStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("quotes").update({ status }).eq("id", id);
    if (error) toast.error(error.message); else qc.invalidateQueries({ queryKey: ["quotes"] });
  };
  const remove = async (id: string) => {
    if (!confirm("Supprimer ce devis ?")) return;
    await supabase.from("quotes").delete().eq("id", id);
    if (editingId === id) reset();
    qc.invalidateQueries({ queryKey: ["quotes"] });
  };

  const filtered = quotes.filter((q: any) => {
    const s = search.toLowerCase();
    return !s || [q.quote_number, q.company_name, q.email, QUOTE_TEMPLATES.find((t) => t.key === q.template_key)?.label].some((v) => v?.toLowerCase().includes(s));
  });

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><FileSignature className="w-6 h-6 text-primary" /> Devis</h1>
          <p className="text-sm text-muted-foreground">Choisissez un modèle, ajustez, puis envoyez le devis au client en un clic.</p>
        </div>
        <Button variant="outline" onClick={reset}><Plus className="w-4 h-4 mr-1" /> Nouveau devis</Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">1. Modèle de devis {quoteNumber && <Badge variant="secondary" className="ml-2">{quoteNumber}</Badge>}</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {QUOTE_TEMPLATES.map((t) => (
            <button key={t.key} type="button" onClick={() => pickTemplate(t.key)}
              className={`text-left rounded-xl border p-4 transition-colors ${templateKey === t.key ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"}`}>
              <p className="font-semibold text-sm">{t.label}</p>
              <p className="text-xs text-muted-foreground mt-1">{t.subtitle}</p>
            </button>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">2. Client</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Client existant (optionnel — remplit les champs)</Label>
            <ClientCombobox options={clients as any} value={clientId} onChange={pickClient} placeholder="Rechercher un client…" />
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            {([["company_name", "Entreprise *"], ["contact_name", "Nom du gérant"], ["email", "Email"], ["phone", "Téléphone"], ["address", "Adresse"], ["postal_code", "Code postal"], ["city", "Ville"], ["siret", "SIRET"]] as const).map(([k, l]) => (
              <div key={k}><Label>{l}</Label><Input value={client[k]} onChange={(e) => setClient({ ...client, [k]: e.target.value })} /></div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">3. Prestations</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">Cochez les lignes à inclure. Prix à 0 = affiché « Inclus ».</p>
          {items.map((it, i) => (
            <div key={i} className="grid grid-cols-[auto_1fr_70px_100px_90px_auto] gap-2 items-center">
              <Checkbox checked={it.included !== false} onCheckedChange={(v) => updateItem(i, { included: !!v })} />
              <Input value={it.description} onChange={(e) => updateItem(i, { description: e.target.value })} />
              <Input type="number" min="1" value={it.quantity} onChange={(e) => updateItem(i, { quantity: parseFloat(e.target.value) || 0 })} />
              <Input type="number" step="0.01" value={it.unit_price} onChange={(e) => updateItem(i, { unit_price: parseFloat(e.target.value) || 0 })} />
              <span className={`text-sm text-right ${it.included === false ? "text-muted-foreground line-through" : ""}`}>{eur(it.quantity * it.unit_price)}</span>
              <Button size="icon" variant="ghost" onClick={() => setItems(items.filter((_, idx) => idx !== i))}><Trash2 className="w-4 h-4" /></Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => setItems([...items, { description: "", quantity: 1, unit_price: 0, total: 0, included: true }])}><Plus className="w-4 h-4 mr-1" /> Ajouter une ligne</Button>

          <div className="grid md:grid-cols-3 gap-3 pt-2">
            <div><Label>Remise (€)</Label><Input type="number" min="0" value={discount} onChange={(e) => setDiscount(e.target.value)} /></div>
            <div><Label>TVA (%)</Label><Input type="number" min="0" step="0.1" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} /></div>
            <div><Label>Validité (jours)</Label><Input type="number" min="1" value={validity} onChange={(e) => setValidity(e.target.value)} /></div>
          </div>
          <div><Label>Conditions / notes</Label><Textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
            <div className="text-sm">
              <span className="text-muted-foreground">Total HT {eur(totals.amount)}{Number(taxRate) > 0 && ` · TVA ${eur(totals.tax_amount)}`} · </span>
              <span className="font-bold text-lg text-primary">{eur(totals.total_amount)}</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" onClick={handleSave} disabled={!!busy}>{busy === "save" ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}Enregistrer</Button>
              <Button variant="outline" onClick={handleDownload} disabled={!!busy}><Download className="w-4 h-4 mr-1" />Aperçu PDF</Button>
              <Button onClick={handleSend} disabled={!!busy}>{busy === "send" ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Send className="w-4 h-4 mr-1" />}Envoyer au client</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
          <CardTitle className="text-base">Devis enregistrés ({quotes.length})</CardTitle>
          <div className="relative w-64"><Search className="w-4 h-4 absolute left-2.5 top-2.5 text-muted-foreground" /><Input className="pl-8" placeholder="Rechercher…" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        </CardHeader>
        <CardContent className="space-y-2">
          {filtered.length === 0 && <p className="text-sm text-muted-foreground">Aucun devis.</p>}
          {filtered.map((q: any) => (
            <div key={q.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-3">
              <div className="flex-1 min-w-[200px]">
                <p className="font-medium text-sm">{q.quote_number} · {q.company_name}</p>
                <p className="text-xs text-muted-foreground">{QUOTE_TEMPLATES.find((t) => t.key === q.template_key)?.label} · {new Date(q.created_at).toLocaleDateString("fr-FR")}{q.sent_at && ` · envoyé le ${new Date(q.sent_at).toLocaleDateString("fr-FR")}`}</p>
              </div>
              <span className="font-semibold text-sm">{eur(q.total_amount)}</span>
              <select className="h-8 rounded-md border border-input bg-background px-2 text-xs" value={q.status} onChange={(e) => setStatus(q.id, e.target.value)}>
                {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <Button size="sm" variant="ghost" onClick={() => loadQuote(q)}>Modifier</Button>
              <Button size="icon" variant="ghost" onClick={() => exportQuotePDF(pdfData(q))}><Download className="w-4 h-4" /></Button>
              <Button size="icon" variant="ghost" onClick={() => sendQuote(q)}><Send className="w-4 h-4" /></Button>
              <Button size="icon" variant="ghost" onClick={() => remove(q.id)}><Trash2 className="w-4 h-4" /></Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
