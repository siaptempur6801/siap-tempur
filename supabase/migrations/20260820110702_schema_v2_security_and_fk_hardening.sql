-- Schema V2 pre-production hardening.
-- Future application migrations are created by postgres; require explicit browser grants.
alter default privileges for role postgres in schema public revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on sequences from anon, authenticated;
alter default privileges for role postgres in schema public revoke execute on functions from public, anon, authenticated;
alter default privileges for role postgres in schema app_private revoke execute on functions from public, anon, authenticated;

-- Commerce mapping/grant tables are server-only. They were created after the original
-- Data API boundary and inherited Supabase's permissive default privileges.
revoke all on table public.event_products from anon, authenticated;
revoke all on table public.product_wallet_grants from anon, authenticated;

-- Cover the only remaining unindexed foreign key.
create index if not exists idx_event_products_session_id
  on public.event_products(session_id);

-- This table was explicitly granted to authenticated users by the Data API boundary,
-- but had no ownership policy. Complete the intended own-remedial read path.
drop policy if exists remedial_session_items_select_own on public.remedial_session_items;
create policy remedial_session_items_select_own
on public.remedial_session_items
for select
to authenticated
using (
  exists (
    select 1
    from public.remedial_sessions rs
    where rs.id = remedial_session_items.session_id
      and (
        rs.user_id = (select auth.uid())
        or (select app_private.has_permission('admin.access'))
      )
  )
);
