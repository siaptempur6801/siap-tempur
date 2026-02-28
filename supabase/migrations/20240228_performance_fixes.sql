-- ==========================================
-- Performance Fix: Auth RLS Initialization Plan
-- Description: Wraps auth.uid() in (select auth.uid()) to prevent re-evaluation per row
-- ==========================================

-- 1. profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (id = (select auth.uid()));

-- 2. test_sessions
DROP POLICY IF EXISTS "Users can view own sessions" ON public.test_sessions;
CREATE POLICY "Users can view own sessions" ON public.test_sessions FOR SELECT USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can create own sessions" ON public.test_sessions;
CREATE POLICY "Users can create own sessions" ON public.test_sessions FOR INSERT WITH CHECK (user_id = (select auth.uid()));

-- 3. test_answers
DROP POLICY IF EXISTS "Users can view own answers" ON public.test_answers;
CREATE POLICY "Users can view own answers" ON public.test_answers FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.test_sessions ts 
    WHERE ts.id = test_answers.session_id 
    AND ts.user_id = (select auth.uid())
  )
);

DROP POLICY IF EXISTS "Users can update own answers" ON public.test_answers;
CREATE POLICY "Users can update own answers" ON public.test_answers FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.test_sessions ts 
    WHERE ts.id = test_answers.session_id 
    AND ts.user_id = (select auth.uid())
  )
);

-- 4. transactions
DROP POLICY IF EXISTS "Users can view own transactions" ON public.transactions;
CREATE POLICY "Users can view own transactions" ON public.transactions FOR SELECT USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert own transactions" ON public.transactions;
CREATE POLICY "Users can insert own transactions" ON public.transactions FOR INSERT WITH CHECK (user_id = (select auth.uid()));

-- 5. voucher_claims
DROP POLICY IF EXISTS "Users can read own voucher claims" ON public.voucher_claims;
CREATE POLICY "Users can read own voucher claims" ON public.voucher_claims FOR SELECT USING (user_id = (select auth.uid()));

-- 6. tryout_configurations
DROP POLICY IF EXISTS "Admins can insert tryout configurations" ON public.tryout_configurations;
CREATE POLICY "Admins can insert tryout configurations" ON public.tryout_configurations FOR INSERT WITH CHECK (
  (SELECT role FROM profiles WHERE id = (select auth.uid())) = 'admin'
);

DROP POLICY IF EXISTS "Admins can update tryout configurations" ON public.tryout_configurations;
CREATE POLICY "Admins can update tryout configurations" ON public.tryout_configurations FOR UPDATE USING (
  (SELECT role FROM profiles WHERE id = (select auth.uid())) = 'admin'
);

DROP POLICY IF EXISTS "Admins can delete tryout configurations" ON public.tryout_configurations;
CREATE POLICY "Admins can delete tryout configurations" ON public.tryout_configurations FOR DELETE USING (
  (SELECT role FROM profiles WHERE id = (select auth.uid())) = 'admin'
);

-- ==========================================
-- Performance Fix: Multiple Permissive Policies
-- Description: Removes duplicate/redundant permissive SELECT policies on options and questions
-- ==========================================

-- 1. options
-- Keep "Everyone can view options" (or whatever existing optimal one is there), drop redundant ones
DO $$
BEGIN
  -- We'll just drop the "Public read options" if "Everyone can view options" exists
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'options' AND policyname = 'Public read options') THEN
    DROP POLICY "Public read options" ON public.options;
  END IF;
END $$;

-- 2. questions
-- Keep "Everyone can view questions", drop redundant "Public read questions"
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'questions' AND policyname = 'Public read questions') THEN
    DROP POLICY "Public read questions" ON public.questions;
  END IF;
END $$;
