
-- 1. Add nfc_quantity to clients
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS nfc_quantity integer NOT NULL DEFAULT 1;

-- 2. Fix storage policies for anon uploads to client-forms bucket
DROP POLICY IF EXISTS "Allow anon uploads to client-forms" ON storage.objects;
CREATE POLICY "Allow anon uploads to client-forms"
ON storage.objects FOR INSERT TO anon
WITH CHECK (bucket_id = 'client-forms');

DROP POLICY IF EXISTS "Allow public read from client-forms" ON storage.objects;
CREATE POLICY "Allow public read from client-forms"
ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'client-forms');

DROP POLICY IF EXISTS "Allow authenticated uploads to client-forms" ON storage.objects;
CREATE POLICY "Allow authenticated uploads to client-forms"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'client-forms');

-- 3. Update commission trigger: add separate 20€ for NFC agents
CREATE OR REPLACE FUNCTION public.generate_commissions_on_signature()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_month text;
  agent_id uuid;
  commercial_id uuid;
  client_pack text;
  monthly_count integer;
  commercial_base numeric;
  commercial_bonus numeric;
BEGIN
  IF NEW.pipeline_status = 'contrat_signe' AND (OLD.pipeline_status IS DISTINCT FROM 'contrat_signe') THEN
    current_month := to_char(now(), 'YYYY-MM');
    agent_id := NEW.assigned_to;
    commercial_id := NEW.signed_by;
    client_pack := COALESCE(NEW.pack_type::text, 'autre');

    -- Agent commission: 50€ flat per signed contract
    IF agent_id IS NOT NULL THEN
      IF NOT EXISTS (SELECT 1 FROM commissions WHERE client_id = NEW.id AND user_id = agent_id AND role = 'agent_telephonique' AND pack_type = client_pack) THEN
        INSERT INTO commissions (user_id, client_id, month_year, role, pack_type, base_amount, bonus_amount, total_amount)
        VALUES (agent_id, NEW.id, current_month, 'agent_telephonique', client_pack, 50, 0, 50);
      END IF;

      -- NFC bonus: additional 20€ for NFC packs
      IF client_pack = 'star_bizness_nfc' THEN
        IF NOT EXISTS (SELECT 1 FROM commissions WHERE client_id = NEW.id AND user_id = agent_id AND role = 'agent_telephonique' AND pack_type = 'nfc_bonus') THEN
          INSERT INTO commissions (user_id, client_id, month_year, role, pack_type, base_amount, bonus_amount, total_amount)
          VALUES (agent_id, NEW.id, current_month, 'agent_telephonique', 'nfc_bonus', 20, 0, 20);
        END IF;
      END IF;
    END IF;

    -- Commercial commission (unchanged)
    IF commercial_id IS NOT NULL THEN
      IF NOT EXISTS (SELECT 1 FROM commissions WHERE client_id = NEW.id AND user_id = commercial_id) THEN
        IF client_pack = 'star_bizness_nfc' THEN
          INSERT INTO commissions (user_id, client_id, month_year, role, pack_type, base_amount, bonus_amount, total_amount)
          VALUES (commercial_id, NEW.id, current_month, 'commercial_terrain', client_pack, 79.90, 0, 79.90);
        ELSE
          SELECT COUNT(*) + 1 INTO monthly_count
          FROM commissions
          WHERE user_id = commercial_id
            AND month_year = current_month
            AND role = 'commercial_terrain'
            AND pack_type != 'star_bizness_nfc';

          CASE monthly_count
            WHEN 1 THEN commercial_base := 250;
            WHEN 2 THEN commercial_base := 300;
            WHEN 3 THEN commercial_base := 350;
            ELSE commercial_base := 400;
          END CASE;

          IF monthly_count > 4 THEN
            commercial_bonus := 100;
          ELSE
            commercial_bonus := 0;
          END IF;

          INSERT INTO commissions (user_id, client_id, month_year, role, pack_type, base_amount, bonus_amount, total_amount)
          VALUES (commercial_id, NEW.id, current_month, 'commercial_terrain', client_pack, commercial_base, commercial_bonus, commercial_base + commercial_bonus);

          IF monthly_count >= 2 THEN
            UPDATE commissions
            SET base_amount = CASE
              WHEN monthly_count >= 4 THEN 400
              WHEN monthly_count = 3 THEN 350
              WHEN monthly_count = 2 THEN 300
              ELSE base_amount
            END,
            bonus_amount = CASE WHEN monthly_count > 4 THEN 100 ELSE 0 END,
            total_amount = CASE
              WHEN monthly_count >= 4 THEN 400
              WHEN monthly_count = 3 THEN 350
              WHEN monthly_count = 2 THEN 300
              ELSE base_amount
            END + CASE WHEN monthly_count > 4 THEN 100 ELSE 0 END
            WHERE user_id = commercial_id
              AND month_year = current_month
              AND role = 'commercial_terrain'
              AND pack_type != 'star_bizness_nfc';
          END IF;
        END IF;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- 4. Auto-create project on contrat_signé
CREATE OR REPLACE FUNCTION public.auto_create_project_on_signature()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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

      INSERT INTO projects (name, client_id, pack_type, created_by, status, start_date, due_date)
      VALUES (
        project_name,
        NEW.id,
        NEW.pack_type,
        COALESCE(NEW.signed_by, NEW.created_by),
        'en_attente',
        now()::date,
        (now() + (deadline_days || ' days')::interval)::date
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_client_signed_create_project ON public.clients;
CREATE TRIGGER on_client_signed_create_project
  AFTER UPDATE ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_project_on_signature();

-- 5. Notify admins on form submission
CREATE OR REPLACE FUNCTION public.notify_form_submission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  client_name text;
  admin_record record;
  form_label text;
BEGIN
  IF NEW.status = 'soumis' AND (OLD IS NULL OR OLD.status IS DISTINCT FROM 'soumis') THEN
    SELECT company_name INTO client_name FROM clients WHERE id = NEW.client_id;
    form_label := CASE WHEN NEW.form_type::text = 'nfc' THEN 'Carte NFC' ELSE 'Site Internet' END;
    
    FOR admin_record IN SELECT user_id FROM user_roles WHERE role = 'admin'
    LOOP
      INSERT INTO notifications (user_id, title, message, type, link)
      VALUES (
        admin_record.user_id,
        'Formulaire ' || form_label || ' soumis',
        'Le client "' || COALESCE(client_name, 'Inconnu') || '" a rempli le formulaire ' || form_label || '.',
        'form_submission',
        '/clients'
      );
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_form_submitted_notify ON public.client_forms;
CREATE TRIGGER on_form_submitted_notify
  AFTER INSERT OR UPDATE ON public.client_forms
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_form_submission();
