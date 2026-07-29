-- 1. Storage: remove anonymous/global read policy on client-forms
DROP POLICY IF EXISTS "Public read client-forms" ON storage.objects;

CREATE POLICY "Staff can read client form files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'client-forms');

-- 2. Profiles: hide phone from all authenticated users via column grants
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

CREATE POLICY "Authenticated can view profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

REVOKE SELECT ON public.profiles FROM authenticated;
GRANT SELECT (id, user_id, full_name, avatar_url, created_at, updated_at)
  ON public.profiles TO authenticated;
GRANT INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

-- 3. Admin-only access to contact details
CREATE OR REPLACE FUNCTION public.get_team_contacts()
RETURNS TABLE(user_id uuid, phone text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.user_id, p.phone
  FROM public.profiles p
  WHERE public.has_role(auth.uid(), 'admin')
     OR p.user_id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.get_team_contacts() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_team_contacts() TO authenticated;