
-- 1. Ajouter parent_id pour les réponses aux notes
ALTER TABLE public.client_activities 
ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.client_activities(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_client_activities_parent_id ON public.client_activities(parent_id);

-- 2. Trigger : notifier les agents mentionnés dans une note
CREATE OR REPLACE FUNCTION public.notify_note_mentions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_client_name text;
  v_author_name text;
  v_mention text;
  v_mentioned_user_id uuid;
  v_mention_array text[];
  v_snippet text;
BEGIN
  IF NEW.activity_type != 'note' OR NEW.description IS NULL THEN
    RETURN NEW;
  END IF;

  -- Extract all @[Name] mentions
  v_mention_array := ARRAY(
    SELECT (regexp_matches(NEW.description, '@\[([^\]]+)\]', 'g'))[1]
  );

  IF array_length(v_mention_array, 1) IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT company_name INTO v_client_name FROM clients WHERE id = NEW.client_id;
  SELECT full_name INTO v_author_name FROM profiles WHERE user_id = NEW.user_id;
  v_snippet := LEFT(NEW.description, 120);

  FOREACH v_mention IN ARRAY v_mention_array
  LOOP
    SELECT user_id INTO v_mentioned_user_id 
    FROM profiles 
    WHERE full_name = v_mention 
    LIMIT 1;

    IF v_mentioned_user_id IS NOT NULL AND v_mentioned_user_id != NEW.user_id THEN
      INSERT INTO notifications (user_id, title, message, type, link)
      VALUES (
        v_mentioned_user_id,
        '💬 Vous avez été mentionné',
        COALESCE(v_author_name, 'Quelqu''un') || ' vous a mentionné sur "' || COALESCE(v_client_name, 'Client') || '" : ' || v_snippet,
        'mention',
        '/clients/' || NEW.client_id
      );
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_note_mentions ON public.client_activities;
CREATE TRIGGER trg_notify_note_mentions
AFTER INSERT ON public.client_activities
FOR EACH ROW
EXECUTE FUNCTION public.notify_note_mentions();

-- 3. Trigger : notifier l'auteur d'origine quand on répond à sa note
CREATE OR REPLACE FUNCTION public.notify_note_reply()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_parent_user_id uuid;
  v_client_name text;
  v_author_name text;
  v_snippet text;
BEGIN
  IF NEW.activity_type != 'note' OR NEW.parent_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT user_id INTO v_parent_user_id 
  FROM client_activities 
  WHERE id = NEW.parent_id;

  IF v_parent_user_id IS NULL OR v_parent_user_id = NEW.user_id THEN
    RETURN NEW;
  END IF;

  SELECT company_name INTO v_client_name FROM clients WHERE id = NEW.client_id;
  SELECT full_name INTO v_author_name FROM profiles WHERE user_id = NEW.user_id;
  v_snippet := LEFT(COALESCE(NEW.description, ''), 120);

  INSERT INTO notifications (user_id, title, message, type, link)
  VALUES (
    v_parent_user_id,
    '↩️ Réponse à votre note',
    COALESCE(v_author_name, 'Quelqu''un') || ' a répondu à votre note sur "' || COALESCE(v_client_name, 'Client') || '" : ' || v_snippet,
    'note_reply',
    '/clients/' || NEW.client_id
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_note_reply ON public.client_activities;
CREATE TRIGGER trg_notify_note_reply
AFTER INSERT ON public.client_activities
FOR EACH ROW
EXECUTE FUNCTION public.notify_note_reply();

-- 4. Permettre aux agents (téléphonique, master, support) de modifier toutes les fiches clients
DROP POLICY IF EXISTS "Users can update assigned clients" ON public.clients;

CREATE POLICY "Authorized users can update clients"
ON public.clients
FOR UPDATE
TO authenticated
USING (
  auth.uid() = assigned_to
  OR auth.uid() = created_by
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'agent_telephonique'::app_role)
  OR has_role(auth.uid(), 'agent_master'::app_role)
  OR has_role(auth.uid(), 'agent_support'::app_role)
);
