CREATE TABLE public.seo_training_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id text NOT NULL,
  module_id text NOT NULL,
  completed boolean NOT NULL DEFAULT true,
  quiz_score integer,
  quiz_total integer,
  notes text,
  completed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, lesson_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.seo_training_progress TO authenticated;
GRANT ALL ON public.seo_training_progress TO service_role;

ALTER TABLE public.seo_training_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own training progress"
ON public.seo_training_progress FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins and masters can view all training progress"
ON public.seo_training_progress FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'agent_master'));

CREATE TRIGGER update_seo_training_progress_updated_at
BEFORE UPDATE ON public.seo_training_progress
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();