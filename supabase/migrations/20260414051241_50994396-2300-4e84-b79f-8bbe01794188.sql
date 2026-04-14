
CREATE OR REPLACE FUNCTION public.notify_ticket_comment()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  v_ticket record;
  v_client_name text;
  v_author_name text;
  v_msg text;
  admin_record record;
BEGIN
  -- Get ticket info
  SELECT t.ticket_number, t.subject, t.assigned_to, t.client_id
    INTO v_ticket
    FROM support_tickets t WHERE t.id = NEW.ticket_id;

  -- Get client name
  SELECT company_name INTO v_client_name FROM clients WHERE id = v_ticket.client_id;

  -- Get author name
  SELECT full_name INTO v_author_name FROM profiles WHERE user_id = NEW.user_id;

  v_msg := COALESCE(v_author_name, 'Quelqu''un') || ' a commenté le ticket "' || v_ticket.ticket_number || '" — ' || v_ticket.subject || ' (' || COALESCE(v_client_name, '') || ')';

  -- Notify assigned user (if not the author)
  IF v_ticket.assigned_to IS NOT NULL AND v_ticket.assigned_to != NEW.user_id THEN
    INSERT INTO notifications (user_id, title, message, type, link)
    VALUES (v_ticket.assigned_to, '💬 Nouveau commentaire', v_msg, 'support', '/support');
  END IF;

  -- Notify all admins (except author and already-notified assignee)
  FOR admin_record IN SELECT ur.user_id FROM user_roles ur WHERE ur.role = 'admin'
  LOOP
    IF admin_record.user_id != NEW.user_id AND admin_record.user_id IS DISTINCT FROM v_ticket.assigned_to THEN
      INSERT INTO notifications (user_id, title, message, type, link)
      VALUES (admin_record.user_id, '💬 Nouveau commentaire', v_msg, 'support', '/support');
    END IF;
  END LOOP;

  RETURN NEW;
END;
$function$;

CREATE TRIGGER on_ticket_comment_notify
  AFTER INSERT ON public.ticket_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_ticket_comment();
