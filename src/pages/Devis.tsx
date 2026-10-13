import { useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useClients } from "@/hooks/use-clients";
import { ClientCombobox } from "@/components/ClientCombobox";
import { QUOTE_TEMPLATES, cleanQuoteDescription, cleanQuoteNotes, computeQuoteTotals, quoteRenewalNote, quoteRemaining, type QuoteItem } from "@/lib/quote-templates";
import { buildQuoteEmail } from "@/lib/quote-email";
import { exportQuotePDF } from "@/lib/export-quote-pdf";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { FileSignature, Plus, Trash2, Download, Send, Save, Loader2, Search, Copy, Eye, CheckCircle2, FileText } from "lucide-react";

const STATUS: Record<string, string> = { brouillon: "Brouillon", envoye: "Envoyé", accepte: "Accepté", refuse: "Refusé" };
const eur = (n: number) => `${Number(n).toFixed(2).replace(".", ",")} €`;
const emptyClient = { company_name: "", contact_name: "", email: "", phone: "", address: "", postal_code: "", city: "", siret: "" };

export default function Devis() {
  const qc = useQueryClient();
  const savedRef = useRef<HTMLDivElement>(null);
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
  const [selected, setSelected] = useState<string[]>([]);
  const [deposit, setDeposit] = useState("0");
  const [dueDate, setDueDate] = useState("");
  const [preview, setPreview] = useState<any[] | null>(null);

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
    const t = QUOTE_TEMPLATES.find((x) => x.key === key);
    if (!t) return;
    // Choisir un autre modèle = nouveau devis : on ne modifie jamais le devis déjà enregistré.
    if (editingId && key !== templateKey) {
      setEditingId(null); setQuoteNumber(null);
      toast.info("Nouveau devis : le devis précédent reste enregistré dans la liste");
    }
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

  /** Saisie directe du prix total TTC d'une ligne : le prix unitaire est recalculé selon la quantité. */
  const updateItemTotal = (i: number, total: number) =>
    setItems((prev) => prev.map((it, idx) => {
      if (idx !== i) return it;
      const qty = it.quantity > 0 ? it.quantity : 1;
      return { ...it, unit_price: total / qty, total };
    }));

  const reset = () => {
    setEditingId(null); setQuoteNumber(null); setClientId(""); setClient({ ...emptyClient });
    setDiscount("0"); setTaxRate("0"); setValidity("30"); setDeposit("0"); setDueDate(""); setCustomNumber(""); pickTemplate("tuning");
  };

  const newForSameClient = () => {
    setEditingId(null); setQuoteNumber(null);
    toast.info("Nouveau devis : les infos client sont conservées, choisissez un autre modèle");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const loadQuote = (q: any) => {
    setEditingId(q.id); setQuoteNumber(q.quote_number); setCustomNumber(q.quote_number || ""); setTemplateKey(q.template_key); setClientId(q.client_id || "");
    setClient({ company_name: q.company_name || "", contact_name: q.contact_name || "", email: q.email || "", phone: q.phone || "", address: q.address || "", postal_code: q.postal_code || "", city: q.city || "", siret: q.siret || "" });
    setItems((q.items || []).map((item: QuoteItem) => ({ ...item, description: cleanQuoteDescription(item.description) }))); setNotes(cleanQuoteNotes(q.notes)); setDiscount(String(q.discount_amount ?? 0)); setTaxRate(String(q.tax_rate ?? 0)); setValidity(String(q.validity_days ?? 30)); setDeposit(String(q.deposit_amount ?? 0)); setDueDate(q.payment_due_date || "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const payload = () => ({
    client_id: clientId || null, template_key: templateKey,
    company_name: client.company_name.trim(),
    contact_name: client.contact_name.trim() || null, email: client.email.trim() || null, phone: client.phone.trim() || null,
    address: client.address.trim() || null, postal_code: client.postal_code.trim() || null, city: client.city.trim() || null, siret: client.siret.trim() || null,
    items: items.map((item) => ({ ...item, description: cleanQuoteDescription(item.description) })) as any, discount_amount: parseFloat(discount) || 0, tax_rate: parseFloat(taxRate) || 0,
    ...(customNumber.trim() ? { quote_number: customNumber.trim() } : {}),
    amount: totals.amount, tax_amount: totals.tax_amount, total_amount: totals.total_amount,
    notes: cleanQuoteNotes(notes) || null, validity_days: parseInt(validity) || 30,
    deposit_amount: parseFloat(deposit) || 0, payment_due_date: dueDate || null,
  });

  const save = async (): Promise<any | null> => {
    if (!client.company_name.trim()) { toast.error("Indiquez le nom du client"); return null; }
    const body = payload();
    const res = editingId
      ? await supabase.from("quotes").update(body).eq("id", editingId).select().single()
      : await supabase.from("quotes").insert(body).select().single();
    if (res.error) { toast.error(res.error.message); return null; }
    setEditingId(res.data.id); setQuoteNumber(res.data.quote_number);
    qc.setQueryData(["quotes"], (previous: any[] = []) => [res.data, ...previous.filter((q) => q.id !== res.data.id)]);
    qc.invalidateQueries({ queryKey: ["quotes"] });
    qc.invalidateQueries({ queryKey: ["client-quotes"] });
    return res.data;
  };

  const pdfData = (q: any) => ({
    quote_number: q.quote_number, created_at: q.created_at, validity_days: q.validity_days, items: q.items,
    discount_amount: Number(q.discount_amount), tax_rate: Number(q.tax_rate), amount: Number(q.amount), tax_amount: Number(q.tax_amount), total_amount: Number(q.total_amount), notes: q.notes, renewal_note: quoteRenewalNote(q.template_key, Array.isArray(q.items) ? q.items : []), deposit_amount: Number(q.deposit_amount || 0), payment_due_date: q.payment_due_date,
    client: { company_name: q.company_name, contact_name: q.contact_name, address: q.address, postal_code: q.postal_code, city: q.city, email: q.email, phone: q.phone, siret: q.siret },
  });

  const handleSave = async () => { setBusy("save"); const q = await save(); setBusy(null); if (q) {
    setSearch("");
    toast.success(`Devis ${q.quote_number} enregistré`);
    requestAnimationFrame(() => savedRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  } };
  const handleDownload = async () => { setBusy("save"); const q = await save(); setBusy(null); if (q) viewPdf(q); };

  const buildEmail = buildQuoteEmail;

  const sendQuotes = async (list: any[]) => {
    if (!list.length) return;
    const email = list[0].email;
    if (!email) { toast.error("Ajoutez l'email du client"); return; }
    if (list.some((q) => (q.email || "").toLowerCase() !== email.toLowerCase())) { toast.error("Les devis sélectionnés doivent concerner le même client (même email)"); return; }
    const { html, subject, name } = buildEmail(list);
    const attachment = list.map((q) => ({ name: `Devis_${q.quote_number}.pdf`, content: exportQuotePDF(pdfData(q), { returnBase64: true }) }));
    const { data, error } = await supabase.functions.invoke("send-brevo-campaign", {
      body: { action: "send_client_email", recipientEmail: email, recipientName: name, subject, htmlContent: html, trigger: "quote_sent", client_id: list[0].client_id, attachment },
    });
    if (error || (data as any)?.error) { toast.error((data as any)?.error || "Échec de l'envoi"); return; }
    await supabase.from("quotes").update({ status: "envoye", sent_at: new Date().toISOString() }).in("id", list.map((q) => q.id));
    qc.invalidateQueries({ queryKey: ["quotes"] });
    setSelected([]);
    toast.success(`${list.length > 1 ? `${list.length} devis envoyés` : "Devis envoyé"} à ${email}`);
  };
  const sendQuote = (q: any) => openPreview([q]);
  const openPreview = (list: any[]) => {
    if (!list.length) return;
    if (!list[0].email) { toast.error("Ajoutez l'email du client"); return; }
    setPreview(list);
  };
  const viewPdf = (q: any) => {
    const b64 = exportQuotePDF(pdfData(q), { returnBase64: true });
    if (!b64) return;
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    window.open(URL.createObjectURL(new Blob([bytes], { type: "application/pdf" })), "_blank");
  };
  const confirmSend = async () => { if (!preview) return; setBusy("send"); await sendQuotes(preview.map((q) => quotes.find((current) => current.id === q.id) || q)); setBusy(null); setPreview(null); };
  const sendSelected = () => openPreview(quotes.filter((q: any) => selected.includes(q.id)));
  const updatePayment = async (id: string, patch: Record<string, any>) => {
    const { error } = await supabase.from("quotes").update(patch as any).eq("id", id);
    if (error) toast.error(error.message); else qc.invalidateQueries({ queryKey: ["quotes"] });
  };

  const handleSend = async () => { setBusy("save"); const q = await save(); setBusy(null); if (q) openPreview([q]); };

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

  const selectedQuotes = quotes.filter((q) => selected.includes(q.id));
  const selectedMail = buildEmail(selectedQuotes);
  const previewQuotes = preview?.map((q) => quotes.find((current) => current.id === q.id) || q);

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
          <p className="text-xs text-muted-foreground">Cochez les lignes à inclure. Prix TTC. Prix à 0 = affiché « Inclus ».</p>
          {items.map((it, i) => (
            <div key={i} className="grid grid-cols-[auto_minmax(0,1fr)_auto] sm:grid-cols-[auto_minmax(0,1fr)_60px_90px_90px_90px_auto] gap-2 items-center">
              <Checkbox checked={it.included !== false} onCheckedChange={(v) => updateItem(i, { included: !!v })} />
              <Textarea rows={3} className="min-w-0 resize-y text-sm" aria-label={`Description de la prestation ${i + 1}`} value={it.description} onChange={(e) => updateItem(i, { description: e.target.value })} />
              <Input className="text-center" aria-label={`Quantité ${i + 1}`} type="number" min="1" value={it.quantity} onChange={(e) => updateItem(i, { quantity: parseFloat(e.target.value) || 0 })} />
              <Input className="text-center" aria-label={`Prix TTC ${i + 1}`} type="number" step="0.01" value={it.unit_price} onChange={(e) => updateItem(i, { unit_price: parseFloat(e.target.value) || 0 })} />
              <Input className="text-center" aria-label={`Total TTC ${i + 1}`} type="number" step="0.01" value={Math.round(it.quantity * it.unit_price * 100) / 100} onChange={(e) => updateItemTotal(i, parseFloat(e.target.value) || 0)} />
              <Button size="icon" variant="ghost" onClick={() => setItems(items.filter((_, idx) => idx !== i))}><Trash2 className="w-4 h-4" /></Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => setItems([...items, { description: "", quantity: 1, unit_price: 0, total: 0, included: true }])}><Plus className="w-4 h-4 mr-1" /> Ajouter une ligne</Button>

          <div className="grid md:grid-cols-3 gap-3 pt-2">
            <div><Label>Remise (€)</Label><Input type="number" min="0" value={discount} onChange={(e) => setDiscount(e.target.value)} /></div>
            <div><Label>TVA incluse (%)</Label><Input type="number" min="0" step="0.1" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} /></div>
            <div><Label>Validité (jours)</Label><Input type="number" min="1" value={validity} onChange={(e) => setValidity(e.target.value)} /></div>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            <div><Label>Acompte demandé (€ TTC)</Label><Input type="number" min="0" value={deposit} onChange={(e) => setDeposit(e.target.value)} /></div>
            <div><Label>Date d'échéance du paiement</Label><Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></div>
          </div>
          <div><Label>Conditions / notes</Label><Textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
            <div className="text-sm">
              <span className="text-muted-foreground">Total TTC{Number(taxRate) > 0 && ` (dont TVA ${eur(totals.tax_amount)})`}{(parseFloat(deposit) || 0) > 0 && ` · reste ${eur(Math.max(0, totals.total_amount - (parseFloat(deposit) || 0)))}`} · </span>
              <span className="font-bold text-lg text-primary">{eur(totals.total_amount)}</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" onClick={handleSave} disabled={!!busy}>{busy === "save" ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}Enregistrer</Button>
              {editingId && <Button variant="outline" onClick={newForSameClient} disabled={!!busy}><Copy className="w-4 h-4 mr-1" />Autre devis pour ce client</Button>}
              <Button variant="outline" onClick={handleDownload} disabled={!!busy}><Eye className="w-4 h-4 mr-1" />Aperçu PDF</Button>
              <Button onClick={handleSend} disabled={!!busy}>{busy === "send" ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Send className="w-4 h-4 mr-1" />}Aperçu & envoi</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div ref={savedRef} className="scroll-mt-6">
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0">
          <div>
            <CardTitle className="text-base">Devis enregistrés ({quotes.length})</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">Cochez plusieurs devis d'un même client pour les envoyer dans un seul email.</p>
          </div>
          {selected.length > 0 && <Button size="sm" onClick={sendSelected} disabled={!!busy}>{busy === "send" ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Send className="w-4 h-4 mr-1" />}Envoyer {selected.length} devis</Button>}
          <div className="relative w-64"><Search className="w-4 h-4 absolute left-2.5 top-2.5 text-muted-foreground" /><Input className="pl-8" placeholder="Rechercher…" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        </CardHeader>
        <CardContent className="space-y-2">
          {filtered.length === 0 && <p className="text-sm text-muted-foreground">Aucun devis.</p>}
          {filtered.map((q: any) => (
            <div key={q.id} className={`flex flex-wrap items-center gap-3 rounded-lg border p-3 ${selected.includes(q.id) ? "border-primary bg-primary/5" : "border-border"}`}>
              <Checkbox aria-label={`Sélectionner ${q.quote_number}`} checked={selected.includes(q.id)} onCheckedChange={(v) => setSelected((p) => v ? [...p, q.id] : p.filter((x) => x !== q.id))} />
              <div className="flex-1 min-w-[200px]">
                <p className="font-medium text-sm">{q.quote_number} · {q.company_name}</p>
                <p className="text-xs text-muted-foreground">{QUOTE_TEMPLATES.find((t) => t.key === q.template_key)?.label} · {new Date(q.created_at).toLocaleDateString("fr-FR")}{q.sent_at && ` · envoyé le ${new Date(q.sent_at).toLocaleDateString("fr-FR")}`}</p>
              </div>
              <div className="text-right text-xs min-w-[150px]">
                <p className="font-semibold text-sm">{eur(q.total_amount)} TTC</p>
                {q.is_paid ? <Badge className="mt-1">Payé{q.paid_at && ` le ${new Date(q.paid_at).toLocaleDateString("fr-FR")}`}</Badge>
                  : <p className="text-muted-foreground">Acompte {eur(q.deposit_amount || 0)} · Reste <span className="text-primary font-medium">{eur(quoteRemaining(q))}</span>{q.payment_due_date && <> · éch. <span className={new Date(q.payment_due_date) < new Date() ? "text-destructive" : ""}>{new Date(q.payment_due_date).toLocaleDateString("fr-FR")}</span></>}</p>}
              </div>
              <Button size="sm" variant={q.is_paid ? "secondary" : "outline"} onClick={() => updatePayment(q.id, q.is_paid ? { is_paid: false, paid_at: null } : { is_paid: true, paid_at: new Date().toISOString(), status: "accepte" })}><CheckCircle2 className="w-4 h-4 mr-1" />{q.is_paid ? "Payé" : "Marquer payé"}</Button>
              <select className="h-8 rounded-md border border-input bg-background px-2 text-xs" value={q.status} onChange={(e) => setStatus(q.id, e.target.value)}>
                {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <Button size="sm" variant="ghost" onClick={() => loadQuote(q)}>Modifier</Button>
              <Button size="icon" variant="ghost" title="Aperçu PDF" onClick={() => viewPdf(q)}><Eye className="w-4 h-4" /></Button>
              <Button size="icon" variant="ghost" title="Télécharger" onClick={() => exportQuotePDF(pdfData(q))}><Download className="w-4 h-4" /></Button>
              <Button size="icon" variant="ghost" onClick={() => sendQuote(q)}><Send className="w-4 h-4" /></Button>
              <Button size="icon" variant="ghost" onClick={() => remove(q.id)}><Trash2 className="w-4 h-4" /></Button>
            </div>
          ))}
        </CardContent>
      </Card>
      {selectedQuotes.length > 0 && (
        <section className="mt-6 space-y-3" aria-label="Mail des devis sélectionnés">
          <h2 className="text-base font-semibold">Aperçu du mail ({selectedQuotes.length} devis)</h2>
          <p className="text-sm text-muted-foreground">Objet : {selectedMail.subject}</p>
          <iframe title="Mail des devis sélectionnés" srcDoc={selectedMail.html} className="w-full h-[540px] rounded-lg border border-border bg-background" />
        </section>
      )}
      </div>
      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Aperçu avant envoi</DialogTitle></DialogHeader>
          {previewQuotes && (() => { const m = buildEmail(previewQuotes); return (
            <div className="space-y-3">
              <div className="text-sm space-y-1">
                <p><span className="text-muted-foreground">À :</span> {m.name} &lt;{previewQuotes[0].email}&gt;</p>
                <p><span className="text-muted-foreground">Objet :</span> <strong>{m.subject}</strong></p>
              </div>
              <div className="flex flex-wrap gap-2">
                {previewQuotes.map((q) => (
                  <Button key={q.id} size="sm" variant="outline" onClick={() => viewPdf(q)}><FileText className="w-4 h-4 mr-1" />Devis_{q.quote_number}.pdf</Button>
                ))}
              </div>
              <iframe title="Aperçu email" srcDoc={m.html} className="w-full h-[55vh] rounded-lg border border-border bg-background" />
            </div>
          ); })()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreview(null)}>Annuler</Button>
            <Button onClick={confirmSend} disabled={busy === "send"}>{busy === "send" ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Send className="w-4 h-4 mr-1" />}Confirmer l'envoi</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
