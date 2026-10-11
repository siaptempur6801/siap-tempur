BEGIN;
-- TKA SMP canonical blueprint aligned to the 2026 official assessment model.
-- Official exam subjects: Matematika + Bahasa Indonesia.
-- Bahasa Inggris + IPA remain available in the catalog as enrichment only.
WITH ctx AS (
  SELECT
    t.id AS track_id
  FROM
    programs p
    JOIN tracks t ON t.program_id = p.id
  WHERE
    p.code = 'TKA'
    AND t.code = 'SMP')
UPDATE
  subjects s
SET
  subject_type = CASE WHEN s.code IN ('MAT', 'BIN') THEN
    'mandatory'
  WHEN s.code IN ('BIG', 'IPA') THEN
    'enrichment'
  ELSE
    s.subject_type
  END,
  updated_at = now()
FROM
  ctx
WHERE
  s.track_id = ctx.track_id
  AND s.code IN ('MAT', 'BIN', 'BIG', 'IPA');
WITH actor AS (
  SELECT
    p.id
  FROM
    profiles p
    JOIN user_roles ur ON ur.user_id = p.id
    JOIN roles r ON r.id = ur.role_id
  WHERE
    lower(p.status) = 'active'
    AND r.code IN ('ADMIN', 'SUPER_ADMIN')
  ORDER BY
    p.created_at ASC
  LIMIT 1
),
ctx AS (
  SELECT
    p.id AS program_id,
    t.id AS track_id
  FROM
    programs p
    JOIN tracks t ON t.program_id = p.id
  WHERE
    p.code = 'TKA'
    AND t.code = 'SMP'
),
seed (
  slug, title, exam_type_code, duration_seconds, attempt_limit, question_order, result_visibility, access_type, status, token_cost, required_feature_code
) AS (
  VALUES ('tka-smp-full', 'Tryout Lengkap TKA SMP', 'FULL_TRYOUT', 9000, NULL::integer, 'section_random', 'instant', 'PREMIUM', 'draft', 0, 'tka.smp.full_tryout.regular'),
    ('tka-smp-mini-matematika', 'Mini Tryout Matematika TKA SMP', 'MINI_TRYOUT', 4500, 1, 'section_random', 'instant', 'FREEMIUM', 'draft', 0, 'tka.smp.mini_tryout.unlimited'),
    ('tka-smp-mini-bahasa-indonesia', 'Mini Tryout Bahasa Indonesia TKA SMP', 'MINI_TRYOUT', 4500, 1, 'section_random', 'instant', 'FREEMIUM', 'draft', 0, 'tka.smp.mini_tryout.unlimited'))
INSERT INTO exams (program_id, track_id, exam_type_id, title, slug, duration_seconds, attempt_limit, question_order, result_visibility, access_type, status, token_cost, required_feature_id, created_by, updated_at)
SELECT
  ctx.program_id,
  ctx.track_id,
  et.id,
  seed.title,
  seed.slug,
  seed.duration_seconds,
  seed.attempt_limit,
  seed.question_order,
  seed.result_visibility,
  seed.access_type,
  seed.status,
  seed.token_cost,
  f.id,
  actor.id,
  now()
FROM
  seed
  CROSS JOIN ctx
  CROSS JOIN actor
  JOIN exam_types et ON et.code = seed.exam_type_code
  JOIN features f ON f.code = seed.required_feature_code
ON CONFLICT (slug)
  DO UPDATE SET
    program_id = excluded.program_id,
    track_id = excluded.track_id,
    exam_type_id = excluded.exam_type_id,
    title = excluded.title,
    duration_seconds = excluded.duration_seconds,
    attempt_limit = excluded.attempt_limit,
    question_order = excluded.question_order,
    result_visibility = excluded.result_visibility,
    access_type = excluded.access_type,
    status = excluded.status,
    token_cost = excluded.token_cost,
    required_feature_id = excluded.required_feature_id,
    updated_at = now();
