-- Table for external commercials (no user account needed)
CREATE TABLE public.external_commercials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  phone text,
  email text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.external_commercials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view external commercials"
  ON public.external_commercials FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage external commercials"
  ON public.external_commercials FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Add signed_by_commercial to clients (for external commercials)
ALTER TABLE public.clients 
  ADD COLUMN signed_by_commercial uuid REFERENCES public.external_commercials(id);

-- Add commercial_id to commissions (for external commercials)
ALTER TABLE public.commissions 
  ADD COLUMN commercial_id uuid REFERENCES public.external_commercials(id);

-- Insert the 4 commercials
INSERT INTO public.external_commercials (full_name) VALUES
  ('Gaelle Moriame'),
  ('Marc Lehiban'),
  ('David Duddois'),
  ('Joel Indice');

-- Update trigger for updated_at
CREATE TRIGGER update_external_commercials_updated_at
  BEFORE UPDATE ON public.external_commercials
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();