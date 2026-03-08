
-- Fix permissive contacts INSERT policy: restrict to users who can see the client
DROP POLICY "Authenticated users can manage contacts" ON public.contacts;
CREATE POLICY "Authenticated users can insert contacts" ON public.contacts
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE id = client_id
        AND (assigned_to = auth.uid() OR created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

-- Fix permissive contacts UPDATE policy
DROP POLICY "Authenticated users can update contacts" ON public.contacts;
CREATE POLICY "Authenticated users can update contacts" ON public.contacts
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE id = client_id
        AND (assigned_to = auth.uid() OR created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );
