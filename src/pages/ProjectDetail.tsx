import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  useProject, useProjectTasks, useDeliverables,
  useUpdateProject, useCreateTask, useUpdateTask,
  useCreateDeliverable, useUpdateDeliverable, useDeleteProjectTasks,
} from "@/hooks/use-projects";
import {
  PROJECT_STATUS_LABELS, PACK_LABELS,
  PACK_MODULES, PACK_DEADLINE_DAYS, getPackModules,
} from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Building2, Calendar, Sparkles, Clock, AlertTriangle, RefreshCw, Globe, ShoppingCart, MapPin } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";
import ProjectModules from "@/components/projects/ProjectModules";
import ProjectDeliverables from "@/components/projects/ProjectDeliverables";
import SocialDeliverables from "@/components/projects/SocialDeliverables";
import ProjectEmailHistory from "@/components/projects/ProjectEmailHistory";

type ProjectStatus = Database["public"]["Enums"]["project_status"];
type TaskStatus = Database["public"]["Enums"]["task_status"];
type DeliverableStatus = Database["public"]["Enums"]["deliverable_status"];

function daysUntil(dateStr: string | null) {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, hasRole } = useAuth();
  const { data: project, isLoading, error: projectError } = useProject(id!);
  const { data: tasks = [] } = useProjectTasks(id!);
  const { data: deliverables } = useDeliverables(id!);
  const { data: teamMembers } = useQuery({
    queryKey: ["team-members"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("user_id, full_name");
      return data || [];
    },
  });
  
  // Fetch client data for has_gmb
  const clientId = project?.client_id;
  const { data: clientData } = useQuery({
    queryKey: ["client-config", clientId],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("has_gmb, site_type").eq("id", clientId!).single();
      if (error) throw error;
      return data as any;
    },
    enabled: !!clientId,
  });

  // Detect pending "appel livraison de site"
  const { data: clientActivities } = useQuery({
    queryKey: ["client-activities-livraison", clientId],
    queryFn: async () => {
      const { data } = await supabase
        .from("client_activities")
        .select("activity_type, description, created_at")
        .eq("client_id", clientId!)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!clientId,
  });
  const livraisonActivity = clientActivities?.find((a) => a.activity_type === "livraison_site");
  const livraisonResolved = livraisonActivity && clientActivities?.some(
    (a) => a.activity_type === "note"
      && new Date(a.created_at) > new Date(livraisonActivity.created_at)
      && /#(resolu|résolu|livraison_ok)/i.test(a.description || "")
  );
  const hasPendingDeliveryCall = !!livraisonActivity && !livraisonResolved;

  const updateProject = useUpdateProject();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const createDeliverable = useCreateDeliverable();
  const updateDeliverable = useUpdateDeliverable();
  const deleteProjectTasks = useDeleteProjectTasks();
  const [isRegenerating, setIsRegenerating] = useState(false);
  const isAdmin = hasRole("admin");

  const siteType = (project as any)?.site_type || "vitrine";
  const hasGmb = clientData?.has_gmb || false;

  const handleStatusChange = async (status: ProjectStatus) => {
    if (!project) return;
    try {
      await updateProject.mutateAsync({ id: project.id, status });
      toast.success("Statut mis à jour");
    } catch { toast.error("Erreur"); }
  };

  const handleSiteTypeChange = async (type: string) => {
    if (!project) return;
    try {
      await supabase.from("projects").update({ site_type: type } as any).eq("id", project.id);
      toast.success(`Type de site : ${type === "ecommerce" ? "E-commerce" : "Vitrine"}`);
      // Refetch project
      window.location.reload();
    } catch { toast.error("Erreur"); }
  };

  const handleGmbToggle = async (value: string) => {
    if (!clientId) return;
    try {
      await supabase.from("clients").update({ has_gmb: value === "oui" } as any).eq("id", clientId);
      toast.success(value === "oui" ? "Le client a déjà une fiche Google" : "Le client n'a pas de fiche Google");
      window.location.reload();
    } catch { toast.error("Erreur"); }
  };

  const queryClient = useQueryClient();

  const handleTaskStatusChange = async (taskId: string, status: TaskStatus) => {
    try {
      await updateTask.mutateAsync({ id: taskId, status });
      queryClient.invalidateQueries({ queryKey: ["projects", id] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Tâche mise à jour");

      // Check if module is now fully completed → notify admins
      if (status === "termine" && tasks) {
        const task = tasks.find(t => t.id === taskId);
        const moduleId = task?.description?.match(/\[(.*?)\]/)?.[1];
        if (moduleId) {
          const moduleTasks = tasks.filter(t => t.description?.match(/\[(.*?)\]/)?.[1] === moduleId);
          const allOthersDone = moduleTasks.every(t => t.id === taskId || t.status === "termine");
          if (allOthersDone && moduleTasks.length > 0) {
            const modules = PACK_MODULES[project?.pack_type || ""] || [];
            const mod = modules.find(m => m.id === moduleId);
            const moduleName = mod?.name || moduleId;

            const { data: admins } = await supabase.from("user_roles").select("user_id").eq("role", "admin");
            for (const admin of admins || []) {
              if (admin.user_id !== user?.id) {
                await supabase.from("notifications").insert({
                  user_id: admin.user_id,
                  title: `✅ Module terminé : ${moduleName}`,
                  message: `Toutes les tâches du module "${moduleName}" du projet "${project?.name}" sont terminées. À vérifier.`,
                  type: "module_complete",
                  link: `/projets/${id}`,
                });
              }
            }
          }
        }
      }
    } catch { toast.error("Erreur lors de la mise à jour de la tâche"); }
  };

  const handleModuleLinkUpdate = async (moduleId: string, linkUrl: string) => {
    if (!project) return;
    const currentLinks = (project as any).module_links || {};
    const updatedLinks = { ...currentLinks, [moduleId]: linkUrl };
    await supabase.from("projects").update({ module_links: updatedLinks } as any).eq("id", project.id);
    window.location.reload();
  };

  const handleAutoGenerateModules = async () => {
    if (!project) return;
    const modules = getPackModules(project.pack_type, siteType, hasGmb);
    if (!modules.length) { toast.error("Pas de modules pour ce pack"); return; }
    try {
      let sortIndex = 0;
      for (const mod of modules) {
        for (const task of mod.tasks) {
          const dueDate = project.start_date
            ? new Date(new Date(project.start_date).getTime() + mod.deadlineDays * 86400000).toISOString().split("T")[0]
            : null;
          await createTask.mutateAsync({
            project_id: id!,
            title: task.title,
            description: `[${mod.id}] ${task.description || ""}`.trim(),
            priority: task.priority,
            due_date: dueDate,
            sort_order: sortIndex++,
          });
        }
      }
      const totalTasks = modules.reduce((sum, m) => sum + m.tasks.length, 0);
      toast.success(`${totalTasks} tâches créées dans ${modules.length} modules`);
    } catch { toast.error("Erreur lors de la génération"); }
  };

  const handleRegenerateModules = async () => {
    if (!project || !id) return;
    const modules = getPackModules(project.pack_type, siteType, hasGmb);
    if (!modules.length) { toast.error("Pas de modules pour ce pack"); return; }
    setIsRegenerating(true);
    try {
      await deleteProjectTasks.mutateAsync(id);
      let sortIndex = 0;
      for (const mod of modules) {
        for (const task of mod.tasks) {
          const dueDate = project.start_date
            ? new Date(new Date(project.start_date).getTime() + mod.deadlineDays * 86400000).toISOString().split("T")[0]
            : null;
          await createTask.mutateAsync({
            project_id: id,
            title: task.title,
            description: `[${mod.id}] ${task.description || ""}`.trim(),
            priority: task.priority,
            due_date: dueDate,
            sort_order: sortIndex++,
          });
        }
      }
      await updateProject.mutateAsync({ id, progress: 0 });
      const totalTasks = modules.reduce((sum, m) => sum + m.tasks.length, 0);
      toast.success(`${totalTasks} tâches regénérées dans ${modules.length} modules`);
    } catch { toast.error("Erreur lors de la regénération"); }
    setIsRegenerating(false);
  };

  const handleAddTask = async (task: Parameters<typeof createTask.mutateAsync>[0]) => {
    try {
      await createTask.mutateAsync(task);
      toast.success("Tâche ajoutée");
    } catch { toast.error("Erreur lors de l'ajout"); }
  };

  const handleAssignModule = async (moduleId: string, userId: string | null) => {
    if (!tasks) return;
    try {
      const moduleTasks = tasks.filter(t => t.description?.match(/\[(.*?)\]/)?.[1] === moduleId);
      for (const task of moduleTasks) {
        await updateTask.mutateAsync({ id: task.id, assigned_to: userId });
      }
      toast.success(userId ? "Module assigné" : "Assignation retirée");
    } catch { toast.error("Erreur"); }
  };

  const handleDeliverableStatusChange = async (deliverableId: string, status: DeliverableStatus) => {
    try {
      const updates: any = { id: deliverableId, status };
      if (status === "soumis") updates.submitted_at = new Date().toISOString();
      if (status === "approuve") updates.approved_at = new Date().toISOString();
      await updateDeliverable.mutateAsync(updates);
      toast.success("Livrable mis à jour");
    } catch { toast.error("Erreur"); }
  };

  const handleAddDeliverable = async (d: Parameters<typeof createDeliverable.mutateAsync>[0]) => {
    try {
      await createDeliverable.mutateAsync(d);
      toast.success("Livrable ajouté");
    } catch { toast.error("Erreur"); }
  };

  const handleAutoCreateDeliverables = async () => {
    if (!project) return;
    const modules = getPackModules(project.pack_type, siteType, hasGmb);
    const names = modules.map((m) => m.name);
    // Toujours inclure le livrable Vidéo Influenceur Réseaux Sociaux
    if (!names.includes("Vidéo Influenceur Réseaux Sociaux")) {
      names.push("Vidéo Influenceur Réseaux Sociaux");
    }
    if (!names.length) { toast.error("Pas de livrables prédéfinis"); return; }
    try {
      for (const name of names) {
        await createDeliverable.mutateAsync({
          project_id: id!,
          name,
          description: name === "Vidéo Influenceur Réseaux Sociaux"
            ? "Vidéo influenceur prête à poster sur Facebook, Instagram & TikTok"
            : null,
        });
      }
      toast.success(`${names.length} livrables créés`);
    } catch { toast.error("Erreur"); }
  };

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (projectError) return <div className="text-center py-12"><p className="text-destructive">Erreur lors du chargement du projet</p><Button variant="outline" className="mt-4" onClick={() => navigate("/projets")}>Retour</Button></div>;
  if (!project) return <p className="text-muted-foreground">Projet introuvable</p>;

  const hasTasks = tasks && tasks.length > 0;
  const hasModules = (PACK_MODULES[project.pack_type] || []).length > 0;
  const daysLeft = daysUntil(project.due_date);
  const isOverdue = daysLeft !== null && daysLeft < 0;
  const isUrgent = daysLeft !== null && daysLeft >= 0 && daysLeft <= 3;
  const isNumerik = project.pack_type === "star_bizness_numerik";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/projets")}><ArrowLeft className="w-5 h-5" /></Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
            <Building2 className="w-3.5 h-3.5" />
            {(project as any).clients?.company_name}
            <span>•</span>
            <Badge variant="secondary" className="text-xs">{PACK_LABELS[project.pack_type]}</Badge>
            {isNumerik && (
              <Badge variant="outline" className="text-xs gap-1">
                {siteType === "ecommerce" ? <><ShoppingCart className="w-3 h-3" /> E-commerce</> : <><Globe className="w-3 h-3" /> Vitrine</>}
              </Badge>
            )}
            {isNumerik && (
              <Badge variant="outline" className={`text-xs gap-1 ${hasGmb ? "bg-success/10 text-success border-success/20" : "bg-warning/10 text-warning border-warning/20"}`}>
                <MapPin className="w-3 h-3" />
                {hasGmb ? "Fiche Google existante" : "Pas de fiche Google"}
              </Badge>
            )}
          </div>
          {hasPendingDeliveryCall && (
            <div className="mt-2">
              <Badge className="bg-primary/10 text-primary border-primary/30 border gap-1.5 animate-pulse">
                📞 Appel livraison de site à faire
              </Badge>
            </div>
          )}
        </div>
        {isAdmin && (
          <Select
            value={project.assigned_to || "none"}
            onValueChange={async (v) => {
              try {
                await updateProject.mutateAsync({ id: project.id, assigned_to: v === "none" ? null : v });
                toast.success(v === "none" ? "Assignation retirée" : "Projet assigné");
              } catch { toast.error("Erreur"); }
            }}
          >
            <SelectTrigger className="w-56"><SelectValue placeholder="Assigner à..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">— Non assigné —</SelectItem>
              {(teamMembers || []).map((m: any) => (
                <SelectItem key={m.user_id} value={m.user_id}>
                  {m.full_name || "Sans nom"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Select value={project.status} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(PROJECT_STATUS_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Config cards for site type & GMB - only for numerik and admin, before tasks are generated */}
      {isAdmin && isNumerik && !hasTasks && (
        <Card className="border-0 shadow-md shadow-primary/5">
          <CardContent className="pt-6 space-y-4">
            <p className="text-sm font-semibold text-foreground">⚙️ Configuration du projet avant génération des tâches</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  {siteType === "ecommerce" ? <ShoppingCart className="w-4 h-4 text-primary" /> : <Globe className="w-4 h-4 text-primary" />}
                  Type de site
                </label>
                <Select value={siteType} onValueChange={handleSiteTypeChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vitrine">🌐 Site vitrine (One Page)</SelectItem>
                    <SelectItem value="ecommerce">🛒 Site e-commerce (WooCommerce)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {siteType === "ecommerce" ? "43 tâches site + catalogue produits, paiement, livraison" : "33 tâches site vitrine classique"}
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" />
                  Fiche Google My Business
                </label>
                <Select value={hasGmb ? "oui" : "non"} onValueChange={handleGmbToggle}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="non">❌ Le client n'a PAS de fiche Google</SelectItem>
                    <SelectItem value="oui">✅ Le client a DÉJÀ une fiche Google</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {hasGmb 
                    ? "Tâches d'optimisation + rapport PDF avant/après pour le client" 
                    : "Tâches de création complète de la fiche Google"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-0 shadow-md shadow-primary/5">
          <CardContent className="pt-6 space-y-2 text-sm">
            {project.start_date && (
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span>Signature : {new Date(project.start_date).toLocaleDateString("fr-FR", { timeZone: "Indian/Reunion" })}</span>
              </div>
            )}
            {project.due_date && (
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span>Deadline : {new Date(project.due_date).toLocaleDateString("fr-FR", { timeZone: "Indian/Reunion" })}</span>
              </div>
            )}
            {daysLeft !== null && (
              <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${
                isOverdue 
                  ? "bg-destructive/10 text-destructive" 
                  : isUrgent 
                    ? "bg-warning/10 text-warning"
                    : "bg-success/10 text-success"
              }`}>
                {isOverdue ? (
                  <><AlertTriangle className="w-4 h-4" /> En retard de {Math.abs(daysLeft)} jour{Math.abs(daysLeft) > 1 ? "s" : ""}</>
                ) : daysLeft === 0 ? (
                  <><Clock className="w-4 h-4" /> Deadline aujourd'hui</>
                ) : (
                  <><Clock className="w-4 h-4" /> {daysLeft} jour{daysLeft > 1 ? "s" : ""} restant{daysLeft > 1 ? "s" : ""}</>
                )}
              </div>
            )}
            {project.description && <p className="text-muted-foreground">{project.description}</p>}
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md shadow-primary/5">
          <CardContent className="pt-6 grid grid-cols-2 gap-3 text-center">
            <div>
              <p className="text-2xl font-bold">{tasks?.length || 0}</p>
              <p className="text-xs text-muted-foreground">Tâches</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{tasks?.filter((t) => t.status === "termine").length || 0}</p>
              <p className="text-xs text-muted-foreground">Terminées</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{deliverables?.length || 0}</p>
              <p className="text-xs text-muted-foreground">Livrables</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{deliverables?.filter((d) => d.status === "approuve").length || 0}</p>
              <p className="text-xs text-muted-foreground">Approuvés</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md shadow-primary/5">
          <CardContent className="pt-6 flex flex-col items-center justify-center gap-3">
            {!hasTasks && hasModules ? (
              <Button onClick={handleAutoGenerateModules} disabled={createTask.isPending} className="w-full">
                {createTask.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                Générer les modules du pack
              </Button>
            ) : (
              <>
                <div className="text-center">
                  <p className="text-4xl font-bold text-primary">{project.progress || 0}%</p>
                  <p className="text-sm text-muted-foreground mt-1">Progression</p>
                </div>
                {hasModules && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRegenerateModules}
                    disabled={isRegenerating}
                    className="w-full gap-2 text-xs"
                  >
                    {isRegenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                    Regénérer les modules
                  </Button>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modules with checkable tasks */}
      {hasTasks && (
        <ProjectModules
          packType={project.pack_type}
          tasks={tasks}
          projectId={id!}
          startDate={project.start_date}
          isAdmin={isAdmin}
          teamMembers={teamMembers || []}
          onTaskStatusChange={handleTaskStatusChange}
          onAddTask={handleAddTask}
          onAssignModule={handleAssignModule}
          moduleLinks={(project as any).module_links || {}}
          onModuleLinkUpdate={handleModuleLinkUpdate}
        />
      )}

      {/* GMB Report button */}
      {isNumerik && hasTasks && (
        <Card className="border-0 shadow-md shadow-primary/5">
          <CardContent className="pt-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">📊 Rapport Google My Business</p>
              <p className="text-xs text-muted-foreground">Générer un PDF de preuve de travail à envoyer au client</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={async () => {
                const seoTasks = tasks!.filter(t => t.description?.includes("[seo]"));
                const doneTasks = seoTasks.filter(t => t.status === "termine");
                const mLinks = (project as any).module_links || {};
                try {
                  const { generateGmbReport } = await import("@/lib/export-gmb-report");
                  generateGmbReport({
                    clientName: (project as any).clients?.company_name || "Client",
                    projectName: project.name,
                    tasksDone: doneTasks.map(t => ({
                      title: t.title,
                      linkUrl: mLinks["seo"] || undefined,
                    })),
                    tasksTotal: seoTasks.length,
                    generatedAt: new Date().toLocaleDateString("fr-FR", { timeZone: "Indian/Reunion", day: "2-digit", month: "long", year: "numeric" }),
                  });
                  toast.success("Rapport PDF généré !");
                } catch (e) {
                  console.error("Erreur génération PDF:", e);
                  toast.error("Erreur lors de la génération du rapport");
                }
              }}
            >
              📄 Générer le rapport PDF
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Social Deliverables - monthly RS */}
      {isNumerik && hasTasks && (
        <SocialDeliverables projectId={id!} clientId={project.client_id} />
      )}

      {/* Deliverables */}
      <ProjectDeliverables
        projectId={id!}
        packType={project.pack_type}
        deliverables={deliverables}
        clientEmail={(project as any).clients?.email}
        clientName={(project as any).clients?.company_name}
        clientWebsite={(project as any).clients?.website}
        onAdd={handleAddDeliverable}
        onStatusChange={handleDeliverableStatusChange}
        onAutoCreate={handleAutoCreateDeliverables}
        isCreating={createDeliverable.isPending}
      />

      {/* Email delivery history for this project */}
      <ProjectEmailHistory projectId={id!} />
    </div>
  );
}
