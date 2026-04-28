-- Suivi création logo client
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS logo_created boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS logo_created_at timestamptz,
  ADD COLUMN IF NOT EXISTS logo_published_gmb boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS logo_published_gmb_at timestamptz,
  ADD COLUMN IF NOT EXISTS logo_validated_by_client boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS logo_validated_at timestamptz,
  ADD COLUMN IF NOT EXISTS logo_reminder_last_sent timestamptz;

-- Trigger d'horodatage automatique
CREATE OR REPLACE FUNCTION public.touch_logo_timestamps()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.logo_created = true AND (OLD.logo_created IS DISTINCT FROM true) THEN
    NEW.logo_created_at := now();
  END IF;
  IF NEW.logo_published_gmb = true AND (OLD.logo_published_gmb IS DISTINCT FROM true) THEN
    NEW.logo_published_gmb_at := now();
  END IF;
  IF NEW.logo_validated_by_client = true AND (OLD.logo_validated_by_client IS DISTINCT FROM true) THEN
    NEW.logo_validated_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_touch_logo_timestamps ON public.clients;
CREATE TRIGGER trg_touch_logo_timestamps
BEFORE UPDATE ON public.clients
FOR EACH ROW EXECUTE FUNCTION public.touch_logo_timestamps();

-- Notification immédiate quand le logo est créé / publié sur GMB / validé
CREATE OR REPLACE FUNCTION public.notify_logo_status_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_msg text;
  v_title text;
  v_recipient uuid;
  v_notified uuid[] := ARRAY[]::uuid[];
  v_project_id uuid;
  v_assigned_to uuid;
BEGIN
  IF NEW.logo_created IS DISTINCT FROM OLD.logo_created
     OR NEW.logo_published_gmb IS DISTINCT FROM OLD.logo_published_gmb
     OR NEW.logo_validated_by_client IS DISTINCT FROM OLD.logo_validated_by_client THEN

    IF NEW.logo_validated_by_client = true AND OLD.logo_validated_by_client = false THEN
      v_title := '✅ Logo validé par le client';
      v_msg := 'Le logo de "' || NEW.company_name || '" a été validé par le client.';
    ELSIF NEW.logo_published_gmb = true AND OLD.logo_published_gmb = false THEN
      v_title := '🌐 Logo publié sur Google';
      v_msg := 'Logo publié sur la fiche Google de "' || NEW.company_name || '". En attente de validation client.';
    ELSIF NEW.logo_created = true AND OLD.logo_created = false THEN
      v_title := '🎨 Logo créé';
      v_msg := 'Logo créé pour "' || NEW.company_name || '". À publier sur la fiche Google puis faire valider par le client.';
    ELSE
      RETURN NEW;
    END IF;

    SELECT id, assigned_to INTO v_project_id, v_assigned_to
    FROM projects WHERE client_id = NEW.id ORDER BY created_at DESC LIMIT 1;

    -- Webmaster assigné au projet
    IF v_assigned_to IS NOT NULL THEN
      INSERT INTO notifications (user_id, title, message, type, link)
      VALUES (v_assigned_to, v_title, v_msg, 'logo_status', '/clients/' || NEW.id);
      v_notified := array_append(v_notified, v_assigned_to);
    END IF;

    -- Admins
    FOR v_recipient IN SELECT ur.user_id FROM user_roles ur WHERE ur.role = 'admin' LOOP
      IF NOT (v_recipient = ANY(v_notified)) THEN
        INSERT INTO notifications (user_id, title, message, type, link)
        VALUES (v_recipient, v_title, v_msg, 'logo_status', '/clients/' || NEW.id);
        v_notified := array_append(v_notified, v_recipient);
      END IF;
    END LOOP;

    -- Agent master
    FOR v_recipient IN SELECT ur.user_id FROM user_roles ur WHERE ur.role = 'agent_master' LOOP
      IF NOT (v_recipient = ANY(v_notified)) THEN
        INSERT INTO notifications (user_id, title, message, type, link)
        VALUES (v_recipient, v_title, v_msg, 'logo_status', '/clients/' || NEW.id);
        v_notified := array_append(v_notified, v_recipient);
      END IF;
    END LOOP;

    -- Reset reminder timer when something progresses
    NEW.logo_reminder_last_sent := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_logo_status ON public.clients;
CREATE TRIGGER trg_notify_logo_status
BEFORE UPDATE ON public.clients
FOR EACH ROW EXECUTE FUNCTION public.notify_logo_status_change();

-- Sync module projet "logo" -> client.logo_created
CREATE OR REPLACE FUNCTION public.sync_logo_task_to_client()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_client_id uuid;
BEGIN
  IF NEW.title ILIKE '%logo%' AND NEW.status = 'termine' AND (OLD.status IS DISTINCT FROM 'termine') THEN
    SELECT client_id INTO v_client_id FROM projects WHERE id = NEW.project_id;
    IF v_client_id IS NOT NULL THEN
      UPDATE clients SET logo_created = true WHERE id = v_client_id AND logo_created = false;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_logo_task_to_client ON public.project_tasks;
CREATE TRIGGER trg_sync_logo_task_to_client
AFTER UPDATE ON public.project_tasks
FOR EACH ROW EXECUTE FUNCTION public.sync_logo_task_to_client();