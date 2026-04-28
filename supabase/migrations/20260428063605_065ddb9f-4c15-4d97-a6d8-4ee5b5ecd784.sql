CREATE TABLE public.seen_marks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_type text NOT NULL CHECK (item_type IN ('module_note','ticket_comment')),
  item_id uuid NOT NULL,
  user_id uuid NOT NULL,
  seen_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (item_type, item_id, user_id)
);

CREATE INDEX idx_seen_marks_item ON public.seen_marks(item_type, item_id);
CREATE INDEX idx_seen_marks_user ON public.seen_marks(user_id);

ALTER TABLE public.seen_marks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view seen marks"
  ON public.seen_marks FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Users can create own seen marks"
  ON public.seen_marks FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own seen marks"
  ON public.seen_marks FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.seen_marks;