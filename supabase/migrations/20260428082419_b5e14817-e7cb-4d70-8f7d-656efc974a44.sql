CREATE OR REPLACE FUNCTION public.prevent_duplicate_email_log()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'sent' AND EXISTS (
    SELECT 1 FROM public.email_send_log
    WHERE recipient_email = NEW.recipient_email
      AND subject = NEW.subject
      AND COALESCE(project_id::text, '') = COALESCE(NEW.project_id::text, '')
      AND COALESCE(deliverable_id::text, '') = COALESCE(NEW.deliverable_id::text, '')
      AND status = 'sent'
      AND created_at > now() - interval '60 seconds'
  ) THEN
    -- silently swallow the duplicate
    RETURN NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_duplicate_email_log_trigger ON public.email_send_log;
CREATE TRIGGER prevent_duplicate_email_log_trigger
BEFORE INSERT ON public.email_send_log
FOR EACH ROW EXECUTE FUNCTION public.prevent_duplicate_email_log();