
-- Restore table-level GRANTs that got dropped during the security hardening.
-- RLS policies stay in charge of row-level access; without GRANTs PostgREST
-- returns a permission error before RLS is even evaluated.

GRANT INSERT ON public.reservation_ical_submissions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reservation_ical_submissions TO authenticated;
GRANT ALL ON public.reservation_ical_submissions TO service_role;

GRANT INSERT ON public.payment_credentials TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_credentials TO authenticated;
GRANT ALL ON public.payment_credentials TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_tickets TO authenticated;
GRANT ALL ON public.support_tickets TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_forms TO authenticated;
GRANT ALL ON public.client_forms TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_invitations TO authenticated;
GRANT ALL ON public.payment_invitations TO service_role;
