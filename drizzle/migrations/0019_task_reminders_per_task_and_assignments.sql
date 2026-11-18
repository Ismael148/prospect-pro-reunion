ALTER TABLE public.task_reminder_log
  ADD COLUMN IF NOT EXISTS task_id uuid,
  ADD COLUMN IF NOT EXISTS task_title text,
  ADD COLUMN IF NOT EXISTS task_due_date date,
  ADD COLUMN IF NOT EXISTS project_id uuid,
  ADD COLUMN IF NOT EXISTS project_name text,
  ADD COLUMN IF NOT EXISTS client_name text;
CREATE INDEX IF NOT EXISTS task_reminder_log_task_idx ON public.task_reminder_log (task_id, created_at DESC);

CREATE TABLE public.team_notification_emails (
  user_id uuid PRIMARY KEY,
  email text NOT NULL CHECK (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' AND length(email) <= 255),
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_notification_emails TO authenticated;
GRANT ALL ON public.team_notification_emails TO service_role;
ALTER TABLE public.team_notification_emails ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins or owner view reminder email" ON public.team_notification_emails FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR (user_id = auth.uid() AND public.is_staff(auth.uid())));
CREATE POLICY "Admins or owner add reminder email" ON public.team_notification_emails FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR (user_id = auth.uid() AND public.is_staff(auth.uid())));
CREATE POLICY "Admins or owner change reminder email" ON public.team_notification_emails FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR (user_id = auth.uid() AND public.is_staff(auth.uid())))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR (user_id = auth.uid() AND public.is_staff(auth.uid())));
CREATE POLICY "Admins or owner remove reminder email" ON public.team_notification_emails FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR (user_id = auth.uid() AND public.is_staff(auth.uid())));

CREATE TABLE public.assignment_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL CHECK (entity_type IN ('client','project')),
  entity_id uuid NOT NULL,
  entity_label text,
  client_id uuid,
  old_assignee uuid,
  new_assignee uuid,
  changed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX assignment_history_created_idx ON public.assignment_history (created_at DESC);
CREATE INDEX assignment_history_entity_idx ON public.assignment_history (entity_type, entity_id);
GRANT SELECT ON public.assignment_history TO authenticated;
GRANT ALL ON public.assignment_history TO service_role;
ALTER TABLE public.assignment_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff view assignment history" ON public.assignment_history FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE OR REPLACE FUNCTION public.log_assignment_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.assigned_to IS DISTINCT FROM OLD.assigned_to THEN
    IF TG_TABLE_NAME = 'clients' THEN
      INSERT INTO public.assignment_history (entity_type, entity_id, entity_label, client_id, old_assignee, new_assignee, changed_by)
      VALUES ('client', NEW.id, NEW.company_name, NEW.id, OLD.assigned_to, NEW.assigned_to, auth.uid());
    ELSE
      INSERT INTO public.assignment_history (entity_type, entity_id, entity_label, client_id, old_assignee, new_assignee, changed_by)
      VALUES ('project', NEW.id, NEW.name, NEW.client_id, OLD.assigned_to, NEW.assigned_to, auth.uid());
    END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER clients_log_assignment AFTER UPDATE OF assigned_to ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.log_assignment_change();
CREATE TRIGGER projects_log_assignment AFTER UPDATE OF assigned_to ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.log_assignment_change();