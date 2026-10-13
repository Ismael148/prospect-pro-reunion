ALTER TABLE public.quotes
  ADD COLUMN deposit_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN payment_due_date date,
  ADD COLUMN is_paid boolean NOT NULL DEFAULT false,
  ADD COLUMN paid_at timestamptz;
CREATE INDEX IF NOT EXISTS quotes_client_id_idx ON public.quotes(client_id);