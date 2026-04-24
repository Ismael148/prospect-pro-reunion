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
  v_recipient uuid;
  v_notified uuid[] := ARRAY[NEW.user_id];
BEGIN
  SELECT t.ticket_number, t.subject, t.assigned_to, t.client_id
    INTO v_ticket
    FROM support_tickets t WHERE t.id = NEW.ticket_id;

  SELECT company_name INTO v_client_name FROM clients WHERE id = v_ticket.client_id;
  SELECT full_name INTO v_author_name FROM profiles WHERE user_id = NEW.user_id;

  v_msg := COALESCE(v_author_name, 'Quelqu''un') || ' a commenté le ticket "' || v_ticket.ticket_number || '" — ' || v_ticket.subject || ' (' || COALESCE(v_client_name, '') || ')';

  -- Notify assigned user
  IF v_ticket.assigned_to IS NOT NULL AND NOT (v_ticket.assigned_to = ANY(v_notified)) THEN
    INSERT INTO notifications (user_id, title, message, type, link)
    VALUES (v_ticket.assigned_to, '💬 Nouveau commentaire', v_msg, 'support', '/support');
    v_notified := array_append(v_notified, v_ticket.assigned_to);
  END IF;

  -- Notify all previous commenters on this ticket (agents, webmasters, etc.)
  FOR v_recipient IN
    SELECT DISTINCT tc.user_id FROM ticket_comments tc
    WHERE tc.ticket_id = NEW.ticket_id AND tc.user_id IS NOT NULL
  LOOP
    IF NOT (v_recipient = ANY(v_notified)) THEN
      INSERT INTO notifications (user_id, title, message, type, link)
      VALUES (v_recipient, '💬 Réponse sur un ticket', v_msg, 'support', '/support');
      v_notified := array_append(v_notified, v_recipient);
    END IF;
  END LOOP;

  -- Notify all admins
  FOR v_recipient IN SELECT ur.user_id FROM user_roles ur WHERE ur.role = 'admin'
  LOOP
    IF NOT (v_recipient = ANY(v_notified)) THEN
      INSERT INTO notifications (user_id, title, message, type, link)
      VALUES (v_recipient, '💬 Nouveau commentaire', v_msg, 'support', '/support');
      v_notified := array_append(v_notified, v_recipient);
    END IF;
  END LOOP;

  RETURN NEW;
END;
$function$;