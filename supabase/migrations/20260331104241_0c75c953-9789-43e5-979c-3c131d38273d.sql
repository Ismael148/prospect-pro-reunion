-- Allow assigned users (webmasters/designers) to update admin_notes on their assigned tickets
CREATE POLICY "Assigned users can update ticket notes"
ON public.support_tickets
FOR UPDATE
TO authenticated
USING (auth.uid() = assigned_to)
WITH CHECK (auth.uid() = assigned_to);