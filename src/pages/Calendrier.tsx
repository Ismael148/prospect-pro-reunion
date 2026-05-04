import { useMemo, useState } from "react";
import { useCalendarEvents, type CalendarEvent } from "@/hooks/use-calendar-events";
import { useClients } from "@/hooks/use-clients";
import { useAgents } from "@/hooks/use-agents";
import { useAuth } from "@/contexts/AuthContext";
import { getHolidays, type Holiday } from "@/lib/calendar-holidays";
import { useEmailBranding } from "@/hooks/use-email-branding";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ChevronLeft, ChevronRight, Plus, CalendarDays, Video, Users as UsersIcon,
  MapPin, Mail, Trash2, Link as LinkIcon, Clock,
} from "lucide-react";
import { motion } from "framer-motion";

const DEFAULT_MEET = "https://meet.google.com/cjd-ydcx-qpe";
const MONTHS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];
const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

const EVENT_TYPE_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  rdv_client: { label: "RDV Client", color: "#ff006e", icon: UsersIcon },
  visio: { label: "Visio", color: "#3b82f6", icon: Video },
  reunion_interne: { label: "Réunion interne", color: "#f59e0b", icon: UsersIcon },
  autre: { label: "Autre", color: "#8b5cf6", icon: CalendarDays },
};

