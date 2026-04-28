ALTER TABLE public.clients REPLICA IDENTITY FULL;
ALTER TABLE public.projects REPLICA IDENTITY FULL;
ALTER TABLE public.project_tasks REPLICA IDENTITY FULL;
ALTER TABLE public.logo_reminder_log REPLICA IDENTITY FULL;
ALTER TABLE public.email_send_log REPLICA IDENTITY FULL;
ALTER TABLE public.support_tickets REPLICA IDENTITY FULL;
ALTER TABLE public.social_deliverables REPLICA IDENTITY FULL;
ALTER TABLE public.social_publications REPLICA IDENTITY FULL;
ALTER TABLE public.invoices REPLICA IDENTITY FULL;
ALTER TABLE public.prospects REPLICA IDENTITY FULL;
ALTER TABLE public.client_activities REPLICA IDENTITY FULL;
ALTER TABLE public.commissions REPLICA IDENTITY FULL;
ALTER TABLE public.expenses REPLICA IDENTITY FULL;
ALTER TABLE public.client_forms REPLICA IDENTITY FULL;
ALTER TABLE public.domain_renewals REPLICA IDENTITY FULL;
ALTER TABLE public.contacts REPLICA IDENTITY FULL;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'clients','projects','project_tasks','logo_reminder_log','email_send_log',
    'support_tickets','social_deliverables','social_publications','invoices',
    'prospects','client_activities','commissions','expenses','client_forms',
    'domain_renewals','contacts'
  ] LOOP
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    EXCEPTION WHEN duplicate_object THEN
      NULL;
    END;
  END LOOP;
END $$;