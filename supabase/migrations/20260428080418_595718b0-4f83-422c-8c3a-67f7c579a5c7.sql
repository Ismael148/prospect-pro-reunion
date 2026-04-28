-- 1. Add file/link columns and validation token
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS logo_file_url text,
  ADD COLUMN IF NOT EXISTS logo_drive_url text,
  ADD COLUMN IF NOT EXISTS logo_validation_token uuid DEFAULT gen_random_uuid();

-- 2. Logo reminder log table
CREATE TABLE IF NOT EXISTS public.logo_reminder_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  triggered_by uuid,
  trigger_type text NOT NULL DEFAULT 'auto',
  step text NOT NULL,
  message text,
  recipients jsonb NOT NULL DEFAULT '[]'::jsonb,
  recipients_count integer NOT NULL DEFAULT 0
);

ALTER TABLE public.logo_reminder_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view logo reminder log"
  ON public.logo_reminder_log FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can insert logo reminder log"
  ON public.logo_reminder_log FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Admins can manage logo reminder log"
  ON public.logo_reminder_log FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_logo_reminder_log_client ON public.logo_reminder_log(client_id, sent_at DESC);

-- 3. Anon can update logo validation by token (public validation page)
CREATE POLICY "Anon can validate logo by token"
  ON public.clients FOR UPDATE TO anon
  USING (logo_validation_token IS NOT NULL)
  WITH CHECK (logo_validation_token IS NOT NULL);

-- 4. Improved touch_logo_timestamps: reset *_at to NULL when going false
CREATE OR REPLACE FUNCTION public.touch_logo_timestamps()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  -- Set timestamp only when transitioning to true
  IF NEW.logo_created = true AND (OLD.logo_created IS DISTINCT FROM true) THEN
    NEW.logo_created_at := now();
  ELSIF NEW.logo_created = false AND OLD.logo_created = true THEN
    NEW.logo_created_at := NULL;
  END IF;

  IF NEW.logo_published_gmb = true AND (OLD.logo_published_gmb IS DISTINCT FROM true) THEN
    NEW.logo_published_gmb_at := now();
  ELSIF NEW.logo_published_gmb = false AND OLD.logo_published_gmb = true THEN
    NEW.logo_published_gmb_at := NULL;
  END IF;

  IF NEW.logo_validated_by_client = true AND (OLD.logo_validated_by_client IS DISTINCT FROM true) THEN
    NEW.logo_validated_at := now();
  ELSIF NEW.logo_validated_by_client = false AND OLD.logo_validated_by_client = true THEN
    NEW.logo_validated_at := NULL;
  END IF;

  RETURN NEW;
END;
$$;

-- 5. Cascade descending on uncheck + reset linked project task
CREATE OR REPLACE FUNCTION public.cascade_logo_uncheck()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  -- If "logo_created" is unchecked, force published & validated to false
  IF OLD.logo_created = true AND NEW.logo_created = false THEN
    NEW.logo_published_gmb := false;
    NEW.logo_validated_by_client := false;

    -- Reset related project task(s) on the client's projects
    UPDATE public.project_tasks pt
    SET status = 'a_faire', updated_at = now()
    WHERE pt.title ILIKE '%logo%'
      AND pt.status = 'termine'
      AND pt.project_id IN (SELECT id FROM public.projects WHERE client_id = NEW.id);
  END IF;

  -- If "published" unchecked, force validated to false
  IF OLD.logo_published_gmb = true AND NEW.logo_published_gmb = false THEN
    NEW.logo_validated_by_client := false;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_touch_logo_timestamps ON public.clients;
CREATE TRIGGER trg_touch_logo_timestamps
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.touch_logo_timestamps();

DROP TRIGGER IF EXISTS trg_cascade_logo_uncheck ON public.clients;
CREATE TRIGGER trg_cascade_logo_uncheck
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.cascade_logo_uncheck();

-- 6. Storage bucket for logo files
INSERT INTO storage.buckets (id, name, public)
VALUES ('client-logos', 'client-logos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read client-logos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'client-logos');

CREATE POLICY "Authenticated upload client-logos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'client-logos');

CREATE POLICY "Authenticated update client-logos"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'client-logos');

CREATE POLICY "Authenticated delete client-logos"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'client-logos');