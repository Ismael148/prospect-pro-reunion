-- 1. chatbot_configs: restrict SELECT to admin/webmaster/agent_master
DROP POLICY IF EXISTS "Authenticated view chatbot configs" ON public.chatbot_configs;
DROP POLICY IF EXISTS "Authenticated can view chatbot configs" ON public.chatbot_configs;
CREATE POLICY "Staff manage chatbot configs read"
  ON public.chatbot_configs FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'webmaster'::app_role)
    OR public.has_role(auth.uid(), 'agent_master'::app_role)
  );

-- 2. profiles: hide phone column from broad reads (column-level privileges)
REVOKE SELECT ON public.profiles FROM authenticated;
REVOKE SELECT ON public.profiles FROM anon;
GRANT SELECT (id, user_id, full_name, avatar_url, created_at, updated_at)
  ON public.profiles TO authenticated;
GRANT UPDATE (full_name, avatar_url, phone, updated_at) ON public.profiles TO authenticated;
GRANT INSERT ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

-- Owner/admin access to phone through a controlled function
CREATE OR REPLACE FUNCTION public.get_profile_phone(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.phone
  FROM public.profiles p
  WHERE p.user_id = _user_id
    AND (auth.uid() = _user_id OR public.has_role(auth.uid(), 'admin'::app_role))
$$;

REVOKE ALL ON FUNCTION public.get_profile_phone(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.get_profile_phone(uuid) TO authenticated;