CREATE OR REPLACE FUNCTION public.notify_support_ticket_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  client_name text;
  admin_record record;
BEGIN
  SELECT company_name INTO client_name FROM clients WHERE id = NEW.client_id;

  FOR admin_record IN SELECT user_id FROM user_roles WHERE role = 'admin'
  LOOP
    INSERT INTO notifications (user_id, title, message, type, link)
    VALUES (
      admin_record.user_id,
      'Nouveau ticket support',
      'Ticket "' || NEW.subject || '" créé par "' || COALESCE(client_name, 'Client inconnu') || '" — Priorité : ' || NEW.priority,
      'support',
      '/support'
    );
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_support_ticket
AFTER INSERT ON support_tickets
FOR EACH ROW
EXECUTE FUNCTION notify_support_ticket_created();