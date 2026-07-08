
-- chatbot_configs
DROP POLICY IF EXISTS "Admins manage chatbot configs" ON public.chatbot_configs;
DROP POLICY IF EXISTS "Authenticated view chatbot configs" ON public.chatbot_configs;
DROP POLICY IF EXISTS "Webmaster/agent_master manage chatbot configs" ON public.chatbot_configs;

CREATE POLICY "Admins manage chatbot configs" ON public.chatbot_configs
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated view chatbot configs" ON public.chatbot_configs
  FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Webmaster/agent_master manage chatbot configs" ON public.chatbot_configs
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'webmaster'::app_role) OR has_role(auth.uid(), 'agent_master'::app_role))
  WITH CHECK (has_role(auth.uid(), 'webmaster'::app_role) OR has_role(auth.uid(), 'agent_master'::app_role));

-- chatbot_conversations
DROP POLICY IF EXISTS "Admins manage chatbot convs" ON public.chatbot_conversations;
DROP POLICY IF EXISTS "Webmaster/agent_master view chatbot convs" ON public.chatbot_conversations;

CREATE POLICY "Admins manage chatbot convs" ON public.chatbot_conversations
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Webmaster/agent_master view chatbot convs" ON public.chatbot_conversations
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'webmaster'::app_role) OR has_role(auth.uid(), 'agent_master'::app_role));

-- partner_access
DROP POLICY IF EXISTS "Admins manage partner access" ON public.partner_access;
DROP POLICY IF EXISTS "Agents view their clients partner access" ON public.partner_access;
DROP POLICY IF EXISTS "Webmasters insert partner access" ON public.partner_access;
DROP POLICY IF EXISTS "Webmasters select partner access" ON public.partner_access;
DROP POLICY IF EXISTS "Webmasters update partner access" ON public.partner_access;

CREATE POLICY "Admins manage partner access" ON public.partner_access
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Agents view their clients partner access" ON public.partner_access
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'agent_telephonique'::app_role) AND EXISTS (
    SELECT 1 FROM public.clients c WHERE c.id = partner_access.client_id AND c.assigned_to = auth.uid()
  ));

CREATE POLICY "Webmasters insert partner access" ON public.partner_access
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'webmaster'::app_role));

CREATE POLICY "Webmasters select partner access" ON public.partner_access
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'webmaster'::app_role) OR has_role(auth.uid(), 'agent_master'::app_role));

CREATE POLICY "Webmasters update partner access" ON public.partner_access
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'webmaster'::app_role));

-- partner_notifications
DROP POLICY IF EXISTS "Admins manage partner notifications" ON public.partner_notifications;
DROP POLICY IF EXISTS "Agent masters view partner notifications" ON public.partner_notifications;
DROP POLICY IF EXISTS "Webmasters manage partner notifications" ON public.partner_notifications;

CREATE POLICY "Admins manage partner notifications" ON public.partner_notifications
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Agent masters view partner notifications" ON public.partner_notifications
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'agent_master'::app_role));

CREATE POLICY "Webmasters manage partner notifications" ON public.partner_notifications
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'webmaster'::app_role))
  WITH CHECK (has_role(auth.uid(), 'webmaster'::app_role));

-- social_publications
DROP POLICY IF EXISTS "Admins can delete publications" ON public.social_publications;
DROP POLICY IF EXISTS "Authenticated users can insert publications" ON public.social_publications;
DROP POLICY IF EXISTS "Authenticated users can update publications" ON public.social_publications;

CREATE POLICY "Admins can delete publications" ON public.social_publications
  FOR DELETE TO authenticated
  USING ((auth.uid() = created_by) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can insert publications" ON public.social_publications
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Authenticated users can update publications" ON public.social_publications
  FOR UPDATE TO authenticated
  USING ((auth.uid() = created_by) OR has_role(auth.uid(), 'admin'::app_role));
