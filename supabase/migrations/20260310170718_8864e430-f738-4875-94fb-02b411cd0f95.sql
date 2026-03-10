
-- Enum for form types
CREATE TYPE public.client_form_type AS ENUM ('nfc', 'site');
CREATE TYPE public.client_form_status AS ENUM ('en_attente', 'soumis', 'valide');

-- Client forms table
CREATE TABLE public.client_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  form_type public.client_form_type NOT NULL,
  form_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  status public.client_form_status NOT NULL DEFAULT 'en_attente',
  submitted_at timestamp with time zone,
  validated_at timestamp with time zone,
  validated_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(client_id, form_type)
);

-- Enable RLS
ALTER TABLE public.client_forms ENABLE ROW LEVEL SECURITY;

-- Anon can insert/update forms via support_token (checked in app logic)
CREATE POLICY "Anon can insert client forms"
  ON public.client_forms FOR INSERT
  TO anon
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.clients WHERE clients.id = client_forms.client_id AND clients.support_token IS NOT NULL)
  );

CREATE POLICY "Anon can update client forms"
  ON public.client_forms FOR UPDATE
  TO anon
  USING (
    EXISTS (SELECT 1 FROM public.clients WHERE clients.id = client_forms.client_id AND clients.support_token IS NOT NULL)
  );

CREATE POLICY "Anon can read client forms"
  ON public.client_forms FOR SELECT
  TO anon
  USING (
    EXISTS (SELECT 1 FROM public.clients WHERE clients.id = client_forms.client_id AND clients.support_token IS NOT NULL)
  );

-- Authenticated users can view all forms
CREATE POLICY "Authenticated users can view forms"
  ON public.client_forms FOR SELECT
  TO authenticated
  USING (true);

-- Admins can manage all forms
CREATE POLICY "Admins can manage forms"
  ON public.client_forms FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Updated_at trigger
CREATE TRIGGER update_client_forms_updated_at
  BEFORE UPDATE ON public.client_forms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
