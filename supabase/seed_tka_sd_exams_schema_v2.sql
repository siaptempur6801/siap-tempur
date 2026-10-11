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
  VALUES ('tka-sd-full', 'Tryout Lengkap TKA SD', 'FULL_TRYOUT', 4500, NULL::integer, 'section_random', 'instant', 'PREMIUM', 'active', 0, 'tka.sd.full_tryout.regular'),
    ('tka-sd-full-bahasa-inggris', 'Tryout Lengkap TKA SD + Bahasa Inggris', 'FULL_TRYOUT', 6300, NULL::integer, 'section_random', 'instant', 'PREMIUM', 'active', 0, 'tka.sd.full_tryout.regular'),
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
        'one_free_then_pass'
      ELSE
        'pass_required'
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
        'one_free_then_pass'
      ELSE
        'pass_required'
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
-- Launch catalog for TKA SD Tempur Pass. IDs are resolved dynamically from catalog codes.
WITH ctx AS (
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
pass_seed (
  code, name, description, duration_days, status
) AS (
  VALUES ('TKA_SD_PASS_30', 'Tempur Pass TKA SD 30 Hari', 'Akses Full Tryout TKA SD dan Mini Tryout unlimited selama 30 hari.', 30, 'ACTIVE'),
    ('TKA_SD_PASS_90', 'Tempur Pass TKA SD 90 Hari', 'Akses Full Tryout TKA SD dan Mini Tryout unlimited selama 90 hari.', 90, 'ACTIVE'))
INSERT INTO products (code, name, description, product_type, program_id, track_id, duration_days, status, updated_at)
SELECT
  ps.code,
  ps.name,
  ps.description,
  'PASS',
  ctx.program_id,
  ctx.track_id,
  ps.duration_days,
  ps.status,
  now()
FROM
  pass_seed ps
  CROSS JOIN ctx
ON CONFLICT (code)
  DO UPDATE SET
    name = excluded.name,
    description = excluded.description,
    product_type = excluded.product_type,
    program_id = excluded.program_id,
    track_id = excluded.track_id,
    duration_days = excluded.duration_days,
    status = excluded.status,
    updated_at = now();
-- Preserve the canonical 10-feature bundle. Only features with implemented runtime
-- should be advertised to users; full/mini tryout are the launch access gates.
WITH feature_seed (
  code
) AS (
  VALUES ('tka.sd.full_tryout.regular'),
    ('tka.sd.mini_tryout.unlimited'),
    ('tka.sd.drill.unlimited'),
    ('tka.sd.material.premium'),
    ('tka.sd.analytics.full'),
    ('tka.sd.explanation.full'),
    ('tka.sd.wrong_questions'),
    ('tka.sd.remedial.auto'),
    ('tka.sd.recommendation'),
    ('tka.sd.progress.history'))
INSERT INTO product_features (product_id, feature_id, limit_value, config)
SELECT
  p.id,
  f.id,
  NULL,
  '{}'::jsonb
FROM
  products p
  CROSS JOIN feature_seed fs
  JOIN features f ON f.code = fs.code
WHERE
  p.code IN ('TKA_SD_PASS_30', 'TKA_SD_PASS_90')
ON CONFLICT (product_id,
  feature_id)
  DO UPDATE SET
    limit_value = excluded.limit_value,
    config = product_features.config || excluded.config;
-- Keep one open-ended active launch price per pass; close any mismatched active price.
WITH desired (
  code,
  amount
) AS (
  VALUES ('TKA_SD_PASS_30', 29000::numeric),
    ('TKA_SD_PASS_90', 69000::numeric)
),
targets AS (
  SELECT
    p.id AS product_id, d.code, d.amount
  FROM
    desired d
    JOIN products p ON p.code = d.code)
UPDATE
  product_prices pp
SET
  status = 'INACTIVE',
  ends_at = coalesce(pp.ends_at, now())
FROM
  targets t
WHERE
  pp.product_id = t.product_id
  AND lower(pp.status) = 'active'
  AND (pp.currency <> 'IDR'
    OR pp.amount <> t.amount
    OR pp.ends_at IS NOT NULL);
WITH desired (
  code,
  amount
) AS (
  VALUES ('TKA_SD_PASS_30', 29000::numeric),
    ('TKA_SD_PASS_90', 69000::numeric)
),
targets AS (
  SELECT
    p.id AS product_id, d.amount
  FROM
    desired d
    JOIN products p ON p.code = d.code)
INSERT INTO product_prices (product_id, currency, amount, starts_at, ends_at, status)
SELECT
  t.product_id,
  'IDR',
  t.amount,
  now(),
  NULL,
  'ACTIVE'
FROM
  targets t
WHERE
  NOT EXISTS (
    SELECT
      1
    FROM
      product_prices pp
    WHERE
      pp.product_id = t.product_id
      AND pp.currency = 'IDR'
      AND pp.amount = t.amount
      AND lower(pp.status) = 'active'
      AND pp.ends_at IS NULL);
COMMIT;
