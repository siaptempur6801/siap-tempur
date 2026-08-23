create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  excerpt text,
  content text not null,
  category text,
  cover_image_url text,
  status text not null default 'draft',
  author_id uuid references public.profiles(id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint articles_status_check check (status in ('draft','published','archived')),
  constraint articles_published_at_check check (
    (status = 'published' and published_at is not null)
    or status <> 'published'
  )
);

create index if not exists articles_status_published_at_idx
  on public.articles(status, published_at desc);
create index if not exists articles_author_status_updated_idx
  on public.articles(author_id, status, updated_at desc);

create or replace function public.set_articles_updated_at()
returns trigger
language plpgsql
set search_path to ''
as $function$
begin
  new.updated_at := pg_catalog.now();
  return new;
end;
$function$;

revoke all on function public.set_articles_updated_at() from public, anon, authenticated;

drop trigger if exists set_articles_updated_at on public.articles;
create trigger set_articles_updated_at
before update on public.articles
for each row execute function public.set_articles_updated_at();

alter table public.articles enable row level security;

revoke all on table public.articles from public, anon, authenticated;
grant select on table public.articles to anon;
grant select, insert, update on table public.articles to authenticated;
grant all on table public.articles to service_role;

drop policy if exists articles_public_read_published on public.articles;
create policy articles_public_read_published
on public.articles
for select
to anon, authenticated
using (status = 'published');

drop policy if exists articles_editor_read_own on public.articles;
create policy articles_editor_read_own
on public.articles
for select
to authenticated
using (
  author_id = (select auth.uid())
  and app_private.current_user_has_permission('content.read')
);

drop policy if exists articles_reviewer_read_all on public.articles;
create policy articles_reviewer_read_all
on public.articles
for select
to authenticated
using (
  app_private.current_user_has_permission('content.review')
  or app_private.current_user_has_permission('content.publish')
);

drop policy if exists articles_editor_create_own_draft on public.articles;
create policy articles_editor_create_own_draft
on public.articles
for insert
to authenticated
with check (
  author_id = (select auth.uid())
  and status = 'draft'
  and app_private.current_user_has_permission('content.create')
);

drop policy if exists articles_editor_update_own_nonpublished on public.articles;
create policy articles_editor_update_own_nonpublished
on public.articles
for update
to authenticated
using (
  author_id = (select auth.uid())
  and status <> 'published'
  and app_private.current_user_has_permission('content.update')
)
with check (
  author_id = (select auth.uid())
  and status <> 'published'
  and app_private.current_user_has_permission('content.update')
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'question-images',
  'question-images',
  true,
  2097152,
  array['image/jpeg','image/png','image/webp','image/gif']::text[]
)
on conflict (id) do update set
  public = true,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists articles_content_creator_upload on storage.objects;
create policy articles_content_creator_upload
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'question-images'
  and (storage.foldername(name))[1] = 'articles'
  and (storage.foldername(name))[2] = (select auth.uid())::text
  and app_private.current_user_has_permission('content.create')
);
