import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAgents } from "@/hooks/use-agents";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Bell, Plus, Check, Trash2, Clock, Loader2, Tag } from "lucide-react";
import { toast } from "sonner";

const TAG_PRESETS = [
  { value: "rappel_client", label: "📞 Rappeler le client", color: "bg-blue-500/15 text-blue-600 border-blue-500/30" },
  { value: "relance_paiement", label: "💳 Relance paiement", color: "bg-amber-500/15 text-amber-600 border-amber-500/30" },
  { value: "suivi_technique", label: "🛠️ Suivi technique", color: "bg-purple-500/15 text-purple-600 border-purple-500/30" },
  { value: "documents", label: "📄 Documents à récupérer", color: "bg-cyan-500/15 text-cyan-600 border-cyan-500/30" },
  { value: "rdv", label: "📅 RDV à planifier", color: "bg-pink-500/15 text-pink-600 border-pink-500/30" },
  { value: "urgent", label: "🚨 Urgent", color: "bg-destructive/15 text-destructive border-destructive/30" },
  { value: "autre", label: "📌 Autre", color: "bg-muted text-muted-foreground" },
];

const tagMeta = (v: string) => TAG_PRESETS.find((t) => t.value === v) || TAG_PRESETS[TAG_PRESETS.length - 1];

