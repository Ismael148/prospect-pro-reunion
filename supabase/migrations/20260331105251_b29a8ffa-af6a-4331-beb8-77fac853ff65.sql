-- Allow anon users to read back their just-inserted ticket (needed for .select().single() after insert)
CREATE POLICY "Anon can read support tickets by client"
ON public.support_tickets
FOR SELECT
TO anon
USING (EXISTS (
  SELECT 1 FROM clients
  WHERE clients.id = support_tickets.client_id
  AND clients.support_token IS NOT NULL
));