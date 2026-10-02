CREATE POLICY "Production staff can update tasks"
ON public.project_tasks FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'webmaster') OR public.has_role(auth.uid(), 'designer') OR public.has_role(auth.uid(), 'agent_master'))
WITH CHECK (public.has_role(auth.uid(), 'webmaster') OR public.has_role(auth.uid(), 'designer') OR public.has_role(auth.uid(), 'agent_master'));

CREATE POLICY "Production staff can insert tasks"
ON public.project_tasks FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'webmaster') OR public.has_role(auth.uid(), 'designer') OR public.has_role(auth.uid(), 'agent_master'));