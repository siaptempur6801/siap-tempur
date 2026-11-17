-- P0 security fix — kebocoran kunci jawaban lewat get_content_question_detail.
--
-- Guard lama (lihat 202608210004_content_review_workspace_access_v1.sql) membolehkan
-- SETIAP user terautentikasi membaca detail soal yang berstatus approved/published:
--
--   v_allowed := ... or v_q.status in ('approved','published') or ...
--
-- Payload fungsi ini memuat question_options (is_correct + score), question_explanations,
-- dan question_versions.snapshot (yang juga memuat is_correct + score). Karena question_id
-- asli dikirim ke browser saat attempt berjalan (src/services/practice-session.service.ts),
-- user biasa dapat membaca kunci jawaban di tengah ujian lewat
--   POST /rest/v1/rpc/get_content_question_detail {"p_question_id":"<uuid>"}.
--
-- Guard baru hanya mengizinkan author/reviewer soal atau pemegang permission workspace
-- konten — sama persis dengan kontrak akses /admin di app/admin/layout.tsx
-- (ADMIN_ACCESS atau salah satu CONTENT_PERMISSIONS).
--
-- Verifikasi setelah apply (harus 0 baris):
--   select 1
--   from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--   where n.nspname = 'app_private'
--     and p.proname = 'get_content_question_detail'
--     and pg_get_functiondef(p.oid) like '%''approved'',''published''%';
CREATE OR REPLACE FUNCTION app_private.get_content_question_detail (p_question_id uuid)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
DECLARE
  v_actor uuid := auth.uid ();
  v_q public.questions%rowtype;
  v_allowed boolean;
  v_result jsonb;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  SELECT
    *
  INTO
    v_q
  FROM
    public.questions
  WHERE
    id = p_question_id;
  IF NOT found THEN
    RAISE EXCEPTION 'Question not found';
  END IF;

  v_allowed := v_q.author_id = v_actor
    OR v_q.reviewer_id = v_actor
    OR app_private.current_user_has_permission ('admin.access')
    OR app_private.current_user_has_permission ('question.manage')
    OR app_private.current_user_has_permission ('content.read')
    OR app_private.current_user_has_permission ('content.create')
    OR app_private.current_user_has_permission ('content.update')
    OR app_private.current_user_has_permission ('content.review')
    OR app_private.current_user_has_permission ('content.publish');
  IF NOT v_allowed THEN
    RAISE EXCEPTION 'Question detail access denied';
  END IF;

  SELECT
    jsonb_build_object('question', to_jsonb (v_q), 'options', coalesce((
        SELECT
          jsonb_agg(to_jsonb (o)
        ORDER BY o.sort_order)
        FROM public.question_options o
        WHERE
          o.question_id = v_q.id), '[]'::jsonb), 'explanation', (
        SELECT
          to_jsonb (e)
        FROM public.question_explanations e
        WHERE
          e.question_id = v_q.id ORDER BY e.version DESC, e.created_at DESC LIMIT 1), 'stimulus', (
        SELECT
          to_jsonb (s)
        FROM public.question_stimuli s
      WHERE
        s.id = v_q.stimulus_id), 'knowledge_mappings', coalesce((
        SELECT
          jsonb_agg(to_jsonb (qk))
        FROM public.question_knowledge_nodes qk
      WHERE
        qk.question_id = v_q.id), '[]'::jsonb), 'knowledge_nodes', coalesce((
      SELECT
        jsonb_agg(to_jsonb (k)
      ORDER BY k.depth, k.sort_order, k.name)
      FROM public.knowledge_nodes k
    WHERE
      k.id IN (
        SELECT
          qk.knowledge_node_id
        FROM public.question_knowledge_nodes qk
      WHERE
        qk.question_id = v_q.id)), '[]'::jsonb), 'versions', coalesce((
    SELECT
      jsonb_agg(to_jsonb (v)
      ORDER BY v.version DESC)
  FROM public.question_versions v
WHERE
  v.question_id = v_q.id), '[]'::jsonb), 'reviews', coalesce((
  SELECT
    jsonb_agg(to_jsonb (r)
    ORDER BY r.review_round DESC, r.created_at DESC)
FROM public.content_reviews r
WHERE
  r.entity_type = 'question'
    AND r.entity_id = v_q.id), '[]'::jsonb), 'audit_logs', coalesce((
  SELECT
    jsonb_agg(to_jsonb (a)
    ORDER BY a.created_at DESC)
FROM (
  SELECT
    *
  FROM public.audit_logs a
WHERE
  a.entity_type = 'question'
    AND a.entity_id = v_q.id ORDER BY a.created_at DESC LIMIT 100) a), '[]'::jsonb), 'stimulus_candidates', coalesce((
  SELECT
    jsonb_agg(to_jsonb (s)
  ORDER BY s.updated_at DESC)
  FROM (
    SELECT
      *
    FROM public.question_stimuli s
  WHERE
    s.program_id = v_q.program_id
    AND s.track_id = v_q.track_id
    AND s.subject_id = v_q.subject_id ORDER BY s.updated_at DESC LIMIT 100) s), '[]'::jsonb), 'subject_knowledge_nodes', coalesce((
  SELECT
    jsonb_agg(to_jsonb (k)
  ORDER BY k.depth, k.sort_order, k.name)
  FROM public.knowledge_nodes k
WHERE
  k.subject_id = v_q.subject_id
    AND upper(k.status) = 'ACTIVE'), '[]'::jsonb))
  INTO
    v_result;
  RETURN v_result;
END;
$function$;
