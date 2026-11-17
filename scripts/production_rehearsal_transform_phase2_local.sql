\set ON_ERROR_STOP on
-- Production-clone rehearsal Phase 2 (LOCAL ONLY via guarded runner):
-- legacy sessions -> canonical exam_attempts -> question snapshots/answers -> subject scores.
-- Source: legacy_prod raw snapshot. Target: canonical public schema in Supabase Local.
BEGIN;
DO $$
DECLARE
  v_sessions bigint;
  v_answers bigint;
  v_scores bigint;
  v_phase1_auth bigint;
  v_phase1_profiles bigint;
  v_withheld_existing bigint;
BEGIN
  IF to_regclass('legacy_prod.test_sessions') IS NULL OR to_regclass('legacy_prod.test_answers') IS NULL OR to_regclass('legacy_prod.session_subject_scores') IS NULL OR to_regclass('legacy_prod.questions') IS NULL OR to_regclass('legacy_prod.options') IS NULL OR to_regclass('legacy_prod.subjects') IS NULL OR to_regclass('legacy_prod.program_track_map') IS NULL THEN
    RAISE EXCEPTION 'legacy_prod / Phase 1 mapping is incomplete';
  END IF;

  SELECT
    count(*)
  INTO
    v_sessions
  FROM
    legacy_prod.test_sessions;
  SELECT
    count(*)
  INTO
    v_answers
  FROM
    legacy_prod.test_answers;
  SELECT
    count(*)
  INTO
    v_scores
  FROM
    legacy_prod.session_subject_scores;
  SELECT
    count(*)
  INTO
    v_phase1_auth
  FROM
    legacy_prod.auth_users_identity a
    JOIN auth.users u ON u.id = a.id::uuid;
  SELECT
    count(*)
  INTO
    v_phase1_profiles
  FROM
    legacy_prod.profiles l
    JOIN public.profiles p ON p.id = l.id::uuid;

  IF v_sessions <> 476 OR v_answers <> 16889 OR v_scores <> 1273 THEN
    RAISE EXCEPTION 'unexpected history baseline: sessions=%, answers=%, scores=%', v_sessions, v_answers, v_scores;
  END IF;
  IF v_phase1_auth <> 426 OR v_phase1_profiles <> 426 THEN
    RAISE EXCEPTION 'Phase 1 must be green first: auth=%, profiles=%', v_phase1_auth, v_phase1_profiles;
  END IF;

  SELECT
    count(*)
  INTO
    v_withheld_existing
  FROM
    public.questions
  WHERE
    question_code IN ('TIU-000033', 'TIU-000064', 'TIU-000065', 'TWK-000385', 'TWK-000448', 'TWK-000461');
  IF v_withheld_existing <> 0 THEN
    RAISE EXCEPTION 'withheld needs_revision questions unexpectedly exist in canonical bank: %', v_withheld_existing;
  END IF;
END
$$;
-- Repeatable cleanup of Phase 2 artifacts only.
DELETE FROM public.exam_attempts
WHERE metadata ->> 'migration_source' = 'production_legacy_rehearsal';
DELETE FROM public.exams
WHERE slug LIKE 'legacy-history-%';
DELETE FROM public.questions
WHERE source_type = 'legacy_history_placeholder';
DROP TABLE IF EXISTS legacy_prod.archive_exam_map;
DROP TABLE IF EXISTS legacy_prod.subject_map;
DROP TABLE IF EXISTS legacy_prod.question_map;
DROP TABLE IF EXISTS legacy_prod.option_map;
DROP TABLE IF EXISTS legacy_prod.question_snapshots;
DROP TABLE IF EXISTS legacy_prod.answer_selection;
-- Legacy subject -> canonical subject, scoped by mapped program/track.
CREATE TABLE legacy_prod.subject_map (
  legacy_subject_id uuid PRIMARY KEY,
  canonical_subject_id uuid NOT NULL,
  canonical_track_id uuid NOT NULL,
  legacy_code text NOT NULL,
  canonical_code text NOT NULL
);
INSERT INTO legacy_prod.subject_map (legacy_subject_id, canonical_subject_id, canonical_track_id, legacy_code, canonical_code)
SELECT
  ls.id::uuid,
  cs.id,
  pm.canonical_track_id,
  ls.code,
  cs.code
