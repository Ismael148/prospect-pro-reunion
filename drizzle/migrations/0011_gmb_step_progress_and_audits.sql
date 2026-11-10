ALTER TABLE public.client_gmb ADD COLUMN IF NOT EXISTS step_progress jsonb NOT NULL DEFAULT '{}'::jsonb;
COMMENT ON COLUMN public.client_gmb.step_progress IS 'Per-step verification of the GMB playbook: {stepKey: {done, at, by, by_name, note}}. Recurring steps are keyed stepId@YYYY-MM.';

CREATE TABLE public.gmb_audits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_gmb_id uuid NOT NULL REFERENCES public.client_gmb(id) ON DELETE CASCADE,
  client_id uuid NOT NULL,
  maps_url text,
  criteria jsonb NOT NULL DEFAULT '{}'::jsonb,
  score integer NOT NULL DEFAULT 0,
  summary text,
  created_by uuid DEFAULT auth.uid(),
  created_by_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX gmb_audits_client_gmb_idx ON public.gmb_audits (client_gmb_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.gmb_audits TO authenticated;
GRANT ALL ON public.gmb_audits TO service_role;

ALTER TABLE public.gmb_audits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "GMB staff manage audits" ON public.gmb_audits
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'agent_master') OR public.has_role(auth.uid(), 'webmaster'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'agent_master') OR public.has_role(auth.uid(), 'webmaster'));

CREATE POLICY "Staff view audits" ON public.gmb_audits
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'designer') OR public.has_role(auth.uid(), 'agent_support'));

CREATE OR REPLACE FUNCTION public.get_public_gmb_dashboard(p_token uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_client record;
  v_gmb record;
  v_activities jsonb;
  v_goal record;
  v_month text;
  v_audits jsonb;
  v_steps jsonb;
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
      'client', jsonb_build_object('company_name', v_client.company_name, 'city', v_client.city, 'sector', v_client.sector),
      'gmb', NULL,
      'activities', '[]'::jsonb,
      'goal', NULL,
      'audits', '[]'::jsonb
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

  SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY x.created_at DESC), '[]'::jsonb)
    INTO v_audits
    FROM (
      SELECT id, criteria, score, summary, created_at
      FROM public.gmb_audits
      WHERE client_gmb_id = v_gmb.id
      ORDER BY created_at DESC
      LIMIT 2
    ) x;

  -- Expose only completion state and date per step, never who did it or internal notes.
  SELECT COALESCE(jsonb_object_agg(key, jsonb_build_object('done', COALESCE((value->>'done')::boolean, false), 'at', value->>'at')), '{}'::jsonb)
    INTO v_steps
    FROM jsonb_each(COALESCE(v_gmb.step_progress, '{}'::jsonb));

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
      'step_progress', v_steps,
      'total_reviews', v_gmb.total_reviews,
      'average_rating', v_gmb.average_rating,
      'last_post_at', v_gmb.last_post_at,
      'updated_at', v_gmb.updated_at
    ),
    'activities', v_activities,
    'audits', v_audits,
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
$function$;