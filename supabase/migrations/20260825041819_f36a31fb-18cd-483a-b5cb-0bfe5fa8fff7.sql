-- clients: require an actual staff role (no role = no access)
DROP POLICY IF EXISTS "Authenticated users can view all clients" ON public.clients;
CREATE POLICY "Staff can view clients"
ON public.clients FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'agent_master') OR
  has_role(auth.uid(), 'agent_support') OR has_role(auth.uid(), 'agent_telephonique') OR
  has_role(auth.uid(), 'commercial_terrain') OR has_role(auth.uid(), 'webmaster') OR
  has_role(auth.uid(), 'designer')
);

-- client_forms: only roles that process onboarding data
DROP POLICY IF EXISTS "Authenticated users can view forms" ON public.client_forms;
CREATE POLICY "Delivery staff can view forms"
ON public.client_forms FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'agent_master') OR
  has_role(auth.uid(), 'agent_support') OR has_role(auth.uid(), 'webmaster') OR
  has_role(auth.uid(), 'designer')
);

-- invoices: finance scope
DROP POLICY IF EXISTS "Authenticated users can view invoices" ON public.invoices;
CREATE POLICY "Finance staff can view invoices"
ON public.invoices FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'agent_master') OR
  auth.uid() = created_by
);

-- domain_renewals: finance scope
DROP POLICY IF EXISTS "Authenticated can view domain renewals" ON public.domain_renewals;
CREATE POLICY "Finance staff can view domain renewals"
ON public.domain_renewals FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'agent_master') OR
  auth.uid() = created_by
);

-- support_tickets: support/technical staff or assignee
DROP POLICY IF EXISTS "Authenticated users can view tickets" ON public.support_tickets;
CREATE POLICY "Support staff can view tickets"
ON public.support_tickets FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'agent_master') OR
  has_role(auth.uid(), 'agent_support') OR has_role(auth.uid(), 'agent_telephonique') OR
  has_role(auth.uid(), 'webmaster') OR has_role(auth.uid(), 'designer') OR
  auth.uid() = assigned_to
);