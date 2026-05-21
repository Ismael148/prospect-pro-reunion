
CREATE TABLE public.reservation_ical_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  airbnb_url TEXT,
  booking_url TEXT,
  vrbo_url TEXT,
  gites_url TEXT,
  expedia_url TEXT,
  other_urls JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'soumis',
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_resa_ical_client ON public.reservation_ical_submissions(client_id);

ALTER TABLE public.reservation_ical_submissions ENABLE ROW LEVEL SECURITY;

-- Authenticated users (team) can view/manage submissions
CREATE POLICY "Authenticated can view ical submissions"
ON public.reservation_ical_submissions FOR SELECT
TO authenticated USING (true);

CREATE POLICY "Authenticated can update ical submissions"
ON public.reservation_ical_submissions FOR UPDATE
TO authenticated USING (true);

CREATE POLICY "Authenticated can delete ical submissions"
ON public.reservation_ical_submissions FOR DELETE
TO authenticated USING (true);

-- Public (anon) can insert via the public form route (the page resolves client_id from support_token server-side via RPC-less query; we allow insert when client_id matches an existing client)
CREATE POLICY "Public can insert ical submissions"
ON public.reservation_ical_submissions FOR INSERT
TO anon, authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.clients c WHERE c.id = client_id)
);

-- Allow anon to look up a client_id from a support_token (already used by other public forms) — no change needed if clients table already allows this. We add a narrow SELECT policy only if missing.

CREATE TRIGGER update_resa_ical_updated_at
BEFORE UPDATE ON public.reservation_ical_submissions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
