
-- Replace permissive INSERT policy with a restrictive one
DROP POLICY "System can insert notifications" ON public.notifications;

-- Only allow users to insert notifications for themselves (trigger bypasses RLS via SECURITY DEFINER)
CREATE POLICY "Users can insert own notifications" ON public.notifications
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
