import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileSignature } from "lucide-react";
import { QUOTE_TEMPLATES, quoteRemaining } from "@/lib/quote-templates";

const STATUS: Record<string, string> = { brouillon: "Brouillon", envoye: "Envoyé", accepte: "Accepté", refuse: "Refusé" };
const eur = (n: number) => `${Number(n || 0).toFixed(2).replace(".", ",")} €`;
const d = (s?: string | null) => (s ? new Date(s).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }) : "—");

export default function ClientQuotesSection({ clientId, clientEmail }: { clientId: string; clientEmail: string | null }) {
  const navigate = useNavigate();
  const { data: quotes = [] } = useQuery({
    queryKey: ["client-quotes", clientId, clientEmail],
    queryFn: async () => {
      let q = supabase.from("quotes").select("*").order("created_at", { ascending: false });
      q = clientEmail ? q.or(`client_id.eq.${clientId},email.eq.${clientEmail}`) : q.eq("client_id", clientId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base flex items-center gap-2"><FileSignature className="w-4 h-4 text-primary" /> Devis ({quotes.length})</CardTitle>
        <Button size="sm" variant="outline" onClick={() => navigate("/devis")}>Créer un devis</Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {quotes.length === 0 && <p className="text-sm text-muted-foreground">Aucun devis pour ce client.</p>}
        {quotes.map((q: any) => (
          <div key={q.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-3 text-sm">
            <div className="flex-1 min-w-[180px]">
              <p className="font-medium">{q.quote_number} · {QUOTE_TEMPLATES.find((t) => t.key === q.template_key)?.label || "Devis"}</p>
              <p className="text-xs text-muted-foreground">Créé {d(q.created_at)}{q.sent_at && ` · envoyé ${d(q.sent_at)}`}</p>
            </div>
            <Badge variant="secondary">{STATUS[q.status] || q.status}</Badge>
            <div className="text-right text-xs">
              <p className="font-semibold text-sm">{eur(q.total_amount)} TTC</p>
              {q.is_paid ? <Badge className="mt-1">Payé</Badge> : (
                <p className="text-muted-foreground">Acompte {eur(q.deposit_amount)} · Reste <span className="text-primary">{eur(quoteRemaining(q))}</span>
                  {q.payment_due_date && ` · éch. ${new Date(q.payment_due_date).toLocaleDateString("fr-FR")}`}</p>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
