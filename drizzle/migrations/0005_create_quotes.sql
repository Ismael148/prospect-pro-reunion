CREATE TABLE public.quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_number text,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  template_key text NOT NULL DEFAULT 'custom',
  company_name text NOT NULL,
  contact_name text,
  email text,
  phone text,
  address text,
  postal_code text,
  city text,
  siret text,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  discount_amount numeric NOT NULL DEFAULT 0,
  tax_rate numeric NOT NULL DEFAULT 0,
  amount numeric NOT NULL DEFAULT 0,
  tax_amount numeric NOT NULL DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  notes text,
  validity_days integer NOT NULL DEFAULT 30,
  status text NOT NULL DEFAULT 'brouillon',
  sent_at timestamptz,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.quotes TO authenticated;
GRANT ALL ON public.quotes TO service_role;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sales staff manage quotes" ON public.quotes FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'agent_master') OR public.has_role(auth.uid(),'agent_telephonique') OR public.has_role(auth.uid(),'commercial_terrain'))
WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'agent_master') OR public.has_role(auth.uid(),'agent_telephonique') OR public.has_role(auth.uid(),'commercial_terrain'));

CREATE OR REPLACE FUNCTION public.generate_quote_number()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE _n int;
BEGIN
  IF NEW.quote_number IS NULL OR NEW.quote_number = '' THEN
    SELECT count(*) + 1 INTO _n FROM public.quotes WHERE extract(year from created_at) = extract(year from now());
    NEW.quote_number := 'DEV-' || to_char(now(),'YYYY') || '-' || lpad(_n::text, 4, '0');
    WHILE EXISTS (SELECT 1 FROM public.quotes WHERE quote_number = NEW.quote_number) LOOP
      _n := _n + 1;
      NEW.quote_number := 'DEV-' || to_char(now(),'YYYY') || '-' || lpad(_n::text, 4, '0');
    END LOOP;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_generate_quote_number BEFORE INSERT ON public.quotes
FOR EACH ROW EXECUTE FUNCTION public.generate_quote_number();
CREATE TRIGGER trg_quotes_updated_at BEFORE UPDATE ON public.quotes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();