
-- Allow authenticated users to also insert client forms (when accessing public form while logged in)
CREATE POLICY "Authenticated can insert client forms"
ON public.client_forms
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM clients
    WHERE clients.id = client_forms.client_id
    AND clients.support_token IS NOT NULL
  )
);

-- Allow authenticated users to also update client forms
CREATE POLICY "Authenticated can update client forms"
ON public.client_forms
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM clients
    WHERE clients.id = client_forms.client_id
    AND clients.support_token IS NOT NULL
  )
);
