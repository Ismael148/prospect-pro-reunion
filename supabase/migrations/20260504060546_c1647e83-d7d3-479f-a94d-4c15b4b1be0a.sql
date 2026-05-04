
-- Client reminders system for support/agent_master
CREATE TABLE public.client_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  created_by uuid NOT NULL,
  assigned_to uuid,
  title text NOT NULL,
  description text,
  tags text[] NOT NULL DEFAULT '{}',
  remind_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- pending | done | snoozed
  notified boolean NOT NULL DEFAULT false,
  notified_at timestamptz,
  completed_at timestamptz,
  completed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_client_reminders_client ON public.client_reminders(client_id);
CREATE INDEX idx_client_reminders_due ON public.client_reminders(remind_at) WHERE status = 'pending' AND notified = false;

ALTER TABLE public.client_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view reminders" ON public.client_reminders
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Support/master/admin can create reminders" ON public.client_reminders
  FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = created_by AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'agent_master'::app_role)
      OR has_role(auth.uid(), 'agent_support'::app_role)
    )
  );

CREATE POLICY "Author/assignee/admin can update reminders" ON public.client_reminders
  FOR UPDATE TO authenticated USING (
    auth.uid() = created_by OR auth.uid() = assigned_to
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'agent_master'::app_role)
  );

CREATE POLICY "Author/admin can delete reminders" ON public.client_reminders
  FOR DELETE TO authenticated USING (
    auth.uid() = created_by
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'agent_master'::app_role)
  );

CREATE TRIGGER update_client_reminders_updated_at
  BEFORE UPDATE ON public.client_reminders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Notify on creation (assignee + creator + admins/master)
CREATE OR REPLACE FUNCTION public.notify_client_reminder_created()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_client_name text;
  v_msg text;
  v_when text;
  v_recipient uuid;
  v_notified uuid[] := ARRAY[]::uuid[];
  rec record;
BEGIN
  SELECT company_name INTO v_client_name FROM clients WHERE id = NEW.client_id;
  v_when := to_char(NEW.remind_at AT TIME ZONE 'Indian/Reunion', 'DD/MM/YYYY HH24:MI');
  v_msg := '⏰ Rappel "' || NEW.title || '" sur ' || COALESCE(v_client_name, 'Client') || ' — prévu ' || v_when;

  IF NEW.assigned_to IS NOT NULL THEN
    INSERT INTO notifications (user_id, title, message, type, link)
    VALUES (NEW.assigned_to, '📌 Rappel client créé', v_msg, 'client_reminder', '/clients/' || NEW.client_id);
    v_notified := array_append(v_notified, NEW.assigned_to);
  END IF;

  IF NOT (NEW.created_by = ANY(v_notified)) AND NEW.assigned_to IS DISTINCT FROM NEW.created_by THEN
    INSERT INTO notifications (user_id, title, message, type, link)
    VALUES (NEW.created_by, '📌 Rappel client créé', v_msg, 'client_reminder', '/clients/' || NEW.client_id);
    v_notified := array_append(v_notified, NEW.created_by);
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_client_reminder_created
  AFTER INSERT ON public.client_reminders
  FOR EACH ROW EXECUTE FUNCTION public.notify_client_reminder_created();

-- Function to fire due reminders (called by pg_cron)
CREATE OR REPLACE FUNCTION public.fire_due_client_reminders()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  r record;
  v_client_name text;
  v_msg text;
  v_recipient uuid;
  v_notified uuid[];
BEGIN
  FOR r IN
    SELECT * FROM client_reminders
    WHERE status = 'pending' AND notified = false AND remind_at <= now()
  LOOP
    SELECT company_name INTO v_client_name FROM clients WHERE id = r.client_id;
    v_msg := '🔔 Rappel : "' || r.title || '" pour ' || COALESCE(v_client_name, 'Client')
      || COALESCE(' — ' || r.description, '');
    v_notified := ARRAY[]::uuid[];

    IF r.assigned_to IS NOT NULL THEN
      INSERT INTO notifications (user_id, title, message, type, link)
      VALUES (r.assigned_to, '🔔 Rappel client', v_msg, 'client_reminder_due', '/clients/' || r.client_id);
      v_notified := array_append(v_notified, r.assigned_to);
    END IF;

    IF NOT (r.created_by = ANY(v_notified)) THEN
      INSERT INTO notifications (user_id, title, message, type, link)
      VALUES (r.created_by, '🔔 Rappel client', v_msg, 'client_reminder_due', '/clients/' || r.client_id);
      v_notified := array_append(v_notified, r.created_by);
    END IF;

    -- Notify admins & agent_masters
    FOR v_recipient IN SELECT ur.user_id FROM user_roles ur WHERE ur.role IN ('admin','agent_master') LOOP
      IF NOT (v_recipient = ANY(v_notified)) THEN
        INSERT INTO notifications (user_id, title, message, type, link)
        VALUES (v_recipient, '🔔 Rappel client', v_msg, 'client_reminder_due', '/clients/' || r.client_id);
        v_notified := array_append(v_notified, v_recipient);
      END IF;
    END LOOP;

    UPDATE client_reminders SET notified = true, notified_at = now() WHERE id = r.id;
  END LOOP;
END;
$$;
