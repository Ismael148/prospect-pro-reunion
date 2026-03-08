import type { Database } from "@/integrations/supabase/types";

type PipelineStatus = Database["public"]["Enums"]["pipeline_status"];
type PackType = Database["public"]["Enums"]["pack_type"];

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
