CREATE TABLE public.data_access_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  actor_email text,
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id text,
  resource_label text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.data_access_audit TO authenticated;
GRANT ALL ON public.data_access_audit TO service_role;

ALTER TABLE public.data_access_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read audit log"
  ON public.data_access_audit FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can insert their own audit entries"
  ON public.data_access_audit FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE INDEX idx_data_access_audit_created_at ON public.data_access_audit (created_at DESC);
CREATE INDEX idx_data_access_audit_user ON public.data_access_audit (user_id, created_at DESC);
CREATE INDEX idx_data_access_audit_resource ON public.data_access_audit (resource_type, resource_id);

CREATE OR REPLACE FUNCTION public.log_data_access(
  p_action text,
  p_resource_type text,
  p_resource_id text DEFAULT NULL,
  p_resource_label text DEFAULT NULL,
  p_details jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_id uuid;
  v_email text;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NULL;
  END IF;

  IF p_action IS NULL OR length(p_action) > 50 OR p_resource_type IS NULL OR length(p_resource_type) > 50 THEN
    RAISE EXCEPTION 'Paramètres d''audit invalides';
  END IF;

  SELECT full_name INTO v_email FROM public.profiles WHERE user_id = auth.uid();

  INSERT INTO public.data_access_audit (user_id, actor_email, action, resource_type, resource_id, resource_label, details)
  VALUES (auth.uid(), v_email, p_action, p_resource_type, LEFT(COALESCE(p_resource_id, ''), 200), LEFT(COALESCE(p_resource_label, ''), 200), COALESCE(p_details, '{}'::jsonb))
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.log_data_access(text, text, text, text, jsonb) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.log_data_access(text, text, text, text, jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.audit_profile_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.data_access_audit (user_id, action, resource_type, resource_id, resource_label, details)
  VALUES (
    auth.uid(),
    lower(TG_OP),
    'profile',
    COALESCE(NEW.user_id, OLD.user_id)::text,
    COALESCE(NEW.full_name, OLD.full_name),
    jsonb_build_object('table', 'profiles')
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_audit_profiles
AFTER UPDATE OR DELETE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.audit_profile_change();

CREATE OR REPLACE FUNCTION public.audit_client_form_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.data_access_audit (user_id, action, resource_type, resource_id, details)
  VALUES (
    auth.uid(),
    lower(TG_OP),
    'client_form',
    COALESCE(NEW.id, OLD.id)::text,
    jsonb_build_object('table', 'client_forms', 'client_id', COALESCE(NEW.client_id, OLD.client_id))
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_audit_client_forms
AFTER UPDATE OR DELETE ON public.client_forms
FOR EACH ROW EXECUTE FUNCTION public.audit_client_form_change();