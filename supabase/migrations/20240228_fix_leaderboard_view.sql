-- ==========================================
-- Security/Functionality Fix: Secure Leaderboard Access
-- Description: Creates a secure wrapper around the materialized view
-- to resolve 'permission denied' after disabling public API access to views.
-- ==========================================

-- Pastikan security_fixes (REVOKE ALL) tidak merusak akses via RPC
-- Dengan membuat fungsi baca berstatus SECURITY DEFINER yang mengambil data dari view,
-- front-end kita tetap bisa menampilkan leaderboard dengan aman lewat supabase.rpc()

CREATE OR REPLACE FUNCTION public.get_leaderboard_snapshot()
RETURNS TABLE (
    rank_pos bigint,
    user_id uuid,
    full_name text,
    avatar_url text,
    top_score int,
    score_twk int,
    score_tiu int,
    score_tkp int,
    updated_at timestamp with time zone
)
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY SELECT * FROM public.leaderboard_snapshot;
END;
$$ LANGUAGE plpgsql;

-- Berikan izin bagi user/anon untuk *mengeksekusi* fungsi pembungkus ini
GRANT EXECUTE ON FUNCTION public.get_leaderboard_snapshot() TO anon, authenticated;
