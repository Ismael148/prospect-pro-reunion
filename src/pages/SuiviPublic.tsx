import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CalendarClock, CheckCircle2, Loader2, LifeBuoy } from "lucide-react";

export default function SuiviPublic() {
  const { token } = useParams();
  const [company, setCompany] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [slots, setSlots] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    (supabase as any).rpc("get_public_client_by_support_token", { p_token: token }).then(({ data, error }: any) => {
      const row = Array.isArray(data) ? data[0] : data;
      if (error || !row) setError("Lien invalide ou expiré");
      else setCompany(row.company_name);
    });
  }, [token]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slots.trim()) return;
    setSending(true);
    const { error } = await (supabase as any).rpc("submit_followup_request", {
      p_token: token, p_name: name, p_slots: slots, p_message: message,
    });
    setSending(false);
    if (error) setError(error.message);
    else setDone(true);
  };

  return (
    <div className="tuto-light min-h-screen py-10 px-4">
      <div className="max-w-xl mx-auto bg-white rounded-2xl shadow-lg ring-1 ring-black/5 p-6 sm:p-8">
        <p className="text-xs font-bold tracking-widest text-[#ff006e]">ADAMKOM BY JJP</p>
        <h1 className="text-2xl font-bold mt-2 text-zinc-900">Planifier un point Visio</h1>
        {company && <p className="text-zinc-600 mt-1">{company}</p>}
        {error && <p className="mt-6 text-red-600">{error}</p>}
        {done ? (
          <div className="mt-8 text-center">
            <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-600" />
            <p className="mt-3 font-semibold text-zinc-900">Merci, vos disponibilités sont bien reçues.</p>
            <p className="text-zinc-600 text-sm mt-1">Notre équipe vous confirme l'heure et vous envoie le lien Google Meet par email.</p>
          </div>
        ) : company && (
          <form onSubmit={submit} className="mt-6 space-y-4">
            <p className="text-sm text-zinc-600 flex gap-2"><CalendarClock className="w-4 h-4 mt-0.5 shrink-0 text-[#ff006e]" />Du lundi au vendredi, de 9h à 17h (heure de La Réunion).</p>
            <div><Label className="text-zinc-800">Votre nom</Label><Input value={name} onChange={(e) => setName(e.target.value)} maxLength={200} className="bg-white text-zinc-900" /></div>
            <div><Label className="text-zinc-800">Vos créneaux disponibles *</Label>
              <Textarea required value={slots} onChange={(e) => setSlots(e.target.value)} maxLength={2000} rows={3}
                placeholder="Ex : Mardi 14h-16h, Jeudi 10h-12h" className="bg-white text-zinc-900" /></div>
            <div><Label className="text-zinc-800">Votre besoin (facultatif)</Label>
              <Textarea value={message} onChange={(e) => setMessage(e.target.value)} maxLength={3000} rows={3}
                placeholder="Modification, mise à jour, question technique…" className="bg-white text-zinc-900" /></div>
            <Button type="submit" disabled={sending} className="w-full">{sending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}Envoyer mes disponibilités</Button>
            <a href={`/s/${token}`} className="flex items-center justify-center gap-2 text-sm text-zinc-600 hover:text-[#ff006e]"><LifeBuoy className="w-4 h-4" />Ou ouvrir un ticket support</a>
          </form>
        )}
      </div>
    </div>
  );
}
