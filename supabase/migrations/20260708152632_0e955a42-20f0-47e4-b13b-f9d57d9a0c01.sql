
DROP POLICY IF EXISTS "Staff or valid token can read client form files" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read from client-forms" ON storage.objects;
DROP POLICY IF EXISTS "Public read client form files" ON storage.objects;

CREATE POLICY "Public read client-forms"
  ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'client-forms');
