
-- Create social deliverables table
CREATE TABLE public.social_deliverables (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  month_year TEXT NOT NULL, -- format: 2026-04
  type TEXT NOT NULL CHECK (type IN ('post_visuel', 'video_influenceur')),
  status TEXT NOT NULL DEFAULT 'a_faire' CHECK (status IN ('a_faire', 'en_cours', 'livre', 'valide')),
  file_url TEXT,
  notes TEXT,
  delivered_by UUID,
  delivered_at TIMESTAMPTZ,
  validated_by UUID,
  validated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(client_id, month_year, type)
);

-- Enable RLS
ALTER TABLE public.social_deliverables ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Authenticated users can view social deliverables"
  ON public.social_deliverables FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert social deliverables"
  ON public.social_deliverables FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins and project members can update social deliverables"
  ON public.social_deliverables FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = social_deliverables.project_id
      AND (p.assigned_to = auth.uid() OR p.created_by = auth.uid())
    )
  );

CREATE POLICY "Admins can delete social deliverables"
  ON public.social_deliverables FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_social_deliverables_updated_at
  BEFORE UPDATE ON public.social_deliverables
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to generate monthly social deliverables for all active numerik projects
CREATE OR REPLACE FUNCTION public.generate_monthly_social_deliverables()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_month TEXT;
  v_project RECORD;
BEGIN
  v_month := to_char(now(), 'YYYY-MM');

  FOR v_project IN
    SELECT p.id AS project_id, p.client_id
    FROM projects p
    WHERE p.pack_type = 'star_bizness_numerik'
      AND p.status NOT IN ('termine', 'annule')
  LOOP
    -- Post visuel FB/IG
    INSERT INTO social_deliverables (project_id, client_id, month_year, type)
    VALUES (v_project.project_id, v_project.client_id, v_month, 'post_visuel')
    ON CONFLICT (client_id, month_year, type) DO NOTHING;

    -- Vidéo influenceur
    INSERT INTO social_deliverables (project_id, client_id, month_year, type)
    VALUES (v_project.project_id, v_project.client_id, v_month, 'video_influenceur')
    ON CONFLICT (client_id, month_year, type) DO NOTHING;
  END LOOP;
END;
$$;
