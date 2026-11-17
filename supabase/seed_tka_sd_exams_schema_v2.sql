BEGIN;
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
    AND t.code = 'SD'
),
seed (
  slug, title, exam_type_code, duration_seconds, attempt_limit, question_order, result_visibility, access_type, status, token_cost, required_feature_code
) AS (
  VALUES ('tka-sd-full', 'Tryout Lengkap TKA SD', 'FULL_TRYOUT', 4500, NULL::integer, 'section_random', 'instant', 'PREMIUM', 'active', 0, NULL::text),
    ('tka-sd-full-bahasa-inggris', 'Tryout Lengkap TKA SD + Bahasa Inggris', 'FULL_TRYOUT', 6300, NULL::integer, 'section_random', 'instant', 'PREMIUM', 'active', 0, NULL::text),
    ('tka-sd-mini-matematika', 'Mini Tryout Matematika', 'MINI_TRYOUT', 2400, 1, 'section_random', 'instant', 'FREEMIUM', 'active', 0, 'tka.sd.mini_tryout.unlimited'),
    ('tka-sd-mini-bahasa-indonesia', 'Mini Tryout Bahasa Indonesia', 'MINI_TRYOUT', 2100, 1, 'section_random', 'instant', 'FREEMIUM', 'active', 0, 'tka.sd.mini_tryout.unlimited'),
    ('tka-sd-mini-bahasa-inggris', 'Mini Tryout Bahasa Inggris', 'MINI_TRYOUT', 2280, 1, 'section_random', 'instant', 'FREEMIUM', 'active', 0, 'tka.sd.mini_tryout.unlimited'))
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
  LEFT JOIN features f ON f.code = seed.required_feature_code
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
-- Update existing section rows in place so attempt_questions.section_id remains valid.
WITH section_seed (
  exam_slug,
  subject_code,
  title,
  sort_order,
  question_count,
  duration_seconds
) AS (
  VALUES ('tka-sd-full', 'MAT', 'Matematika', 1, 25, 2400),
    ('tka-sd-full', 'BIN', 'Bahasa Indonesia', 2, 25, 2100),
    ('tka-sd-full-bahasa-inggris', 'MAT', 'Matematika', 1, 25, 2400),
    ('tka-sd-full-bahasa-inggris', 'BIN', 'Bahasa Indonesia', 2, 25, 2100),
    ('tka-sd-full-bahasa-inggris', 'BIG', 'Bahasa Inggris', 3, 20, 1800),
    ('tka-sd-mini-matematika', 'MAT', 'Matematika', 1, 25, 2400),
    ('tka-sd-mini-bahasa-indonesia', 'BIN', 'Bahasa Indonesia', 1, 25, 2100),
    ('tka-sd-mini-bahasa-inggris', 'BIG', 'Bahasa Inggris', 1, 25, 2280)
),
ctx AS (
  SELECT
    t.id AS track_id
  FROM
    programs p
    JOIN tracks t ON t.program_id = p.id
  WHERE
    p.code = 'TKA'
    AND t.code = 'SD'
),
resolved AS (
  SELECT
    e.id AS exam_id,
    s.id AS subject_id,
    ss.title,
    ss.sort_order,
    ss.question_count,
    ss.duration_seconds,
    jsonb_build_object('scoring_strategy', 'standard', 'legacy_source', 'production_tka_sd_published_config', 'seed_version', 4, 'access_policy', CASE WHEN e.access_type = 'FREEMIUM' THEN
        'one_free_then_entitlement'
      ELSE
        'entitlement_required'
      END) AS config
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
    config = r.config
  FROM
    resolved r
WHERE
  es.exam_id = r.exam_id
  AND es.subject_id = r.subject_id;
-- Insert only section pairs that do not exist yet; never replace IDs used by attempt snapshots.
WITH section_seed (
  exam_slug,
  subject_code,
  title,
  sort_order,
  question_count,
  duration_seconds
) AS (
  VALUES ('tka-sd-full', 'MAT', 'Matematika', 1, 25, 2400),
    ('tka-sd-full', 'BIN', 'Bahasa Indonesia', 2, 25, 2100),
    ('tka-sd-full-bahasa-inggris', 'MAT', 'Matematika', 1, 25, 2400),
    ('tka-sd-full-bahasa-inggris', 'BIN', 'Bahasa Indonesia', 2, 25, 2100),
    ('tka-sd-full-bahasa-inggris', 'BIG', 'Bahasa Inggris', 3, 20, 1800),
    ('tka-sd-mini-matematika', 'MAT', 'Matematika', 1, 25, 2400),
    ('tka-sd-mini-bahasa-indonesia', 'BIN', 'Bahasa Indonesia', 1, 25, 2100),
    ('tka-sd-mini-bahasa-inggris', 'BIG', 'Bahasa Inggris', 1, 25, 2280)
),
ctx AS (
  SELECT
    t.id AS track_id
  FROM
    programs p
    JOIN tracks t ON t.program_id = p.id
  WHERE
    p.code = 'TKA'
    AND t.code = 'SD'
),
resolved AS (
  SELECT
    e.id AS exam_id,
    s.id AS subject_id,
    ss.title,
    ss.sort_order,
    ss.question_count,
    ss.duration_seconds,
    jsonb_build_object('scoring_strategy', 'standard', 'legacy_source', 'production_tka_sd_published_config', 'seed_version', 4, 'access_policy', CASE WHEN e.access_type = 'FREEMIUM' THEN
        'one_free_then_entitlement'
      ELSE
        'entitlement_required'
      END) AS config
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
    r.config
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
COMMIT;
