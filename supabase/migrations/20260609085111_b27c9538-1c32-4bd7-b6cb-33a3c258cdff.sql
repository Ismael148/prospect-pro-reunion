
-- 1) chatbot_conversations: restrict insert to service_role only (edge function/webhook)
DROP POLICY IF EXISTS "System can insert chatbot convs" ON public.chatbot_conversations;
CREATE POLICY "Service role can insert chatbot convs"
  ON public.chatbot_conversations
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- 2) social_accounts: restrict UPDATE and INSERT to admins or assigned/creator users
DROP POLICY IF EXISTS "Authenticated users can update social accounts" ON public.social_accounts;
DROP POLICY IF EXISTS "Authenticated users can insert social accounts" ON public.social_accounts;

CREATE POLICY "Admins or assigned users can update social accounts"
  ON public.social_accounts
  FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role) OR EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.id = social_accounts.client_id
        AND (c.assigned_to = auth.uid() OR c.created_by = auth.uid())
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role) OR EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.id = social_accounts.client_id
        AND (c.assigned_to = auth.uid() OR c.created_by = auth.uid())
    )
  );

CREATE POLICY "Admins or assigned users can insert social accounts"
  ON public.social_accounts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role) OR EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.id = social_accounts.client_id
        AND (c.assigned_to = auth.uid() OR c.created_by = auth.uid())
    )
  );

-- 3) Storage avatars: enforce ownership on UPDATE and DELETE via folder name = auth.uid()
DROP POLICY IF EXISTS "Users can update own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own avatars" ON storage.objects;

CREATE POLICY "Users can update own avatars"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete own avatars"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