-- Update existing section rows in place so historical attempt snapshots never lose FK targets.
WITH section_seed (
  exam_slug,
  subject_code,
  title,
  sort_order,
  question_count,
  duration_seconds
) AS (
  VALUES ('tka-smp-full', 'MAT', 'Matematika', 1, 30, 4500),
    ('tka-smp-full', 'BIN', 'Bahasa Indonesia', 2, 30, 4500),
    ('tka-smp-mini-matematika', 'MAT', 'Matematika', 1, 30, 4500),
    ('tka-smp-mini-bahasa-indonesia', 'BIN', 'Bahasa Indonesia', 1, 30, 4500)
),
ctx AS (
  SELECT
    t.id AS track_id
  FROM
    programs p
    JOIN tracks t ON t.program_id = p.id
  WHERE
    p.code = 'TKA'
    AND t.code = 'SMP'
),
resolved AS (
  SELECT
    e.id AS exam_id,
    s.id AS subject_id,
    ss.title,
    ss.sort_order,
    ss.question_count,
    ss.duration_seconds,
    e.access_type
  FROM
    section_seed ss
    JOIN exams e ON e.slug = ss.exam_slug
    CROSS JOIN ctx
    JOIN subjects s ON s.track_id = ctx.track_id
      AND s.code = ss.subject_code)
  UPDATE
    exam_sections es
  SET
    title = r.title,
    sort_order = r.sort_order,
    question_count = r.question_count,
    duration_seconds = r.duration_seconds,
    config = coalesce(es.config, '{}'::jsonb) || jsonb_build_object('scoring_strategy', 'standard', 'blueprint', 'official_tka_smp_2026', 'official_subject', TRUE, 'access_policy', CASE WHEN r.access_type = 'FREEMIUM' THEN
        'one_free_then_pass'
      ELSE
        'pass_required'
      END)
  FROM
    resolved r
WHERE
  es.exam_id = r.exam_id
  AND es.subject_id = r.subject_id;
WITH section_seed (
  exam_slug,
  subject_code,
  title,
  sort_order,
  question_count,
  duration_seconds
) AS (
  VALUES ('tka-smp-full', 'MAT', 'Matematika', 1, 30, 4500),
    ('tka-smp-full', 'BIN', 'Bahasa Indonesia', 2, 30, 4500),
    ('tka-smp-mini-matematika', 'MAT', 'Matematika', 1, 30, 4500),
    ('tka-smp-mini-bahasa-indonesia', 'BIN', 'Bahasa Indonesia', 1, 30, 4500)
),
ctx AS (
  SELECT
    t.id AS track_id
  FROM
    programs p
    JOIN tracks t ON t.program_id = p.id
  WHERE
    p.code = 'TKA'
    AND t.code = 'SMP'
),
resolved AS (
  SELECT
    e.id AS exam_id,
    s.id AS subject_id,
    ss.title,
    ss.sort_order,
    ss.question_count,
    ss.duration_seconds,
    e.access_type
  FROM
    section_seed ss
    JOIN exams e ON e.slug = ss.exam_slug
    CROSS JOIN ctx
    JOIN subjects s ON s.track_id = ctx.track_id
      AND s.code = ss.subject_code)
  INSERT INTO exam_sections (exam_id, subject_id, title, sort_order, question_count, duration_seconds, config)
  SELECT
    r.exam_id,
    r.subject_id,
    r.title,
    r.sort_order,
    r.question_count,
    r.duration_seconds,
    jsonb_build_object('scoring_strategy', 'standard', 'blueprint', 'official_tka_smp_2026', 'official_subject', TRUE, 'access_policy', CASE WHEN r.access_type = 'FREEMIUM' THEN
        'one_free_then_pass'
      ELSE
        'pass_required'
      END)
  FROM
    resolved r
WHERE
  NOT EXISTS (
    SELECT
      1
    FROM
      exam_sections es
    WHERE
      es.exam_id = r.exam_id
      AND es.subject_id = r.subject_id);
-- Keep SMP pass products unavailable until the SMP question bank and E2E gates pass.
UPDATE
  products p
SET
  status = 'DRAFT',
  updated_at = now()
WHERE
  p.code IN ('TKA_SMP_PASS_30', 'TKA_SMP_PASS_90');
COMMIT;
