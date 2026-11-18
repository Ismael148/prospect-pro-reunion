import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { ArrowRight, Briefcase, Building2, History, Loader2, Mail, Search, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { fetchAllPages } from "@/hooks/use-tasks-agenda";
import { useTeamMembers, ROLE_LABELS } from "@/hooks/use-team-comments";
import { useReminderAddresses, useSaveReminderAddress } from "@/hooks/use-task-reminders";
import { PACK_LABELS, PROJECT_STATUS_LABELS } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const NONE = "__none__";
const PAGE = 50;
const isActiveProject = (s: string) => s !== "termine" && s !== "annule";

type ClientRow = { id: string; company_name: string; ndi: string | null; pack_type: string | null; manager_name: string | null; assigned_to: string | null };
type ProjectRow = { id: string; name: string; status: string; client_id: string | null; assigned_to: string | null; pack_type: string | null; clients: { company_name: string } | null };

function useAssignmentData() {
  return useQuery({
    queryKey: ["assignments-board"],
    queryFn: async () => {
      const [clients, projects] = await Promise.all([
        fetchAllPages<ClientRow>((from, to) =>
          supabase.from("clients").select("id, company_name, ndi, pack_type, manager_name, assigned_to").order("company_name").range(from, to)),
        fetchAllPages<ProjectRow>((from, to) =>
          supabase.from("projects").select("id, name, status, client_id, assigned_to, pack_type, clients(company_name)").order("created_at", { ascending: false }).range(from, to)),
      ]);
      return { clients, projects };
    },
  });
}

function useAssignmentHistory() {
  return useQuery({
    queryKey: ["assignment-history"],
    queryFn: async () => {
      const { data, error } = await supabase.from("assignment_history").select("*").order("created_at", { ascending: false }).limit(200);
      if (error) throw error;
      return data || [];
    },
  });
}

function ReminderAddressField({ userId, current, canEdit }: { userId: string; current: string | undefined; canEdit: boolean }) {
  const [value, setValue] = useState(current ?? "");
  const save = useSaveReminderAddress();
  const dirty = value.trim().toLowerCase() !== (current ?? "");
  if (!canEdit) {
    return current ? <p className="truncate text-xs text-muted-foreground"><Mail className="mr-1 inline h-3 w-3" />{current}</p> : null;
  }
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Adresse de réception des relances</p>
      <div className="flex gap-1.5">
        <Input type="email" value={value} onChange={(e) => setValue(e.target.value)} placeholder="vraie.adresse@gmail.com" className="h-8 text-xs" />
        <Button size="sm" className="h-8" disabled={!dirty || save.isPending}
          onClick={() => save.mutate({ userId, email: value }, {
            onSuccess: () => toast.success(value.trim() ? "Adresse enregistrée" : "Adresse retirée"),
            onError: (e: any) => toast.error(e.message || "Enregistrement impossible"),
          })}>
          {save.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "OK"}
        </Button>
      </div>
      {!current && <p className="text-[11px] text-destructive">À renseigner : sans elle, aucune relance n'est envoyée.</p>}
    </div>
  );
}

function AssigneeSelect({ value, onChange, members, disabled, className = "h-8 w-44" }: {
  value: string | null; onChange: (v: string | null) => void; members: { user_id: string; full_name: string | null }[]; disabled?: boolean; className?: string;
}) {
  return (
    <Select value={value ?? NONE} onValueChange={(v) => onChange(v === NONE ? null : v)} disabled={disabled}>
      <SelectTrigger className={`${className} text-xs`}><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE}>Sans responsable</SelectItem>
        {members.map((m) => <SelectItem key={m.user_id} value={m.user_id}>{m.full_name || "Membre"}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

/** Generic assignable list (clients or projects) with search, responsible filter and bulk assignment. */
function AssignableList<T extends { id: string; assigned_to: string | null }>({
  items, members, canEdit, onAssign, searchText, renderMain, emptyLabel,
}: {
  items: T[]; members: { user_id: string; full_name: string | null }[]; canEdit: boolean;
  onAssign: (ids: string[], assignee: string | null) => Promise<void>;
  searchText: (row: T) => string; renderMain: (row: T) => React.ReactNode; emptyLabel: string;
}) {
  const [q, setQ] = useState("");
  const [who, setWho] = useState("all");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkTo, setBulkTo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return items.filter((r) =>
      (who === "all" || (who === NONE ? !r.assigned_to : r.assigned_to === who)) &&
      (!needle || searchText(r).toLowerCase().includes(needle)));
  }, [items, q, who, searchText]);
  const pageRows = filtered.slice(page * PAGE, page * PAGE + PAGE);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const allOnPage = pageRows.length > 0 && pageRows.every((r) => selected.has(r.id));

  const run = async (ids: string[], assignee: string | null) => {
    setBusy(true);
    try { await onAssign(ids, assignee); setSelected(new Set()); } finally { setBusy(false); }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} placeholder="Rechercher…" className="pl-9" />
        </div>
        <Select value={who} onValueChange={(v) => { setWho(v); setPage(0); }}>
          <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les responsables</SelectItem>
            <SelectItem value={NONE}>Sans responsable</SelectItem>
            {members.map((m) => <SelectItem key={m.user_id} value={m.user_id}>{m.full_name || "Membre"}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">{filtered.length} résultat{filtered.length > 1 ? "s" : ""}</span>
      </div>

      {canEdit && selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 p-2.5 text-sm">
          <span className="font-medium">{selected.size} sélectionné{selected.size > 1 ? "s" : ""}</span>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          <AssigneeSelect value={bulkTo} onChange={setBulkTo} members={members} className="h-8 w-48" />
          <Button size="sm" disabled={busy} onClick={() => run([...selected], bulkTo)}>
            {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <UserCheck className="mr-1 h-4 w-4" />} Attribuer
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Annuler</Button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              {canEdit && (
                <th className="w-8 py-2 pr-2">
                  <Checkbox checked={allOnPage} aria-label="Tout sélectionner sur la page" onCheckedChange={(c) => {
                    const next = new Set(selected);
                    pageRows.forEach((r) => (c ? next.add(r.id) : next.delete(r.id)));
                    setSelected(next);
                  }} />
                </th>
              )}
              <th className="py-2 pr-3">Nom</th><th className="py-2">Responsable</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr><td colSpan={3} className="py-8 text-center text-muted-foreground">{emptyLabel}</td></tr>
            ) : pageRows.map((r) => (
              <tr key={r.id} className="border-b border-border/60">
                {canEdit && (
                  <td className="py-2 pr-2">
                    <Checkbox checked={selected.has(r.id)} aria-label="Sélectionner" onCheckedChange={(c) => {
                      const next = new Set(selected); c ? next.add(r.id) : next.delete(r.id); setSelected(next);
                    }} />
                  </td>
                )}
                <td className="py-2 pr-3">{renderMain(r)}</td>
                <td className="py-2">
                  {canEdit
                    ? <AssigneeSelect value={r.assigned_to} onChange={(v) => run([r.id], v)} members={members} disabled={busy} />
                    : <span className="text-xs">{members.find((m) => m.user_id === r.assigned_to)?.full_name || "Sans responsable"}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <div className="flex items-center justify-end gap-2 text-xs">
          <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(page - 1)}>Précédent</Button>
          <span>Page {page + 1}/{pages}</span>
          <Button size="sm" variant="outline" disabled={page + 1 >= pages} onClick={() => setPage(page + 1)}>Suivant</Button>
        </div>
      )}
    </div>
  );
}

/** "Qui gère quoi" in Suivi équipe: responsible per client and per project, reminder addresses, change history. */
export function AssignmentsBoard() {
  const { hasRole } = useAuth();
  const canEdit = hasRole("admin");
  const qc = useQueryClient();
  const { data, isLoading } = useAssignmentData();
  const { data: team } = useTeamMembers();
  const { data: addresses } = useReminderAddresses();
  const { data: history } = useAssignmentHistory();
  const members = useMemo(() => (team || []).filter((m) => m.roles.length).sort((a, b) => (a.full_name || "").localeCompare(b.full_name || "")), [team]);
  const nameOf = (id: string | null) => (id ? team?.find((m) => m.user_id === id)?.full_name || "Ancien membre" : "Sans responsable");

  const clients = data?.clients || [];
  const projects = data?.projects || [];
  const perMember = useMemo(() => members.map((m) => ({
    ...m,
    clients: clients.filter((c) => c.assigned_to === m.user_id).length,
    projectsActive: projects.filter((p) => p.assigned_to === m.user_id && isActiveProject(p.status)).length,
    projectsTotal: projects.filter((p) => p.assigned_to === m.user_id).length,
  })), [members, clients, projects]);

  const assign = useMutation({
    mutationFn: async ({ table, ids, assignee }: { table: "clients" | "projects"; ids: string[]; assignee: string | null }) => {
      for (let i = 0; i < ids.length; i += 100) {
        const { error } = await supabase.from(table).update({ assigned_to: assignee }).in("id", ids.slice(i, i + 100));
        if (error) throw error;
      }
    },
    onSuccess: (_d, v) => {
      toast.success(`${v.ids.length} ${v.table === "clients" ? "client" : "projet"}${v.ids.length > 1 ? "s" : ""} → ${nameOf(v.assignee)}`);
      qc.invalidateQueries({ queryKey: ["assignments-board"] });
      qc.invalidateQueries({ queryKey: ["assignment-history"] });
      qc.invalidateQueries({ queryKey: ["projects"] });
    },
    onError: (e: any) => toast.error(e.message || "Attribution impossible"),
  });

  const unassignedClients = clients.filter((c) => !c.assigned_to).length;
  const unassignedProjects = projects.filter((p) => !p.assigned_to && isActiveProject(p.status)).length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Qui gère quoi</h2>
        <p className="text-sm text-muted-foreground">
          Le responsable de chaque client et de chaque projet. {unassignedClients} client{unassignedClients > 1 ? "s" : ""} et {unassignedProjects} projet{unassignedProjects > 1 ? "s" : ""} en cours sans responsable.
          {!canEdit && " Seuls les administrateurs peuvent modifier les attributions."}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {isLoading ? [0, 1, 2].map((i) => <Skeleton key={i} className="h-40" />) : perMember.map((m) => (
          <Card key={m.user_id} className="border-0 shadow-md shadow-primary/5">
            <CardContent className="space-y-3 p-4">
              <div>
                <p className="font-semibold">{m.full_name || "Membre"}</p>
                <p className="text-xs text-muted-foreground">{m.roles.map((r) => ROLE_LABELS[r] || r).join(", ")}</p>
              </div>
              <div className="flex gap-4 text-sm">
                <span className="flex items-center gap-1"><Building2 className="h-4 w-4 text-primary" /><strong>{m.clients}</strong> client{m.clients > 1 ? "s" : ""}</span>
                <span className="flex items-center gap-1"><Briefcase className="h-4 w-4 text-primary" /><strong>{m.projectsActive}</strong> projet{m.projectsActive > 1 ? "s" : ""} en cours</span>
              </div>
              <ReminderAddressField key={addresses?.get(m.user_id) ?? "none"} userId={m.user_id} current={addresses?.get(m.user_id)} canEdit={canEdit} />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-0 shadow-md shadow-primary/5">
        <CardContent className="p-4">
          <Tabs defaultValue="clients">
            <TabsList className="mb-4">
              <TabsTrigger value="clients" className="gap-1.5"><Building2 className="h-4 w-4" /> Clients ({clients.length})</TabsTrigger>
              <TabsTrigger value="projects" className="gap-1.5"><Briefcase className="h-4 w-4" /> Projets ({projects.length})</TabsTrigger>
              <TabsTrigger value="history" className="gap-1.5"><History className="h-4 w-4" /> Historique</TabsTrigger>
            </TabsList>
            <TabsContent value="clients">
              {isLoading ? <Skeleton className="h-60" /> : (
                <AssignableList
                  items={clients} members={members} canEdit={canEdit} emptyLabel="Aucun client"
                  onAssign={(ids, assignee) => assign.mutateAsync({ table: "clients", ids, assignee })}
                  searchText={(c) => `${c.company_name} ${c.ndi || ""} ${c.manager_name || ""}`}
                  renderMain={(c) => (
                    <Link to={`/clients/${c.id}`} className="hover:underline">
                      <span className="font-medium">{c.company_name}</span>
                      <span className="block text-xs text-muted-foreground">{[c.ndi, c.pack_type ? PACK_LABELS[c.pack_type as keyof typeof PACK_LABELS] || c.pack_type : null, c.manager_name].filter(Boolean).join(" · ")}</span>
                    </Link>
                  )}
                />
              )}
            </TabsContent>
            <TabsContent value="projects">
              {isLoading ? <Skeleton className="h-60" /> : (
                <AssignableList
                  items={projects} members={members} canEdit={canEdit} emptyLabel="Aucun projet"
                  onAssign={(ids, assignee) => assign.mutateAsync({ table: "projects", ids, assignee })}
                  searchText={(p) => `${p.name} ${p.clients?.company_name || ""}`}
                  renderMain={(p) => (
                    <Link to={`/projets/${p.id}`} className="hover:underline">
                      <span className="font-medium">{p.name}</span>
                      <span className="block text-xs text-muted-foreground">
                        {[p.clients?.company_name, PROJECT_STATUS_LABELS[p.status as keyof typeof PROJECT_STATUS_LABELS] || p.status].filter(Boolean).join(" · ")}
                      </span>
                    </Link>
                  )}
                />
              )}
            </TabsContent>
            <TabsContent value="history">
              {!history?.length ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Aucun changement de responsable enregistré pour l'instant.</p>
              ) : (
                <ul className="divide-y divide-border/60 text-sm">
                  {history.map((h: any) => (
                    <li key={h.id} className="flex flex-wrap items-center gap-x-2 gap-y-1 py-2.5">
                      <Badge variant="outline">{h.entity_type === "client" ? "Client" : "Projet"}</Badge>
                      <Link to={h.entity_type === "client" ? `/clients/${h.entity_id}` : `/projets/${h.entity_id}`} className="font-medium hover:underline">{h.entity_label || "—"}</Link>
                      <span className="text-muted-foreground">{nameOf(h.old_assignee)}</span>
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="font-medium">{nameOf(h.new_assignee)}</span>
                      <span className="ml-auto text-xs text-muted-foreground">
                        par {h.changed_by ? nameOf(h.changed_by) : "le système"} · {formatDistanceToNow(new Date(h.created_at), { addSuffix: true, locale: fr })}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
