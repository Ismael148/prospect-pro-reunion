CREATE POLICY "Followup staff view followup email logs"
ON public.email_send_log
FOR SELECT
TO authenticated
USING (
  (metadata->>'trigger') = 'tuning_followup'
  AND (
    public.has_role(auth.uid(), 'agent_master'::app_role)
    OR public.has_role(auth.uid(), 'agent_support'::app_role)
    OR public.has_role(auth.uid(), 'webmaster'::app_role)
  )
);