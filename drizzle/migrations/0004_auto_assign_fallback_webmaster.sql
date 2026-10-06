CREATE OR REPLACE FUNCTION public.auto_assign_project_task()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _mod text;
BEGIN
  IF NEW.assigned_to IS NULL THEN
    _mod := substring(coalesce(NEW.description,'') from '^\[([^\]]+)\]');
    NEW.assigned_to := coalesce(
      public.pick_least_loaded_user(public.task_role_for_module(coalesce(_mod,''))),
      public.pick_least_loaded_user('webmaster'::app_role));
  END IF;
  RETURN NEW;
END;
$$;

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM public.project_tasks WHERE assigned_to IS NULL AND status <> 'termine' ORDER BY created_at LOOP
    UPDATE public.project_tasks SET assigned_to = public.pick_least_loaded_user('webmaster'::app_role) WHERE id = r.id;
  END LOOP;
END $$;