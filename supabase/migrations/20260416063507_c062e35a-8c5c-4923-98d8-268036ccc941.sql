
-- Notify admins when social deliverable status changes
CREATE OR REPLACE FUNCTION public.notify_social_deliverable_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_client_name text;
  v_type_label text;
  v_status_label text;
  v_msg text;
  admin_record record;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    SELECT company_name INTO v_client_name FROM clients WHERE id = NEW.client_id;
    
    v_type_label := CASE NEW.type
      WHEN 'post_visuel' THEN 'Post Visuel FB/IG'
      WHEN 'video_influenceur' THEN 'Vidéo Influenceur'
      ELSE NEW.type
    END;
    
    v_status_label := CASE NEW.status
      WHEN 'a_faire' THEN 'À faire'
      WHEN 'en_cours' THEN 'En cours'
      WHEN 'livre' THEN 'Livré'
      WHEN 'valide' THEN 'Validé'
      ELSE NEW.status
    END;
    
    v_msg := v_type_label || ' (' || COALESCE(v_client_name, 'Client') || ') — ' || NEW.month_year || ' → ' || v_status_label;

    FOR admin_record IN SELECT ur.user_id FROM user_roles ur WHERE ur.role = 'admin'
    LOOP
      INSERT INTO notifications (user_id, title, message, type, link)
      VALUES (admin_record.user_id, '📱 Livrable RS mis à jour', v_msg, 'social_deliverable', '/projets');
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_social_deliverable_update
AFTER UPDATE ON public.social_deliverables
FOR EACH ROW
EXECUTE FUNCTION public.notify_social_deliverable_update();

-- Update notify_prospect_changes to also notify agent_master users
CREATE OR REPLACE FUNCTION public.notify_prospect_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  prospect_name text;
  target_user uuid;
  admin_record record;
  master_record record;
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

  -- Notify ALL admins and agent_masters when RDV is scheduled
  IF (TG_OP = 'UPDATE' AND NEW.status = 'rdv_planifie' AND OLD.status IS DISTINCT FROM 'rdv_planifie') THEN
    SELECT p.full_name INTO agent_name FROM profiles p WHERE p.user_id = NEW.assigned_to;
    
    rdv_details := 'RDV planifié pour "' || prospect_name || '"'
      || E'\n📅 ' || COALESCE(to_char(NEW.appointment_date, 'DD/MM/YYYY'), 'Date non renseignée')
      || COALESCE(' à ' || LEFT(NEW.appointment_time::text, 5), '')
      || E'\n📍 ' || COALESCE(NEW.address, '') || CASE WHEN NEW.city IS NOT NULL THEN ', ' || NEW.city ELSE '' END
      || E'\n📞 ' || COALESCE(NEW.phone, 'Non renseigné')
      || E'\n🏢 ' || COALESCE(NEW.sector, 'Non renseigné')
      || E'\n👤 Agent : ' || COALESCE(agent_name, 'Non assigné')
      || CASE WHEN NEW.notes IS NOT NULL AND NEW.notes != '' THEN E'\n📝 ' || NEW.notes ELSE '' END;

    -- Notify admins
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

    -- Notify agent_masters
    FOR master_record IN SELECT ur.user_id FROM user_roles ur WHERE ur.role = 'agent_master'
    LOOP
      INSERT INTO public.notifications (user_id, title, message, type, link)
      VALUES (
        master_record.user_id,
        '📅 RDV planifié — ' || prospect_name,
        rdv_details,
        'rdv_planifie',
        '/prospection'
      );
    END LOOP;

  -- Notify on other status changes
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

    -- Also notify all agent_masters of ANY status change
    FOR master_record IN SELECT ur.user_id FROM user_roles ur WHERE ur.role = 'agent_master'
    LOOP
      IF master_record.user_id IS DISTINCT FROM target_user THEN
        INSERT INTO public.notifications (user_id, title, message, type, link)
        VALUES (
          master_record.user_id,
          '🔄 Prospect mis à jour — ' || prospect_name,
          'Le prospect "' || prospect_name || '" est passé en "' || NEW.status::text || '".',
          'status_change',
          '/prospection'
        );
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;
