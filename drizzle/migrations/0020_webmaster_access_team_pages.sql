ALTER TABLE public.seen_marks DROP CONSTRAINT seen_marks_item_type_check;
ALTER TABLE public.seen_marks ADD CONSTRAINT seen_marks_item_type_check
  CHECK (item_type = ANY (ARRAY['module_note'::text, 'ticket_comment'::text, 'team_comment'::text]));

CREATE POLICY "Webmasters view Decollage presentation logs" ON public.email_send_log FOR SELECT TO authenticated
  USING (template_name = 'pack_decollage' AND public.has_role(auth.uid(), 'webmaster'));