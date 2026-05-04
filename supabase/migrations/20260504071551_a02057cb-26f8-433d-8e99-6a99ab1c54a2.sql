
-- Table principale calendar_events
CREATE TABLE public.calendar_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text,
  event_type text NOT NULL DEFAULT 'rdv_client',
  start_at timestamp with time zone NOT NULL,
  end_at timestamp with time zone NOT NULL,
  all_day boolean NOT NULL DEFAULT false,
  location text,
  meet_link text,
  client_id uuid,
  participants uuid[] NOT NULL DEFAULT '{}'::uuid[],
  color text NOT NULL DEFAULT '#ff006e',
  status text NOT NULL DEFAULT 'planifie',
  email_sent_to_client boolean NOT NULL DEFAULT false,
  email_sent_at timestamp with time zone,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_calendar_events_start_at ON public.calendar_events(start_at);
CREATE INDEX idx_calendar_events_client_id ON public.calendar_events(client_id);
CREATE INDEX idx_calendar_events_participants ON public.calendar_events USING GIN(participants);

ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

-- RLS : tous les authentifiés peuvent voir
CREATE POLICY "Authenticated can view calendar events"
ON public.calendar_events FOR SELECT TO authenticated USING (true);

-- Admin / Agent Master / Agent Support peuvent créer
CREATE POLICY "Staff can create calendar events"
ON public.calendar_events FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = created_by AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'agent_master'::app_role)
    OR has_role(auth.uid(), 'agent_support'::app_role)
  )
);

-- Mêmes rôles + créateur peuvent modifier
CREATE POLICY "Staff can update calendar events"
ON public.calendar_events FOR UPDATE TO authenticated
USING (
  auth.uid() = created_by
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'agent_master'::app_role)
  OR has_role(auth.uid(), 'agent_support'::app_role)
);

-- Suppression : créateur, admin, agent_master
CREATE POLICY "Staff can delete calendar events"
ON public.calendar_events FOR DELETE TO authenticated
USING (
  auth.uid() = created_by
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'agent_master'::app_role)
);

-- Trigger updated_at
CREATE TRIGGER update_calendar_events_updated_at
BEFORE UPDATE ON public.calendar_events
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger : notifier les participants à la création/assignation
CREATE OR REPLACE FUNCTION public.notify_calendar_event_participants()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_participant uuid;
  v_client_name text;
  v_when text;
  v_msg text;
  v_title text;
  v_notified uuid[] := ARRAY[NEW.created_by];
BEGIN
  IF NEW.client_id IS NOT NULL THEN
    SELECT company_name INTO v_client_name FROM clients WHERE id = NEW.client_id;
  END IF;

  v_when := to_char(NEW.start_at AT TIME ZONE 'Indian/Reunion', 'DD/MM/YYYY HH24:MI');
  v_title := CASE
    WHEN TG_OP = 'INSERT' THEN '📅 Nouvel événement'
    ELSE '🔄 Événement mis à jour'
  END;
  v_msg := '"' || NEW.title || '" — ' || v_when
    || COALESCE(' — Client: ' || v_client_name, '')
    || COALESCE(' — Lieu: ' || NEW.location, '');

  -- Notifier chaque participant
  IF NEW.participants IS NOT NULL THEN
    FOREACH v_participant IN ARRAY NEW.participants
    LOOP
      IF NOT (v_participant = ANY(v_notified)) THEN
        INSERT INTO notifications (user_id, title, message, type, link)
        VALUES (v_participant, v_title, v_msg, 'calendar_event', '/calendrier');
        v_notified := array_append(v_notified, v_participant);
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER notify_calendar_event_on_insert
AFTER INSERT ON public.calendar_events
FOR EACH ROW EXECUTE FUNCTION public.notify_calendar_event_participants();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.calendar_events;
