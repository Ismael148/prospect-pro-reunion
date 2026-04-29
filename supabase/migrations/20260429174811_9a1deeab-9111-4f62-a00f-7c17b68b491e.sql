-- Provider enum
CREATE TYPE public.payment_provider AS ENUM (
  'stripe', 'paypal', 'alma', 'mollie', 'lyra', 'helloasso', 'sumup'
);

CREATE TYPE public.payment_env AS ENUM ('test', 'live');
CREATE TYPE public.payment_status AS ENUM ('en_attente', 'recu', 'configure', 'actif', 'rejete');

CREATE TABLE public.payment_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  client_ndi text,
  company_name text,
  contact_email text NOT NULL,
  contact_name text,
  provider payment_provider NOT NULL,
  environment payment_env NOT NULL DEFAULT 'test',
  credentials jsonb NOT NULL DEFAULT '{}'::jsonb,
  status payment_status NOT NULL DEFAULT 'recu',
  notes text,
  submitted_via text DEFAULT 'public_form',
  submitted_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_payment_credentials_client_id ON public.payment_credentials(client_id);
CREATE INDEX idx_payment_credentials_provider ON public.payment_credentials(provider);
CREATE INDEX idx_payment_credentials_status ON public.payment_credentials(status);

CREATE TRIGGER trg_payment_credentials_updated_at
  BEFORE UPDATE ON public.payment_credentials
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.payment_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  client_ndi text,
  company_name text,
  contact_email text NOT NULL,
  contact_name text,
  token text UNIQUE NOT NULL DEFAULT replace(gen_random_uuid()::text, '-', ''),
  providers payment_provider[] DEFAULT ARRAY['stripe','paypal','alma']::payment_provider[],
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  completed_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_payment_invitations_token ON public.payment_invitations(token);
CREATE INDEX idx_payment_invitations_client_id ON public.payment_invitations(client_id);

ALTER TABLE public.payment_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all payment credentials"
  ON public.payment_credentials FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update payment credentials"
  ON public.payment_credentials FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete payment credentials"
  ON public.payment_credentials FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can submit payment credentials"
  ON public.payment_credentials FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can manage invitations"
  ON public.payment_invitations FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anonymous can read invitations by token"
  ON public.payment_invitations FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE OR REPLACE FUNCTION public.notify_payment_credentials_submission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  admin_record record;
  v_msg text;
BEGIN
  v_msg := '💳 ' || COALESCE(NEW.company_name, NEW.contact_email)
    || ' a envoyé ses clés ' || upper(NEW.provider::text)
    || ' (' || NEW.environment::text || ')';

  FOR admin_record IN SELECT user_id FROM public.user_roles WHERE role = 'admin'
  LOOP
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (
      admin_record.user_id,
      '💳 Nouvelles clés de paiement reçues',
      v_msg,
      'payment_credentials',
      '/paiements'
    );
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_payment_credentials
  AFTER INSERT ON public.payment_credentials
  FOR EACH ROW EXECUTE FUNCTION public.notify_payment_credentials_submission();