FROM
  legacy_prod.subjects ls
  JOIN legacy_prod.program_track_map pm ON pm.legacy_program_id = ls.program_id::uuid
  JOIN public.subjects cs ON cs.track_id = pm.canonical_track_id
    AND cs.code = CASE ls.code
    WHEN 'BIND' THEN
      'BIN'
    WHEN 'BING' THEN
      'BIG'
    WHEN 'MTK' THEN
      'MAT'
    WHEN 'MTKL' THEN
      'MAT-LANJUT'
    ELSE
      ls.code
    END;
DO $$
DECLARE
  v_missing bigint;
BEGIN
  SELECT
    count(*)
  INTO
    v_missing
  FROM ( SELECT DISTINCT
      q.subject_id::uuid AS subject_id
    FROM
      legacy_prod.test_answers a
      JOIN legacy_prod.questions q ON q.id = a.question_id
  UNION
  SELECT DISTINCT
    s.subject_id::uuid
  FROM
    legacy_prod.session_subject_scores s) x
  LEFT JOIN legacy_prod.subject_map sm ON sm.legacy_subject_id = x.subject_id
WHERE
  sm.legacy_subject_id IS NULL;

  IF v_missing <> 0 THEN
    RAISE EXCEPTION 'subject mapping incomplete for history rows: missing=%', v_missing;
  END IF;
END
$$;
-- Create one hidden draft placeholder per canonical subject only when a legacy answered
-- question has no canonical question_code match. Exact content still lives in question_snapshot.
INSERT INTO public.questions (id, question_code, program_id, track_id, subject_id, question_type, stem, difficulty, cognitive_level, source_type, source_reference, estimated_seconds, status, version, author_id, reviewer_id, published_at, created_at, updated_at, stimulus_id, stimulus_order, response_config)
SELECT DISTINCT
  md5('legacy-history-placeholder:' || sm.canonical_subject_id::text)::uuid,
  'LEGACY-HISTORY-' || upper(t.code) || '-' || upper(cs.code),
  t.program_id,
  t.id,
  cs.id,
  'single_choice'::text,
  '[Legacy history placeholder] Exact question content is preserved in attempt question_snapshot.'::text,
  'medium'::text,
  NULL::text,
  'legacy_history_placeholder'::text,
  ('production-legacy-history:' || t.slug || ':' || cs.slug)::text,
  NULL::integer,
  'draft'::text,
  1::integer,
  '4cf7114c-7613-4676-9aa9-64793f855f04'::uuid,
  NULL::uuid,
  NULL::timestamptz,
  now(),
  now(),
  NULL::uuid,
  1::integer,
  '{}'::jsonb
FROM
  legacy_prod.test_answers a
  JOIN legacy_prod.questions lq ON lq.id = a.question_id
  JOIN legacy_prod.subject_map sm ON sm.legacy_subject_id = lq.subject_id::uuid
  JOIN public.subjects cs ON cs.id = sm.canonical_subject_id
  JOIN public.tracks t ON t.id = sm.canonical_track_id
  LEFT JOIN public.questions cq ON cq.question_code = lq.question_code
WHERE
  cq.id IS NULL
ON CONFLICT (question_code)
  DO NOTHING;
CREATE TABLE legacy_prod.question_map (
  legacy_question_id uuid PRIMARY KEY,
  legacy_question_code text NOT NULL,
  canonical_question_id uuid NOT NULL,
  mapping_type text NOT NULL CHECK (mapping_type IN ('canonical_code', 'history_placeholder'))
);
INSERT INTO legacy_prod.question_map (legacy_question_id, legacy_question_code, canonical_question_id, mapping_type)
SELECT
  lq.id::uuid,
  lq.question_code,
  coalesce(cq.id, md5('legacy-history-placeholder:' || sm.canonical_subject_id::text)::uuid),
  CASE WHEN cq.id IS NOT NULL THEN
    'canonical_code'
  ELSE
    'history_placeholder'
  END
FROM
  legacy_prod.questions lq
  JOIN legacy_prod.subject_map sm ON sm.legacy_subject_id = lq.subject_id::uuid
  LEFT JOIN public.questions cq ON cq.question_code = lq.question_code
    AND cq.source_type <> 'legacy_history_placeholder';
DO $$
DECLARE
  v_unmapped_answers bigint;
  v_withheld_maps bigint;
  v_withheld_answers bigint;
