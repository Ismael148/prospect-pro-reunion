
ALTER TABLE public.email_send_log ADD COLUMN IF NOT EXISTS message_id text;
ALTER TABLE public.email_send_log ADD COLUMN IF NOT EXISTS campaign_name text;

-- Allow service role and anon to insert logs (for webhook)
CREATE POLICY "Service can insert email logs" ON public.email_send_log FOR INSERT TO anon WITH CHECK (true);

-- Allow updates for webhook status changes
CREATE POLICY "Service can update email logs" ON public.email_send_log FOR UPDATE TO anon USING (true);
CREATE POLICY "Admins can update email logs" ON public.email_send_log FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
