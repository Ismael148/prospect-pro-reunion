CREATE TABLE public.fb_onboarding_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  client_ndi text,
  company_name text NOT NULL,
  contact_email text NOT NULL,
  fb_page_url text,
  fb_page_name text,
  business_manager_id text,
  business_manager_email text NOT NULL,
  has_existing_page boolean DEFAULT true,
  notes text,
  status text NOT NULL DEFAULT 'recu',
  source_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  processed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.fb_onboarding_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can submit fb onboarding"
ON public.fb_onboarding_submissions FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "team can read fb onboarding"
ON public.fb_onboarding_submissions FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(),'admin') OR
  public.has_role(auth.uid(),'agent_master') OR
  public.has_role(auth.uid(),'agent_telephonique') OR
  public.has_role(auth.uid(),'agent_support')
);

CREATE POLICY "admins can update fb onboarding"
ON public.fb_onboarding_submissions FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(),'admin') OR
  public.has_role(auth.uid(),'agent_master')
);

CREATE POLICY "admins can delete fb onboarding"
ON public.fb_onboarding_submissions FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER update_fb_onboarding_updated_at
BEFORE UPDATE ON public.fb_onboarding_submissions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.notify_fb_onboarding_submission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  admin_record record;
  v_msg text;
BEGIN
  v_msg := '🟦 ' || NEW.company_name || ' a envoyé ses accès Facebook'
    || COALESCE(' — BM ID: ' || NEW.business_manager_id, '')
    || ' — Email: ' || NEW.business_manager_email;

  FOR admin_record IN SELECT user_id FROM public.user_roles WHERE role = 'admin'
  LOOP
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (
      admin_record.user_id,
      '🟦 Nouveau tuto Facebook reçu',
      v_msg,
      'fb_onboarding',
      '/onboarding-fb'
    );
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER notify_fb_onboarding_submission_trigger
AFTER INSERT ON public.fb_onboarding_submissions
FOR EACH ROW EXECUTE FUNCTION public.notify_fb_onboarding_submission();

ALTER PUBLICATION supabase_realtime ADD TABLE public.fb_onboarding_submissions;
ALTER TABLE public.fb_onboarding_submissions REPLICA IDENTITY FULL;