BEGIN
  SELECT
    count(*)
  INTO
    v_unmapped_answers
  FROM
    legacy_prod.test_answers a
    LEFT JOIN legacy_prod.question_map qm ON qm.legacy_question_id = a.question_id::uuid
  WHERE
    qm.legacy_question_id IS NULL;

  SELECT
    count(*)
  INTO
    v_withheld_maps
  FROM
    legacy_prod.question_map
  WHERE
    legacy_question_code IN ('TIU-000033', 'TIU-000064', 'TIU-000065', 'TWK-000385', 'TWK-000448', 'TWK-000461')
    AND mapping_type = 'history_placeholder';

  SELECT
    count(*)
  INTO
    v_withheld_answers
  FROM
    legacy_prod.test_answers a
    JOIN legacy_prod.questions q ON q.id = a.question_id
  WHERE
    q.question_code IN ('TIU-000033', 'TIU-000064', 'TIU-000065', 'TWK-000385', 'TWK-000448', 'TWK-000461');

  IF v_unmapped_answers <> 0 THEN
    RAISE EXCEPTION 'answered question mapping incomplete: unmapped answers=%', v_unmapped_answers;
  END IF;
  IF v_withheld_maps <> 6 OR v_withheld_answers <> 405 THEN
    RAISE EXCEPTION 'withheld-history reconciliation failed: mapped_codes=%, answers=%', v_withheld_maps, v_withheld_answers;
  END IF;
END
$$;
-- Map legacy options to canonical options only for exact canonical-question mappings.
CREATE TABLE legacy_prod.option_map (
  legacy_option_id uuid PRIMARY KEY,
  canonical_option_id uuid,
  mapping_type text NOT NULL
);
INSERT INTO legacy_prod.option_map (legacy_option_id, canonical_option_id, mapping_type)
SELECT
  lo.id::uuid,
  qo.id,
  CASE WHEN qo.id IS NOT NULL THEN
    'canonical_sort_order'
  ELSE
    'snapshot_only'
  END
FROM
  legacy_prod.options lo
  JOIN legacy_prod.question_map qm ON qm.legacy_question_id = lo.question_id::uuid
  LEFT JOIN public.question_options qo ON qm.mapping_type = 'canonical_code'
    AND qo.question_id = qm.canonical_question_id
    AND qo.sort_order = lo.sort_order::integer;
-- Precompute exact legacy snapshots once; every attempt_question uses this immutable JSON.
CREATE TABLE legacy_prod.question_snapshots AS
SELECT
  lq.id::uuid AS legacy_question_id,
  jsonb_build_object('migration_source', 'production_legacy_rehearsal', 'legacy_question_id', lq.id, 'legacy_question_code', lq.question_code, 'stem', lq.content, 'type', lq.type, 'category', nullif (lq.category, ''), 'sub_category', nullif (lq.sub_category, ''), 'explanation', nullif (lq.explanation, ''), 'image_url', nullif (lq.image_url, ''), 'legacy_subject_id', lq.subject_id, 'legacy_program_id', lq.program_id, 'mapping_type', qm.mapping_type, 'canonical_question_id', qm.canonical_question_id, 'options', coalesce(jsonb_agg(jsonb_build_object('legacy_option_id', lo.id, 'content', lo.content, 'is_correct', nullif (lo.is_correct, '')::boolean, 'score_value', coalesce(nullif (lo.score_value, '')::numeric, 0), 'sort_order', coalesce(nullif (lo.sort_order, '')::integer, 0), 'image_url', nullif (lo.image_url, ''), 'response_group', nullif (lo.response_group, ''), 'response_group_order', nullif (lo.response_group_order, '')::integer)
      ORDER BY coalesce(nullif (lo.sort_order, '')::integer, 0), lo.id) FILTER (WHERE lo.id IS NOT NULL), '[]'::jsonb)) AS snapshot,
  coalesce(max(coalesce(nullif (lo.score_value, '')::numeric, 0)), 0) AS max_score
FROM
  legacy_prod.questions lq
  JOIN legacy_prod.question_map qm ON qm.legacy_question_id = lq.id::uuid
  LEFT JOIN legacy_prod.options lo ON lo.question_id = lq.id
GROUP BY
  lq.id,
  lq.question_code,
  lq.content,
  lq.type,
  lq.category,
  lq.sub_category,
  lq.explanation,
  lq.image_url,
  lq.subject_id,
  lq.program_id,
  qm.mapping_type,
  qm.canonical_question_id;
