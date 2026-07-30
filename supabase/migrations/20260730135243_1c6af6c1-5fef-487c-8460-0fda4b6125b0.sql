
CREATE OR REPLACE FUNCTION public.submit_reservation_ical_public(
  p_token uuid,
  p_airbnb_url text DEFAULT NULL,
  p_booking_url text DEFAULT NULL,
  p_vrbo_url text DEFAULT NULL,
  p_gites_url text DEFAULT NULL,
  p_expedia_url text DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_client_id uuid;
  v_id uuid;
  v_urls text[];
  u text;
BEGIN
  SELECT c.id INTO v_client_id FROM public.clients c WHERE c.support_token = p_token LIMIT 1;
  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Lien invalide ou expiré';
  END IF;

  v_urls := ARRAY[p_airbnb_url, p_booking_url, p_vrbo_url, p_gites_url, p_expedia_url];

  IF (SELECT count(*) FROM unnest(v_urls) x WHERE nullif(btrim(x), '') IS NOT NULL) = 0 THEN
    RAISE EXCEPTION 'Au moins un lien iCal est requis';
  END IF;

  FOREACH u IN ARRAY v_urls LOOP
    IF nullif(btrim(u), '') IS NOT NULL THEN
      IF length(btrim(u)) > 2000 OR btrim(u) !~* '^https?://' THEN
        RAISE EXCEPTION 'Lien iCal invalide';
      END IF;
    END IF;
  END LOOP;

  IF p_notes IS NOT NULL AND length(p_notes) > 5000 THEN
    RAISE EXCEPTION 'Notes trop longues';
  END IF;

  INSERT INTO public.reservation_ical_submissions (
    client_id, airbnb_url, booking_url, vrbo_url, gites_url, expedia_url, notes
  ) VALUES (
    v_client_id,
    nullif(btrim(p_airbnb_url), ''),
    nullif(btrim(p_booking_url), ''),
    nullif(btrim(p_vrbo_url), ''),
    nullif(btrim(p_gites_url), ''),
    nullif(btrim(p_expedia_url), ''),
    nullif(btrim(p_notes), '')
  ) RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_reservation_ical_public(uuid,text,text,text,text,text,text) FROM public;
GRANT EXECUTE ON FUNCTION public.submit_reservation_ical_public(uuid,text,text,text,text,text,text) TO anon, authenticated;

DROP POLICY IF EXISTS "Public can insert ical submissions" ON public.reservation_ical_submissions;
REVOKE INSERT ON public.reservation_ical_submissions FROM anon;
