GRANT SELECT, INSERT, UPDATE ON public.support_tickets TO authenticated;
GRANT ALL ON public.support_tickets TO service_role;

DROP POLICY IF EXISTS "Internal staff can create tickets" ON public.support_tickets;
CREATE POLICY "Internal staff can create tickets"
ON public.support_tickets
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'agent_master'::app_role)
  OR has_role(auth.uid(), 'agent_support'::app_role)
  OR has_role(auth.uid(), 'agent_telephonique'::app_role)
  OR has_role(auth.uid(), 'webmaster'::app_role)
  OR has_role(auth.uid(), 'designer'::app_role)
);