-- 1. client_gmb: restrict broad authenticated SELECT
DROP POLICY IF EXISTS "Authenticated can view gmb" ON public.client_gmb;

CREATE POLICY "Staff and assigned users can view gmb"
ON public.client_gmb
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'agent_master')
  OR public.has_role(auth.uid(), 'webmaster')
  OR public.has_role(auth.uid(), 'designer')
  OR public.has_role(auth.uid(), 'agent_support')
  OR EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = client_gmb.client_id
      AND (c.assigned_to = auth.uid() OR c.created_by = auth.uid())
  )
);

-- 2. social_accounts: hide OAuth tokens from client-side roles (column-level grants)
REVOKE ALL ON public.social_accounts FROM authenticated;
REVOKE ALL ON public.social_accounts FROM anon;

GRANT SELECT (id, client_id, platform, profile_url, username, page_id, created_at, updated_at)
  ON public.social_accounts TO authenticated;
GRANT INSERT (id, client_id, platform, profile_url, username, page_id, created_at, updated_at)
  ON public.social_accounts TO authenticated;
GRANT UPDATE (client_id, platform, profile_url, username, page_id, updated_at)
  ON public.social_accounts TO authenticated;
GRANT DELETE ON public.social_accounts TO authenticated;
GRANT ALL ON public.social_accounts TO service_role;

-- 3. Storage: stricter public upload rule for client-forms
CREATE OR REPLACE FUNCTION public.is_valid_client_form_upload(_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _name IS NOT NULL
     AND length(_name) <= 300
     AND array_length(storage.foldername(_name), 1) = 1
     AND public.is_valid_support_token_text((storage.foldername(_name))[1])
$$;

DROP POLICY IF EXISTS "Public can upload client form files with valid support token pa" ON storage.objects;

CREATE POLICY "Public can upload client form files with valid support token"
ON storage.objects
FOR INSERT
TO anon, authenticated
WITH CHECK (
  bucket_id = 'client-forms'
  AND public.is_valid_client_form_upload(name)
);