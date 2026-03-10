
-- Add unique support token to clients for public form links
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS support_token uuid DEFAULT gen_random_uuid() UNIQUE;

-- Backfill existing clients with tokens
UPDATE public.clients SET support_token = gen_random_uuid() WHERE support_token IS NULL;

-- Support ticket categories
CREATE TYPE public.support_category AS ENUM (
  'modification_site',
  'modification_carte_nfc',
  'fiche_google',
  'reseaux_sociaux',
  'bug_technique',
  'question',
  'autre'
);

CREATE TYPE public.ticket_status AS ENUM (
  'ouvert',
  'en_cours',
  'resolu',
  'ferme'
);

-- Support tickets table
CREATE TABLE public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  ticket_number text NOT NULL UNIQUE,
  category support_category NOT NULL DEFAULT 'autre',
  subject text NOT NULL,
  message text NOT NULL,
  attachments text[], -- array of file URLs
  status ticket_status NOT NULL DEFAULT 'ouvert',
  priority text NOT NULL DEFAULT 'normale', -- normale, urgente
  resolved_at timestamp with time zone,
  resolved_by uuid,
  admin_notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- Public can insert (for the public form - no auth required)
CREATE POLICY "Anyone can create support tickets" ON public.support_tickets
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Authenticated users can view all tickets
CREATE POLICY "Authenticated users can view tickets" ON public.support_tickets
  FOR SELECT TO authenticated
  USING (true);

-- Admins can update tickets
CREATE POLICY "Admins can update tickets" ON public.support_tickets
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can delete tickets
CREATE POLICY "Admins can delete tickets" ON public.support_tickets
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Auto-generate ticket number
CREATE SEQUENCE IF NOT EXISTS public.ticket_number_seq START WITH 1;

CREATE OR REPLACE FUNCTION public.generate_ticket_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.ticket_number IS NULL THEN
    NEW.ticket_number := 'TKT-' || LPAD(nextval('public.ticket_number_seq')::text, 5, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_generate_ticket_number
  BEFORE INSERT ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_ticket_number();

-- Updated_at trigger
CREATE TRIGGER update_support_tickets_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Allow anon to read clients by support_token (for public form)
CREATE POLICY "Anon can read client by support token" ON public.clients
  FOR SELECT TO anon
  USING (support_token IS NOT NULL);
