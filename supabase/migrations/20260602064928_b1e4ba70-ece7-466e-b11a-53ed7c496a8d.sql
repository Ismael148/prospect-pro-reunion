-- Restrict public token-based data access to validated security-definer functions

-- Helper used by public functions and storage policies. Accepts text safely so invalid UUIDs do not raise errors.
CREATE OR REPLACE FUNCTION public.is_valid_support_token_text(_token text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token uuid;
BEGIN
  BEGIN
    v_token := _token::uuid;
  EXCEPTION WHEN invalid_text_representation THEN
    RETURN false;
  END;

  RETURN EXISTS (
    SELECT 1
    FROM public.clients c
    WHERE c.support_token = v_token
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_public_client_by_support_token(p_token uuid)
RETURNS TABLE (
  id uuid,
  company_name text,
  nfc_quantity integer,
  pack_type text,
  site_ical_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id, c.company_name, c.nfc_quantity, c.pack_type::text, c.site_ical_url
  FROM public.clients c
  WHERE c.support_token = p_token
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_client_form_public(
  p_token uuid,
  p_form_type public.client_form_type
)
RETURNS TABLE (
  client_id uuid,
  company_name text,
  nfc_quantity integer,
  form_id uuid,
  form_data jsonb,
  status public.client_form_status
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id, c.company_name, c.nfc_quantity, cf.id, cf.form_data, cf.status
  FROM public.clients c
  LEFT JOIN public.client_forms cf
    ON cf.client_id = c.id
   AND cf.form_type = p_form_type
  WHERE c.support_token = p_token
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.submit_client_form_public(
  p_token uuid,
  p_form_type public.client_form_type,
  p_form_data jsonb
)
RETURNS SETOF public.client_forms
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_id uuid;
  v_form public.client_forms%ROWTYPE;
BEGIN
  SELECT c.id INTO v_client_id
  FROM public.clients c
  WHERE c.support_token = p_token
  LIMIT 1;

  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Lien invalide';
  END IF;

  IF p_form_data IS NULL OR pg_column_size(p_form_data) > 262144 THEN
    RAISE EXCEPTION 'Données de formulaire invalides';
  END IF;

  UPDATE public.client_forms
  SET form_data = p_form_data,
      status = 'soumis',
      submitted_at = now(),
      updated_at = now()
  WHERE client_id = v_client_id
    AND form_type = p_form_type
  RETURNING * INTO v_form;

  IF NOT FOUND THEN
    INSERT INTO public.client_forms (client_id, form_type, form_data, status, submitted_at)
    VALUES (v_client_id, p_form_type, p_form_data, 'soumis', now())
    RETURNING * INTO v_form;
  END IF;

  RETURN NEXT v_form;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_support_ticket_public(
  p_token uuid,
  p_category text,
  p_subject text,
  p_message text,
  p_priority text DEFAULT 'normale',
  p_attachments text[] DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  ticket_number text,
  client_id uuid,
  category public.support_category,
  subject text,
  message text,
  priority text,
  attachments text[],
  status public.ticket_status,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_id uuid;
  v_priority text;
  v_category public.support_category;
BEGIN
  SELECT c.id INTO v_client_id
  FROM public.clients c
  WHERE c.support_token = p_token
  LIMIT 1;

  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Lien invalide';
  END IF;

  IF trim(coalesce(p_subject, '')) = '' OR length(trim(p_subject)) > 200 THEN
    RAISE EXCEPTION 'Objet invalide';
  END IF;

  IF trim(coalesce(p_message, '')) = '' OR length(trim(p_message)) > 2000 THEN
    RAISE EXCEPTION 'Message invalide';
  END IF;

  IF p_attachments IS NOT NULL AND array_length(p_attachments, 1) > 10 THEN
    RAISE EXCEPTION 'Trop de pièces jointes';
  END IF;

  v_priority := CASE WHEN p_priority = 'urgente' THEN 'urgente' ELSE 'normale' END;
  v_category := p_category::public.support_category;

  RETURN QUERY
  INSERT INTO public.support_tickets (client_id, category, subject, message, priority, attachments)
  VALUES (v_client_id, v_category, trim(p_subject), trim(p_message), v_priority, p_attachments)
  RETURNING support_tickets.id,
            support_tickets.ticket_number,
            support_tickets.client_id,
            support_tickets.category,
            support_tickets.subject,
            support_tickets.message,
            support_tickets.priority,
            support_tickets.attachments,
            support_tickets.status,
            support_tickets.created_at;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_payment_invitation_public(p_token text)
RETURNS TABLE (
  id uuid,
  client_id uuid,
  client_ndi text,
  company_name text,
  contact_email text,
  contact_name text,
  providers public.payment_provider[],
  expires_at timestamptz,
  completed_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pi.id,
         pi.client_id,
         pi.client_ndi,
         pi.company_name,
         pi.contact_email,
         pi.contact_name,
         pi.providers,
         pi.expires_at,
         pi.completed_at
  FROM public.payment_invitations pi
  WHERE pi.token = p_token
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.complete_payment_invitation_public(p_token text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated integer;
BEGIN
  UPDATE public.payment_invitations
  SET completed_at = now()
  WHERE token = p_token
    AND completed_at IS NULL;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0;
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_valid_support_token_text(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_public_client_by_support_token(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_client_form_public(uuid, public.client_form_type) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.submit_client_form_public(uuid, public.client_form_type, jsonb) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_support_ticket_public(uuid, text, text, text, text, text[]) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_payment_invitation_public(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.complete_payment_invitation_public(text) TO anon, authenticated, service_role;

-- Remove broad anonymous data exposure policies.
DROP POLICY IF EXISTS "Anon can read client by support token" ON public.clients;

DROP POLICY IF EXISTS "Anon can insert client forms" ON public.client_forms;
DROP POLICY IF EXISTS "Anon can read client forms" ON public.client_forms;
DROP POLICY IF EXISTS "Anon can update client forms" ON public.client_forms;
DROP POLICY IF EXISTS "Authenticated can insert client forms" ON public.client_forms;
DROP POLICY IF EXISTS "Authenticated can update client forms" ON public.client_forms;

DROP POLICY IF EXISTS "Anon can read support tickets by client" ON public.support_tickets;
DROP POLICY IF EXISTS "Validated insert on support tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Anyone can create support tickets" ON public.support_tickets;

DROP POLICY IF EXISTS "Anonymous can read invitations by token" ON public.payment_invitations;

-- Allow authenticated team members to update client forms directly where the app needs internal validation.
CREATE POLICY "Team can update client forms"
ON public.client_forms
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'agent_master'::public.app_role)
  OR public.has_role(auth.uid(), 'agent_support'::public.app_role)
  OR public.has_role(auth.uid(), 'webmaster'::public.app_role)
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'agent_master'::public.app_role)
  OR public.has_role(auth.uid(), 'agent_support'::public.app_role)
  OR public.has_role(auth.uid(), 'webmaster'::public.app_role)
);

-- Restrict public uploads in client-forms to paths starting with a valid support token.
DROP POLICY IF EXISTS "Allow anon uploads to client-forms" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads to client-forms" ON storage.objects;
DROP POLICY IF EXISTS "Anon can upload client form files" ON storage.objects;

CREATE POLICY "Public can upload client form files with valid support token path"
ON storage.objects
FOR INSERT
TO anon, authenticated
WITH CHECK (
  bucket_id = 'client-forms'
  AND public.is_valid_support_token_text((storage.foldername(name))[1])
);

CREATE POLICY "Admins can upload client form files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'client-forms'
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);