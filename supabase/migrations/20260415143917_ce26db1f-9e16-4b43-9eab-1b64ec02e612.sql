
-- Fix INSERT policy to be more restrictive
DROP POLICY "Authenticated users can insert social deliverables" ON public.social_deliverables;

CREATE POLICY "Project members can insert social deliverables"
  ON public.social_deliverables FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = social_deliverables.project_id
      AND (p.assigned_to = auth.uid() OR p.created_by = auth.uid())
    )
  );
