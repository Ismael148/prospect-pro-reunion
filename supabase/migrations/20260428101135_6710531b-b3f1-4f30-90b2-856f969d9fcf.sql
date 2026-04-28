
CREATE TYPE public.partner_access_status AS ENUM (
  'a_inviter','invitation_envoyee','accepte','refuse','expire','revoque'
);

CREATE TYPE public.partner_access_type AS ENUM (
  'fb_page','fb_business_manager','ig_account','ad_account','catalog','gmb_location','pixel'
);

CREATE TYPE public.partner_access_role AS ENUM (
  'admin','editor','advertiser','analyst','manager','owner'
);

CREATE TYPE public.partner_notification_type AS ENUM (
  'post','story','reel','gmb_post','gmb_review_reply','message_reply','announcement'
);

CREATE TYPE public.partner_notification_status AS ENUM (
  'brouillon','planifie','publie_manuel','publie_api','echec'
);

CREATE TABLE public.partner_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  platform text NOT NULL,
  access_type public.partner_access_type NOT NULL,
  status public.partner_access_status NOT NULL DEFAULT 'a_inviter',
  invitation_email text,
  business_manager_id text,
  asset_id text,
  asset_name text,
  granted_role public.partner_access_role,
  invitation_link text,
  invitation_sent_at timestamptz,
  accepted_at timestamptz,
  expires_at timestamptz,
  notes text,
  last_reminder_sent_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX partner_access_unique_asset 
  ON public.partner_access(client_id, platform, access_type, COALESCE(asset_id, ''));
CREATE INDEX partner_access_client_idx ON public.partner_access(client_id);
CREATE INDEX partner_access_status_idx ON public.partner_access(status);

ALTER TABLE public.partner_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage partner access"
  ON public.partner_access FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Webmasters select partner access"
  ON public.partner_access FOR SELECT
  USING (public.has_role(auth.uid(), 'webmaster') OR public.has_role(auth.uid(), 'agent_master'));

CREATE POLICY "Webmasters update partner access"
  ON public.partner_access FOR UPDATE
  USING (public.has_role(auth.uid(), 'webmaster'));

CREATE POLICY "Webmasters insert partner access"
  ON public.partner_access FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'webmaster'));

CREATE POLICY "Agents view their clients partner access"
  ON public.partner_access FOR SELECT
  USING (
    public.has_role(auth.uid(), 'agent_telephonique')
    AND EXISTS (SELECT 1 FROM public.clients c WHERE c.id = partner_access.client_id AND c.assigned_to = auth.uid())
  );

CREATE TRIGGER set_partner_access_updated_at
  BEFORE UPDATE ON public.partner_access
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.partner_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_access_id uuid REFERENCES public.partner_access(id) ON DELETE SET NULL,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  platform text NOT NULL,
  notification_type public.partner_notification_type NOT NULL,
  title text,
  content text NOT NULL,
  media_urls text[] DEFAULT '{}',
  target_url text,
  status public.partner_notification_status NOT NULL DEFAULT 'brouillon',
  scheduled_for timestamptz,
  published_at timestamptz,
  published_by uuid,
  external_post_id text,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX partner_notif_client_idx ON public.partner_notifications(client_id);
CREATE INDEX partner_notif_status_idx ON public.partner_notifications(status);
CREATE INDEX partner_notif_scheduled_idx ON public.partner_notifications(scheduled_for);

ALTER TABLE public.partner_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage partner notifications"
  ON public.partner_notifications FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Webmasters manage partner notifications"
  ON public.partner_notifications FOR ALL USING (public.has_role(auth.uid(), 'webmaster'));

CREATE POLICY "Agent masters view partner notifications"
  ON public.partner_notifications FOR SELECT USING (public.has_role(auth.uid(), 'agent_master'));

CREATE TRIGGER set_partner_notif_updated_at
  BEFORE UPDATE ON public.partner_notifications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.touch_partner_notification_published()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status IN ('publie_manuel','publie_api')
     AND OLD.status NOT IN ('publie_manuel','publie_api')
     AND NEW.published_at IS NULL THEN
    NEW.published_at := now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_partner_notif_published
  BEFORE UPDATE ON public.partner_notifications
  FOR EACH ROW EXECUTE FUNCTION public.touch_partner_notification_published();

CREATE OR REPLACE FUNCTION public.touch_partner_access_timestamps()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status = 'accepte' AND (OLD.status IS DISTINCT FROM 'accepte') AND NEW.accepted_at IS NULL THEN
    NEW.accepted_at := now();
  END IF;
  IF NEW.status = 'invitation_envoyee' AND (OLD.status IS DISTINCT FROM 'invitation_envoyee') AND NEW.invitation_sent_at IS NULL THEN
    NEW.invitation_sent_at := now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_partner_access_timestamps
  BEFORE UPDATE ON public.partner_access
  FOR EACH ROW EXECUTE FUNCTION public.touch_partner_access_timestamps();

ALTER TABLE public.partner_access REPLICA IDENTITY FULL;
ALTER TABLE public.partner_notifications REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.partner_access;
ALTER PUBLICATION supabase_realtime ADD TABLE public.partner_notifications;
