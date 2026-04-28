-- Ajout d'un interrupteur pour activer/désactiver le suivi logo par client
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS logo_tracking_enabled boolean NOT NULL DEFAULT false;

-- Quand on désactive le suivi logo, on reset toutes les étapes
CREATE OR REPLACE FUNCTION public.reset_logo_on_disable()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.logo_tracking_enabled = true AND NEW.logo_tracking_enabled = false THEN
    NEW.logo_created := false;
    NEW.logo_published_gmb := false;
    NEW.logo_validated_by_client := false;
    NEW.logo_created_at := NULL;
    NEW.logo_published_gmb_at := NULL;
    NEW.logo_validated_at := NULL;
    NEW.logo_reminder_last_sent := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reset_logo_on_disable ON public.clients;
CREATE TRIGGER trg_reset_logo_on_disable
BEFORE UPDATE ON public.clients
FOR EACH ROW
EXECUTE FUNCTION public.reset_logo_on_disable();