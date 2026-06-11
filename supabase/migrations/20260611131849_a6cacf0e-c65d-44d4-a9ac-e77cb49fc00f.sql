
DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
CREATE POLICY "Users can upload own avatars" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Authenticated upload client-logos" ON storage.objects;
CREATE POLICY "Staff can upload client-logos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'client-logos' AND (
      public.has_role(auth.uid(), 'admin') OR
      public.has_role(auth.uid(), 'agent_master') OR
      public.has_role(auth.uid(), 'webmaster')
    )
  );
