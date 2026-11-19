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
  v_mention_array text[];
  v_snippet text;
  v_notified uuid[] := ARRAY[NEW.user_id];
  v_target record;
  admin_record record;
  v_mentioned_names text;
  v_group_roles public.app_role[];
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

  FOREACH v_mention IN ARRAY v_mention_array
  LOOP
    v_group_roles := CASE v_mention
      WHEN 'Tous les agents' THEN ARRAY['agent_master','agent_support','agent_telephonique']::public.app_role[]
      WHEN 'Tous les webmasters' THEN ARRAY['webmaster']::public.app_role[]
      WHEN 'Toute l''équipe' THEN NULL
      ELSE ARRAY[]::public.app_role[]
    END;

    FOR v_target IN
      SELECT DISTINCT u.user_id FROM (
        SELECT p.user_id FROM profiles p
         WHERE v_group_roles IS NOT NULL AND cardinality(v_group_roles) = 0 AND p.full_name = v_mention
        UNION
        SELECT ur.user_id FROM user_roles ur
         WHERE v_group_roles IS NULL OR (cardinality(v_group_roles) > 0 AND ur.role = ANY(v_group_roles))
      ) u
    LOOP
      IF NOT (v_target.user_id = ANY(v_notified)) THEN
        INSERT INTO notifications (user_id, title, message, type, link)
        VALUES (
          v_target.user_id,
          '💬 Vous avez été mentionné',
          COALESCE(v_author_name, 'Quelqu''un') || ' vous a mentionné sur "' || COALESCE(v_client_name, 'Client') || '" : ' || v_snippet,
          'mention',
          '/clients/' || NEW.client_id
        );
        v_notified := array_append(v_notified, v_target.user_id);
      END IF;
    END LOOP;
  END LOOP;

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