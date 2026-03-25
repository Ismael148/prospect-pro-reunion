CREATE TABLE public.saved_email_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  category TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.saved_email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view templates" ON public.saved_email_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert templates" ON public.saved_email_templates FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Owners and admins can update templates" ON public.saved_email_templates FOR UPDATE TO authenticated USING (auth.uid() = created_by OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Owners and admins can delete templates" ON public.saved_email_templates FOR DELETE TO authenticated USING (auth.uid() = created_by OR has_role(auth.uid(), 'admin'::app_role));