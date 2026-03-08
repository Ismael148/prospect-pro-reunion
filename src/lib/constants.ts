import type { Database } from "@/integrations/supabase/types";

type PipelineStatus = Database["public"]["Enums"]["pipeline_status"];
type PackType = Database["public"]["Enums"]["pack_type"];
type ProjectStatus = Database["public"]["Enums"]["project_status"];
type TaskStatus = Database["public"]["Enums"]["task_status"];
type TaskPriority = Database["public"]["Enums"]["task_priority"];
type DeliverableStatus = Database["public"]["Enums"]["deliverable_status"];

export const PIPELINE_LABELS: Record<PipelineStatus, string> = {
  nouveau: "Nouveau",
  contacte: "Contacté",
  rdv_planifie: "RDV planifié",
  proposition_envoyee: "Proposition envoyée",
  negociation: "Négociation",
  contrat_signe: "Contrat signé",
  perdu: "Perdu",
};

export const PIPELINE_COLORS: Record<PipelineStatus, string> = {
  nouveau: "bg-info/10 text-info border-info/20",
  contacte: "bg-primary/10 text-primary border-primary/20",
  rdv_planifie: "bg-warning/10 text-warning border-warning/20",
  proposition_envoyee: "bg-accent/10 text-accent-foreground border-accent/20",
  negociation: "bg-warning/10 text-warning border-warning/20",
  contrat_signe: "bg-success/10 text-success border-success/20",
  perdu: "bg-destructive/10 text-destructive border-destructive/20",
};

export const PIPELINE_ORDER: PipelineStatus[] = [
  "nouveau",
  "contacte",
  "rdv_planifie",
  "proposition_envoyee",
  "negociation",
  "contrat_signe",
  "perdu",
];

export const PACK_LABELS: Record<PackType, string> = {
  star_bizness_numerik: "STAR BIZNESS NUMERIK",
  star_bizness_nfc: "STAR BIZNESS NFC",
  autre: "Autre",
};

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  en_attente: "En attente",
  en_cours: "En cours",
  en_revision: "En révision",
  termine: "Terminé",
  annule: "Annulé",
};

export const PROJECT_STATUS_COLORS: Record<ProjectStatus, string> = {
  en_attente: "bg-muted text-muted-foreground border-border",
  en_cours: "bg-primary/10 text-primary border-primary/20",
  en_revision: "bg-warning/10 text-warning border-warning/20",
  termine: "bg-success/10 text-success border-success/20",
  annule: "bg-destructive/10 text-destructive border-destructive/20",
};

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  a_faire: "À faire",
  en_cours: "En cours",
  en_revision: "En révision",
  termine: "Terminé",
};

export const TASK_STATUS_COLORS: Record<TaskStatus, string> = {
  a_faire: "bg-muted text-muted-foreground border-border",
  en_cours: "bg-primary/10 text-primary border-primary/20",
  en_revision: "bg-warning/10 text-warning border-warning/20",
  termine: "bg-success/10 text-success border-success/20",
};

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  basse: "Basse",
  moyenne: "Moyenne",
  haute: "Haute",
  urgente: "Urgente",
};

export const TASK_PRIORITY_COLORS: Record<TaskPriority, string> = {
  basse: "text-muted-foreground",
  moyenne: "text-info",
  haute: "text-warning",
  urgente: "text-destructive",
};

export const DELIVERABLE_STATUS_LABELS: Record<DeliverableStatus, string> = {
  en_attente: "En attente",
  en_cours: "En cours",
  soumis: "Soumis",
  approuve: "Approuvé",
  rejete: "Rejeté",
};

export const DELIVERABLE_STATUS_COLORS: Record<DeliverableStatus, string> = {
  en_attente: "bg-muted text-muted-foreground border-border",
  en_cours: "bg-primary/10 text-primary border-primary/20",
  soumis: "bg-warning/10 text-warning border-warning/20",
  approuve: "bg-success/10 text-success border-success/20",
  rejete: "bg-destructive/10 text-destructive border-destructive/20",
};

// Default deliverables per pack type
export const PACK_DELIVERABLES: Record<string, string[]> = {
  star_bizness_numerik: [
    "Création page Google My Business",
    "Site vitrine responsive",
    "Référencement local SEO",
    "Fiche établissement optimisée",
    "Photos professionnelles",
    "Formation gestion GMB",
  ],
  star_bizness_nfc: [
    "Carte NFC personnalisée",
    "Page de profil digital",
    "QR Code personnalisé",
    "Intégration réseaux sociaux",
    "Formation utilisation NFC",
  ],
  autre: [],
};
