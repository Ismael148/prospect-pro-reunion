
-- 1. Notify note author when admin marks as seen
CREATE OR REPLACE FUNCTION public.notify_note_admin_seen()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_name text;
  v_snippet text;
BEGIN
  -- Only fire when admin_seen changes from false to true
  IF NEW.admin_seen = true AND (OLD.admin_seen IS DISTINCT FROM true) AND NEW.activity_type = 'note' THEN
    SELECT company_name INTO v_client_name FROM clients WHERE id = NEW.client_id;
    v_snippet := LEFT(COALESCE(NEW.description, ''), 80);

    -- Notify the note author (not the admin who marked it)
    INSERT INTO notifications (user_id, title, message, type, link)
    VALUES (
      NEW.user_id,
      '✅ Note vue par l''admin',
      'Votre note sur "' || COALESCE(v_client_name, 'Client') || '" a été vue : ' || v_snippet,
      'note_seen',
      '/clients/' || NEW.client_id
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_note_admin_seen
AFTER UPDATE ON public.client_activities
FOR EACH ROW
EXECUTE FUNCTION public.notify_note_admin_seen();

-- 2. Notify relevant users when a support ticket status/assignment changes
CREATE OR REPLACE FUNCTION public.notify_ticket_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_name text;
  v_msg text;
  v_creator_id uuid;
  v_note_authors uuid[];
BEGIN
  SELECT company_name INTO v_client_name FROM clients WHERE id = NEW.client_id;

  -- Notify on status change
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    v_msg := 'Le ticket "' || NEW.ticket_number || '" (' || COALESCE(v_client_name, '') || ') est passé en "' || NEW.status::text || '"';

    -- Find the agent who created the original note that spawned this ticket
    -- Notify assigned_to if changed or on status change
    IF NEW.assigned_to IS NOT NULL THEN
      INSERT INTO notifications (user_id, title, message, type, link)
      VALUES (NEW.assigned_to, '🎫 Ticket mis à jour', v_msg, 'support', '/support')
      ON CONFLICT DO NOTHING;
    END IF;

    -- Notify all agents who commented on this ticket
    FOR v_creator_id IN
      SELECT DISTINCT tc.user_id FROM ticket_comments tc
      WHERE tc.ticket_id = NEW.id
      AND tc.user_id IS DISTINCT FROM NEW.assigned_to
    LOOP
      INSERT INTO notifications (user_id, title, message, type, link)
      VALUES (v_creator_id, '🎫 Ticket mis à jour', v_msg, 'support', '/support');
    END LOOP;
  END IF;

  -- Notify on assignment change
  IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to AND NEW.assigned_to IS NOT NULL THEN
    v_msg := 'Le ticket "' || NEW.ticket_number || '" (' || COALESCE(v_client_name, '') || ') vous a été assigné — ' || NEW.subject;
    INSERT INTO notifications (user_id, title, message, type, link)
    VALUES (NEW.assigned_to, '📋 Ticket assigné', v_msg, 'support', '/support');
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_ticket_update
AFTER UPDATE ON public.support_tickets
FOR EACH ROW
EXECUTE FUNCTION public.notify_ticket_update();
