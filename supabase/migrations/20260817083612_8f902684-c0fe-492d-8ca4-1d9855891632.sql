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
     AND EXISTS (
       SELECT 1 FROM public.clients c
       WHERE c.support_token = ((storage.foldername(_name))[1])::uuid
     )
$$;