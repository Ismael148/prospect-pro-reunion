
-- Create module_notes table for feedback on project modules
CREATE TABLE public.module_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  module_id TEXT NOT NULL,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.module_notes ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Authenticated users can view module notes"
ON public.module_notes FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert own module notes"
ON public.module_notes FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authors and admins can update module notes"
ON public.module_notes FOR UPDATE
TO authenticated
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authors and admins can delete module notes"
ON public.module_notes FOR DELETE
TO authenticated
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.module_notes;
