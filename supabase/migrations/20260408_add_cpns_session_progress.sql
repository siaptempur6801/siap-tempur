ALTER TABLE public.test_sessions
  ADD COLUMN IF NOT EXISTS current_question_index integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS marked_questions jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS last_activity_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now());

UPDATE
  public.test_sessions
SET
  current_question_index = COALESCE(current_question_index, 0),
  marked_questions = COALESCE(marked_questions, '{}'::jsonb),
  last_activity_at = COALESCE(last_activity_at, start_time, created_at, timezone('utc'::text, now()))
WHERE
  current_question_index IS NULL
  OR marked_questions IS NULL
  OR last_activity_at IS NULL;

CREATE INDEX IF NOT EXISTS test_sessions_active_lookup_idx ON public.test_sessions (user_id, mode, status, last_activity_at DESC);
