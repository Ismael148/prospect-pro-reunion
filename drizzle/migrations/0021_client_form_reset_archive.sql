CREATE TABLE public.client_form_archives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id uuid NOT NULL,
  client_id uuid NOT NULL,
  form_type public.client_form_type NOT NULL,
  form_data jsonb,
  status public.client_form_status,
  submitted_at timestamptz,
  validated_at timestamptz,
  archived_at timestamptz NOT NULL DEFAULT now(),
  archived_by uuid
);

GRANT SELECT ON public.client_form_archives TO authenticated;
GRANT ALL ON public.client_form_archives TO service_role;

ALTER TABLE public.client_form_archives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view form archives"
ON public.client_form_archives FOR SELECT TO authenticated
USING (public.is_staff(auth.uid()));

CREATE INDEX idx_client_form_archives_client ON public.client_form_archives(client_id, form_type);

CREATE OR REPLACE FUNCTION public.reset_client_form(p_form_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_form public.client_forms%ROWTYPE;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;

  SELECT * INTO v_form FROM public.client_forms WHERE id = p_form_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Formulaire introuvable';
  END IF;

  IF v_form.status <> 'en_attente' OR (v_form.form_data IS NOT NULL AND v_form.form_data <> '{}'::jsonb) THEN
    INSERT INTO public.client_form_archives (form_id, client_id, form_type, form_data, status, submitted_at, validated_at, archived_by)
    VALUES (v_form.id, v_form.client_id, v_form.form_type, v_form.form_data, v_form.status, v_form.submitted_at, v_form.validated_at, auth.uid());
  END IF;

  UPDATE public.client_forms
  SET form_data = '{}'::jsonb,
      status = 'en_attente',
      submitted_at = NULL,
      validated_at = NULL,
      validated_by = NULL
  WHERE id = p_form_id;
END;
$$;

REVOKE ALL ON FUNCTION public.reset_client_form(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reset_client_form(uuid) TO authenticated;