-- Hidden archive exams are per canonical track and legacy history class. They are draft so
-- they do not become user-facing catalog exams; attempts can still satisfy the canonical FK.
CREATE TABLE legacy_prod.archive_exam_map (
  legacy_program_id uuid NOT NULL,
  history_class text NOT NULL,
  canonical_exam_id uuid NOT NULL,
  canonical_track_id uuid NOT NULL,
  PRIMARY KEY (legacy_program_id, history_class)
);
WITH classes AS (
  SELECT DISTINCT
    ts.program_id::uuid AS legacy_program_id,
    CASE WHEN ts.session_kind = 'mini_tryout' THEN
      'mini'
    WHEN ts.session_kind = 'full_tryout' THEN
      'full'
    WHEN ts.mode = 'practice'
      OR ts.session_kind = 'drilling_materi' THEN
      'practice'
    ELSE
      'full'
    END AS history_class
  FROM
    legacy_prod.test_sessions ts
),
mapped AS (
  SELECT
    c.*,
    pm.canonical_program_id,
    pm.canonical_track_id,
    t.slug AS track_slug,
    t.name AS track_name,
    CASE c.history_class
    WHEN 'practice' THEN
      'DRILL'
    WHEN 'mini' THEN
      'MINI_TRYOUT'
    ELSE
      'FULL_TRYOUT'
    END AS exam_type_code
  FROM
    classes c
    JOIN legacy_prod.program_track_map pm ON pm.legacy_program_id = c.legacy_program_id
    JOIN public.tracks t ON t.id = pm.canonical_track_id
),
inserted AS (
INSERT INTO public.exams (id, program_id, track_id, period_id, exam_type_id, exam_rule_id, blueprint_id, title, slug, description, duration_seconds, attempt_limit, question_order, result_visibility, access_type, status, starts_at, ends_at, created_by, created_at, updated_at, required_feature_id, token_cost)
  SELECT
    md5('legacy-history-exam:' || m.canonical_track_id::text || ':' || m.history_class)::uuid,
    m.canonical_program_id,
    m.canonical_track_id,
    NULL::uuid,
    et.id,
    NULL::uuid,
    NULL::uuid,
    '[Legacy History] ' || m.track_name || ' ' || initcap(m.history_class),
    'legacy-history-' || m.track_slug || '-' || m.history_class,
    'Migration-only archive exam for preserving legacy attempt history. Not user-facing.',
    NULL::integer,
    NULL::integer,
    'fixed',
    'instant',
    'free',
    'draft',
    NULL::timestamptz,
    NULL::timestamptz,
    '4cf7114c-7613-4676-9aa9-64793f855f04'::uuid,
    now(),
    now(),
    NULL::uuid,
    0
  FROM
    mapped m
    JOIN public.exam_types et ON et.code = m.exam_type_code
  RETURNING
    id)
INSERT INTO legacy_prod.archive_exam_map (legacy_program_id, history_class, canonical_exam_id, canonical_track_id)
SELECT
  m.legacy_program_id,
  m.history_class,
  md5('legacy-history-exam:' || m.canonical_track_id::text || ':' || m.history_class)::uuid,
  m.canonical_track_id
FROM
  mapped m;
DO $$
DECLARE
  v_missing bigint;
BEGIN
  SELECT
    count(*)
  INTO
    v_missing
  FROM
    legacy_prod.test_sessions ts
    LEFT JOIN legacy_prod.archive_exam_map aem ON aem.legacy_program_id = ts.program_id::uuid
      AND aem.history_class = CASE WHEN ts.session_kind = 'mini_tryout' THEN
        'mini'
      WHEN ts.session_kind = 'full_tryout' THEN
        'full'
      WHEN ts.mode = 'practice'
        OR ts.session_kind = 'drilling_materi' THEN
        'practice'
      ELSE
        'full'
      END
  WHERE
    aem.canonical_exam_id IS NULL;
  IF v_missing <> 0 THEN
    RAISE EXCEPTION 'archive exam mapping incomplete: sessions missing=%', v_missing;
  END IF;
