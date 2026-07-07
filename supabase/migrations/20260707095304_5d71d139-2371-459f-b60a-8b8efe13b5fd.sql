-- Table des avis Google reçus (saisis par le webmaster ou importés)
CREATE TABLE public.gmb_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  client_gmb_id UUID REFERENCES public.client_gmb(id) ON DELETE SET NULL,
  author_name TEXT NOT NULL,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review_text TEXT,
  google_review_id TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  replied_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'nouveau', -- nouveau | en_cours | repondu | ignore
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_gmb_reviews_client ON public.gmb_reviews(client_id, received_at DESC);
CREATE INDEX idx_gmb_reviews_status ON public.gmb_reviews(status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.gmb_reviews TO authenticated;
GRANT ALL ON public.gmb_reviews TO service_role;

ALTER TABLE public.gmb_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team can view all reviews"
  ON public.gmb_reviews FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'agent_master')
    OR public.has_role(auth.uid(), 'webmaster')
    OR public.has_role(auth.uid(), 'agent_telephonique')
  );

CREATE POLICY "Team can insert reviews"
  ON public.gmb_reviews FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'agent_master')
    OR public.has_role(auth.uid(), 'webmaster')
  );

CREATE POLICY "Team can update reviews"
  ON public.gmb_reviews FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'agent_master')
    OR public.has_role(auth.uid(), 'webmaster')
  );

CREATE POLICY "Admins can delete reviews"
  ON public.gmb_reviews FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_gmb_reviews_updated
  BEFORE UPDATE ON public.gmb_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Table des réponses générées (historique complet des variantes)
CREATE TABLE public.gmb_review_replies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  review_id UUID NOT NULL REFERENCES public.gmb_reviews(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  tone TEXT, -- chaleureux | professionnel | empathique | ferme | humoristique
  formality TEXT, -- tutoiement | vouvoiement
  length TEXT, -- courte | moyenne | longue
  is_final BOOLEAN NOT NULL DEFAULT false,
  generated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_gmb_review_replies_review ON public.gmb_review_replies(review_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.gmb_review_replies TO authenticated;
GRANT ALL ON public.gmb_review_replies TO service_role;

ALTER TABLE public.gmb_review_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team can view replies"
  ON public.gmb_review_replies FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'agent_master')
    OR public.has_role(auth.uid(), 'webmaster')
    OR public.has_role(auth.uid(), 'agent_telephonique')
  );

CREATE POLICY "Team can insert replies"
  ON public.gmb_review_replies FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'agent_master')
    OR public.has_role(auth.uid(), 'webmaster')
  );

CREATE POLICY "Team can update replies"
  ON public.gmb_review_replies FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'agent_master')
    OR public.has_role(auth.uid(), 'webmaster')
  );

CREATE POLICY "Admins can delete replies"
  ON public.gmb_review_replies FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Notification automatique quand un nouvel avis arrive
CREATE OR REPLACE FUNCTION public.notify_new_gmb_review()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_name text;
  v_assigned_webmaster uuid;
  v_stars text;
  v_msg text;
  v_title text;
  admin_record record;
  v_notified uuid[] := ARRAY[]::uuid[];
BEGIN
  SELECT company_name INTO v_client_name FROM clients WHERE id = NEW.client_id;
  v_stars := repeat('⭐', NEW.rating);

  v_title := CASE
    WHEN NEW.rating >= 4 THEN '🌟 Nouvel avis positif — ' || v_client_name
    WHEN NEW.rating = 3 THEN '⚠️ Avis moyen à traiter — ' || v_client_name
    ELSE '🚨 Avis négatif urgent — ' || v_client_name
  END;

  v_msg := v_stars || ' (' || NEW.rating || '/5) par ' || NEW.author_name
    || CASE WHEN NEW.review_text IS NOT NULL AND length(NEW.review_text) > 0
            THEN E'\n"' || LEFT(NEW.review_text, 200) || CASE WHEN length(NEW.review_text) > 200 THEN '..."' ELSE '"' END
            ELSE ''
       END;

  -- Webmaster assigné au projet du client
  SELECT p.assigned_to INTO v_assigned_webmaster
  FROM projects p WHERE p.client_id = NEW.client_id ORDER BY p.created_at DESC LIMIT 1;

  IF v_assigned_webmaster IS NOT NULL THEN
    INSERT INTO notifications (user_id, title, message, type, link)
    VALUES (v_assigned_webmaster, v_title, v_msg, 'gmb_review', '/gmb');
    v_notified := array_append(v_notified, v_assigned_webmaster);
  END IF;

  -- Admins
  FOR admin_record IN SELECT ur.user_id FROM user_roles ur WHERE ur.role = 'admin' LOOP
    IF NOT (admin_record.user_id = ANY(v_notified)) THEN
      INSERT INTO notifications (user_id, title, message, type, link)
      VALUES (admin_record.user_id, v_title, v_msg, 'gmb_review', '/gmb');
      v_notified := array_append(v_notified, admin_record.user_id);
    END IF;
  END LOOP;

  -- Incrémente le compteur d'avis + note moyenne (approximatif)
  UPDATE client_gmb
  SET total_reviews = COALESCE(total_reviews, 0) + 1,
      average_rating = (
        SELECT ROUND(AVG(rating)::numeric, 2)
        FROM gmb_reviews WHERE client_id = NEW.client_id
      )
  WHERE client_id = NEW.client_id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_new_gmb_review
  AFTER INSERT ON public.gmb_reviews
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_gmb_review();
