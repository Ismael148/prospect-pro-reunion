-- Trigger pour notifier les utilisateurs mentionnés (@[Nom]) dans les commentaires de tickets
CREATE OR REPLACE FUNCTION public.notify_ticket_comment_mentions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_ticket record;
  v_client_name text;
  v_author_name text;
  v_mention text;
  v_mentioned_user_id uuid;
  v_mention_array text[];
  v_snippet text;
  v_notified uuid[] := ARRAY[NEW.user_id];
BEGIN
  IF NEW.content IS NULL THEN
    RETURN NEW;
  END IF;

  v_mention_array := ARRAY(
    SELECT (regexp_matches(NEW.content, '@\[([^\]]+)\]', 'g'))[1]
  );

  IF array_length(v_mention_array, 1) IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT t.ticket_number, t.subject, t.client_id
    INTO v_ticket FROM support_tickets t WHERE t.id = NEW.ticket_id;
  SELECT company_name INTO v_client_name FROM clients WHERE id = v_ticket.client_id;
  SELECT full_name INTO v_author_name FROM profiles WHERE user_id = NEW.user_id;
  v_snippet := LEFT(NEW.content, 120);

  FOREACH v_mention IN ARRAY v_mention_array
  LOOP
    SELECT user_id INTO v_mentioned_user_id 
    FROM profiles WHERE full_name = v_mention LIMIT 1;

    IF v_mentioned_user_id IS NOT NULL AND NOT (v_mentioned_user_id = ANY(v_notified)) THEN
      INSERT INTO notifications (user_id, title, message, type, link)
      VALUES (
        v_mentioned_user_id,
        '💬 Mention dans un ticket',
        COALESCE(v_author_name, 'Quelqu''un') || ' vous a mentionné sur le ticket ' || v_ticket.ticket_number 
          || ' (' || COALESCE(v_client_name, '') || ') : ' || v_snippet,
        'mention',
        '/support'
      );
      v_notified := array_append(v_notified, v_mentioned_user_id);
    END IF;
  END LOOP;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_notify_ticket_comment_mentions ON public.ticket_comments;
CREATE TRIGGER trg_notify_ticket_comment_mentions
AFTER INSERT ON public.ticket_comments
FOR EACH ROW EXECUTE FUNCTION public.notify_ticket_comment_mentions();