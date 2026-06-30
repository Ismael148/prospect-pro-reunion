
-- 1. Email send log: restrict SELECT to admins
DROP POLICY IF EXISTS "Authenticated users can view email logs" ON public.email_send_log;
CREATE POLICY "Admins can view email logs"
ON public.email_send_log
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- 2. Module note export log: restrict SELECT to owner + admin
DROP POLICY IF EXISTS "Authenticated can view export logs" ON public.module_note_export_log;
CREATE POLICY "Owners and admins can view export logs"
ON public.module_note_export_log
FOR SELECT
TO authenticated
USING ((auth.uid() = exported_by) OR has_role(auth.uid(), 'admin'::app_role));

-- 3. FB onboarding: remove open anon INSERT, expose SECURITY DEFINER RPC instead
DROP POLICY IF EXISTS "anyone can submit fb onboarding" ON public.fb_onboarding_submissions;

CREATE OR REPLACE FUNCTION public.submit_fb_onboarding_public(
  p_company_name text,
  p_contact_email text,
  p_business_manager_email text,
  p_has_existing_page boolean,
  p_client_id uuid DEFAULT NULL,
  p_client_ndi text DEFAULT NULL,
  p_fb_page_url text DEFAULT NULL,
  p_fb_page_name text DEFAULT NULL,
  p_business_manager_id text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_source_url text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF p_company_name IS NULL OR length(trim(p_company_name)) = 0 OR length(p_company_name) > 200 THEN
    RAISE EXCEPTION 'Nom de société invalide';
  END IF;
  IF p_contact_email IS NULL OR p_contact_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' OR length(p_contact_email) > 200 THEN
    RAISE EXCEPTION 'Email de contact invalide';
  END IF;
  IF p_business_manager_email IS NULL OR p_business_manager_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' OR length(p_business_manager_email) > 200 THEN
    RAISE EXCEPTION 'Email Business Manager invalide';
  END IF;
  IF p_notes IS NOT NULL AND length(p_notes) > 2000 THEN
    RAISE EXCEPTION 'Notes trop longues';
  END IF;
  IF p_fb_page_url IS NOT NULL AND length(p_fb_page_url) > 500 THEN
    RAISE EXCEPTION 'URL invalide';
  END IF;

  INSERT INTO public.fb_onboarding_submissions (
    client_id, client_ndi, company_name, contact_email,
    fb_page_url, fb_page_name, business_manager_id, business_manager_email,
    has_existing_page, notes, source_url
  ) VALUES (
    p_client_id, p_client_ndi, trim(p_company_name), trim(p_contact_email),
    p_fb_page_url, p_fb_page_name, p_business_manager_id, trim(p_business_manager_email),
    p_has_existing_page, p_notes, p_source_url
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_fb_onboarding_public(
  text, text, text, boolean, uuid, text, text, text, text, text, text
) TO anon, authenticated;

-- 4. GMB onboarding: same treatment
DROP POLICY IF EXISTS "anyone can submit gmb onboarding" ON public.gmb_onboarding_submissions;

CREATE OR REPLACE FUNCTION public.submit_gmb_onboarding_public(
  p_company_name text,
  p_contact_email text,
  p_has_existing_listing boolean,
  p_manager_added boolean,
  p_client_id uuid DEFAULT NULL,
  p_client_ndi text DEFAULT NULL,
  p_gmb_business_name text DEFAULT NULL,
  p_gmb_maps_url text DEFAULT NULL,
  p_gmb_address text DEFAULT NULL,
  p_gmb_phone text DEFAULT NULL,
  p_google_account_email text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_source_url text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF p_company_name IS NULL OR length(trim(p_company_name)) = 0 OR length(p_company_name) > 200 THEN
    RAISE EXCEPTION 'Nom de société invalide';
  END IF;
  IF p_contact_email IS NULL OR p_contact_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' OR length(p_contact_email) > 200 THEN
    RAISE EXCEPTION 'Email de contact invalide';
  END IF;
  IF p_google_account_email IS NOT NULL AND (p_google_account_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' OR length(p_google_account_email) > 200) THEN
    RAISE EXCEPTION 'Email Google invalide';
  END IF;
  IF p_notes IS NOT NULL AND length(p_notes) > 2000 THEN
    RAISE EXCEPTION 'Notes trop longues';
  END IF;
  IF p_gmb_maps_url IS NOT NULL AND length(p_gmb_maps_url) > 500 THEN
    RAISE EXCEPTION 'URL invalide';
  END IF;
  IF p_gmb_address IS NOT NULL AND length(p_gmb_address) > 500 THEN
    RAISE EXCEPTION 'Adresse trop longue';
  END IF;

  INSERT INTO public.gmb_onboarding_submissions (
    client_id, client_ndi, company_name, contact_email,
    has_existing_listing, gmb_business_name, gmb_maps_url, gmb_address, gmb_phone,
    manager_added, google_account_email, notes, source_url
  ) VALUES (
    p_client_id, p_client_ndi, trim(p_company_name), trim(p_contact_email),
    p_has_existing_listing, p_gmb_business_name, p_gmb_maps_url, p_gmb_address, p_gmb_phone,
    p_manager_added, p_google_account_email, p_notes, p_source_url
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_gmb_onboarding_public(
  text, text, boolean, boolean, uuid, text, text, text, text, text, text, text, text
) TO anon, authenticated;
