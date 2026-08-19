REVOKE SELECT ON public.profiles FROM authenticated;
GRANT SELECT (id, user_id, full_name, avatar_url, created_at, updated_at) ON public.profiles TO authenticated;
GRANT UPDATE (full_name, phone, avatar_url, updated_at) ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;