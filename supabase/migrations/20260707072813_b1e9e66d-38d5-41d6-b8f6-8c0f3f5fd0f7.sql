
-- 1) gmb_monthly_goals
DROP POLICY IF EXISTS "Authenticated can insert gmb goals" ON public.gmb_monthly_goals;
DROP POLICY IF EXISTS "Authenticated can update gmb goals" ON public.gmb_monthly_goals;

CREATE POLICY "Staff can insert gmb goals"
  ON public.gmb_monthly_goals
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'agent_master'::app_role)
    OR public.has_role(auth.uid(), 'webmaster'::app_role)
  );

CREATE POLICY "Staff can update gmb goals"
  ON public.gmb_monthly_goals
  FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'agent_master'::app_role)
    OR public.has_role(auth.uid(), 'webmaster'::app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'agent_master'::app_role)
    OR public.has_role(auth.uid(), 'webmaster'::app_role)
  );

-- 2) logo_reminder_log
DROP POLICY IF EXISTS "Authenticated can insert logo reminder log" ON public.logo_reminder_log;

CREATE POLICY "Admins can insert logo reminder log"
  ON public.logo_reminder_log
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    AND (triggered_by IS NULL OR triggered_by = auth.uid())
  );

-- 3) reservation_ical_submissions
DROP POLICY IF EXISTS "Authenticated can update ical submissions" ON public.reservation_ical_submissions;
DROP POLICY IF EXISTS "Authenticated can delete ical submissions" ON public.reservation_ical_submissions;

CREATE POLICY "Staff can update ical submissions"
  ON public.reservation_ical_submissions
  FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'agent_master'::app_role)
    OR public.has_role(auth.uid(), 'webmaster'::app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'agent_master'::app_role)
    OR public.has_role(auth.uid(), 'webmaster'::app_role)
  );

CREATE POLICY "Staff can delete ical submissions"
  ON public.reservation_ical_submissions
  FOR DELETE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'agent_master'::app_role)
    OR public.has_role(auth.uid(), 'webmaster'::app_role)
  );

-- 4) social_publications: SELECT authenticated-only
DROP POLICY IF EXISTS "Authenticated users can view publications" ON public.social_publications;

CREATE POLICY "Authenticated users can view publications"
  ON public.social_publications
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- 5) Storage: restrict SELECT on client-forms
DROP POLICY IF EXISTS "Allow public read from client-forms" ON storage.objects;
DROP POLICY IF EXISTS "Public read client form files" ON storage.objects;

CREATE POLICY "Staff or valid token can read client form files"
  ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (
    bucket_id = 'client-forms'
    AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'agent_master'::app_role)
      OR public.has_role(auth.uid(), 'webmaster'::app_role)
      OR public.has_role(auth.uid(), 'agent_support'::app_role)
      OR public.is_valid_support_token_text((storage.foldername(name))[1])
    )
  );
