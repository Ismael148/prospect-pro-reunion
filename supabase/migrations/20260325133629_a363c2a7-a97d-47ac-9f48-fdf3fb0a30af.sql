
DROP POLICY IF EXISTS "Authenticated users can insert email logs" ON public.email_send_log;

CREATE POLICY "Admins can insert email logs"
  ON public.email_send_log FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
