ALTER TYPE public.pack_type ADD VALUE IF NOT EXISTS 'star_bizness_tuning';

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS conversion_page_url text,
  ADD COLUMN IF NOT EXISTS conversion_page_created boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS conversion_page_created_at timestamptz,
  ADD COLUMN IF NOT EXISTS google_reviews_url text,
  ADD COLUMN IF NOT EXISTS search_console_url text;