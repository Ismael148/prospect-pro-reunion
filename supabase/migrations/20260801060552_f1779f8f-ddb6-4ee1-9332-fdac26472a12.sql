-- 1. client_gmb : scope policies to authenticated only
DROP POLICY IF EXISTS "Admins manage gmb" ON public.client_gmb;
DROP POLICY IF EXISTS "Agent masters and webmasters manage gmb" ON public.client_gmb;
DROP POLICY IF EXISTS "Authenticated can view gmb" ON public.client_gmb;

CREATE POLICY "Admins manage gmb"
ON public.client_gmb FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Agent masters and webmasters manage gmb"
ON public.client_gmb FOR ALL TO authenticated
USING (has_role(auth.uid(), 'agent_master'::app_role) OR has_role(auth.uid(), 'webmaster'::app_role))
WITH CHECK (has_role(auth.uid(), 'agent_master'::app_role) OR has_role(auth.uid(), 'webmaster'::app_role));

CREATE POLICY "Authenticated can view gmb"
ON public.client_gmb FOR SELECT TO authenticated
USING (auth.uid() IS NOT NULL);

REVOKE ALL ON public.client_gmb FROM anon;

-- 2. email_branding : remove anonymous read
DROP POLICY IF EXISTS "Anon can view branding" ON public.email_branding;
REVOKE ALL ON public.email_branding FROM anon;

-- 3. payment_credentials : explicit deny for anon direct writes (public flow uses the SECURITY DEFINER RPC)
REVOKE ALL ON public.payment_credentials FROM anon;
DROP POLICY IF EXISTS "Deny anonymous access to payment credentials" ON public.payment_credentials;
CREATE POLICY "Deny anonymous access to payment credentials"
ON public.payment_credentials FOR ALL TO anon
USING (false) WITH CHECK (false);

-- 4. social_accounts : keep token reads limited to admins + linked staff, deny anon
REVOKE ALL ON public.social_accounts FROM anon;
DROP POLICY IF EXISTS "Deny anonymous access to social accounts" ON public.social_accounts;
CREATE POLICY "Deny anonymous access to social accounts"
ON public.social_accounts FOR ALL TO anon
USING (false) WITH CHECK (false);