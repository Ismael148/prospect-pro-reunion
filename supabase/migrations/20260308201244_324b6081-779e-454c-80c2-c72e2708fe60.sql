
-- Pipeline status enum
CREATE TYPE public.pipeline_status AS ENUM (
  'nouveau',
  'contacte',
  'rdv_planifie',
  'proposition_envoyee',
  'negociation',
  'contrat_signe',
  'perdu'
);

-- Pack type enum
CREATE TYPE public.pack_type AS ENUM (
  'star_bizness_numerik',
  'star_bizness_nfc',
  'autre'
);

-- Clients table
CREATE TABLE public.clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name TEXT NOT NULL,
  siret TEXT,
  address TEXT,
  city TEXT,
  postal_code TEXT,
  sector TEXT,
  website TEXT,
  notes TEXT,
  pipeline_status pipeline_status NOT NULL DEFAULT 'nouveau',
  pack_type pack_type,
  assigned_to UUID REFERENCES auth.users(id),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Contacts table (multiple contacts per client)
CREATE TABLE public.contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  position TEXT,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

-- Pipeline history / activity log
CREATE TABLE public.client_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  activity_type TEXT NOT NULL,
  description TEXT,
  old_status pipeline_status,
  new_status pipeline_status,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.client_activities ENABLE ROW LEVEL SECURITY;

-- RLS policies for clients
CREATE POLICY "Authenticated users can view all clients" ON public.clients
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create clients" ON public.clients
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update assigned clients" ON public.clients
  FOR UPDATE TO authenticated USING (
    auth.uid() = assigned_to OR auth.uid() = created_by OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins can delete clients" ON public.clients
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- RLS policies for contacts
CREATE POLICY "Authenticated users can view all contacts" ON public.contacts
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage contacts" ON public.contacts
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update contacts" ON public.contacts
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Admins can delete contacts" ON public.contacts
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- RLS policies for activities
CREATE POLICY "Authenticated users can view activities" ON public.client_activities
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create activities" ON public.client_activities
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Triggers for updated_at
CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_contacts_updated_at
  BEFORE UPDATE ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX idx_clients_pipeline_status ON public.clients(pipeline_status);
CREATE INDEX idx_clients_assigned_to ON public.clients(assigned_to);
CREATE INDEX idx_contacts_client_id ON public.contacts(client_id);
CREATE INDEX idx_activities_client_id ON public.client_activities(client_id);
