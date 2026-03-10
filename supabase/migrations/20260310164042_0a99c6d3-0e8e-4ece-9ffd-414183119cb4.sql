
-- Add NDI (auto-generated client number) and signed_by (commercial who signed)
ALTER TABLE public.clients 
  ADD COLUMN IF NOT EXISTS ndi text UNIQUE,
  ADD COLUMN IF NOT EXISTS signed_by uuid;

-- Create sequence for NDI
CREATE SEQUENCE IF NOT EXISTS public.clients_ndi_seq START WITH 1;

-- Function to auto-generate NDI on insert
CREATE OR REPLACE FUNCTION public.generate_client_ndi()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.ndi IS NULL THEN
    NEW.ndi := 'CLI-' || LPAD(nextval('public.clients_ndi_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger to auto-generate NDI
DROP TRIGGER IF EXISTS trg_generate_ndi ON public.clients;
CREATE TRIGGER trg_generate_ndi
  BEFORE INSERT ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_client_ndi();

-- Backfill existing clients with NDI
DO $$
DECLARE
  r RECORD;
  counter integer := 1;
BEGIN
  FOR r IN SELECT id FROM public.clients ORDER BY created_at ASC LOOP
    UPDATE public.clients SET ndi = 'CLI-' || LPAD(counter::text, 4, '0') WHERE id = r.id AND ndi IS NULL;
    counter := counter + 1;
  END LOOP;
  -- Set sequence to next value
  PERFORM setval('public.clients_ndi_seq', counter);
END;
$$;
