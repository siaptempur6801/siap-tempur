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
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT articles_status_check CHECK (status IN ('draft', 'published', 'archived')),
  CONSTRAINT articles_published_at_check CHECK ((status = 'published' AND published_at IS NOT NULL) OR status <> 'published')
);

CREATE INDEX IF NOT EXISTS articles_status_published_at_idx ON public.articles (status, published_at DESC);

CREATE INDEX IF NOT EXISTS articles_author_status_updated_idx ON public.articles (author_id, status, updated_at DESC);

CREATE OR REPLACE FUNCTION public.set_articles_updated_at ()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
BEGIN
  NEW.updated_at := pg_catalog.now();
  RETURN new;
END;
$function$;

REVOKE ALL ON FUNCTION public.set_articles_updated_at () FROM public, anon, authenticated;

DROP TRIGGER IF EXISTS set_articles_updated_at ON public.articles;

CREATE TRIGGER set_articles_updated_at
  BEFORE UPDATE ON public.articles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_articles_updated_at ();

ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.articles FROM public, anon, authenticated;

GRANT SELECT ON TABLE public.articles TO anon;

GRANT SELECT, INSERT, UPDATE ON TABLE public.articles TO authenticated;

GRANT ALL ON TABLE public.articles TO service_role;

DROP POLICY IF EXISTS articles_public_read_published ON public.articles;

CREATE POLICY articles_public_read_published ON public.articles
  FOR SELECT TO anon, authenticated
  USING (status = 'published');

DROP POLICY IF EXISTS articles_editor_read_own ON public.articles;

CREATE POLICY articles_editor_read_own ON public.articles
  FOR SELECT TO authenticated
  USING (author_id = (
    SELECT
      auth.uid ())
      AND app_private.current_user_has_permission ('content.read'));

DROP POLICY IF EXISTS articles_reviewer_read_all ON public.articles;

CREATE POLICY articles_reviewer_read_all ON public.articles
  FOR SELECT TO authenticated
  USING (app_private.current_user_has_permission ('content.review')
    OR app_private.current_user_has_permission ('content.publish'));

DROP POLICY IF EXISTS articles_editor_create_own_draft ON public.articles;

CREATE POLICY articles_editor_create_own_draft ON public.articles
  FOR INSERT TO authenticated
  WITH CHECK (author_id = (
    SELECT
      auth.uid ())
      AND status = 'draft'
      AND app_private.current_user_has_permission ('content.create'));

DROP POLICY IF EXISTS articles_editor_update_own_nonpublished ON public.articles;

CREATE POLICY articles_editor_update_own_nonpublished ON public.articles
  FOR UPDATE TO authenticated
  USING (author_id = (
    SELECT
      auth.uid ())
      AND status <> 'published'
      AND app_private.current_user_has_permission ('content.update'))
  WITH CHECK (author_id = (
    SELECT
      auth.uid ())
      AND status <> 'published'
      AND app_private.current_user_has_permission ('content.update'));
