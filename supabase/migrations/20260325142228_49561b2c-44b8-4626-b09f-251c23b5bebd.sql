ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS site_type text DEFAULT 'vitrine';

CREATE OR REPLACE FUNCTION public.auto_create_project_on_signature()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  project_name text;
  deadline_days integer;
BEGIN
  IF NEW.pipeline_status = 'contrat_signe' AND (OLD.pipeline_status IS DISTINCT FROM 'contrat_signe') THEN
    IF NEW.pack_type IS NOT NULL AND NOT EXISTS (SELECT 1 FROM projects WHERE client_id = NEW.id) THEN
      project_name := NEW.company_name || ' - ' || CASE
        WHEN NEW.pack_type::text = 'star_bizness_numerik' THEN 'STAR BIZNESS NUMERIK'
        WHEN NEW.pack_type::text = 'star_bizness_nfc' THEN 'STAR BIZNESS NFC'
        ELSE 'Projet'
      END;
      
      deadline_days := CASE
        WHEN NEW.pack_type::text = 'star_bizness_numerik' THEN 15
        WHEN NEW.pack_type::text = 'star_bizness_nfc' THEN 7
        ELSE 30
      END;

      INSERT INTO projects (name, client_id, pack_type, created_by, status, start_date, due_date, site_type)
      VALUES (
        project_name,
        NEW.id,
        NEW.pack_type,
        COALESCE(NEW.signed_by, NEW.created_by),
        'en_attente',
        now()::date,
        (now() + (deadline_days || ' days')::interval)::date,
        COALESCE(NEW.site_type, 'vitrine')
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;