function toDateInput(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
function toTimeInput(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}
function combineDateTime(dateStr: string, timeStr: string): string {
  return new Date(`${dateStr}T${timeStr}:00`).toISOString();
}

export default function Calendrier() {
  const { roles, hasRole, user } = useAuth();
  const canManage =
    hasRole("admin") || hasRole("agent_master") || hasRole("agent_support");
  const { data: events = [], create, update, remove } = useCalendarEvents();
  const { data: clients = [] } = useClients();
  const { data: agents = [] } = useAgents();
  const { data: branding } = useEmailBranding();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [filterType, setFilterType] = useState<string>("all");

  // Form state
  const [form, setForm] = useState({
    title: "",
    description: "",
    event_type: "rdv_client",
    date: toDateInput(new Date()),
    start_time: "10:00",
    end_time: "11:00",
    all_day: false,
    location: "",
    meet_link: DEFAULT_MEET,
    client_id: "none",
    participants: [] as string[],
    color: "#ff006e",
  });

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const holidays = useMemo(() => getHolidays(year), [year]);

  // Build month grid
  const monthGrid = useMemo(() => {
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    // Monday-start: getDay() Sun=0..Sat=6 -> shift
    const firstDow = (first.getDay() + 6) % 7;
    const days: { date: Date; inMonth: boolean }[] = [];
    for (let i = firstDow; i > 0; i--) {
      days.push({ date: new Date(year, month, 1 - i), inMonth: false });
    }
    for (let d = 1; d <= last.getDate(); d++) {
      days.push({ date: new Date(year, month, d), inMonth: true });
    }
    while (days.length % 7 !== 0) {
      const lastD = days[days.length - 1].date;
      days.push({ date: new Date(lastD.getFullYear(), lastD.getMonth(), lastD.getDate() + 1), inMonth: false });
    }
    while (days.length < 42) {
      const lastD = days[days.length - 1].date;
      days.push({ date: new Date(lastD.getFullYear(), lastD.getMonth(), lastD.getDate() + 1), inMonth: false });
    }
    return days;
  }, [year, month]);

  const filteredEvents = useMemo(() => {
    return events.filter((e) => filterType === "all" || e.event_type === filterType);
  }, [events, filterType]);

  function eventsForDay(d: Date): CalendarEvent[] {
    const dayKey = toDateInput(d);
    return filteredEvents.filter((e) => toDateInput(new Date(e.start_at)) === dayKey);
  }

  function holidaysForDay(d: Date): Holiday[] {
    const k = toDateInput(d);
    return holidays.filter((h) => h.date === k);
  }

  function openCreate(date?: Date) {
    setEditingEvent(null);
    const d = date || new Date();
    setForm({
      title: "",
      description: "",
      event_type: "rdv_client",
      date: toDateInput(d),
      start_time: "10:00",
      end_time: "11:00",
      all_day: false,
      location: "",
      meet_link: DEFAULT_MEET,
      client_id: "none",
      participants: [],
      color: "#ff006e",
    });
    setDialogOpen(true);
  }

  function openEdit(ev: CalendarEvent) {
    setEditingEvent(ev);
    const start = new Date(ev.start_at);
    const end = new Date(ev.end_at);
    setForm({
      title: ev.title,
      description: ev.description || "",
      event_type: ev.event_type,
      date: toDateInput(start),
      start_time: toTimeInput(start),
      end_time: toTimeInput(end),
      all_day: ev.all_day,
      location: ev.location || "",
      meet_link: ev.meet_link || DEFAULT_MEET,
      client_id: ev.client_id || "none",
      participants: ev.participants || [],
      color: ev.color,
    });
    setDialogOpen(true);
  }

  async function submitForm() {
    if (!form.title.trim()) {
      toast.error("Titre obligatoire");
      return;
    }
    const start_at = combineDateTime(form.date, form.all_day ? "00:00" : form.start_time);
    const end_at = combineDateTime(form.date, form.all_day ? "23:59" : form.end_time);
    const payload: any = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      event_type: form.event_type,
      start_at,
      end_at,
      all_day: form.all_day,
      location: form.location.trim() || null,
      meet_link: form.meet_link.trim() || null,
      client_id: form.client_id === "none" ? null : form.client_id,
      participants: form.participants,
      color: EVENT_TYPE_CONFIG[form.event_type]?.color || form.color,
    };

    try {
      if (editingEvent) {
        await update.mutateAsync({ id: editingEvent.id, ...payload });
      } else {
        await create.mutateAsync(payload);
      }
      setDialogOpen(false);
    } catch {/* toast handled */}
  }

  async function sendEmailToClient(ev: CalendarEvent) {
    if (!ev.client_id) {
      toast.error("Aucun client lié");
      return;
    }
    const client = clients.find((c: any) => c.id === ev.client_id);
    if (!client?.email) {
      toast.error("Pas d'email pour ce client");
      return;
    }

    const startD = new Date(ev.start_at);
    const endD = new Date(ev.end_at);
    const dateStr = startD.toLocaleDateString("fr-FR", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    });
    const startTime = ev.all_day ? "Toute la journée" :
      `${toTimeInput(startD)} - ${toTimeInput(endD)}`;
    const typeLabel = EVENT_TYPE_CONFIG[ev.event_type]?.label || "Événement";
    const brandColor = branding?.brand_color || "#ff006e";

    const html = `
<div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #fff;">
  <div style="background: linear-gradient(135deg, ${brandColor} 0%, #1a1a2e 100%); padding: 30px; text-align: center;">
    ${branding?.logo_url ? `<img src="${branding.logo_url}" alt="Adamkom" style="height: 40px; filter: brightness(0) invert(1);" />` : ""}
    <h1 style="color: #fff; margin: 16px 0 0 0; font-size: 24px;">📅 ${typeLabel}</h1>
  </div>
  <div style="padding: 32px 24px; color: #1a1a2e;">
    <p style="font-size: 16px; margin: 0 0 20px;">Bonjour ${client.manager_name || client.company_name},</p>
    <p style="font-size: 15px; line-height: 1.6;">Nous avons le plaisir de vous confirmer un rendez-vous.</p>

    <div style="background: #f8f9fc; border-left: 4px solid ${brandColor}; padding: 20px; margin: 24px 0; border-radius: 8px;">
      <h2 style="margin: 0 0 12px 0; font-size: 18px; color: ${brandColor};">${ev.title}</h2>
      <p style="margin: 6px 0; font-size: 14px;"><strong>📅 Date :</strong> ${dateStr}</p>
      <p style="margin: 6px 0; font-size: 14px;"><strong>🕐 Horaire :</strong> ${startTime}</p>
      ${ev.location ? `<p style="margin: 6px 0; font-size: 14px;"><strong>📍 Lieu :</strong> ${ev.location}</p>` : ""}
      ${ev.description ? `<p style="margin: 12px 0 0 0; font-size: 14px; color: #555;">${ev.description.replace(/\n/g, "<br>")}</p>` : ""}
    </div>

    ${ev.meet_link ? `
    <div style="text-align: center; margin: 32px 0;">
      <a href="${ev.meet_link}" style="display: inline-block; background: ${brandColor}; color: #fff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px;">
        🎥 Rejoindre la visio
      </a>
      <p style="margin: 12px 0 0 0; font-size: 13px; color: #666;">
        Ou copiez ce lien : <a href="${ev.meet_link}" style="color: ${brandColor};">${ev.meet_link}</a>
      </p>
    </div>` : ""}

    <p style="font-size: 14px; color: #666; margin: 24px 0 0 0;">
      En cas d'empêchement, merci de nous prévenir au plus tôt.
    </p>
    <p style="font-size: 14px; margin: 16px 0 0 0;">À très bientôt,<br><strong>L'équipe ${branding?.footer_company || "Adamkom"}</strong></p>
  </div>
  <div style="background: #1a1a2e; color: #fff; padding: 20px; text-align: center; font-size: 12px;">
    <p style="margin: 0;">${branding?.footer_copyright || "Adamkom by JJP — La Réunion 🇷🇪"}</p>
    <p style="margin: 4px 0 0 0; opacity: 0.7;">${branding?.footer_phone || ""}</p>
  </div>
</div>`.trim();

    try {
      const { error } = await supabase.functions.invoke("send-brevo-campaign", {
        body: {
          action: "send_client_email",
          recipientEmail: client.email,
          recipientName: client.manager_name || client.company_name,
          htmlContent: html,
          subject: `📅 ${typeLabel} : ${ev.title} — ${dateStr}`,
          trigger: "calendar_event",
          client_id: client.id,
        },
      });
      if (error) throw error;
      await update.mutateAsync({
        id: ev.id,
        email_sent_to_client: true,
        email_sent_at: new Date().toISOString(),
      } as any);
      toast.success("Email envoyé au client");
    } catch (e: any) {
      toast.error("Erreur : " + e.message);
    }
  }

  const today = new Date();
  const isToday = (d: Date) =>
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear();

  const upcoming = useMemo(() => {
    const now = new Date();
    return filteredEvents
      .filter((e) => new Date(e.start_at) >= now)
      .slice(0, 5);
  }, [filteredEvents]);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">📅 Calendrier</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gérez tous les RDV, visios et réunions de l'entreprise
          </p>
        </div>
        {canManage && (
          <Button onClick={() => openCreate()} className="gap-2">
            <Plus className="w-4 h-4" /> Nouvel événement
          </Button>
        )}
      </div>

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <Card className="p-4 border-primary/20 bg-primary/5">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold">Événements à venir</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {upcoming.map((e) => {
              const cfg = EVENT_TYPE_CONFIG[e.event_type] || EVENT_TYPE_CONFIG.autre;
              const d = new Date(e.start_at);
              return (
                <Badge
                  key={e.id}
                  variant="outline"
                  className="cursor-pointer text-xs py-1.5 px-3 hover:bg-primary/10"
                  style={{ borderColor: cfg.color + "40" }}
                  onClick={() => openEdit(e)}
                >
                  <span style={{ color: cfg.color }} className="font-semibold">
                    {d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
                    {!e.all_day && ` ${toTimeInput(d)}`}
                  </span>
                  <span className="ml-2">— {e.title}</span>
                </Badge>
              );
            })}
          </div>
        </Card>
      )}

      {/* Month nav + filter */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setCurrentDate(new Date(year, month - 1, 1))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h2 className="text-xl font-semibold min-w-[180px] text-center">
            {MONTHS[month]} {year}
          </h2>
          <Button variant="ghost" size="icon" onClick={() => setCurrentDate(new Date(year, month + 1, 1))}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
            Aujourd'hui
          </Button>
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les types</SelectItem>
            {Object.entries(EVENT_TYPE_CONFIG).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Calendar grid */}
      <Card className="overflow-hidden">
        <div className="grid grid-cols-7 border-b bg-muted/30">
          {WEEKDAYS.map((d) => (
            <div key={d} className="text-center text-xs font-semibold py-2 text-muted-foreground uppercase">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {monthGrid.map((cell, idx) => {
            const dayEvents = eventsForDay(cell.date);
            const dayHolidays = holidaysForDay(cell.date);
            const today = isToday(cell.date);
            return (
              <motion.div
                key={idx}
                whileHover={{ backgroundColor: "hsl(var(--muted) / 0.4)" }}
                className={`min-h-[110px] border-r border-b p-1.5 cursor-pointer ${
                  cell.inMonth ? "bg-background" : "bg-muted/10"
                } ${today ? "ring-2 ring-primary ring-inset" : ""}`}
                onClick={() => canManage && openCreate(cell.date)}
              >
                <div className="flex items-start justify-between gap-1">
                  <span className={`text-sm font-semibold ${
                    cell.inMonth ? (today ? "text-primary" : "text-foreground") : "text-muted-foreground/40"
                  }`}>
                    {cell.date.getDate()}
                  </span>
                  {dayHolidays.length > 0 && (
                    <span className="text-base" title={dayHolidays.map(h => h.name).join(", ")}>
                      {dayHolidays[0].emoji}
                    </span>
                  )}
                </div>
                {dayHolidays.length > 0 && cell.inMonth && (
                  <div className="text-[9px] text-muted-foreground truncate mt-0.5">
                    {dayHolidays[0].name}
                  </div>
                )}
                <div className="space-y-0.5 mt-1">
                  {dayEvents.slice(0, 3).map((e) => {
                    const cfg = EVENT_TYPE_CONFIG[e.event_type] || EVENT_TYPE_CONFIG.autre;
                    return (
                      <div
                        key={e.id}
                        className="text-[10px] px-1.5 py-0.5 rounded truncate font-medium text-white cursor-pointer hover:opacity-80"
                        style={{ backgroundColor: cfg.color }}
                        onClick={(ev) => { ev.stopPropagation(); openEdit(e); }}
                      >
                        {!e.all_day && toTimeInput(new Date(e.start_at)) + " "}
                        {e.title}
                      </div>
                    );
                  })}
                  {dayEvents.length > 3 && (
                    <div className="text-[9px] text-muted-foreground px-1">
                      +{dayEvents.length - 3} autre(s)
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </Card>

      {/* Dialog Create/Edit */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingEvent ? "Modifier l'événement" : "Nouvel événement"}
            </DialogTitle>
            <DialogDescription>
              {editingEvent ? "Modifiez les détails ou envoyez l'invitation." : "Créez un RDV, une visio ou une réunion."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>Titre *</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex: Présentation maquette site" />
              </div>
              <div>
                <Label>Type</Label>
                <Select value={form.event_type} onValueChange={(v) => setForm({ ...form, event_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(EVENT_TYPE_CONFIG).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Client (optionnel)</Label>
                <Select value={form.client_id} onValueChange={(v) => setForm({ ...form, client_id: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucun client</SelectItem>
                    {clients.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Date</Label>
                <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </div>
              <div className="flex items-end gap-2">
                <Checkbox
                  id="all_day"
                  checked={form.all_day}
                  onCheckedChange={(c) => setForm({ ...form, all_day: c === true })}
                />
                <Label htmlFor="all_day" className="cursor-pointer">Toute la journée</Label>
              </div>
              {!form.all_day && (
                <>
                  <div>
                    <Label>Début</Label>
                    <Input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
                  </div>
                  <div>
                    <Label>Fin</Label>
                    <Input type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} />
                  </div>
                </>
              )}
              <div className="col-span-2">
                <Label className="flex items-center gap-1"><MapPin className="w-3 h-3" /> Lieu</Label>
                <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Bureau, adresse..." />
              </div>
              <div className="col-span-2">
                <Label className="flex items-center gap-1"><LinkIcon className="w-3 h-3" /> Lien Meet / Visio</Label>
                <Input value={form.meet_link} onChange={(e) => setForm({ ...form, meet_link: e.target.value })} placeholder={DEFAULT_MEET} />
              </div>
              <div className="col-span-2">
                <Label>Participants équipe</Label>
                <div className="flex flex-wrap gap-2 mt-1 p-2 border rounded-md max-h-32 overflow-y-auto">
                  {agents.map((a: any) => {
                    const checked = form.participants.includes(a.user_id);
                    return (
                      <button
                        key={a.user_id}
                        type="button"
                        onClick={() => {
                          setForm({
                            ...form,
                            participants: checked
                              ? form.participants.filter((p) => p !== a.user_id)
                              : [...form.participants, a.user_id],
                          });
                        }}
                        className={`text-xs px-2.5 py-1 rounded-full border transition ${
                          checked
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background hover:bg-muted"
                        }`}
                      >
                        {a.full_name}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="col-span-2">
                <Label>Description / Ordre du jour</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  placeholder="Détails, points à aborder..."
                />
              </div>
            </div>
          </div>

          <DialogFooter className="flex-wrap gap-2">
            {editingEvent && (
              <>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={async () => {
                    if (confirm("Supprimer cet événement ?")) {
                      await remove.mutateAsync(editingEvent.id);
                      setDialogOpen(false);
                    }
                  }}
                >
                  <Trash2 className="w-4 h-4 mr-1" /> Supprimer
                </Button>
                {editingEvent.client_id && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => sendEmailToClient(editingEvent)}
                  >
                    <Mail className="w-4 h-4 mr-1" />
                    {editingEvent.email_sent_to_client ? "Renvoyer" : "Envoyer"} au client
                  </Button>
                )}
              </>
            )}
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={submitForm} disabled={create.isPending || update.isPending}>
              {editingEvent ? "Mettre à jour" : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
