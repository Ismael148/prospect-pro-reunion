-- Email branding config (single row)
CREATE TABLE public.email_branding (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  logo_url text NOT NULL DEFAULT 'https://ai.adamkom.com/lovable-uploads/d6c24753-6c76-49a3-8a6d-fe0dd4a898be.png',
  slogan text NOT NULL DEFAULT 'La performance digitale pour votre entreprise',
  brand_color text NOT NULL DEFAULT '#ff006e',
  footer_company text NOT NULL DEFAULT 'Adamkom',
  footer_tagline text NOT NULL DEFAULT 'La performance digitale',
  footer_phone text NOT NULL DEFAULT '0262 66 68 76',
  footer_copyright text NOT NULL DEFAULT 'Adamkom by JJP — La Réunion 🇷🇪',
  support_cta_title text NOT NULL DEFAULT '📋 Besoin d''une modification ?',
  support_cta_text text NOT NULL DEFAULT 'Chez Adamkom, toutes vos demandes de modifications passent par notre système de ticket support. C''est le moyen le plus rapide et le plus efficace pour être pris en charge.',
  support_cta_button text NOT NULL DEFAULT '📋 Ouvrir un ticket support',
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.email_branding ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view branding" ON public.email_branding FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anon can view branding" ON public.email_branding FOR SELECT TO anon USING (true);
CREATE POLICY "Admins can update branding" ON public.email_branding FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can insert branding" ON public.email_branding FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Insert default row
INSERT INTO public.email_branding DEFAULT VALUES;