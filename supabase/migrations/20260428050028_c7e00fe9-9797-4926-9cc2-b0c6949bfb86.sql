-- Historique des modifications de notes de module
CREATE TABLE public.module_note_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  note_id UUID NOT NULL,
  project_id UUID NOT NULL,
  module_id TEXT NOT NULL,
  previous_content TEXT NOT NULL,
  edited_by UUID NOT NULL,
  edited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  action TEXT NOT NULL DEFAULT 'update'
);

ALTER TABLE public.module_note_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view note history"
ON public.module_note_history FOR SELECT
TO authenticated USING (true);

CREATE POLICY "Authenticated can insert note history"
ON public.module_note_history FOR INSERT
TO authenticated WITH CHECK (auth.uid() = edited_by);

CREATE INDEX idx_module_note_history_note ON public.module_note_history(note_id);
CREATE INDEX idx_module_note_history_project ON public.module_note_history(project_id);