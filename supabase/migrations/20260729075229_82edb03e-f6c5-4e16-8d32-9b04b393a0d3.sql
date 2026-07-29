CREATE OR REPLACE FUNCTION public.create_support_ticket_public(
  p_token text,
  p_category text,
  p_subject text,
  p_message text,
  p_priority text DEFAULT 'normale',
  p_attachments text[] DEFAULT NULL
)
RETURNS TABLE(id uuid, ticket_number text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_id uuid;
  v_ticket_id uuid;
  v_ticket_number text;
BEGIN
  SELECT c.id INTO v_client_id
  FROM public.clients c
  WHERE c.support_token = p_token
  LIMIT 1;

  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Lien invalide';
  END IF;

  IF trim(coalesce(p_subject, '')) = '' THEN
    RAISE EXCEPTION 'Objet invalide';
  END IF;

  IF trim(coalesce(p_message, '')) = '' THEN
    RAISE EXCEPTION 'Message invalide';
  END IF;

  IF p_attachments IS NOT NULL AND array_length(p_attachments, 1) > 10 THEN
    RAISE EXCEPTION 'Trop de pièces jointes';
  END IF;

  INSERT INTO public.support_tickets (client_id, category, subject, message, priority, attachments, status)
  VALUES (
    v_client_id,
    p_category,
    trim(p_subject),
    trim(p_message),
    COALESCE(NULLIF(trim(p_priority), ''), 'normale'),
    p_attachments,
    'ouvert'
  )
  RETURNING support_tickets.id, support_tickets.ticket_number INTO v_ticket_id, v_ticket_number;

  RETURN QUERY SELECT v_ticket_id, v_ticket_number;
END;
$$;