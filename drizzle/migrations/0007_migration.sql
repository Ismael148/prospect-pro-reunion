CREATE TABLE public.followup_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  contact_name text,
  slots text NOT NULL,
  message text,
  status text NOT NULL DEFAULT 'en_attente' CHECK (status IN ('en_attente','confirme','recale','annule')),
  rdv_at timestamptz,
  meet_link text,
  handled_by uuid,
  handled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX followup_requests_client_idx ON public.followup_requests(client_id);
ALTER TABLE public.followup_requests ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.followup_requests TO authenticated;
GRANT ALL ON public.followup_requests TO service_role;

CREATE POLICY followup_staff_select ON public.followup_requests FOR SELECT TO authenticated
USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'agent_support') OR public.has_role(auth.uid(),'agent_master') OR public.has_role(auth.uid(),'webmaster'));
CREATE POLICY followup_staff_update ON public.followup_requests FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'agent_support') OR public.has_role(auth.uid(),'agent_master') OR public.has_role(auth.uid(),'webmaster'));
CREATE POLICY followup_admin_delete ON public.followup_requests FOR DELETE TO authenticated
USING (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.submit_followup_request(p_token uuid, p_name text, p_slots text, p_message text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_client uuid; v_id uuid;
BEGIN
  SELECT id INTO v_client FROM public.clients WHERE support_token = p_token LIMIT 1;
  IF v_client IS NULL THEN RAISE EXCEPTION 'Lien invalide'; END IF;
  IF coalesce(trim(p_slots),'') = '' OR length(p_slots) > 2000 OR length(coalesce(p_message,'')) > 3000 THEN
    RAISE EXCEPTION 'Créneaux invalides';
  END IF;
  INSERT INTO public.followup_requests(client_id, contact_name, slots, message)
  VALUES (v_client, nullif(left(trim(p_name),200),''), trim(p_slots), nullif(trim(p_message),''))
  RETURNING id INTO v_id;
  RETURN v_id;
END $$;
GRANT EXECUTE ON FUNCTION public.submit_followup_request(uuid,text,text,text) TO anon, authenticated;