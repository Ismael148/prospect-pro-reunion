
-- Prospect status enum
CREATE TYPE public.prospect_status AS ENUM (
  'nouveau',
  'a_contacter',
  'contacte',
  'qualifie',
  'non_interesse',
  'converti'
);

-- Prospects table
CREATE TABLE public.prospects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  postal_code TEXT,
  phone TEXT,
  website TEXT,
  email TEXT,
  sector TEXT,
  rating NUMERIC(2,1),
  reviews_count INTEGER,
  google_maps_url TEXT,
  source TEXT DEFAULT 'google_maps',
  status prospect_status NOT NULL DEFAULT 'nouveau',
  assigned_to UUID REFERENCES auth.users(id),
  notes TEXT,
  search_query TEXT,
  search_zone TEXT,
  converted_client_id UUID REFERENCES public.clients(id),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.prospects ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Authenticated users can view all prospects" ON public.prospects
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create prospects" ON public.prospects
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update assigned prospects" ON public.prospects
  FOR UPDATE TO authenticated USING (
    auth.uid() = assigned_to OR auth.uid() = created_by OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins can delete prospects" ON public.prospects
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Indexes
CREATE INDEX idx_prospects_status ON public.prospects(status);
CREATE INDEX idx_prospects_city ON public.prospects(city);
CREATE INDEX idx_prospects_assigned_to ON public.prospects(assigned_to);

-- Trigger for updated_at
CREATE TRIGGER update_prospects_updated_at
  BEFORE UPDATE ON public.prospects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
