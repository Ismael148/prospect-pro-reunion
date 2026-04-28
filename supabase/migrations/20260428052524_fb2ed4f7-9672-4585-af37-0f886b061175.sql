CREATE TABLE public.module_note_export_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL,
  module_id TEXT NOT NULL,
  module_name TEXT,
  exported_by UUID NOT NULL,
  format TEXT NOT NULL,
  scope TEXT NOT NULL DEFAULT 'note',
  note_id UUID,
  rows_count INTEGER NOT NULL DEFAULT 0,
  file_name TEXT NOT NULL,
  file_data TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.module_note_export_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view export logs"
ON public.module_note_export_log
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated can insert own export logs"
ON public.module_note_export_log
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = exported_by);

CREATE POLICY "Admins and owners can delete export logs"
ON public.module_note_export_log
FOR DELETE
TO authenticated
USING (auth.uid() = exported_by OR has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_mnel_module ON public.module_note_export_log(project_id, module_id, created_at DESC);
