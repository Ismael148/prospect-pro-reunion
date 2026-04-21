
-- Table de log des suppressions clients
CREATE TABLE public.deleted_clients_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  original_client_id uuid NOT NULL,
  client_data jsonb NOT NULL,
  contacts_data jsonb DEFAULT '[]'::jsonb,
  activities_data jsonb DEFAULT '[]'::jsonb,
  deleted_by uuid,
  deleted_at timestamp with time zone NOT NULL DEFAULT now(),
  restored_at timestamp with time zone,
  restored_by uuid
);

ALTER TABLE public.deleted_clients_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view deleted clients log"
  ON public.deleted_clients_log FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update deleted clients log"
  ON public.deleted_clients_log FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert deleted clients log"
  ON public.deleted_clients_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE INDEX idx_deleted_clients_log_deleted_at ON public.deleted_clients_log(deleted_at DESC);

-- Trigger function: archive client before deletion
CREATE OR REPLACE FUNCTION public.archive_deleted_client()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contacts jsonb;
  v_activities jsonb;
BEGIN
  SELECT COALESCE(jsonb_agg(to_jsonb(c.*)), '[]'::jsonb) INTO v_contacts
  FROM contacts c WHERE c.client_id = OLD.id;

  SELECT COALESCE(jsonb_agg(to_jsonb(a.*)), '[]'::jsonb) INTO v_activities
  FROM client_activities a WHERE a.client_id = OLD.id;

  INSERT INTO deleted_clients_log (original_client_id, client_data, contacts_data, activities_data, deleted_by)
  VALUES (OLD.id, to_jsonb(OLD.*), v_contacts, v_activities, auth.uid());

  RETURN OLD;
END;
$$;

CREATE TRIGGER trg_archive_deleted_client
  BEFORE DELETE ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.archive_deleted_client();
