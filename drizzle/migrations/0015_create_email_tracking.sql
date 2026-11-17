CREATE TABLE public.email_tracking (
  message_id text PRIMARY KEY,
  client_id uuid,
  template_name text,
  recipient_email text,
  subject text,
  sent_at timestamptz,
  status text NOT NULL DEFAULT 'sent',
  delivered_at timestamptz,
  first_opened_at timestamptz,
  last_opened_at timestamptz,
  open_count integer NOT NULL DEFAULT 0,
  click_count integer NOT NULL DEFAULT 0,
  last_clicked_at timestamptz,
  clicked_links jsonb NOT NULL DEFAULT '[]'::jsonb,
  failure_reason text,
  last_synced_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.email_tracking TO authenticated;
GRANT ALL ON public.email_tracking TO service_role;

ALTER TABLE public.email_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can read email tracking"
ON public.email_tracking FOR SELECT TO authenticated
USING (public.is_staff(auth.uid()));

CREATE INDEX email_tracking_client_idx ON public.email_tracking (client_id, sent_at DESC);