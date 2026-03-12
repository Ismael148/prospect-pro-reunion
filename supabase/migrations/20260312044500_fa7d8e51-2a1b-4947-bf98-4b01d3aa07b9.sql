
-- Trigger: Notify user when assigned to a project
CREATE OR REPLACE FUNCTION public.notify_project_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  project_name text;
  client_name text;
BEGIN
  -- Only fire when assigned_to changes and is not null
  IF (TG_OP = 'UPDATE' AND OLD.assigned_to IS DISTINCT FROM NEW.assigned_to AND NEW.assigned_to IS NOT NULL) THEN
    SELECT c.company_name INTO client_name FROM clients c WHERE c.id = NEW.client_id;
    
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (
      NEW.assigned_to,
      'Projet assigné',
      'Le projet "' || NEW.name || '" (' || COALESCE(client_name, '') || ') vous a été assigné.',
      'assignment',
      '/projets/' || NEW.id::text
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_project_assignment
  AFTER UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_project_assignment();

-- Trigger: Notify agent when callback date is tomorrow
-- This will be handled by the existing check-deadlines edge function instead
