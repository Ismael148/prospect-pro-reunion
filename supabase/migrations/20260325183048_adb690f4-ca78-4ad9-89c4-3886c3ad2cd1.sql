
-- 1) Update the notify_prospect_changes trigger to notify ALL admins with full RDV details
CREATE OR REPLACE FUNCTION public.notify_prospect_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  prospect_name text;
  target_user uuid;
  admin_record record;
  agent_name text;
  rdv_details text;
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

  -- Notify ALL admins when RDV is scheduled
  IF (TG_OP = 'UPDATE' AND NEW.status = 'rdv_planifie' AND OLD.status IS DISTINCT FROM 'rdv_planifie') THEN
    -- Get agent name
    SELECT p.full_name INTO agent_name FROM profiles p WHERE p.user_id = NEW.assigned_to;
    
    rdv_details := 'RDV planifié pour "' || prospect_name || '"'
      || E'\n📅 ' || COALESCE(to_char(NEW.appointment_date, 'DD/MM/YYYY'), 'Date non renseignée')
      || COALESCE(' à ' || LEFT(NEW.appointment_time::text, 5), '')
      || E'\n📍 ' || COALESCE(NEW.address, '') || CASE WHEN NEW.city IS NOT NULL THEN ', ' || NEW.city ELSE '' END
      || E'\n📞 ' || COALESCE(NEW.phone, 'Non renseigné')
      || E'\n🏢 ' || COALESCE(NEW.sector, 'Non renseigné')
      || E'\n👤 Agent : ' || COALESCE(agent_name, 'Non assigné')
      || CASE WHEN NEW.notes IS NOT NULL AND NEW.notes != '' THEN E'\n📝 ' || NEW.notes ELSE '' END;

    FOR admin_record IN SELECT ur.user_id FROM user_roles ur WHERE ur.role = 'admin'
    LOOP
      INSERT INTO public.notifications (user_id, title, message, type, link)
      VALUES (
        admin_record.user_id,
        '📅 RDV planifié — ' || prospect_name,
        rdv_details,
        'rdv_planifie',
        '/prospection'
      );
    END LOOP;
  -- Notify on other status changes (not rdv_planifie, already handled above)
  ELSIF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
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
$function$;

-- 2) Add RLS policy to allow agent_telephonique to update prospects
CREATE POLICY "Agents can update prospects"
ON public.prospects
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'agent_telephonique'::app_role));
