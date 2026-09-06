ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS billing_amount numeric;