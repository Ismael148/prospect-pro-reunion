import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CalendarClock, CheckCircle2, Loader2, LifeBuoy, Plus, Trash2 } from "lucide-react";

type Slot = { date: string; start: string; end: string };

const HOURS = Array.from({ length: 9 }, (_, i) => `${String(9 + i).padStart(2, "0")}:00`);

const fmtSlot = (s: Slot) => {
  const d = new Date(s.date + "T00:00:00");
  const day = d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  return `${day} de ${s.start} à ${s.end}`;
};

const isWeekday = (date: string) => {
  const d = new Date(date + "T00:00:00").getDay();
  return d >= 1 && d <= 5;
};

export default function SuiviPublic() {
  const { token } = useParams();
  const [company, setCompany] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [slots, setSlots] = useState<Slot[]>([{ date: "", start: "09:00", end: "10:00" }]);
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

  const setSlot = (i: number, patch: Partial<Slot>) =>
    setSlots((prev) => prev.map((s, j) => (j === i ? { ...s, ...patch } : s)));

  const addSlot = () => setSlots((prev) => [...prev, { date: "", start: "09:00", end: "10:00" }]);
  const removeSlot = (i: number) => setSlots((prev) => prev.filter((_, j) => j !== i));

  const validSlots = slots.filter((s) => s.date && s.start && s.end && s.start < s.end && isWeekday(s.date));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validSlots.length) return;
    setSending(true);
    const { error } = await (supabase as any).rpc("submit_followup_request", {
      p_token: token, p_name: name, p_slots: validSlots.map(fmtSlot).join(" ; "), p_message: message,
    });
    setSending(false);
    if (error) setError(error.message);
    else setDone(true);
  };

  const today = new Date().toISOString().slice(0, 10);

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
            <div className="space-y-3">
              <Label className="text-zinc-800">Vos créneaux disponibles *</Label>
              {slots.map((s, i) => (
                <div key={i} className="flex flex-wrap items-center gap-2 rounded-xl border border-zinc-200 p-3">
                  <Input type="date" min={today} value={s.date} onChange={(e) => setSlot(i, { date: e.target.value })}
                    className="bg-white text-zinc-900 w-auto" required />
                  <select value={s.start} onChange={(e) => setSlot(i, { start: e.target.value })}
                    className="h-10 rounded-md border border-input bg-white px-2 text-sm text-zinc-900">
                    {HOURS.slice(0, -1).map((h) => <option key={h} value={h}>{h}</option>)}
                  </select>
                  <span className="text-zinc-500 text-sm">à</span>
                  <select value={s.end} onChange={(e) => setSlot(i, { end: e.target.value })}
                    className="h-10 rounded-md border border-input bg-white px-2 text-sm text-zinc-900">
                    {HOURS.slice(1).map((h) => <option key={h} value={h}>{h}</option>)}
                  </select>
                  {slots.length > 1 && (
                    <button type="button" onClick={() => removeSlot(i)} className="text-zinc-400 hover:text-red-500" aria-label="Retirer ce créneau">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  {s.date && !isWeekday(s.date) && <p className="w-full text-xs text-red-600">Choisissez un jour de semaine (lundi à vendredi).</p>}
                  {s.start >= s.end && <p className="w-full text-xs text-red-600">L'heure de fin doit être après l'heure de début.</p>}
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addSlot} className="gap-1">
                <Plus className="w-4 h-4" />Ajouter un créneau
              </Button>
            </div>
            <div><Label className="text-zinc-800">Votre besoin (facultatif)</Label>
              <Textarea value={message} onChange={(e) => setMessage(e.target.value)} maxLength={3000} rows={3}
                placeholder="Modification, mise à jour, question technique…" className="bg-white text-zinc-900" /></div>
            <Button type="submit" disabled={sending || !validSlots.length} className="w-full">{sending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}Envoyer mes disponibilités</Button>
            <a href={`/s/${token}`} className="flex items-center justify-center gap-2 text-sm text-zinc-600 hover:text-[#ff006e]"><LifeBuoy className="w-4 h-4" />Ou ouvrir un ticket support</a>
          </form>
        )}
      </div>
    </div>
  );
}
