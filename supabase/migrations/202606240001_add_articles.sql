-- Add article publishing workflow with a restricted article_writer role.
DO $$
BEGIN
  IF EXISTS (
    SELECT
      1
    FROM
      pg_type
    WHERE
      typname = 'user_role') THEN
  ALTER TYPE public.user_role
    ADD value IF NOT EXISTS 'article_writer';
END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS public.articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  excerpt text,
  content text NOT NULL,
  category text,
  cover_image_url text,
  status text NOT NULL DEFAULT 'draft',
  author_id uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  published_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT articles_status_check CHECK (status IN ('draft', 'published', 'archived')),
  CONSTRAINT articles_published_at_check CHECK ((status = 'published' AND published_at IS NOT NULL) OR (status <> 'published'))
);

CREATE INDEX IF NOT EXISTS articles_status_published_at_idx ON public.articles (status, published_at DESC);

CREATE INDEX IF NOT EXISTS articles_author_status_idx ON public.articles (author_id, status, updated_at DESC);

CREATE OR REPLACE FUNCTION public.set_articles_updated_at ()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS set_articles_updated_at ON public.articles;

CREATE TRIGGER set_articles_updated_at
  BEFORE UPDATE ON public.articles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_articles_updated_at ();

ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read published articles" ON public.articles;

CREATE POLICY "Public can read published articles" ON public.articles
  FOR SELECT
  USING (status = 'published');

DROP POLICY IF EXISTS "Article writers can read own articles" ON public.articles;

CREATE POLICY "Article writers can read own articles" ON public.articles
  FOR SELECT TO authenticated
  USING (author_id = auth.uid ()
    AND (
      SELECT
        ROLE
      FROM
        public.profiles
      WHERE
        id = auth.uid ()) = 'article_writer');

DROP POLICY IF EXISTS "Admins can read all articles" ON public.articles;

CREATE POLICY "Admins can read all articles" ON public.articles
  FOR SELECT TO authenticated
  USING ((
    SELECT
      ROLE
    FROM
      public.profiles
    WHERE
      id = auth.uid ()) IN ('admin', 'superadmin'));

DROP POLICY IF EXISTS "Article writers can create own drafts" ON public.articles;

CREATE POLICY "Article writers can create own drafts" ON public.articles
  FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid ()
  AND status = 'draft'
  AND (
    SELECT
      ROLE
    FROM
      public.profiles
    WHERE
      id = auth.uid ()) = 'article_writer');

DROP POLICY IF EXISTS "Admins can create articles" ON public.articles;

CREATE POLICY "Admins can create articles" ON public.articles
  FOR INSERT TO authenticated
  WITH CHECK ((
    SELECT
      ROLE
    FROM
      public.profiles
    WHERE
      id = auth.uid ()) IN ('admin', 'superadmin'));

DROP POLICY IF EXISTS "Article writers can update own non-published articles" ON public.articles;

CREATE POLICY "Article writers can update own non-published articles" ON public.articles
  FOR UPDATE TO authenticated
  USING (author_id = auth.uid ()
    AND status <> 'published'
    AND (
      SELECT
        ROLE
      FROM
        public.profiles
      WHERE
        id = auth.uid ()) = 'article_writer')
  WITH CHECK (author_id = auth.uid ()
  AND status <> 'published'
  AND (
    SELECT
      ROLE
    FROM
      public.profiles
    WHERE
      id = auth.uid ()) = 'article_writer');

DROP POLICY IF EXISTS "Admins can update all articles" ON public.articles;

CREATE POLICY "Admins can update all articles" ON public.articles
  FOR UPDATE TO authenticated
  USING ((
    SELECT
      ROLE
    FROM
      public.profiles
    WHERE
      id = auth.uid ()) IN ('admin', 'superadmin'))
  WITH CHECK ((
    SELECT
      ROLE
    FROM
      public.profiles
    WHERE
      id = auth.uid ()) IN ('admin', 'superadmin'));

DROP POLICY IF EXISTS "Admins can delete articles" ON public.articles;

CREATE POLICY "Admins can delete articles" ON public.articles
  FOR DELETE TO authenticated
  USING ((
    SELECT
      ROLE
    FROM
      public.profiles
    WHERE
      id = auth.uid ()) IN ('admin', 'superadmin'));
