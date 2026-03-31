
-- Create function to auto-sync project progress from task statuses
CREATE OR REPLACE FUNCTION public.sync_project_progress()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  pid uuid;
BEGIN
  pid := coalesce(new.project_id, old.project_id);
  UPDATE public.projects p
  SET progress = coalesce((
    SELECT round(100.0 * count(*) filter (where t.status = 'termine') / nullif(count(*), 0))
    FROM public.project_tasks t
    WHERE t.project_id = pid
  ), 0),
  updated_at = now()
  WHERE p.id = pid;
  RETURN coalesce(new, old);
END;
$$;

-- Create trigger on project_tasks for insert, update of status, and delete
DROP TRIGGER IF EXISTS trg_sync_project_progress ON public.project_tasks;
CREATE TRIGGER trg_sync_project_progress
  AFTER INSERT OR UPDATE OF status OR DELETE
  ON public.project_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_project_progress();
