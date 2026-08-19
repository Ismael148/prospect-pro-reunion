CREATE TABLE IF NOT EXISTS public.whatsapp_onboarding_submissions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete set null,
  company_name text not null,
  contact_email text not null,
  whatsapp_number text,
  phone_number_id text,
  access_token text,
  notes text,
  status text not null default 'nouveau',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_onboarding_submissions TO authenticated;
GRANT ALL ON public.whatsapp_onboarding_submissions TO service_role;

ALTER TABLE public.whatsapp_onboarding_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view whatsapp submissions"
ON public.whatsapp_onboarding_submissions FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'webmaster')
  OR public.has_role(auth.uid(),'agent_master') OR public.has_role(auth.uid(),'agent_support')
);

CREATE POLICY "Staff can update whatsapp submissions"
ON public.whatsapp_onboarding_submissions FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'webmaster') OR public.has_role(auth.uid(),'agent_master'))
WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'webmaster') OR public.has_role(auth.uid(),'agent_master'));

CREATE POLICY "Admins can delete whatsapp submissions"
ON public.whatsapp_onboarding_submissions FOR DELETE TO authenticated
USING (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.submit_whatsapp_onboarding_public(
  p_company_name text,
  p_contact_email text,
  p_whatsapp_number text default null,
  p_phone_number_id text default null,
  p_access_token text default null,
  p_notes text default null,
  p_client_id uuid default null
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_client uuid := p_client_id;
BEGIN
  IF coalesce(trim(p_company_name),'') = '' OR coalesce(trim(p_contact_email),'') = '' THEN
    RAISE EXCEPTION 'Nom de société et email obligatoires';
  END IF;

  IF v_client IS NULL THEN
    SELECT id INTO v_client FROM public.clients
    WHERE lower(email) = lower(trim(p_contact_email))
    LIMIT 1;
  END IF;

  INSERT INTO public.whatsapp_onboarding_submissions
    (client_id, company_name, contact_email, whatsapp_number, phone_number_id, access_token, notes)
  VALUES (v_client, trim(p_company_name), trim(p_contact_email), nullif(trim(p_whatsapp_number),''),
          nullif(trim(p_phone_number_id),''), nullif(trim(p_access_token),''), nullif(trim(p_notes),''))
  RETURNING id INTO v_id;

  INSERT INTO public.notifications (user_id, title, message, type, link)
  SELECT ur.user_id, 'Nouvelle demande WhatsApp Business',
         trim(p_company_name) || ' a transmis ses informations WhatsApp Business',
         'info', '/clients'
  FROM public.user_roles ur WHERE ur.role = 'admin';

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_whatsapp_onboarding_public(text,text,text,text,text,text,uuid) TO anon, authenticated;