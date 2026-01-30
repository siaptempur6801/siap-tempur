-- Enable RLS just in case
ALTER TABLE test_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_answers ENABLE ROW LEVEL SECURITY;

-- CLEANUP existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view own sessions" ON test_sessions;
DROP POLICY IF EXISTS "Users can create own sessions" ON test_sessions;
DROP POLICY IF EXISTS "Users can view own answers" ON test_answers;
DROP POLICY IF EXISTS "Users can update own answers" ON test_answers;

-- POLICIES FOR TEST_SESSIONS
CREATE POLICY "Users can view own sessions"
ON test_sessions FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own sessions"
ON test_sessions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- POLICIES FOR TEST_ANSWERS
-- Users need to view answers to load the session
CREATE POLICY "Users can view own answers"
ON test_answers FOR SELECT
TO authenticated
USING (
  exists (
    select 1 from test_sessions
    where test_sessions.id = test_answers.session_id
    and test_sessions.user_id = auth.uid()
  )
);

-- Users need to update answers (submit option)
CREATE POLICY "Users can update own answers"
ON test_answers FOR UPDATE
TO authenticated
USING (
  exists (
    select 1 from test_sessions
    where test_sessions.id = test_answers.session_id
    and test_sessions.user_id = auth.uid()
  )
)
WITH CHECK (
  exists (
    select 1 from test_sessions
    where test_sessions.id = test_answers.session_id
    and test_sessions.user_id = auth.uid()
  )
);
