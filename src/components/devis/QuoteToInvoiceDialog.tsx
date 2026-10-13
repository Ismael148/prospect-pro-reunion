import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { cleanQuoteDescription, cleanQuoteNotes } from "@/lib/quote-templates";

const METHODS: Record<string, string> = { virement: "Virement", cb: "Carte bancaire", cheque: "Chèque", especes: "Espèces" };
const eur = (n: number) => `${Number(n || 0).toFixed(2).replace(".", ",")} €`;

export function QuoteToInvoiceDialog({ quote, onClose }: { quote: any | null; onClose: () => void }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [paid, setPaid] = useState("0");
  const [paidDate, setPaidDate] = useState(new Date().toISOString().slice(0, 10));
  const [method, setMethod] = useState("virement");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (quote) setPaid(String(quote.is_paid ? quote.total_amount : Number(quote.deposit_amount || 0)));
  }, [quote]);

  if (!quote) return null;
  const total = Number(quote.total_amount || 0);
  const paidNum = Math.max(0, parseFloat(paid.replace(",", ".")) || 0);
  const rest = Math.max(0, Math.round((total - paidNum) * 100) / 100);
  const fullyPaid = paidNum > 0 && rest === 0;

  const create = async () => {
    if (!quote.client_id) return toast.error("Ce devis n'est relié à aucune fiche client. Sélectionnez un client sur le devis puis réenregistrez-le.");
    setBusy(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const { data: existing } = await supabase.from("invoices").select("id").eq("invoice_number", quote.quote_number).maybeSingle();
      if (existing) throw new Error(`Une facture n° ${quote.quote_number} existe déjà.`);
      const items = (quote.items || []).filter((i: any) => i.included !== false).map((i: any) => ({
        description: cleanQuoteDescription(i.description), quantity: Number(i.quantity), unit_price: Number(i.unit_price), total: Number(i.quantity) * Number(i.unit_price),
      }));
      const paymentLine = paidNum > 0
        ? `Paiement effectué : ${eur(paidNum)} le ${new Date(paidDate).toLocaleDateString("fr-FR")} (${METHODS[method]}).${rest > 0 ? ` Reste à payer : ${eur(rest)}.` : " Facture soldée."}`
        : "";
      const notes = [cleanQuoteNotes(quote.notes), `Facture établie d'après le devis n° ${quote.quote_number}.`, paymentLine].filter(Boolean).join("\n");
      const { error } = await supabase.from("invoices").insert({
        client_id: quote.client_id,
        created_by: auth.user!.id,
        invoice_number: quote.quote_number,
        amount: Number(quote.amount ?? total),
        tax_rate: Number(quote.tax_rate || 0),
        tax_amount: Number(quote.tax_amount || 0),
        total_amount: total,
        discount_amount: Number(quote.discount_amount || 0),
        items,
        notes,
        payment_methods: [method],
        status: fullyPaid ? "payee" : "brouillon",
        paid_date: fullyPaid ? paidDate : null,
      } as any);
      if (error) throw error;
      if (fullyPaid) await supabase.from("quotes").update({ is_paid: true, paid_at: new Date(paidDate).toISOString(), status: "accepte" } as any).eq("id", quote.id);
      else if (paidNum > 0) await supabase.from("quotes").update({ deposit_amount: paidNum, status: "accepte" } as any).eq("id", quote.id);
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["quotes"] });
      toast.success(`Facture ${quote.quote_number} créée`, { action: { label: "Voir", onClick: () => navigate("/factures") } });
      onClose();
    } catch (e: any) {
      toast.error(e.message || "Erreur lors de la création de la facture");
    } finally { setBusy(false); }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Créer la facture du devis {quote.quote_number}</DialogTitle></DialogHeader>
        <div className="space-y-3 text-sm">
          <p className="text-muted-foreground">{quote.company_name} · mêmes prestations · facture n° <b className="text-foreground">{quote.quote_number}</b> · total <b className="text-foreground">{eur(total)} TTC</b></p>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Paiement effectué (€)</Label><Input inputMode="decimal" value={paid} onChange={(e) => setPaid(e.target.value)} /></div>
            <div><Label>Date du paiement</Label><Input type="date" value={paidDate} onChange={(e) => setPaidDate(e.target.value)} /></div>
          </div>
          <div><Label>Moyen de paiement</Label>
            <select className="h-9 w-full rounded-md border border-input bg-background px-2" value={method} onChange={(e) => setMethod(e.target.value)}>
              {Object.entries(METHODS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <p>Reste à payer : <b className="text-primary">{eur(rest)}</b>{fullyPaid && " — la facture sera marquée Payée"}</p>
          <p className="text-xs text-muted-foreground">La facture est créée sans être envoyée ; vous l'envoyez ensuite depuis Facturation.</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={create} disabled={busy}>{busy && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}Créer la facture</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
