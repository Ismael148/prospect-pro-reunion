
ALTER TABLE public.payment_invitations
  ADD COLUMN IF NOT EXISTS reminder_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_reminder_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_sent_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_payment_invitations_reminder
  ON public.payment_invitations(completed_at, reminder_count, last_reminder_at);
