ALTER TABLE public.support_tickets
  ADD COLUMN IF NOT EXISTS first_response_at timestamptz,
  ADD COLUMN IF NOT EXISTS first_response_by uuid;

CREATE TABLE public.support_ticket_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('ouverture','statut','assignation','priorite','reponse')),
  from_value text,
  to_value text,
  actor_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX support_ticket_events_ticket_idx ON public.support_ticket_events (ticket_id, created_at);

GRANT SELECT ON public.support_ticket_events TO authenticated;
GRANT ALL ON public.support_ticket_events TO service_role;

ALTER TABLE public.support_ticket_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view events of visible tickets"
ON public.support_ticket_events FOR SELECT TO authenticated
USING (
  public.is_staff(auth.uid())
  AND EXISTS (SELECT 1 FROM public.support_tickets t WHERE t.id = support_ticket_events.ticket_id)
);

-- Dates de réponse / résolution tenues à jour côté base
CREATE OR REPLACE FUNCTION public.track_support_ticket_dates()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF OLD.status = 'ouvert' AND NEW.first_response_at IS NULL THEN
      NEW.first_response_at := now();
      NEW.first_response_by := auth.uid();
    END IF;
    IF NEW.status IN ('resolu','ferme') THEN
      IF NEW.resolved_at IS NULL THEN
        NEW.resolved_at := now();
      END IF;
      IF NEW.resolved_by IS NULL THEN
        NEW.resolved_by := auth.uid();
      END IF;
    ELSE
      NEW.resolved_at := NULL;
      NEW.resolved_by := NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_track_support_ticket_dates
BEFORE UPDATE ON public.support_tickets
FOR EACH ROW EXECUTE FUNCTION public.track_support_ticket_dates();

-- Historique : ouverture et changements
CREATE OR REPLACE FUNCTION public.log_support_ticket_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO support_ticket_events (ticket_id, event_type, to_value, actor_id, created_at)
    VALUES (NEW.id, 'ouverture', NEW.status::text, auth.uid(), NEW.created_at);
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO support_ticket_events (ticket_id, event_type, from_value, to_value, actor_id)
    VALUES (NEW.id, 'statut', OLD.status::text, NEW.status::text, auth.uid());
  END IF;
  IF NEW.assigned_to IS DISTINCT FROM OLD.assigned_to THEN
    INSERT INTO support_ticket_events (ticket_id, event_type, from_value, to_value, actor_id)
    VALUES (NEW.id, 'assignation', OLD.assigned_to::text, NEW.assigned_to::text, auth.uid());
  END IF;
  IF NEW.priority IS DISTINCT FROM OLD.priority THEN
    INSERT INTO support_ticket_events (ticket_id, event_type, from_value, to_value, actor_id)
    VALUES (NEW.id, 'priorite', OLD.priority, NEW.priority, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_support_ticket_insert
AFTER INSERT ON public.support_tickets
FOR EACH ROW EXECUTE FUNCTION public.log_support_ticket_event();

CREATE TRIGGER trg_log_support_ticket_update
AFTER UPDATE ON public.support_tickets
FOR EACH ROW EXECUTE FUNCTION public.log_support_ticket_event();

-- Réponses : chaque commentaire de l'équipe
CREATE OR REPLACE FUNCTION public.log_ticket_comment_response()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO support_ticket_events (ticket_id, event_type, to_value, actor_id, created_at)
  VALUES (NEW.ticket_id, 'reponse', left(NEW.content, 200), NEW.user_id, NEW.created_at);

  UPDATE support_tickets
     SET first_response_at = NEW.created_at,
         first_response_by = NEW.user_id
   WHERE id = NEW.ticket_id
     AND first_response_at IS NULL;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_ticket_comment_response
AFTER INSERT ON public.ticket_comments
FOR EACH ROW EXECUTE FUNCTION public.log_ticket_comment_response();

REVOKE EXECUTE ON FUNCTION public.log_support_ticket_event() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_ticket_comment_response() FROM PUBLIC, anon, authenticated;

-- Reprise des tickets existants
INSERT INTO public.support_ticket_events (ticket_id, event_type, to_value, created_at)
SELECT id, 'ouverture', 'ouvert', created_at FROM public.support_tickets;

INSERT INTO public.support_ticket_events (ticket_id, event_type, to_value, actor_id, created_at)
SELECT ticket_id, 'reponse', left(content, 200), user_id, created_at FROM public.ticket_comments;

INSERT INTO public.support_ticket_events (ticket_id, event_type, from_value, to_value, actor_id, created_at)
SELECT id, 'statut', NULL, status::text, resolved_by, resolved_at
FROM public.support_tickets
WHERE resolved_at IS NOT NULL;

ALTER TABLE public.support_tickets DISABLE TRIGGER trg_track_support_ticket_dates;
ALTER TABLE public.support_tickets DISABLE TRIGGER trg_log_support_ticket_update;
ALTER TABLE public.support_tickets DISABLE TRIGGER trg_notify_ticket_update;
ALTER TABLE public.support_tickets DISABLE TRIGGER update_support_tickets_updated_at;

UPDATE public.support_tickets t
   SET first_response_at = s.at, first_response_by = s.by
  FROM (
    SELECT t2.id,
           COALESCE(c.created_at, t2.resolved_at) AS at,
           CASE WHEN c.created_at IS NOT NULL THEN c.user_id ELSE t2.resolved_by END AS by
      FROM public.support_tickets t2
      LEFT JOIN LATERAL (
        SELECT created_at, user_id FROM public.ticket_comments tc
         WHERE tc.ticket_id = t2.id ORDER BY created_at ASC LIMIT 1
      ) c ON true
     WHERE c.created_at IS NOT NULL OR t2.resolved_at IS NOT NULL
  ) s
 WHERE t.id = s.id AND t.first_response_at IS NULL;

ALTER TABLE public.support_tickets ENABLE TRIGGER trg_track_support_ticket_dates;
ALTER TABLE public.support_tickets ENABLE TRIGGER trg_log_support_ticket_update;
ALTER TABLE public.support_tickets ENABLE TRIGGER trg_notify_ticket_update;
ALTER TABLE public.support_tickets ENABLE TRIGGER update_support_tickets_updated_at;