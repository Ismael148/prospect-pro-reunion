
ALTER TABLE public.client_gmb
  ADD CONSTRAINT client_gmb_client_id_fkey
  FOREIGN KEY (client_id)
  REFERENCES public.clients(id)
  ON DELETE CASCADE;
