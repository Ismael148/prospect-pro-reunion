
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS relance_facebook_needed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS relance_facebook_at timestamptz,
  ADD COLUMN IF NOT EXISTS relance_facebook_by uuid,
  ADD COLUMN IF NOT EXISTS relance_facebook_note text,
  ADD COLUMN IF NOT EXISTS relance_gmb_needed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS relance_gmb_at timestamptz,
  ADD COLUMN IF NOT EXISTS relance_gmb_by uuid,
  ADD COLUMN IF NOT EXISTS relance_gmb_note text;

CREATE OR REPLACE FUNCTION public.notify_relance_flag_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recipient uuid;
  v_title text;
  v_msg text;
  v_kind text;
  v_changed boolean := false;
  v_enabled boolean;
  v_note text;
BEGIN
  IF NEW.relance_facebook_needed IS DISTINCT FROM OLD.relance_facebook_needed THEN
    v_kind := 'facebook';
    v_enabled := NEW.relance_facebook_needed;
    v_note := NEW.relance_facebook_note;
    v_changed := true;
  ELSIF NEW.relance_gmb_needed IS DISTINCT FROM OLD.relance_gmb_needed THEN
    v_kind := 'gmb';
    v_enabled := NEW.relance_gmb_needed;
    v_note := NEW.relance_gmb_note;
    v_changed := true;
  END IF;

  IF NOT v_changed THEN
    RETURN NEW;
  END IF;

  IF v_enabled THEN
    v_title := CASE WHEN v_kind = 'facebook' THEN '📘 Relance Facebook à faire' ELSE '📍 Relance GMB à faire' END;
    v_msg := 'Le client "' || COALESCE(NEW.company_name, '—') || '" doit être rappelé pour ' ||
             CASE WHEN v_kind = 'facebook' THEN 'le Business Manager Facebook' ELSE 'la fiche Google My Business' END
             || COALESCE(' — ' || v_note, '');
  ELSE
    v_title := CASE WHEN v_kind = 'facebook' THEN '✅ Relance Facebook terminée' ELSE '✅ Relance GMB terminée' END;
    v_msg := 'La relance ' || CASE WHEN v_kind = 'facebook' THEN 'Facebook' ELSE 'GMB' END
             || ' pour "' || COALESCE(NEW.company_name, '—') || '" a été marquée comme traitée.';
  END IF;

  FOR v_recipient IN
    SELECT DISTINCT ur.user_id FROM user_roles ur
    WHERE ur.role IN ('agent_support','agent_master','agent_telephonique','admin')
  LOOP
    INSERT INTO notifications (user_id, title, message, type, link)
    VALUES (v_recipient, v_title, v_msg, 'relance_' || v_kind, '/clients/' || NEW.id);
  END LOOP;

  -- timestamp/author
  IF v_kind = 'facebook' AND v_enabled THEN
    NEW.relance_facebook_at := now();
  ELSIF v_kind = 'gmb' AND v_enabled THEN
    NEW.relance_gmb_at := now();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_relance_flag_change ON public.clients;
CREATE TRIGGER trg_notify_relance_flag_change
BEFORE UPDATE OF relance_facebook_needed, relance_gmb_needed ON public.clients
FOR EACH ROW EXECUTE FUNCTION public.notify_relance_flag_change();
