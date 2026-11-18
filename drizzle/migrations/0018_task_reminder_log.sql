CREATE TABLE public.task_reminder_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignee_id uuid NOT NULL,
  recipient_email text,
  recipient_name text,
  task_count integer NOT NULL DEFAULT 0,
  task_ids uuid[] NOT NULL DEFAULT '{}',
  oldest_due_date date,
  status text NOT NULL DEFAULT 'sent',
  error_message text,
  message_id text,
  trigger text NOT NULL DEFAULT 'auto',
  triggered_by uuid,
  reminder_day date NOT NULL DEFAULT ((now() AT TIME ZONE 'Indian/Reunion')::date),
  opened_at timestamptz,
  open_count integer NOT NULL DEFAULT 0,
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT task_reminder_log_status_check CHECK (status IN ('sent', 'failed', 'no_email')),
  CONSTRAINT task_reminder_log_trigger_check CHECK (trigger IN ('auto', 'manual'))
);

CREATE INDEX task_reminder_log_assignee_idx ON public.task_reminder_log (assignee_id, created_at DESC);
CREATE INDEX task_reminder_log_created_idx ON public.task_reminder_log (created_at DESC);

GRANT SELECT ON public.task_reminder_log TO authenticated;
GRANT ALL ON public.task_reminder_log TO service_role;

ALTER TABLE public.task_reminder_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Support managers view all task reminders"
ON public.task_reminder_log FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'agent_master'::app_role)
  OR public.has_role(auth.uid(), 'agent_support'::app_role)
);

CREATE POLICY "Team members view their own task reminders"
ON public.task_reminder_log FOR SELECT TO authenticated
USING (assignee_id = auth.uid() AND public.is_staff(auth.uid()));

ALTER PUBLICATION supabase_realtime ADD TABLE public.task_reminder_log;