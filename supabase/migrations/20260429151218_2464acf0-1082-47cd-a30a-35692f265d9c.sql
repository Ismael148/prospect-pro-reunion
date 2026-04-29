-- Enum pour le statut de la fiche GMB
CREATE TYPE public.gmb_status AS ENUM (
  'a_creer',
  'compte_cree',
  'verification_postale_demandee',
  'code_recu',
  'active',
  'suspendue',
  'non_applicable'
);

CREATE TYPE public.gmb_access_level AS ENUM (
  'aucun',
  'gestionnaire',
  'proprietaire',
  'proprietaire_principal'
);

-- Table principale
CREATE TABLE public.client_gmb (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL UNIQUE,
  status public.gmb_status NOT NULL DEFAULT 'a_creer',
  access_level public.gmb_access_level NOT NULL DEFAULT 'aucun',
  
  -- Identifiants Google
  gmb_url text,
  gmb_location_id text,
  business_name_on_google text,
  google_account_email text,
  
  -- Checklist de création
  checklist_account_created boolean NOT NULL DEFAULT false,
  checklist_postal_requested boolean NOT NULL DEFAULT false,
  checklist_code_received boolean NOT NULL DEFAULT false,
  checklist_verified boolean NOT NULL DEFAULT false,
  checklist_logo_added boolean NOT NULL DEFAULT false,
  checklist_photos_added boolean NOT NULL DEFAULT false,
  checklist_hours_set boolean NOT NULL DEFAULT false,
  checklist_description_added boolean NOT NULL DEFAULT false,
  
  -- Dates de suivi
  postal_requested_at timestamptz,
  code_received_at timestamptz,
  verified_at timestamptz,
  last_post_at timestamptz,
  last_review_replied_at timestamptz,
  
  -- Stats GMB (mise à jour manuelle ou via API plus tard)
  total_reviews integer DEFAULT 0,
  average_rating numeric(2,1),
  unanswered_reviews integer DEFAULT 0,
  
  notes text,
  
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_client_gmb_client_id ON public.client_gmb(client_id);
CREATE INDEX idx_client_gmb_status ON public.client_gmb(status);

-- Trigger pour updated_at
CREATE TRIGGER trg_client_gmb_updated_at
BEFORE UPDATE ON public.client_gmb
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger pour auto-set des timestamps de checklist
CREATE OR REPLACE FUNCTION public.touch_client_gmb_timestamps()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.checklist_postal_requested = true AND (OLD.checklist_postal_requested IS DISTINCT FROM true) AND NEW.postal_requested_at IS NULL THEN
    NEW.postal_requested_at := now();
  END IF;
  IF NEW.checklist_code_received = true AND (OLD.checklist_code_received IS DISTINCT FROM true) AND NEW.code_received_at IS NULL THEN
    NEW.code_received_at := now();
  END IF;
  IF NEW.checklist_verified = true AND (OLD.checklist_verified IS DISTINCT FROM true) AND NEW.verified_at IS NULL THEN
    NEW.verified_at := now();
    -- Auto-passage en "active" si toutes les étapes sont OK
    IF NEW.status IN ('a_creer','compte_cree','verification_postale_demandee','code_recu') THEN
      NEW.status := 'active';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_client_gmb_touch_timestamps
BEFORE UPDATE ON public.client_gmb
FOR EACH ROW
EXECUTE FUNCTION public.touch_client_gmb_timestamps();

-- RLS
ALTER TABLE public.client_gmb ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage gmb"
ON public.client_gmb
FOR ALL
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Agent masters and webmasters manage gmb"
ON public.client_gmb
FOR ALL
USING (
  public.has_role(auth.uid(), 'agent_master'::app_role)
  OR public.has_role(auth.uid(), 'webmaster'::app_role)
)
WITH CHECK (
  public.has_role(auth.uid(), 'agent_master'::app_role)
  OR public.has_role(auth.uid(), 'webmaster'::app_role)
);

CREATE POLICY "Authenticated can view gmb"
ON public.client_gmb
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Activer realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.client_gmb;
ALTER TABLE public.client_gmb REPLICA IDENTITY FULL;