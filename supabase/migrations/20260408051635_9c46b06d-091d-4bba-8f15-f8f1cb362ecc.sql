-- Allow agent_master to update any prospect (for dispatching)
CREATE POLICY "Agent masters can update prospects"
ON public.prospects
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'agent_master'::app_role))
WITH CHECK (has_role(auth.uid(), 'agent_master'::app_role));