
ALTER TABLE public.client_activities
ADD COLUMN admin_seen boolean NOT NULL DEFAULT false,
ADD COLUMN admin_seen_at timestamp with time zone;
