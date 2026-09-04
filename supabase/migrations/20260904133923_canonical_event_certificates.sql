-- Complete the Schema V2 event certificate model used by the application.

alter table public.certificates
  add column if not exists certificate_name text,
  add column if not exists certificate_kind text,
  add column if not exists rank integer,
  add column if not exists score numeric,
  add column if not exists name_locked_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

update public.certificates c
set
  certificate_name = coalesce(nullif(trim(p.full_name), ''), 'Nama Peserta'),
  certificate_kind = 'participant',
  name_locked_at = coalesce(c.name_locked_at, c.issued_at)
from public.profiles p
where p.id = c.user_id
  and (c.certificate_name is null or c.certificate_kind is null);

update public.certificates
set
  certificate_name = coalesce(certificate_name, 'Nama Peserta'),
  certificate_kind = coalesce(certificate_kind, 'participant'),
  name_locked_at = coalesce(name_locked_at, issued_at);

alter table public.certificates
  alter column certificate_name set not null,
  alter column certificate_kind set not null;

alter table public.certificates
  drop constraint if exists certificates_kind_check,
  add constraint certificates_kind_check check (
    certificate_kind in ('winner_1', 'winner_2', 'winner_3', 'participant')
  ),
  drop constraint if exists certificates_rank_check,
  add constraint certificates_rank_check check (
    (certificate_kind = 'winner_1' and rank = 1)
    or (certificate_kind = 'winner_2' and rank = 2)
    or (certificate_kind = 'winner_3' and rank = 3)
    or (certificate_kind = 'participant' and (rank is null or rank > 3))
  ),
  drop constraint if exists certificates_name_check,
  add constraint certificates_name_check check (
    char_length(trim(certificate_name)) between 3 and 100
  );

create unique index if not exists certificates_event_user_uq
  on public.certificates(event_id, user_id);

insert into public.certificate_templates (name, template_url, config)
select
  'Sertifikat Event Bawaan',
  'builtin:event-certificate-v1',
  '{"renderer":"event-certificate-v1"}'::jsonb
where not exists (
  select 1
  from public.certificate_templates
  where template_url = 'builtin:event-certificate-v1'
);

insert into storage.buckets (id, name, public)
values ('event-certificates', 'event-certificates', false)
on conflict (id) do update set public = false;

drop policy if exists "Users can read own event certificate files" on storage.objects;
create policy "Users can read own event certificate files"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'event-certificates'
  and (storage.foldername(name))[2] = (select auth.uid())::text
);

drop policy if exists "Admins can manage event certificate files" on storage.objects;
create policy "Admins can manage event certificate files"
on storage.objects
for all
to authenticated
using (
  bucket_id = 'event-certificates'
  and (select app_private.has_permission('admin.access'))
)
with check (
  bucket_id = 'event-certificates'
  and (select app_private.has_permission('admin.access'))
);
