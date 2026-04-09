-- Archived on 2026-04-09.
-- Reason: ad-hoc non-timestamped script; functionality is already covered by schema.sql
-- and active timestamped migrations.

-- 1. Function to safely increment tryout quota
create or replace function increment_tryout_quota(user_id_param uuid, increment_by int)
returns void as $$
begin
  update profiles
  set tryout_quota = coalesce(tryout_quota, 0) + increment_by
  where id = user_id_param;
end;
$$ language plpgsql security definer;

-- 2. Add 'capture' to transaction_status enum (if not exists)
do $$
begin
  if not exists (select 1 from pg_type t join pg_enum e on t.oid = e.enumtypid where t.typname = 'transaction_status' and e.enumlabel = 'capture') then
    alter type transaction_status add value 'capture';
  end if;
end $$;

-- 3. Add Insert Policy for transactions (for authenticated users)
create policy "Users can insert own transactions"
on transactions for insert
with check (auth.uid() = user_id);