END
$$;
-- Preserve legacy session UUID directly as canonical attempt UUID.
WITH classified AS (
  SELECT
    ts.*,
    CASE WHEN ts.session_kind = 'mini_tryout' THEN
      'mini'
    WHEN ts.session_kind = 'full_tryout' THEN
      'full'
    WHEN ts.mode = 'practice'
      OR ts.session_kind = 'drilling_materi' THEN
      'practice'
    ELSE
      'full'
    END AS history_class
  FROM
    legacy_prod.test_sessions ts
),
numbered AS (
  SELECT
    c.*,
    aem.canonical_exam_id,
    row_number() OVER (PARTITION BY c.user_id,
      aem.canonical_exam_id ORDER BY c.start_time::timestamptz,
      c.id)::integer AS attempt_number_calc
  FROM
    classified c
    JOIN legacy_prod.archive_exam_map aem ON aem.legacy_program_id = c.program_id::uuid
      AND aem.history_class = c.history_class)
  INSERT INTO public.exam_attempts (id, exam_id, user_id, attempt_number, status, started_at, submitted_at, duration_used_seconds, total_score, percentage, rank, passed, last_question_position, last_saved_at, metadata, created_at, updated_at)
  SELECT
    n.id::uuid,
    n.canonical_exam_id,
    n.user_id::uuid,
    n.attempt_number_calc,
    coalesce(nullif (n.status, ''), 'in_progress'),
    nullif (n.start_time, '')::timestamptz,
    CASE WHEN n.status = 'completed' THEN
      coalesce(nullif (n.end_time, '')::timestamptz, nullif(n.last_activity_at,'')::timestamptz)
    ELSE
      NULL
    END,
    greatest (0, extract(epoch FROM (coalesce(nullif (n.end_time, '')::timestamptz, nullif(n.last_activity_at,'')::timestamptz, nullif (n.start_time, '')::timestamptz) - nullif (n.start_time, '')::timestamptz))::integer), nullif (n.total_score, '')::numeric, NULL::numeric, NULL::integer, nullif (n.is_passed, '')::boolean, nullif (n.current_question_index, '')::integer, nullif (n.last_activity_at, '')::timestamptz, jsonb_build_object('migration_source', 'production_legacy_rehearsal', 'legacy_session_id', n.id, 'legacy_program_id', n.program_id, 'legacy_exam_id', nullif (n.exam_id, ''), 'legacy_mode', nullif (n.mode, ''), 'legacy_session_kind', nullif (n.session_kind, ''), 'legacy_practice_subject_id', nullif (n.practice_subject_id, ''), 'legacy_practice_sub_category', nullif (n.practice_sub_category, ''), 'legacy_practice_difficulty', nullif (n.practice_difficulty, ''), 'legacy_deadline_at', nullif (n.deadline_at, ''), 'legacy_score_twk', nullif (n.score_twk, '')::integer, 'legacy_score_tiu', nullif (n.score_tiu, '')::integer, 'legacy_score_tkp', nullif (n.score_tkp, '')::integer, 'legacy_marked_questions', coalesce(nullif (n.marked_questions, '')::jsonb, '{}'::jsonb), 'history_class', n.history_class), coalesce(nullif (n.created_at, '')::timestamptz, nullif (n.start_time, '')::timestamptz, now()), coalesce(nullif (n.last_activity_at, '')::timestamptz, nullif (n.end_time, '')::timestamptz, nullif (n.created_at, '')::timestamptz, now())
      FROM numbered n;
-- Every legacy answer becomes one immutable attempt_question snapshot. The answer UUID is also
-- reused as attempt_question UUID, which gives a deterministic 1:1 audit trail.
WITH ordered_answers AS (
  SELECT
    ta.*,
    row_number() OVER (PARTITION BY ta.session_id ORDER BY CASE WHEN nullif (ta.question_order, '') IS NULL THEN
        1
      ELSE
        0
      END,
      nullif (ta.question_order, '')::integer NULLS LAST,
      ta.created_at::timestamptz,
      ta.id)::integer AS position_calc
  FROM
    legacy_prod.test_answers ta)
INSERT INTO public.attempt_questions (id, attempt_id, question_id, question_version, position, section_id, question_snapshot, max_score, created_at)
SELECT
  oa.id::uuid,
  oa.session_id::uuid,
  qm.canonical_question_id,
  coalesce(cq.version, 1),
  oa.position_calc,
  NULL::uuid,
  qs.snapshot || jsonb_build_object('legacy_question_order', nullif (oa.question_order, '')::integer, 'legacy_option_order', CASE WHEN nullif (oa.option_order, '') IS NULL THEN
    'null'::jsonb
  ELSE
    to_jsonb (oa.option_order::uuid[])
END),
  qs.max_score,
  coalesce(nullif (oa.created_at, '')::timestamptz, now())
FROM
  ordered_answers oa
  JOIN legacy_prod.question_map qm ON qm.legacy_question_id = oa.question_id::uuid
  JOIN public.questions cq ON cq.id = qm.canonical_question_id
  JOIN legacy_prod.question_snapshots qs ON qs.legacy_question_id = oa.question_id::uuid;
-- Normalize selected legacy option ids. selected_option_ids is authoritative when non-empty;
-- old option_id is the fallback for older answer rows.
CREATE TABLE legacy_prod.answer_selection AS
SELECT
  ta.id::uuid AS legacy_answer_id,
  x.legacy_option_id
