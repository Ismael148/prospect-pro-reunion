CREATE OR REPLACE FUNCTION public.notify_form_submission()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  client_name text;
  form_label text;
  v_who text;
  v_details text;
  v_resubmit boolean;
BEGIN
  IF NEW.status <> 'soumis' THEN
    RETURN NEW;
  END IF;
  v_resubmit := OLD IS NOT NULL AND OLD.status = 'soumis';
  IF v_resubmit AND OLD.submitted_at IS NOT DISTINCT FROM NEW.submitted_at THEN
    RETURN NEW;
  END IF;

  SELECT company_name INTO client_name FROM clients WHERE id = NEW.client_id;
  form_label := CASE NEW.form_type::text
    WHEN 'nfc' THEN 'Carte NFC'
    WHEN 'conversion' THEN 'Page de conversion'
    ELSE 'Site Internet' END;

  v_who := nullif(btrim(COALESCE(NEW.form_data->>'full_name', '')), '');
  v_details := concat_ws(' · ',
    CASE WHEN v_who IS NOT NULL THEN 'Rempli par ' || v_who END,
    CASE WHEN nullif(btrim(COALESCE(NEW.form_data->>'company_name','')),'') IS NOT NULL
          AND NEW.form_data->>'company_name' IS DISTINCT FROM client_name
         THEN 'Entreprise : ' || (NEW.form_data->>'company_name') END,
    CASE WHEN nullif(btrim(COALESCE(NEW.form_data->>'phone', NEW.form_data->>'contact_phone', '')),'') IS NOT NULL
         THEN 'Tél : ' || COALESCE(nullif(NEW.form_data->>'phone',''), NEW.form_data->>'contact_phone') END,
    CASE WHEN nullif(btrim(COALESCE(NEW.form_data->>'email','')),'') IS NOT NULL THEN 'Email : ' || (NEW.form_data->>'email') END
  );

  INSERT INTO notifications (user_id, title, message, type, link)
  SELECT ur.user_id,
    '📝 ' || COALESCE(client_name, 'Un client') || ' a rempli le formulaire ' || form_label
      || CASE WHEN v_resubmit THEN ' (nouvelle version)' ELSE '' END,
    COALESCE(nullif(v_details, ''), 'Les réponses sont visibles sur la fiche client.'),
    'form_submission',
    '/clients/' || NEW.client_id
  FROM user_roles ur WHERE ur.role = 'admin';

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_followup_request()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  client_name text;
BEGIN
  SELECT company_name INTO client_name FROM clients WHERE id = NEW.client_id;
  INSERT INTO notifications (user_id, title, message, type, link)
  SELECT ur.user_id,
    '📅 ' || COALESCE(client_name, 'Un client') || ' a envoyé ses disponibilités',
    concat_ws(' · ',
      CASE WHEN NEW.contact_name IS NOT NULL THEN 'Rempli par ' || NEW.contact_name END,
      'Créneaux : ' || left(NEW.slots, 160)),
    'form_submission',
    '/suivi-disponibilites'
  FROM user_roles ur WHERE ur.role = 'admin';
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_notify_followup_request ON public.followup_requests;
CREATE TRIGGER trg_notify_followup_request
  AFTER INSERT ON public.followup_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_followup_request();

CREATE OR REPLACE FUNCTION public.notify_reservation_ical_submission()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  client_name text;
BEGIN
  SELECT company_name INTO client_name FROM clients WHERE id = NEW.client_id;
  INSERT INTO notifications (user_id, title, message, type, link)
  SELECT ur.user_id,
    '🗓️ ' || COALESCE(client_name, 'Un client') || ' a envoyé ses liens de calendrier de réservation',
    concat_ws(' · ',
      CASE WHEN NEW.airbnb_url IS NOT NULL THEN 'Airbnb' END,
      CASE WHEN NEW.booking_url IS NOT NULL THEN 'Booking' END,
      CASE WHEN NEW.vrbo_url IS NOT NULL THEN 'Vrbo' END,
      CASE WHEN NEW.gites_url IS NOT NULL THEN 'Gîtes de France' END,
      CASE WHEN NEW.expedia_url IS NOT NULL THEN 'Expedia' END),
    'form_submission',
    '/clients/' || NEW.client_id
  FROM user_roles ur WHERE ur.role = 'admin';
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_notify_reservation_ical ON public.reservation_ical_submissions;
CREATE TRIGGER trg_notify_reservation_ical
  AFTER INSERT ON public.reservation_ical_submissions
  FOR EACH ROW EXECUTE FUNCTION public.notify_reservation_ical_submission();

CREATE OR REPLACE FUNCTION public.submit_whatsapp_onboarding_public(p_company_name text, p_contact_email text, p_whatsapp_number text DEFAULT NULL::text, p_phone_number_id text DEFAULT NULL::text, p_access_token text DEFAULT NULL::text, p_notes text DEFAULT NULL::text, p_client_id uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_id uuid;
  v_client uuid := p_client_id;
BEGIN
  IF coalesce(trim(p_company_name),'') = '' OR coalesce(trim(p_contact_email),'') = '' THEN
    RAISE EXCEPTION 'Nom de société et email obligatoires';
  END IF;

  IF v_client IS NULL THEN
    SELECT id INTO v_client FROM public.clients
    WHERE lower(email) = lower(trim(p_contact_email))
    LIMIT 1;
  END IF;

  INSERT INTO public.whatsapp_onboarding_submissions
    (client_id, company_name, contact_email, whatsapp_number, phone_number_id, access_token, notes)
  VALUES (v_client, trim(p_company_name), trim(p_contact_email), nullif(trim(p_whatsapp_number),''),
          nullif(trim(p_phone_number_id),''), nullif(trim(p_access_token),''), nullif(trim(p_notes),''))
  RETURNING id INTO v_id;

  INSERT INTO public.notifications (user_id, title, message, type, link)
  SELECT ur.user_id, '💬 ' || trim(p_company_name) || ' a rempli le formulaire WhatsApp Business',
         concat_ws(' · ', 'Email : ' || trim(p_contact_email),
           CASE WHEN nullif(trim(p_whatsapp_number),'') IS NOT NULL THEN 'WhatsApp : ' || trim(p_whatsapp_number) END),
         'form_submission',
         CASE WHEN v_client IS NOT NULL THEN '/clients/' || v_client ELSE '/clients' END
  FROM public.user_roles ur WHERE ur.role = 'admin';

  RETURN v_id;
END;
$function$;