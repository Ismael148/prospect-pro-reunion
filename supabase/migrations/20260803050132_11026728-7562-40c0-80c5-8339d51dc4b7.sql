-- 1. Prospects: scope agent_telephonique updates to their own / assigned prospects
DROP POLICY IF EXISTS "Agents can update prospects" ON public.prospects;

CREATE POLICY "Agents can update their assigned prospects"
ON public.prospects
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'agent_telephonique'::app_role)
  AND (auth.uid() = assigned_to OR auth.uid() = created_by)
)
WITH CHECK (
  has_role(auth.uid(), 'agent_telephonique'::app_role)
  AND (auth.uid() = assigned_to OR auth.uid() = created_by)
);

-- 2. Storage: restrict reading of client-submitted form files to internal staff roles
DROP POLICY IF EXISTS "Staff can read client form files" ON storage.objects;

CREATE POLICY "Internal staff can read client form files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'client-forms'
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'agent_master'::app_role)
    OR has_role(auth.uid(), 'agent_support'::app_role)
    OR has_role(auth.uid(), 'webmaster'::app_role)
    OR has_role(auth.uid(), 'designer'::app_role)
  )
);