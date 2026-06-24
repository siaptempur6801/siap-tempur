-- Add article publishing workflow with a restricted article_writer role.

do $$
begin
  if exists (select 1 from pg_type where typname = 'user_role') then
    alter type public.user_role add value if not exists 'article_writer';
  end if;
end;
$$;

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
  published_at timestamp with time zone,
  created_at timestamp with time zone not null default timezone('utc'::text, now()),
  updated_at timestamp with time zone not null default timezone('utc'::text, now()),
  constraint articles_status_check check (status in ('draft', 'published', 'archived')),
  constraint articles_published_at_check check (
    (status = 'published' and published_at is not null)
    or (status <> 'published')
  )
);

create index if not exists articles_status_published_at_idx
  on public.articles (status, published_at desc);

create index if not exists articles_author_status_idx
  on public.articles (author_id, status, updated_at desc);

create or replace function public.set_articles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

drop trigger if exists set_articles_updated_at on public.articles;
create trigger set_articles_updated_at
before update on public.articles
for each row execute function public.set_articles_updated_at();

alter table public.articles enable row level security;

drop policy if exists "Public can read published articles" on public.articles;
create policy "Public can read published articles"
  on public.articles for select
  using (status = 'published');

drop policy if exists "Article writers can read own articles" on public.articles;
create policy "Article writers can read own articles"
  on public.articles for select to authenticated
  using (
    author_id = auth.uid()
    and (select role from public.profiles where id = auth.uid()) = 'article_writer'
  );

drop policy if exists "Admins can read all articles" on public.articles;
create policy "Admins can read all articles"
  on public.articles for select to authenticated
  using (
    (select role from public.profiles where id = auth.uid()) in ('admin', 'superadmin')
  );

drop policy if exists "Article writers can create own drafts" on public.articles;
create policy "Article writers can create own drafts"
  on public.articles for insert to authenticated
  with check (
    author_id = auth.uid()
    and status = 'draft'
    and (select role from public.profiles where id = auth.uid()) = 'article_writer'
  );

drop policy if exists "Admins can create articles" on public.articles;
create policy "Admins can create articles"
  on public.articles for insert to authenticated
  with check (
    (select role from public.profiles where id = auth.uid()) in ('admin', 'superadmin')
  );

drop policy if exists "Article writers can update own non-published articles" on public.articles;
create policy "Article writers can update own non-published articles"
  on public.articles for update to authenticated
  using (
    author_id = auth.uid()
    and status <> 'published'
    and (select role from public.profiles where id = auth.uid()) = 'article_writer'
  )
  with check (
    author_id = auth.uid()
    and status <> 'published'
    and (select role from public.profiles where id = auth.uid()) = 'article_writer'
  );

drop policy if exists "Admins can update all articles" on public.articles;
create policy "Admins can update all articles"
  on public.articles for update to authenticated
  using (
    (select role from public.profiles where id = auth.uid()) in ('admin', 'superadmin')
  )
  with check (
    (select role from public.profiles where id = auth.uid()) in ('admin', 'superadmin')
  );

drop policy if exists "Admins can delete articles" on public.articles;
create policy "Admins can delete articles"
  on public.articles for delete to authenticated
  using (
    (select role from public.profiles where id = auth.uid()) in ('admin', 'superadmin')
  );