const fmt = (d: string) =>
  new Date(d).toLocaleString("fr-FR", { timeZone: "Indian/Reunion", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

export default function ClientRemindersSection({ clientId }: { clientId: string }) {
  const { user, role } = useAuth();
  const qc = useQueryClient();
  const { data: agents = [] } = useAgents();
  const canCreate = role === "admin" || role === "agent_master" || role === "agent_support";

  const { data: reminders = [], isLoading } = useQuery({
    queryKey: ["client_reminders", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_reminders")
        .select("*")
        .eq("client_id", clientId)
        .order("remind_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const profileMap = useMemo(() => {
    const m = new Map<string, any>();
    agents.forEach((a: any) => m.set(a.user_id, a));
    return m;
  }, [agents]);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    tags: [] as string[],
    remind_at: "",
    assigned_to: "",
  });

  const reset = () => setForm({ title: "", description: "", tags: [], remind_at: "", assigned_to: "" });

  const createReminder = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Non authentifié");
      if (!form.title.trim()) throw new Error("Titre requis");
      if (!form.remind_at) throw new Error("Date de rappel requise");
      const { error } = await supabase.from("client_reminders").insert({
        client_id: clientId,
        created_by: user.id,
        title: form.title.trim(),
        description: form.description.trim() || null,
        tags: form.tags,
        remind_at: new Date(form.remind_at).toISOString(),
        assigned_to: form.assigned_to || user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Rappel créé — notification envoyée");
      qc.invalidateQueries({ queryKey: ["client_reminders", clientId] });
      reset();
      setOpen(false);
    },
    onError: (e: any) => toast.error(e.message || "Erreur"),
  });

  const toggleDone = useMutation({
    mutationFn: async (r: any) => {
      const newStatus = r.status === "done" ? "pending" : "done";
      const { error } = await supabase
        .from("client_reminders")
        .update({
          status: newStatus,
          completed_at: newStatus === "done" ? new Date().toISOString() : null,
          completed_by: newStatus === "done" ? user?.id : null,
        })
        .eq("id", r.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["client_reminders", clientId] }),
  });

  const removeReminder = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("client_reminders").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Rappel supprimé");
      qc.invalidateQueries({ queryKey: ["client_reminders", clientId] });
    },
  });

  const toggleTag = (v: string) => {
    setForm((f) => ({ ...f, tags: f.tags.includes(v) ? f.tags.filter((t) => t !== v) : [...f.tags, v] }));
  };

  const pending = reminders.filter((r) => r.status === "pending");
  const done = reminders.filter((r) => r.status === "done");

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <Bell className="w-4 h-4 text-primary" />
          Rappels & Tâches
          {pending.length > 0 && <Badge variant="default">{pending.length}</Badge>}
        </CardTitle>
        {canCreate && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="w-4 h-4 mr-1" />Nouveau rappel</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Créer un rappel</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Titre *</Label>
                  <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex : Rappeler pour signer le contrat" />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} placeholder="Détails (optionnel)" />
                </div>
                <div>
                  <Label className="flex items-center gap-1"><Tag className="w-3 h-3" />Tags</Label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {TAG_PRESETS.map((t) => {
                      const active = form.tags.includes(t.value);
                      return (
                        <button
                          type="button"
                          key={t.value}
                          onClick={() => toggleTag(t.value)}
                          className={`text-xs px-2 py-1 rounded-full border transition-all ${active ? t.color + " ring-2 ring-primary/40" : "bg-background hover:bg-muted"}`}
                        >
                          {t.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Date & heure du rappel *</Label>
                    <Input type="datetime-local" value={form.remind_at} onChange={(e) => setForm({ ...form, remind_at: e.target.value })} />
                  </div>
                  <div>
                    <Label>Assigner à</Label>
                    <Select value={form.assigned_to || "self"} onValueChange={(v) => setForm({ ...form, assigned_to: v === "self" ? "" : v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="self">Moi-même</SelectItem>
                        {agents.map((a: any) => (
                          <SelectItem key={a.user_id} value={a.user_id}>{a.full_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
                <Button onClick={() => createReminder.mutate()} disabled={createReminder.isPending}>
                  {createReminder.isPending && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                  Créer le rappel
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading && <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin" /></div>}
        {!isLoading && reminders.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">Aucun rappel pour ce client. {canCreate && "Créez-en un pour ne rien oublier."}</p>
        )}
        {pending.map((r) => {
          const overdue = new Date(r.remind_at).getTime() < Date.now();
          const assignee = r.assigned_to ? profileMap.get(r.assigned_to) : null;
          return (
            <div key={r.id} className={`p-3 rounded-lg border ${overdue ? "border-destructive/40 bg-destructive/5" : "bg-muted/20"}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-sm">{r.title}</p>
                    {overdue && <Badge variant="destructive" className="text-[10px]">En retard</Badge>}
                  </div>
                  {r.description && <p className="text-xs text-muted-foreground mt-1">{r.description}</p>}
                  <div className="flex items-center gap-2 flex-wrap mt-1.5">
                    {(r.tags || []).map((t: string) => {
                      const m = tagMeta(t);
                      return <Badge key={t} variant="outline" className={`text-[10px] ${m.color}`}>{m.label}</Badge>;
                    })}
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-1.5">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{fmt(r.remind_at)}</span>
                    {assignee && <span>· Assigné à {assignee.full_name}</span>}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button size="sm" variant="outline" onClick={() => toggleDone.mutate(r)} title="Marquer terminé">
                    <Check className="w-3 h-3" />
                  </Button>
                  {(r.created_by === user?.id || role === "admin" || role === "agent_master") && (
                    <Button size="sm" variant="ghost" onClick={() => removeReminder.mutate(r.id)} title="Supprimer">
                      <Trash2 className="w-3 h-3 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {done.length > 0 && (
          <details className="mt-3">
            <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
              {done.length} rappel(s) terminé(s)
            </summary>
            <div className="mt-2 space-y-1">
              {done.map((r) => (
                <div key={r.id} className="p-2 rounded border bg-success/5 text-xs flex items-center justify-between">
                  <span className="line-through text-muted-foreground">{r.title} — {fmt(r.remind_at)}</span>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" className="h-6 px-2" onClick={() => toggleDone.mutate(r)}>Rouvrir</Button>
                    {(r.created_by === user?.id || role === "admin" || role === "agent_master") && (
                      <Button size="sm" variant="ghost" className="h-6 px-2" onClick={() => removeReminder.mutate(r.id)}>
                        <Trash2 className="w-3 h-3 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </details>
        )}
      </CardContent>
    </Card>
  );
}