FROM
  legacy_prod.test_answers ta
  CROSS JOIN LATERAL unnest(
    CASE WHEN nullif (ta.selected_option_ids, '') IS NOT NULL
      AND ta.selected_option_ids <> '{}' THEN
      ta.selected_option_ids::uuid[]
    WHEN nullif (ta.option_id, '') IS NOT NULL THEN
      ARRAY[ta.option_id::uuid]
    ELSE
      '{}'::uuid[]
    END) AS x (legacy_option_id);
INSERT INTO public.attempt_answers (id, attempt_question_id, selected_option_id, answer_value, is_correct, score_awarded, answered_at, time_spent_seconds, is_flagged, created_at, updated_at)
SELECT
  ta.id::uuid,
  ta.id::uuid,
  CASE WHEN agg.selected_count = 1
    AND agg.mapped_count = 1 THEN
    agg.single_canonical_option_id
  ELSE
    NULL::uuid
  END,
  jsonb_build_object('migration_source', 'production_legacy_rehearsal', 'legacy_answer_id', ta.id, 'legacy_option_id', nullif (ta.option_id, ''), 'legacy_selected_option_ids', CASE WHEN nullif (ta.selected_option_ids, '') IS NULL THEN
    '[]'::jsonb
  ELSE
    to_jsonb (ta.selected_option_ids::uuid[])
END, 'selected_options', coalesce(agg.selected_options, '[]'::jsonb))::text,
  agg.is_correct,
  coalesce(agg.score_awarded, 0),
  coalesce(nullif (ta.created_at, '')::timestamptz, now()),
  0,
  FALSE,
  coalesce(nullif (ta.created_at, '')::timestamptz, now()),
  coalesce(nullif (ta.created_at, '')::timestamptz, now())
FROM
  legacy_prod.test_answers ta
  LEFT JOIN LATERAL (
    SELECT
      count(*)::integer AS selected_count,
      count(om.canonical_option_id)::integer AS mapped_count,
      (array_agg(om.canonical_option_id ORDER BY om.canonical_option_id::text) FILTER (WHERE om.canonical_option_id IS NOT NULL))[1] AS single_canonical_option_id,
      CASE WHEN count(*) = 0 THEN
        NULL
      ELSE
        bool_and(coalesce(nullif (lo.is_correct, '')::boolean, FALSE))
      END AS is_correct,
      coalesce(sum(coalesce(nullif (lo.score_value, '')::numeric, 0)), 0) AS score_awarded,
      jsonb_agg(jsonb_build_object('legacy_option_id', sel.legacy_option_id, 'canonical_option_id', om.canonical_option_id, 'content', lo.content, 'is_correct', nullif (lo.is_correct, '')::boolean, 'score_value', coalesce(nullif (lo.score_value, '')::numeric, 0), 'sort_order', coalesce(nullif (lo.sort_order, '')::integer, 0))
    ORDER BY
      coalesce(nullif (lo.sort_order, '')::integer, 0),
      sel.legacy_option_id) AS selected_options
FROM
  legacy_prod.answer_selection sel
  LEFT JOIN legacy_prod.options lo ON lo.id = sel.legacy_option_id::text
  LEFT JOIN legacy_prod.option_map om ON om.legacy_option_id = sel.legacy_option_id
WHERE
  sel.legacy_answer_id = ta.id::uuid) agg ON TRUE;
INSERT INTO public.attempt_answer_options (attempt_answer_id, option_id)
SELECT DISTINCT
  sel.legacy_answer_id,
  om.canonical_option_id
FROM
  legacy_prod.answer_selection sel
  JOIN legacy_prod.option_map om ON om.legacy_option_id = sel.legacy_option_id
WHERE
  om.canonical_option_id IS NOT NULL;
-- Preserve subject score UUIDs and exact raw score aggregates.
INSERT INTO public.attempt_scores (id, attempt_id, subject_id, raw_score, normalized_score, percentage, passing_score, passed, correct_count, wrong_count, unanswered_count, created_at)
SELECT
  ss.id::uuid,
  ss.session_id::uuid,
  sm.canonical_subject_id,
  ss.score::numeric,
  NULL::numeric,
  CASE WHEN nullif (ls.max_score, '') IS NOT NULL
    AND ls.max_score::numeric > 0 THEN
    round((ss.score::numeric / ls.max_score::numeric) * 100, 4)
  ELSE
    NULL::numeric
  END,
  nullif (ls.passing_grade, '')::numeric,
  CASE WHEN nullif (ls.passing_grade, '') IS NULL THEN
    NULL::boolean
  ELSE
    ss.score::numeric >= ls.passing_grade::numeric
  END,
  0,
  0,
  0,
  coalesce(nullif (ss.created_at, '')::timestamptz, now())
