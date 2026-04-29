
-- Table des invitations envoyées (= envoi du lien tuto)
CREATE TABLE IF NOT EXISTS public.onboarding_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('facebook', 'gmb')),
  client_id uuid NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  client_ndi text NULL,
  contact_email text NOT NULL,
  company_name text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  sent_by uuid NULL,
  reminder_count integer NOT NULL DEFAULT 0,
  last_reminder_at timestamptz NULL,
  completed_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_onb_inv_active 
  ON public.onboarding_invitations (kind, completed_at, last_reminder_at) 
  WHERE completed_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_onb_inv_email ON public.onboarding_invitations (contact_email);
CREATE INDEX IF NOT EXISTS idx_onb_inv_ndi ON public.onboarding_invitations (client_ndi);

ALTER TABLE public.onboarding_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins/agents can view invitations"
ON public.onboarding_invitations FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'agent_master')
  OR public.has_role(auth.uid(), 'agent_telephonique')
  OR public.has_role(auth.uid(), 'webmaster')
);

CREATE POLICY "Admins/agents can insert invitations"
ON public.onboarding_invitations FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'agent_master')
  OR public.has_role(auth.uid(), 'agent_telephonique')
  OR public.has_role(auth.uid(), 'webmaster')
);

CREATE POLICY "Admins can update invitations"
ON public.onboarding_invitations FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Trigger : dès qu'une soumission FB arrive, marquer l'invitation correspondante comme complétée
CREATE OR REPLACE FUNCTION public.complete_invitation_on_submission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_kind text;
BEGIN
  v_kind := CASE TG_TABLE_NAME
    WHEN 'fb_onboarding_submissions' THEN 'facebook'
    WHEN 'gmb_onboarding_submissions' THEN 'gmb'
    ELSE NULL
  END;
  IF v_kind IS NULL THEN
    RETURN NEW;
  END IF;

  UPDATE public.onboarding_invitations
  SET completed_at = COALESCE(completed_at, now())
  WHERE kind = v_kind
    AND completed_at IS NULL
    AND (
      (NEW.client_ndi IS NOT NULL AND client_ndi = NEW.client_ndi)
      OR (NEW.contact_email IS NOT NULL AND lower(contact_email) = lower(NEW.contact_email))
    );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_complete_inv_fb ON public.fb_onboarding_submissions;
CREATE TRIGGER trg_complete_inv_fb
AFTER INSERT ON public.fb_onboarding_submissions
FOR EACH ROW EXECUTE FUNCTION public.complete_invitation_on_submission();

DROP TRIGGER IF EXISTS trg_complete_inv_gmb ON public.gmb_onboarding_submissions;
CREATE TRIGGER trg_complete_inv_gmb
AFTER INSERT ON public.gmb_onboarding_submissions
FOR EACH ROW EXECUTE FUNCTION public.complete_invitation_on_submission();
