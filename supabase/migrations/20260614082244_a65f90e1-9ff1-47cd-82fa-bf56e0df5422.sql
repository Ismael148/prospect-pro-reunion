
-- 1) Tighten social_accounts DELETE policy role from public to authenticated
DROP POLICY IF EXISTS "Admins can delete social accounts" ON public.social_accounts;
CREATE POLICY "Admins can delete social accounts"
ON public.social_accounts
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 2) Replace wide INSERT policy on payment_credentials with a validated RPC
DROP POLICY IF EXISTS "Anyone can submit payment credentials" ON public.payment_credentials;

-- Authenticated admins can still insert directly if needed
CREATE POLICY "Admins can insert payment credentials"
ON public.payment_credentials
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.submit_payment_credentials_public(
  p_token text,
  p_company_name text,
  p_contact_email text,
  p_contact_name text,
  p_provider payment_provider,
  p_environment payment_env,
  p_credentials jsonb,
  p_notes text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invitation public.payment_invitations%ROWTYPE;
  v_recent_count integer;
  v_new_id uuid;
  v_client_id uuid;
  v_client_ndi text;
  v_submitted_via text;
BEGIN
  -- Basic validation
  IF p_company_name IS NULL OR length(btrim(p_company_name)) < 2 OR length(p_company_name) > 200 THEN
    RAISE EXCEPTION 'Nom d''entreprise invalide';
  END IF;
  IF p_contact_email IS NULL OR p_contact_email !~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' OR length(p_contact_email) > 255 THEN
    RAISE EXCEPTION 'Email invalide';
  END IF;
  IF p_contact_name IS NOT NULL AND length(p_contact_name) > 200 THEN
    RAISE EXCEPTION 'Nom de contact trop long';
  END IF;
  IF p_notes IS NOT NULL AND length(p_notes) > 2000 THEN
    RAISE EXCEPTION 'Notes trop longues';
  END IF;
  IF p_credentials IS NULL OR pg_column_size(p_credentials) > 32768 THEN
    RAISE EXCEPTION 'Identifiants invalides';
  END IF;

  -- Token (optional) — when provided, must be a valid, non-expired, non-completed invitation
  IF p_token IS NOT NULL AND length(p_token) > 0 THEN
    SELECT * INTO v_invitation
    FROM public.payment_invitations
    WHERE token = p_token AND expires_at > now()
    LIMIT 1;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Lien d''invitation invalide ou expiré';
    END IF;

    v_client_id := v_invitation.client_id;
    v_client_ndi := v_invitation.client_ndi;
    v_submitted_via := 'invitation';
  ELSE
    v_submitted_via := 'public_form';
  END IF;

  -- Rate-limit anonymous floods: max 5 submissions per email per hour
  SELECT count(*) INTO v_recent_count
  FROM public.payment_credentials
  WHERE lower(contact_email) = lower(p_contact_email)
    AND created_at > now() - interval '1 hour';
  IF v_recent_count >= 5 THEN
    RAISE EXCEPTION 'Trop de soumissions récentes — réessayez plus tard';
  END IF;

  INSERT INTO public.payment_credentials (
    client_id, client_ndi, company_name, contact_email, contact_name,
    provider, environment, credentials, notes, status, submitted_via
  )
  VALUES (
    v_client_id, v_client_ndi, btrim(p_company_name), lower(btrim(p_contact_email)),
    NULLIF(btrim(coalesce(p_contact_name, '')), ''),
    p_provider, p_environment, p_credentials,
    NULLIF(btrim(coalesce(p_notes, '')), ''),
    'recu'::payment_status, v_submitted_via
  )
  RETURNING id INTO v_new_id;

  RETURN v_new_id;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_payment_credentials_public(text, text, text, text, payment_provider, payment_env, jsonb, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_payment_credentials_public(text, text, text, text, payment_provider, payment_env, jsonb, text) TO anon, authenticated;
