-- Social accounts linked to a client (Facebook, Instagram, Google My Business)
CREATE TABLE public.social_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  platform text NOT NULL CHECK (platform IN ('facebook', 'instagram', 'google_my_business')),
  profile_url text,
  username text,
  page_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.social_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view social accounts"
  ON public.social_accounts FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert social accounts"
  ON public.social_accounts FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update social accounts"
  ON public.social_accounts FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can delete social accounts"
  ON public.social_accounts FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_social_accounts_updated_at
  BEFORE UPDATE ON public.social_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Planned social publications per client
CREATE TABLE public.social_publications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  platform text NOT NULL CHECK (platform IN ('facebook', 'instagram', 'google_my_business')),
  content text NOT NULL,
  image_url text,
  scheduled_date date,
  status text NOT NULL DEFAULT 'a_faire' CHECK (status IN ('a_faire', 'planifie', 'publie')),
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.social_publications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view publications"
  ON public.social_publications FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert publications"
  ON public.social_publications FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Authenticated users can update publications"
  ON public.social_publications FOR UPDATE
  USING ((auth.uid() = created_by) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete publications"
  ON public.social_publications FOR DELETE
  USING ((auth.uid() = created_by) OR has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_social_publications_updated_at
  BEFORE UPDATE ON public.social_publications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();