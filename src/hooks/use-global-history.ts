import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type HistoryCategory =
  | "clients"
  | "commentaires"
  | "taches"
  | "projets"
  | "support"
  | "gmb"
  | "facturation"
  | "emails"
  | "social"
  | "prospection"
  | "agenda"
  | "audit";

export const HISTORY_CATEGORIES: Record<HistoryCategory, { label: string; emoji: string; class: string }> = {
  clients: { label: "Clients", emoji: "🏢", class: "bg-primary/10 text-primary border-primary/20" },
  commentaires: { label: "Commentaires & notes", emoji: "💬", class: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  taches: { label: "Tâches & rappels", emoji: "✅", class: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" },
  projets: { label: "Projets", emoji: "📁", class: "bg-violet-500/10 text-violet-500 border-violet-500/20" },
  support: { label: "Support", emoji: "🛟", class: "bg-orange-500/10 text-orange-500 border-orange-500/20" },
  gmb: { label: "Fiches Google", emoji: "📍", class: "bg-teal-500/10 text-teal-500 border-teal-500/20" },
  facturation: { label: "Facturation", emoji: "🧾", class: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
  emails: { label: "Emails envoyés", emoji: "📧", class: "bg-sky-500/10 text-sky-500 border-sky-500/20" },
  social: { label: "Réseaux sociaux", emoji: "📣", class: "bg-pink-500/10 text-pink-500 border-pink-500/20" },
  prospection: { label: "Prospection", emoji: "🎯", class: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20" },
  agenda: { label: "Agenda", emoji: "📅", class: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20" },
  audit: { label: "Accès & sécurité", emoji: "🛡️", class: "bg-muted text-muted-foreground border-border" },
};

export type HistoryEntry = {
  id: string;
  category: HistoryCategory;
  title: string;
  detail?: string | null;
  at: string; // ISO timestamp
  link?: string | null;
  actor?: string | null;
};

type Range = { from: string; to: string };

const PER_SOURCE_LIMIT = 400;

async function safe<T>(fn: () => Promise<{ data: any; error: any }>): Promise<any[]> {
  try {
    const { data, error } = await fn();
    if (error) return [];
    return (data as any[]) || [];
  } catch {
    return [];
  }
}

export function useGlobalHistory(range: Range) {
  return useQuery({
    queryKey: ["global_history", range.from, range.to],
    queryFn: async (): Promise<HistoryEntry[]> => {
      const inRange = (q: any, col = "created_at") => q.gte(col, range.from).lte(col, range.to);

      const [
        clients,
        activities,
        moduleNotes,
        ticketComments,
        tasks,
        reminders,
        projects,
        tickets,
        gmbActs,
        invoices,
        emails,
        socialPubs,
        socialDelivs,
        prospects,
        events,
        audit,
      ] = await Promise.all([
        safe(() => inRange(supabase.from("clients").select("id,company_name,ndi,created_at")).order("created_at", { ascending: false }).limit(PER_SOURCE_LIMIT)),
        safe(() => inRange(supabase.from("client_activities").select("id,client_id,activity_type,description,created_at")).order("created_at", { ascending: false }).limit(PER_SOURCE_LIMIT)),
        safe(() => inRange(supabase.from("module_notes").select("id,project_id,module_id,content,created_at")).order("created_at", { ascending: false }).limit(PER_SOURCE_LIMIT)),
        safe(() => inRange(supabase.from("ticket_comments").select("id,ticket_id,content,created_at")).order("created_at", { ascending: false }).limit(PER_SOURCE_LIMIT)),
        safe(() => inRange(supabase.from("project_tasks").select("id,project_id,title,status,created_at")).order("created_at", { ascending: false }).limit(PER_SOURCE_LIMIT)),
        safe(() => inRange(supabase.from("client_reminders").select("id,client_id,title,status,created_at")).order("created_at", { ascending: false }).limit(PER_SOURCE_LIMIT)),
        safe(() => inRange(supabase.from("projects").select("id,name,status,client_id,created_at")).order("created_at", { ascending: false }).limit(PER_SOURCE_LIMIT)),
        safe(() => inRange(supabase.from("support_tickets").select("id,ticket_number,subject,status,priority,created_at")).order("created_at", { ascending: false }).limit(PER_SOURCE_LIMIT)),
        safe(() => inRange(supabase.from("gmb_activities").select("id,client_id,action_type,description,performed_at"), "performed_at").order("performed_at", { ascending: false }).limit(PER_SOURCE_LIMIT)),
        safe(() => inRange(supabase.from("invoices").select("id,invoice_number,total_amount,status,created_at")).order("created_at", { ascending: false }).limit(PER_SOURCE_LIMIT)),
        safe(() => inRange(supabase.from("email_send_log").select("id,subject,recipient_email,status,created_at")).order("created_at", { ascending: false }).limit(PER_SOURCE_LIMIT)),
        safe(() => inRange(supabase.from("social_publications").select("id,platform,content,status,created_at")).order("created_at", { ascending: false }).limit(PER_SOURCE_LIMIT)),
        safe(() => inRange(supabase.from("social_deliverables").select("id,type,status,month_year,created_at")).order("created_at", { ascending: false }).limit(PER_SOURCE_LIMIT)),
        safe(() => inRange(supabase.from("prospects").select("id,business_name,status,city,created_at")).order("created_at", { ascending: false }).limit(PER_SOURCE_LIMIT)),
        safe(() => inRange(supabase.from("calendar_events").select("id,title,event_type,start_at,created_at")).order("created_at", { ascending: false }).limit(PER_SOURCE_LIMIT)),
        safe(() => inRange(supabase.from("data_access_audit").select("id,action,resource_type,resource_label,actor_email,created_at")).order("created_at", { ascending: false }).limit(PER_SOURCE_LIMIT)),
      ]);

      const clientIds = new Set<string>();
      [...activities, ...reminders, ...projects, ...gmbActs].forEach((r: any) => r.client_id && clientIds.add(r.client_id));
      let clientNames: Record<string, string> = {};
      if (clientIds.size > 0) {
        const rows = await safe(() =>
          supabase.from("clients").select("id,company_name").in("id", Array.from(clientIds).slice(0, 500))
        );
        clientNames = Object.fromEntries(rows.map((c: any) => [c.id, c.company_name]));
      }
      const withClient = (id?: string | null) => (id && clientNames[id] ? clientNames[id] : null);

      const entries: HistoryEntry[] = [
        ...clients.map((c: any) => ({
          id: `client-${c.id}`,
          category: "clients" as const,
          title: `Nouveau client · ${c.company_name}`,
          detail: c.ndi,
          at: c.created_at,
          link: `/clients/${c.id}`,
        })),
        ...activities.map((a: any) => ({
          id: `act-${a.id}`,
          category: (a.activity_type === "note" || a.activity_type === "commentaire"
            ? "commentaires"
            : "clients") as HistoryCategory,
          title: withClient(a.client_id) || "Activité client",
          detail: a.description,
          at: a.created_at,
          link: a.client_id ? `/clients/${a.client_id}` : null,
        })),
        ...moduleNotes.map((n: any) => ({
          id: `mnote-${n.id}`,
          category: "commentaires" as const,
          title: "Note de module projet",
          detail: (n.content || "").slice(0, 200),
          at: n.created_at,
          link: n.project_id ? `/projets/${n.project_id}` : null,
        })),
        ...ticketComments.map((c: any) => ({
          id: `tcom-${c.id}`,
          category: "commentaires" as const,
          title: "Commentaire sur un ticket",
          detail: (c.content || "").slice(0, 200),
          at: c.created_at,
          link: "/support",
        })),
        ...tasks.map((t: any) => ({
          id: `task-${t.id}`,
          category: "taches" as const,
          title: `Tâche · ${t.title}`,
          detail: t.status,
          at: t.created_at,
          link: t.project_id ? `/projets/${t.project_id}` : null,
        })),
        ...reminders.map((r: any) => ({
          id: `rem-${r.id}`,
          category: "taches" as const,
          title: `Rappel · ${r.title}`,
          detail: [withClient(r.client_id), r.status].filter(Boolean).join(" · "),
          at: r.created_at,
          link: r.client_id ? `/clients/${r.client_id}` : null,
        })),
        ...projects.map((p: any) => ({
          id: `proj-${p.id}`,
          category: "projets" as const,
          title: `Projet · ${p.name}`,
          detail: [withClient(p.client_id), p.status].filter(Boolean).join(" · "),
          at: p.created_at,
          link: `/projets/${p.id}`,
        })),
        ...tickets.map((t: any) => ({
          id: `tick-${t.id}`,
          category: "support" as const,
          title: `Ticket ${t.ticket_number || ""} · ${t.subject}`,
          detail: [t.status, t.priority].filter(Boolean).join(" · "),
          at: t.created_at,
          link: "/support",
        })),
        ...gmbActs.map((g: any) => ({
          id: `gmb-${g.id}`,
          category: "gmb" as const,
          title: `${withClient(g.client_id) || "Fiche Google"} · ${g.action_type}`,
          detail: g.description,
          at: g.performed_at,
          link: "/gmb",
        })),
        ...invoices.map((i: any) => ({
          id: `inv-${i.id}`,
          category: "facturation" as const,
          title: `Facture ${i.invoice_number}`,
          detail: `${Number(i.total_amount || 0).toFixed(2)} € · ${i.status}`,
          at: i.created_at,
          link: "/facturation",
        })),
        ...emails.map((e: any) => ({
          id: `mail-${e.id}`,
          category: "emails" as const,
          title: e.subject || "Email envoyé",
          detail: [e.recipient_email, e.status].filter(Boolean).join(" · "),
          at: e.created_at,
          link: "/emails",
        })),
        ...socialPubs.map((s: any) => ({
          id: `pub-${s.id}`,
          category: "social" as const,
          title: `Publication ${s.platform}`,
          detail: (s.content || "").slice(0, 160),
          at: s.created_at,
        })),
        ...socialDelivs.map((s: any) => ({
          id: `sdel-${s.id}`,
          category: "social" as const,
          title: `Livrable ${s.type}`,
          detail: [s.month_year, s.status].filter(Boolean).join(" · "),
          at: s.created_at,
        })),
        ...prospects.map((p: any) => ({
          id: `pros-${p.id}`,
          category: "prospection" as const,
          title: `Prospect · ${p.business_name}`,
          detail: [p.city, p.status].filter(Boolean).join(" · "),
          at: p.created_at,
          link: "/prospection",
        })),
        ...events.map((e: any) => ({
          id: `evt-${e.id}`,
          category: "agenda" as const,
          title: `Événement · ${e.title}`,
          detail: e.event_type,
          at: e.created_at,
          link: "/calendrier",
        })),
        ...audit.map((a: any) => ({
          id: `aud-${a.id}`,
          category: "audit" as const,
          title: `${a.action} · ${a.resource_type}`,
          detail: a.resource_label,
          at: a.created_at,
          actor: a.actor_email,
          link: "/audit",
        })),
      ].filter((e) => !!e.at);

      return entries.sort((a, b) => (a.at < b.at ? 1 : -1));
    },
    staleTime: 30_000,
  });
}
