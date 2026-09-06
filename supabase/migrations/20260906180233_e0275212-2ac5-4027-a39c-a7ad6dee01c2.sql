ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS billing_year integer,
  ADD COLUMN IF NOT EXISTS invoiced_offline boolean NOT NULL DEFAULT false;