-- Schema V2 pre-production hardening.
-- Future application migrations are created by postgres; require explicit browser grants.
ALTER DEFAULT privileges FOR ROLE postgres IN SCHEMA public REVOKE ALL ON tables FROM anon, authenticated;

ALTER DEFAULT privileges FOR ROLE postgres IN SCHEMA public REVOKE ALL ON sequences FROM anon, authenticated;

ALTER DEFAULT privileges FOR ROLE postgres IN SCHEMA public REVOKE EXECUTE ON functions FROM public, anon, authenticated;

ALTER DEFAULT privileges FOR ROLE postgres IN SCHEMA app_private REVOKE EXECUTE ON functions FROM public, anon, authenticated;

-- Commerce mapping/grant tables are server-only. They were created after the original
-- Data API boundary and inherited Supabase's permissive default privileges.
REVOKE ALL ON TABLE public.event_products FROM anon, authenticated;

REVOKE ALL ON TABLE public.product_wallet_grants FROM anon, authenticated;

-- Cover the only remaining unindexed foreign key.
CREATE INDEX IF NOT EXISTS idx_event_products_session_id ON public.event_products (session_id);

-- This table was explicitly granted to authenticated users by the Data API boundary,
-- but had no ownership policy. Complete the intended own-remedial read path.
DROP POLICY IF EXISTS remedial_session_items_select_own ON public.remedial_session_items;

CREATE POLICY remedial_session_items_select_own ON public.remedial_session_items
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT
      1
    FROM
      public.remedial_sessions rs
    WHERE
      rs.id = remedial_session_items.session_id
      AND (rs.user_id = (
        SELECT
          auth.uid ())
          OR (
            SELECT
              app_private.has_permission ('admin.access')))));
