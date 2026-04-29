-- Create GMB onboarding submissions table
CREATE TABLE public.gmb_onboarding_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  client_ndi text,
  company_name text NOT NULL,
  contact_email text NOT NULL,
  has_existing_listing boolean DEFAULT true,
  gmb_business_name text,
  gmb_maps_url text,
  gmb_address text,
  gmb_phone text,
  manager_added boolean DEFAULT false,
  google_account_email text,
  notes text,
  status text NOT NULL DEFAULT 'recu',
  source_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  processed_by uuid
);

ALTER TABLE public.gmb_onboarding_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can submit gmb onboarding"
  ON public.gmb_onboarding_submissions
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "team can read gmb onboarding"
  ON public.gmb_onboarding_submissions
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'agent_master'::app_role)
    OR has_role(auth.uid(), 'agent_telephonique'::app_role)
    OR has_role(auth.uid(), 'agent_support'::app_role)
    OR has_role(auth.uid(), 'webmaster'::app_role)
  );

CREATE POLICY "admins can update gmb onboarding"
  ON public.gmb_onboarding_submissions
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'agent_master'::app_role));

CREATE POLICY "admins can delete gmb onboarding"
  ON public.gmb_onboarding_submissions
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_gmb_onboarding_updated_at
  BEFORE UPDATE ON public.gmb_onboarding_submissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Notification trigger
CREATE OR REPLACE FUNCTION public.notify_gmb_onboarding_submission()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  admin_record record;
  v_msg text;
BEGIN
  v_msg := '📍 ' || NEW.company_name || ' a envoyé ses infos Google My Business'
    || COALESCE(' — Fiche : ' || NEW.gmb_business_name, '')
    || COALESCE(' — Email Google : ' || NEW.google_account_email, '');

  FOR admin_record IN SELECT user_id FROM public.user_roles WHERE role = 'admin'
  LOOP
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (
      admin_record.user_id,
      '📍 Nouveau tuto GMB reçu',
      v_msg,
      'gmb_onboarding',
      '/onboarding-clients'
    );
  END LOOP;
  RETURN NEW;
END;
$$;

CREATE TRIGGER notify_gmb_onboarding_submission_trigger
  AFTER INSERT ON public.gmb_onboarding_submissions
  FOR EACH ROW EXECUTE FUNCTION public.notify_gmb_onboarding_submission();

-- Add to realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.gmb_onboarding_submissions;