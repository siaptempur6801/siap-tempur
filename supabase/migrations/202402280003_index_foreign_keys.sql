-- ==========================================
-- Performance Fix: Unindexed Foreign Keys
-- Description: Creates indexes for foreign key columns to improve JOIN and DELETE performance
-- ==========================================
-- 1. options
CREATE INDEX IF NOT EXISTS options_question_id_idx ON public.options (question_id);

-- 2. test_answers
CREATE INDEX IF NOT EXISTS test_answers_option_id_idx ON public.test_answers (option_id);

CREATE INDEX IF NOT EXISTS test_answers_question_id_idx ON public.test_answers (question_id);

-- 3. test_sessions
CREATE INDEX IF NOT EXISTS test_sessions_tryout_id_idx ON public.test_sessions (tryout_id);

CREATE INDEX IF NOT EXISTS test_sessions_user_id_idx ON public.test_sessions (user_id);

-- 4. transactions
CREATE INDEX IF NOT EXISTS transactions_user_id_idx ON public.transactions (user_id);

-- 5. tryout_questions
CREATE INDEX IF NOT EXISTS tryout_questions_question_id_idx ON public.tryout_questions (question_id);

-- 6. voucher_claims
CREATE INDEX IF NOT EXISTS voucher_claims_user_id_idx ON public.voucher_claims (user_id);
