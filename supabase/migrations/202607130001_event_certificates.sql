-- E-certificate support for completed Tryout Akbar events.
-- This migration is intentionally not applied by Codex.

alter table public.tryout_events
  add column if not exists certificate_enabled boolean not null default false,
  add column if not exists certificate_released_at timestamptz;

comment on column public.tryout_events.certificate_enabled is
  'When true, completed participants can claim event certificates after ranking is final/released.';
comment on column public.tryout_events.certificate_released_at is
  'Timestamp when certificates are released for this event. Null means not released yet.';

create table if not exists public.event_certificates (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.tryout_events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  certificate_number text not null unique,
  certificate_name text not null,
  certificate_kind text not null,
  rank integer,
  score integer,
  storage_path text,
  generated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  constraint event_certificates_kind_check check (
    certificate_kind in ('winner_1', 'winner_2', 'winner_3', 'participant')
  ),
  constraint event_certificates_rank_check check (
    (certificate_kind = 'winner_1' and rank = 1)
    or (certificate_kind = 'winner_2' and rank = 2)
    or (certificate_kind = 'winner_3' and rank = 3)
    or (certificate_kind = 'participant' and (rank is null or rank > 3))
  ),
  constraint event_certificates_name_check check (
    char_length(trim(certificate_name)) between 3 and 100
  ),
  unique(event_id, user_id)
);

create index if not exists event_certificates_event_idx
  on public.event_certificates(event_id, certificate_kind, rank);

create index if not exists event_certificates_user_idx
  on public.event_certificates(user_id, created_at desc);

alter table public.event_certificates enable row level security;

revoke all on public.event_certificates from anon, authenticated;
grant select on public.event_certificates to authenticated;
grant select, insert, update on public.event_certificates to service_role;

drop policy if exists "Users can read own event certificates" on public.event_certificates;
create policy "Users can read own event certificates"
on public.event_certificates
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Admins can read event certificates" on public.event_certificates;
create policy "Admins can read event certificates"
on public.event_certificates
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'superadmin')
  )
);

insert into storage.buckets (id, name, public)
values ('event-certificates', 'event-certificates', false)
on conflict (id) do nothing;

drop policy if exists "Users can read own event certificate files" on storage.objects;
create policy "Users can read own event certificate files"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'event-certificates'
  and (storage.foldername(name))[2] = auth.uid()::text
);

drop policy if exists "Admins can manage event certificate files" on storage.objects;
create policy "Admins can manage event certificate files"
on storage.objects
for all
to authenticated
using (
  bucket_id = 'event-certificates'
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'superadmin')
  )
)
with check (
  bucket_id = 'event-certificates'
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'superadmin')
  )
);
