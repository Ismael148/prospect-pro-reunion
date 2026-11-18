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

  IF NEW.admin_notes IS DISTINCT FROM OLD.admin_notes
     AND COALESCE(btrim(NEW.admin_notes), '') <> ''
     AND NEW.first_response_at IS NULL THEN
    NEW.first_response_at := now();
    NEW.first_response_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

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
  IF NEW.admin_notes IS DISTINCT FROM OLD.admin_notes AND COALESCE(btrim(NEW.admin_notes), '') <> '' THEN
    INSERT INTO support_ticket_events (ticket_id, event_type, from_value, to_value, actor_id)
    VALUES (NEW.id, 'reponse', 'note', 'Note interne mise à jour', auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.log_support_ticket_event() FROM PUBLIC, anon, authenticated;