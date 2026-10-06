CREATE OR REPLACE FUNCTION public.task_role_for_module(_module text)
RETURNS app_role LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE
    WHEN _module IN ('carte_business','nfc','video_short','visuels_gmb','reseaux') THEN 'designer'::app_role
    WHEN _module IN ('formation') THEN 'agent_master'::app_role
    ELSE 'webmaster'::app_role
  END
$$;

CREATE OR REPLACE FUNCTION public.pick_least_loaded_user(_role app_role)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT ur.user_id
  FROM user_roles ur
  LEFT JOIN project_tasks t ON t.assigned_to = ur.user_id AND t.status <> 'termine'
  WHERE ur.role = _role
  GROUP BY ur.user_id
  ORDER BY count(t.id) ASC, ur.user_id
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.auto_assign_project_task()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _mod text;
BEGIN
  IF NEW.assigned_to IS NULL THEN
    _mod := substring(coalesce(NEW.description,'') from '^\[([^\]]+)\]');
    NEW.assigned_to := public.pick_least_loaded_user(public.task_role_for_module(coalesce(_mod,'')));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_assign_project_task ON public.project_tasks;
CREATE TRIGGER trg_auto_assign_project_task
BEFORE INSERT ON public.project_tasks
FOR EACH ROW EXECUTE FUNCTION public.auto_assign_project_task();

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id, description FROM public.project_tasks WHERE assigned_to IS NULL AND status <> 'termine' ORDER BY created_at LOOP
    UPDATE public.project_tasks
      SET assigned_to = public.pick_least_loaded_user(public.task_role_for_module(coalesce(substring(coalesce(r.description,'') from '^\[([^\]]+)\]'),'')))
      WHERE id = r.id;
  END LOOP;
END $$;