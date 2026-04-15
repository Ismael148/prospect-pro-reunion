
CREATE OR REPLACE FUNCTION public.notify_client_note()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_client_name text;
  v_author_name text;
  v_msg text;
  admin_record record;
BEGIN
  IF NEW.activity_type != 'note' THEN
    RETURN NEW;
  END IF;

  SELECT company_name INTO v_client_name FROM clients WHERE id = NEW.client_id;
  SELECT full_name INTO v_author_name FROM profiles WHERE user_id = NEW.user_id;

  v_msg := COALESCE(v_author_name, 'Quelqu''un') || ' a ajouté une note sur "' || COALESCE(v_client_name, 'Client') || '" : ' || LEFT(COALESCE(NEW.description, ''), 100);

  FOR admin_record IN SELECT ur.user_id FROM user_roles ur WHERE ur.role = 'admin'
  LOOP
    IF admin_record.user_id != NEW.user_id THEN
      INSERT INTO notifications (user_id, title, message, type, link)
      VALUES (admin_record.user_id, '📝 Nouvelle note client', v_msg, 'note', '/clients/' || NEW.client_id);
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_client_note
AFTER INSERT ON public.client_activities
FOR EACH ROW
EXECUTE FUNCTION public.notify_client_note();