FROM
  legacy_prod.session_subject_scores ss
  JOIN legacy_prod.subject_map sm ON sm.legacy_subject_id = ss.subject_id::uuid
  JOIN legacy_prod.subjects ls ON ls.id = ss.subject_id;
-- Hard reconciliation gates for Phase 2.
DO $$
DECLARE
  v_attempts bigint;
  v_completed bigint;
  v_noncompleted bigint;
  v_questions bigint;
  v_answers bigint;
  v_scores bigint;
  v_preserved_ids bigint;
  v_total_score numeric;
  v_twk numeric;
  v_tiu numeric;
  v_tkp numeric;
  v_orphan_aq bigint;
  v_orphan_aa bigint;
  v_orphan_as bigint;
  v_draft_legacy bigint;
  v_draft_versions bigint;
BEGIN
  SELECT
    count(*)
  INTO
    v_attempts
  FROM
    public.exam_attempts
  WHERE
    metadata ->> 'migration_source' = 'production_legacy_rehearsal';
  SELECT
    count(*)
  INTO
    v_completed
  FROM
    public.exam_attempts
  WHERE
    metadata ->> 'migration_source' = 'production_legacy_rehearsal'
    AND status = 'completed';
  SELECT
    count(*)
  INTO
    v_noncompleted
  FROM
    public.exam_attempts
  WHERE
    metadata ->> 'migration_source' = 'production_legacy_rehearsal'
    AND status <> 'completed';
  SELECT
    count(*)
  INTO
    v_questions
  FROM
    public.attempt_questions aq
    JOIN public.exam_attempts ea ON ea.id = aq.attempt_id
  WHERE
    ea.metadata ->> 'migration_source' = 'production_legacy_rehearsal';
  SELECT
    count(*)
  INTO
    v_answers
  FROM
    public.attempt_answers aa
    JOIN public.attempt_questions aq ON aq.id = aa.attempt_question_id
    JOIN public.exam_attempts ea ON ea.id = aq.attempt_id
  WHERE
    ea.metadata ->> 'migration_source' = 'production_legacy_rehearsal';
  SELECT
    count(*)
  INTO
    v_scores
  FROM
    public.attempt_scores s
    JOIN public.exam_attempts ea ON ea.id = s.attempt_id
  WHERE
    ea.metadata ->> 'migration_source' = 'production_legacy_rehearsal';

  SELECT
    count(*)
  INTO
    v_preserved_ids
  FROM
    legacy_prod.test_sessions ts
    JOIN public.exam_attempts ea ON ea.id = ts.id::uuid
  WHERE
    ea.metadata ->> 'migration_source' = 'production_legacy_rehearsal';

  SELECT
    coalesce(sum(total_score), 0)
  INTO
    v_total_score
  FROM
    public.exam_attempts
  WHERE
    metadata ->> 'migration_source' = 'production_legacy_rehearsal'
    AND status = 'completed';

  SELECT
    coalesce(sum(s.raw_score), 0)
  INTO
    v_twk
  FROM
    public.attempt_scores s
    JOIN public.subjects sub ON sub.id = s.subject_id
    JOIN public.exam_attempts ea ON ea.id = s.attempt_id
  WHERE
    ea.metadata ->> 'migration_source' = 'production_legacy_rehearsal'
    AND sub.code = 'TWK';
  SELECT
    coalesce(sum(s.raw_score), 0)
  INTO
    v_tiu
  FROM
    public.attempt_scores s
    JOIN public.subjects sub ON sub.id = s.subject_id
    JOIN public.exam_attempts ea ON ea.id = s.attempt_id
  WHERE
    ea.metadata ->> 'migration_source' = 'production_legacy_rehearsal'
    AND sub.code = 'TIU';
  SELECT
    coalesce(sum(s.raw_score), 0)
  INTO
    v_tkp
  FROM
    public.attempt_scores s
    JOIN public.subjects sub ON sub.id = s.subject_id
    JOIN public.exam_attempts ea ON ea.id = s.attempt_id
  WHERE
    ea.metadata ->> 'migration_source' = 'production_legacy_rehearsal'
    AND sub.code = 'TKP';

  SELECT
    count(*)
  INTO
    v_orphan_aq
  FROM
    public.attempt_questions aq
    LEFT JOIN public.exam_attempts ea ON ea.id = aq.attempt_id
  WHERE
    ea.id IS NULL;
  SELECT
    count(*)
  INTO
    v_orphan_aa
  FROM
    public.attempt_answers aa
    LEFT JOIN public.attempt_questions aq ON aq.id = aa.attempt_question_id
  WHERE
    aq.id IS NULL;
  SELECT
    count(*)
  INTO
    v_orphan_as
  FROM
    public.attempt_scores s
    LEFT JOIN public.exam_attempts ea ON ea.id = s.attempt_id
  WHERE
    ea.id IS NULL;

  SELECT
    count(*)
  INTO
    v_draft_legacy
  FROM
    public.questions
  WHERE
    source_type = 'legacy_migration'
    AND status = 'draft';
  SELECT
    count(*)
  INTO
    v_draft_versions
  FROM
    public.question_versions qv
    JOIN public.questions q ON q.id = qv.question_id
  WHERE
    q.source_type = 'legacy_migration'
    AND q.status = 'draft';

  IF v_attempts <> 476 OR v_completed <> 426 OR v_noncompleted <> 50 OR v_preserved_ids <> 476 THEN
    RAISE EXCEPTION 'attempt reconciliation failed: attempts=%, completed=%, noncompleted=%, preserved_ids=%', v_attempts, v_completed, v_noncompleted, v_preserved_ids;
  END IF;
  IF v_questions <> 16889 OR v_answers <> 16889 OR v_scores <> 1273 THEN
    RAISE EXCEPTION 'history row reconciliation failed: attempt_questions=%, answers=%, scores=%', v_questions, v_answers, v_scores;
  END IF;
  IF v_total_score <> 88239 OR v_twk <> 21365 OR v_tiu <> 22255 OR v_tkp <> 44603 THEN
    RAISE EXCEPTION 'score reconciliation failed: total=%, TWK=%, TIU=%, TKP=%', v_total_score, v_twk, v_tiu, v_tkp;
  END IF;
  IF v_orphan_aq <> 0 OR v_orphan_aa <> 0 OR v_orphan_as <> 0 THEN
    RAISE EXCEPTION 'orphan reconciliation failed: aq=%, aa=%, scores=%', v_orphan_aq, v_orphan_aa, v_orphan_as;
  END IF;
  IF v_draft_legacy <> 433 OR v_draft_versions <> 0 THEN
    RAISE EXCEPTION 'CPNS reviewed draft invariant changed: legacy drafts=%, versions=%', v_draft_legacy, v_draft_versions;
  END IF;
