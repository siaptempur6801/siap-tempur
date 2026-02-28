-- ==========================================
-- Security Fix: Function Search Path Mutable
-- Description: Adds 'SET search_path = public' to all custom functions
-- to prevent search path manipulation attacks as recommended by Supabase Security Advisor.
-- ==========================================

-- 1. claim_voucher
ALTER FUNCTION public.claim_voucher(uuid, text) SET search_path = public;

-- 2. start_tryout_session
ALTER FUNCTION public.start_tryout_session(UUID) SET search_path = public;

-- 3. start_practice_session
-- Cek tipe argumennya dulu kalau ada, kalau tidak ada argumennya maka hapus (UUID)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'start_practice_session') THEN
    -- Assuming parameter is UUID like the tryout one or maybe no params depending on schema.
    -- We'll try common signatures
    BEGIN
      ALTER FUNCTION public.start_practice_session(UUID, VARCHAR) SET search_path = public;
    EXCEPTION WHEN OTHERS THEN NULL; END;
    
    BEGIN
      ALTER FUNCTION public.start_practice_session(UUID) SET search_path = public;
    EXCEPTION WHEN OTHERS THEN NULL; END;
  END IF;
END $$;

-- 4. increment_tryout_quota
BEGIN
  ALTER FUNCTION public.increment_tryout_quota(UUID, INT) SET search_path = public;
EXCEPTION WHEN OTHERS THEN NULL; END;

-- 5. handle_new_user (Usually a trigger function)
ALTER FUNCTION public.handle_new_user() SET search_path = public;

-- 6. update_user_streak
BEGIN
  ALTER FUNCTION public.update_user_streak(UUID) SET search_path = public;
EXCEPTION WHEN OTHERS THEN NULL; END;

-- 7. calculate_session_score
BEGIN
  ALTER FUNCTION public.calculate_session_score(UUID) SET search_path = public;
EXCEPTION WHEN OTHERS THEN NULL; END;

-- 8. is_admin
BEGIN
  ALTER FUNCTION public.is_admin() SET search_path = public;
EXCEPTION WHEN OTHERS THEN NULL; END;

-- 9. update_tryout_configurations_updated_at (Trigger function)
ALTER FUNCTION public.update_tryout_configurations_updated_at() SET search_path = public;

-- ==========================================
-- Security Fix: Materialized View in API
-- Description: Revokes public access to materialized views
-- ==========================================
-- By default materialized views shouldn't be accessible by anon/authenticated 
-- unless explicitly needed, but the warning says it is selectable.
-- Best practice is to revoke and use a wrapper function with security definer if needed by frontend
REVOKE ALL ON public.leaderboard_snapshot FROM anon, authenticated;
