
-- 1) Critical: anon UPDATE on clients allowed any column. Replace with a narrow SECURITY DEFINER RPC.
DROP POLICY IF EXISTS "Anon can validate logo by token" ON public.clients;

CREATE OR REPLACE FUNCTION public.validate_logo_with_token(p_client_id uuid, p_token text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ok boolean;
BEGIN
  IF p_client_id IS NULL OR p_token IS NULL OR length(p_token) < 10 THEN
    RETURN false;
  END IF;
  UPDATE public.clients
  SET logo_validated_by_client = true
  WHERE id = p_client_id
    AND logo_validation_token IS NOT NULL
    AND logo_validation_token = p_token;
  GET DIAGNOSTICS v_ok = ROW_COUNT;
  RETURN v_ok;
END;
$$;

REVOKE ALL ON FUNCTION public.validate_logo_with_token(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_logo_with_token(uuid, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_client_logo_for_validation(p_client_id uuid, p_token text)
RETURNS TABLE (
  id uuid,
  company_name text,
  logo_file_url text,
  logo_drive_url text,
  logo_validated_by_client boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_client_id IS NULL OR p_token IS NULL OR length(p_token) < 10 THEN
    RETURN;
  END IF;
  RETURN QUERY
  SELECT c.id, c.company_name, c.logo_file_url, c.logo_drive_url, c.logo_validated_by_client
  FROM public.clients c
  WHERE c.id = p_client_id
    AND c.logo_validation_token IS NOT NULL
    AND c.logo_validation_token = p_token;
END;
$$;

REVOKE ALL ON FUNCTION public.get_client_logo_for_validation(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_client_logo_for_validation(uuid, text) TO anon, authenticated;

-- 2) expenses: restrict SELECT to admins only
DROP POLICY IF EXISTS "Authenticated users can view expenses" ON public.expenses;
CREATE POLICY "Admins can view expenses"
ON public.expenses FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 3) salary_advances: ensure no broader SELECT than admin (admin ALL already exists; add an explicit deny-by-default by ensuring no other policy is permissive)
-- Nothing else to drop here since only admin ALL policy exists.

-- 4) social_accounts: restrict SELECT to admins and users assigned to the client
DROP POLICY IF EXISTS "Authenticated users can view social accounts" ON public.social_accounts;
CREATE POLICY "Admins or assigned users can view social accounts"
ON public.social_accounts FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = social_accounts.client_id
      AND (c.assigned_to = auth.uid() OR c.created_by = auth.uid())
  )
);

-- 5) deleted_clients_log: lock down INSERT — the archive trigger is SECURITY DEFINER so it bypasses RLS anyway
DROP POLICY IF EXISTS "System can insert deleted clients log" ON public.deleted_clients_log;
CREATE POLICY "Admins can insert deleted clients log"
ON public.deleted_clients_log FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- 6) client-logos storage: restrict UPDATE/DELETE to admin/agent_master
DROP POLICY IF EXISTS "Authenticated update client-logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated delete client-logos" ON storage.objects;

CREATE POLICY "Admins can update client-logos"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'client-logos'
  AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'agent_master'::app_role))
);

CREATE POLICY "Admins can delete client-logos"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'client-logos'
  AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'agent_master'::app_role))
);
