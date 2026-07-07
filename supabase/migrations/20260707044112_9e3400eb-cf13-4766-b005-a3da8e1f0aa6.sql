
-- 1. Add public token on clients for GMB deliverable page
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS gmb_public_token uuid DEFAULT gen_random_uuid();
UPDATE public.clients SET gmb_public_token = gen_random_uuid() WHERE gmb_public_token IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS clients_gmb_public_token_idx ON public.clients(gmb_public_token);

-- 2. Enum for GMB activity types
DO $$ BEGIN
  CREATE TYPE public.gmb_activity_type AS ENUM (
    'post_publie','photo_ajoutee','avis_repondu','description_maj',
    'horaires_maj','produit_ajoute','qa_repondue','verification',
    'checklist_maj','statut_maj','autre'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. gmb_activities table
CREATE TABLE IF NOT EXISTS public.gmb_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_gmb_id uuid NOT NULL REFERENCES public.client_gmb(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  action_type public.gmb_activity_type NOT NULL DEFAULT 'autre',
  description text NOT NULL,
  link text,
  visible_to_client boolean NOT NULL DEFAULT true,
  performed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  performed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gmb_activities_client_id_idx ON public.gmb_activities(client_id, performed_at DESC);
CREATE INDEX IF NOT EXISTS gmb_activities_client_gmb_id_idx ON public.gmb_activities(client_gmb_id, performed_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.gmb_activities TO authenticated;
GRANT ALL ON public.gmb_activities TO service_role;

ALTER TABLE public.gmb_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view gmb activities"
  ON public.gmb_activities FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated can create gmb activities"
  ON public.gmb_activities FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = performed_by);

CREATE POLICY "Author or admin can update gmb activities"
  ON public.gmb_activities FOR UPDATE
  TO authenticated USING (auth.uid() = performed_by OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Author or admin can delete gmb activities"
  ON public.gmb_activities FOR DELETE
  TO authenticated USING (auth.uid() = performed_by OR public.has_role(auth.uid(), 'admin'));

-- 4. gmb_monthly_goals table
CREATE TABLE IF NOT EXISTS public.gmb_monthly_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_gmb_id uuid NOT NULL REFERENCES public.client_gmb(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  month_year text NOT NULL,
  posts_target int NOT NULL DEFAULT 4,
  posts_done int NOT NULL DEFAULT 0,
  reviews_reply_target_pct int NOT NULL DEFAULT 100,
  reviews_replied int NOT NULL DEFAULT 0,
  reviews_received int NOT NULL DEFAULT 0,
  photos_target int NOT NULL DEFAULT 8,
  photos_done int NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_gmb_id, month_year)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.gmb_monthly_goals TO authenticated;
GRANT ALL ON public.gmb_monthly_goals TO service_role;

ALTER TABLE public.gmb_monthly_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view gmb goals"
  ON public.gmb_monthly_goals FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can insert gmb goals"
  ON public.gmb_monthly_goals FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated can update gmb goals"
  ON public.gmb_monthly_goals FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Admin can delete gmb goals"
  ON public.gmb_monthly_goals FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_gmb_goals_updated_at
  BEFORE UPDATE ON public.gmb_monthly_goals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Public RPC to fetch GMB dashboard for client via token
CREATE OR REPLACE FUNCTION public.get_public_gmb_dashboard(p_token uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client record;
  v_gmb record;
  v_activities jsonb;
  v_goal record;
  v_month text;
BEGIN
  SELECT id, company_name, city, sector, gmb_public_token
    INTO v_client
    FROM public.clients
    WHERE gmb_public_token = p_token
    LIMIT 1;

  IF v_client.id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_gmb FROM public.client_gmb WHERE client_id = v_client.id LIMIT 1;

  IF v_gmb.id IS NULL THEN
    RETURN jsonb_build_object(
      'client', to_jsonb(v_client),
      'gmb', NULL,
      'activities', '[]'::jsonb,
      'goal', NULL
    );
  END IF;

  SELECT COALESCE(jsonb_agg(to_jsonb(a) ORDER BY a.performed_at DESC), '[]'::jsonb)
    INTO v_activities
    FROM (
      SELECT id, action_type, description, link, performed_at
      FROM public.gmb_activities
      WHERE client_gmb_id = v_gmb.id AND visible_to_client = true
      ORDER BY performed_at DESC
      LIMIT 30
    ) a;

  v_month := to_char(now() AT TIME ZONE 'Indian/Reunion', 'YYYY-MM');
  SELECT * INTO v_goal FROM public.gmb_monthly_goals
    WHERE client_gmb_id = v_gmb.id AND month_year = v_month LIMIT 1;

  RETURN jsonb_build_object(
    'client', jsonb_build_object(
      'company_name', v_client.company_name,
      'city', v_client.city,
      'sector', v_client.sector
    ),
    'gmb', jsonb_build_object(
      'status', v_gmb.status,
      'business_name_on_google', v_gmb.business_name_on_google,
      'gmb_url', v_gmb.gmb_url,
      'checklist_account_created', v_gmb.checklist_account_created,
      'checklist_postal_requested', v_gmb.checklist_postal_requested,
      'checklist_code_received', v_gmb.checklist_code_received,
      'checklist_verified', v_gmb.checklist_verified,
      'checklist_logo_added', v_gmb.checklist_logo_added,
      'checklist_photos_added', v_gmb.checklist_photos_added,
      'checklist_hours_set', v_gmb.checklist_hours_set,
      'checklist_description_added', v_gmb.checklist_description_added,
      'total_reviews', v_gmb.total_reviews,
      'average_rating', v_gmb.average_rating,
      'last_post_at', v_gmb.last_post_at,
      'updated_at', v_gmb.updated_at
    ),
    'activities', v_activities,
    'goal', CASE WHEN v_goal.id IS NULL THEN NULL ELSE jsonb_build_object(
      'month_year', v_goal.month_year,
      'posts_target', v_goal.posts_target,
      'posts_done', v_goal.posts_done,
      'reviews_reply_target_pct', v_goal.reviews_reply_target_pct,
      'reviews_replied', v_goal.reviews_replied,
      'reviews_received', v_goal.reviews_received,
      'photos_target', v_goal.photos_target,
      'photos_done', v_goal.photos_done
    ) END
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_gmb_dashboard(uuid) TO anon, authenticated;
