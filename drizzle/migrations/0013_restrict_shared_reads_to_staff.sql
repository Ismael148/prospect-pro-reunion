CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _user_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id
  )
$$;

REVOKE ALL ON FUNCTION public.is_staff(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "Authenticated users can view publications" ON public.social_publications;
CREATE POLICY "Staff can view publications" ON public.social_publications
  FOR SELECT TO authenticated
  USING (auth.uid() = created_by OR public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can view all projects" ON public.projects;
CREATE POLICY "Staff can view projects" ON public.projects
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can view templates" ON public.saved_email_templates;
CREATE POLICY "Staff can view templates" ON public.saved_email_templates
  FOR SELECT TO authenticated
  USING (auth.uid() = created_by OR public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can view external commercials" ON public.external_commercials;
CREATE POLICY "Staff can view external commercials" ON public.external_commercials
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Authenticated can view gmb activities" ON public.gmb_activities;
CREATE POLICY "Staff can view gmb activities" ON public.gmb_activities
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can view all prospects" ON public.prospects;
CREATE POLICY "Staff can view prospects" ON public.prospects
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can view social deliverables" ON public.social_deliverables;
CREATE POLICY "Staff can view social deliverables" ON public.social_deliverables
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Authenticated can view seen marks" ON public.seen_marks;
CREATE POLICY "Staff can view seen marks" ON public.seen_marks
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can view all contacts" ON public.contacts;
CREATE POLICY "Staff can view contacts" ON public.contacts
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Authenticated can view logo reminder log" ON public.logo_reminder_log;
CREATE POLICY "Staff can view logo reminder log" ON public.logo_reminder_log
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Authenticated can view renewal reminders" ON public.domain_renewal_reminders;
CREATE POLICY "Staff can view renewal reminders" ON public.domain_renewal_reminders
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Authenticated can view profiles" ON public.profiles;
CREATE POLICY "Staff can view profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Authenticated can view branding" ON public.email_branding;
CREATE POLICY "Staff can view branding" ON public.email_branding
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can view module notes" ON public.module_notes;
CREATE POLICY "Staff can view module notes" ON public.module_notes
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Authenticated can view note history" ON public.module_note_history;
CREATE POLICY "Staff can view note history" ON public.module_note_history
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can view comments" ON public.ticket_comments;
CREATE POLICY "Staff can view comments" ON public.ticket_comments
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Authenticated can view ical submissions" ON public.reservation_ical_submissions;
CREATE POLICY "Staff can view ical submissions" ON public.reservation_ical_submissions
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Authenticated can view calendar events" ON public.calendar_events;
CREATE POLICY "Staff can view calendar events" ON public.calendar_events
  FOR SELECT TO authenticated
  USING (auth.uid() = created_by OR public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can view all tasks" ON public.project_tasks;
CREATE POLICY "Staff can view tasks" ON public.project_tasks
  FOR SELECT TO authenticated
  USING (auth.uid() = assigned_to OR public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can view all deliverables" ON public.deliverables;
CREATE POLICY "Staff can view deliverables" ON public.deliverables
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can view activities" ON public.client_activities;
CREATE POLICY "Staff can view activities" ON public.client_activities
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Authenticated can view reminders" ON public.client_reminders;
CREATE POLICY "Staff can view reminders" ON public.client_reminders
  FOR SELECT TO authenticated
  USING (auth.uid() = created_by OR auth.uid() = assigned_to OR public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Authenticated can view gmb goals" ON public.gmb_monthly_goals;
CREATE POLICY "Staff can view gmb goals" ON public.gmb_monthly_goals
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));