
-- Create notifications table
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  message text,
  type text NOT NULL DEFAULT 'info',
  read boolean NOT NULL DEFAULT false,
  link text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- System can insert notifications (via trigger with security definer)
CREATE POLICY "System can insert notifications" ON public.notifications
  FOR INSERT TO authenticated WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Trigger function: create notification on prospect assignment or status change
CREATE OR REPLACE FUNCTION public.notify_prospect_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  prospect_name text;
  target_user uuid;
BEGIN
  prospect_name := NEW.business_name;

  -- Notify on assignment change
  IF (TG_OP = 'UPDATE' AND OLD.assigned_to IS DISTINCT FROM NEW.assigned_to AND NEW.assigned_to IS NOT NULL) THEN
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (
      NEW.assigned_to,
      'Prospect assigné',
      'Le prospect "' || prospect_name || '" vous a été assigné.',
      'assignment',
      '/prospection'
    );
  END IF;

  -- Notify on status change
  IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
    -- Notify the assigned user (or creator)
    target_user := COALESCE(NEW.assigned_to, NEW.created_by);
    IF target_user IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, title, message, type, link)
      VALUES (
        target_user,
        'Statut prospect modifié',
        'Le prospect "' || prospect_name || '" est passé en "' || NEW.status::text || '".',
        'status_change',
        '/prospection'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_prospect_change
  AFTER UPDATE ON public.prospects
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_prospect_changes();
