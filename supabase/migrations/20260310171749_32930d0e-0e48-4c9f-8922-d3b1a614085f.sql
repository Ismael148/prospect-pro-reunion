
-- Create storage bucket for client form uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('client-forms', 'client-forms', true);

-- Allow anon users to upload files to client-forms bucket
CREATE POLICY "Anon can upload client form files"
ON storage.objects FOR INSERT
TO anon
WITH CHECK (bucket_id = 'client-forms');

-- Allow anon users to read files from client-forms bucket
CREATE POLICY "Public read client form files"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'client-forms');

-- Allow authenticated users to delete files from client-forms bucket
CREATE POLICY "Authenticated can delete client form files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'client-forms' AND public.has_role(auth.uid(), 'admin'));
