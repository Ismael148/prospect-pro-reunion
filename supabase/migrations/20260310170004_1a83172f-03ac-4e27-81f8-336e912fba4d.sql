
-- Replace the overly permissive INSERT policy with a validated one
DROP POLICY IF EXISTS "Anyone can create support tickets" ON public.support_tickets;

-- Only allow inserts where client_id actually exists
CREATE POLICY "Validated insert on support tickets" ON public.support_tickets
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.clients WHERE id = support_tickets.client_id)
  );
