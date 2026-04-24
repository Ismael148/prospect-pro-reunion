CREATE OR REPLACE FUNCTION public.notify_note_mentions()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_client_name text;
  v_author_name text;
  v_mention text;
  v_mentioned_user_id uuid;
  v_mention_array text[];
  v_snippet text;
  v_notified uuid[] := ARRAY[NEW.user_id];
  admin_record record;
  v_mentioned_names text;
BEGIN
  IF NEW.activity_type != 'note' OR NEW.description IS NULL THEN
    RETURN NEW;
  END IF;

  v_mention_array := ARRAY(
    SELECT (regexp_matches(NEW.description, '@\[([^\]]+)\]', 'g'))[1]
  );

  IF array_length(v_mention_array, 1) IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT company_name INTO v_client_name FROM clients WHERE id = NEW.client_id;
  SELECT full_name INTO v_author_name FROM profiles WHERE user_id = NEW.user_id;
  v_snippet := LEFT(NEW.description, 120);
  v_mentioned_names := array_to_string(v_mention_array, ', ');

  -- Notify mentioned users
  FOREACH v_mention IN ARRAY v_mention_array
  LOOP
    SELECT user_id INTO v_mentioned_user_id 
    FROM profiles 
    WHERE full_name = v_mention 
    LIMIT 1;

    IF v_mentioned_user_id IS NOT NULL AND NOT (v_mentioned_user_id = ANY(v_notified)) THEN
      INSERT INTO notifications (user_id, title, message, type, link)
      VALUES (
        v_mentioned_user_id,
        '💬 Vous avez été mentionné',
        COALESCE(v_author_name, 'Quelqu''un') || ' vous a mentionné sur "' || COALESCE(v_client_name, 'Client') || '" : ' || v_snippet,
        'mention',
        '/clients/' || NEW.client_id
      );
      v_notified := array_append(v_notified, v_mentioned_user_id);
    END IF;
  END LOOP;

  -- Notify admins (so they're aware of mentions made by agents/webmasters)
  FOR admin_record IN SELECT ur.user_id FROM user_roles ur WHERE ur.role = 'admin'
  LOOP
    IF NOT (admin_record.user_id = ANY(v_notified)) THEN
      INSERT INTO notifications (user_id, title, message, type, link)
      VALUES (
        admin_record.user_id,
        '👁️ Mention dans une note',
        COALESCE(v_author_name, 'Quelqu''un') || ' a mentionné ' || v_mentioned_names || ' sur "' || COALESCE(v_client_name, 'Client') || '" : ' || v_snippet,
        'mention',
        '/clients/' || NEW.client_id
      );
      v_notified := array_append(v_notified, admin_record.user_id);
    END IF;
  END LOOP;

  RETURN NEW;
END;
$function$;