END
$$;
COMMIT;
SELECT
  (
    SELECT
      count(*)
    FROM
      public.exam_attempts
    WHERE
      metadata ->> 'migration_source' = 'production_legacy_rehearsal') AS attempts,
  (
    SELECT
      count(*)
    FROM
      public.exam_attempts
    WHERE
      metadata ->> 'migration_source' = 'production_legacy_rehearsal'
      AND status = 'completed') AS completed,
  (
    SELECT
      count(*)
    FROM
      public.attempt_questions aq
      JOIN public.exam_attempts ea ON ea.id = aq.attempt_id
    WHERE
      ea.metadata ->> 'migration_source' = 'production_legacy_rehearsal') AS attempt_questions,
  (
    SELECT
      count(*)
    FROM
      public.attempt_answers aa
      JOIN public.attempt_questions aq ON aq.id = aa.attempt_question_id
      JOIN public.exam_attempts ea ON ea.id = aq.attempt_id
    WHERE
      ea.metadata ->> 'migration_source' = 'production_legacy_rehearsal') AS attempt_answers,
  (
    SELECT
      count(*)
    FROM
      public.attempt_scores s
      JOIN public.exam_attempts ea ON ea.id = s.attempt_id
    WHERE
      ea.metadata ->> 'migration_source' = 'production_legacy_rehearsal') AS attempt_scores,
  (
    SELECT
      count(*)
    FROM
      public.questions
    WHERE
      source_type = 'legacy_history_placeholder') AS history_placeholders;
SELECT
  mapping_type,
  count(*) AS legacy_questions
FROM
  legacy_prod.question_map
GROUP BY
  mapping_type
ORDER BY
  mapping_type;
SELECT
  sub.code,
  sum(s.raw_score) AS raw_score_sum
FROM
  public.attempt_scores s
  JOIN public.subjects sub ON sub.id = s.subject_id
  JOIN public.exam_attempts ea ON ea.id = s.attempt_id
WHERE
  ea.metadata ->> 'migration_source' = 'production_legacy_rehearsal'
  AND sub.code IN ('TWK', 'TIU', 'TKP')
GROUP BY
  sub.code
ORDER BY
  sub.code;
