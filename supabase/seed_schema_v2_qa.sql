-- Schema V2 QA seed for Siap Tempur STAGING ONLY.
--
-- Purpose:
--   - Exercise Dashboard, Mini Tryout, Drill, Full Tryout, scoring, result, and history.
--   - Keep all synthetic content visibly namespaced with QA-/qa- markers.
--
-- Safety:
--   - Refuses to run against the legacy runtime schema (production currently has test_sessions).
--   - Requires the verified staging QA account dirga@siaptempur.id.
--   - QA exams use token_cost=0 until WalletService debit is implemented; the wallet is still
--     credited so existing UI token guards can be exercised.
--
-- This file is intentionally NOT merged into supabase/seed.sql. Run it explicitly on staging.
BEGIN;
DO $$
DECLARE
  v_user uuid;
  v_program uuid;
  v_track uuid;
  v_twk uuid;
  v_tiu uuid;
  v_tkp uuid;
  v_type_drill uuid;
  v_type_mini uuid;
  v_type_full uuid;
  v_node_twk uuid;
  v_node_tiu uuid;
  v_node_tkp uuid;
  v_exam uuid;
  v_section uuid;
  v_question uuid;
  v_wallet uuid;
  i integer;
BEGIN
  IF to_regclass('public.test_sessions') IS NOT NULL THEN
    RAISE EXCEPTION 'Refusing Schema V2 QA seed: legacy table public.test_sessions exists';
  END IF;

  IF to_regclass('public.exam_attempts') IS NULL OR to_regclass('public.attempt_questions') IS NULL OR to_regclass('public.wallets') IS NULL THEN
    RAISE EXCEPTION 'Refusing Schema V2 QA seed: canonical Schema V2 tables are missing';
  END IF;

  SELECT
    id
  INTO
    STRICT v_user
  FROM
    auth.users
  WHERE
    lower(email) = 'dirga@siaptempur.id';

  IF NOT EXISTS (
    SELECT
      1
    FROM
      auth.users
    WHERE
      id = v_user
      AND email_confirmed_at IS NOT NULL) THEN
  RAISE EXCEPTION 'QA user dirga@siaptempur.id must be email-confirmed first';
END IF;

  SELECT
    id
  INTO
    STRICT v_program
  FROM
    public.programs
  WHERE
    code = 'CPNS';
  SELECT
    id
  INTO
    STRICT v_track
  FROM
    public.tracks
  WHERE
    program_id = v_program
    AND code = 'SKD';
  SELECT
    id
  INTO
    STRICT v_twk
  FROM
    public.subjects
  WHERE
    track_id = v_track
    AND code = 'TWK';
  SELECT
    id
  INTO
    STRICT v_tiu
  FROM
    public.subjects
  WHERE
    track_id = v_track
    AND code = 'TIU';
  SELECT
    id
  INTO
    STRICT v_tkp
  FROM
    public.subjects
  WHERE
    track_id = v_track
    AND code = 'TKP';
  SELECT
    id
  INTO
    STRICT v_type_drill
  FROM
    public.exam_types
  WHERE
    code = 'DRILL';
  SELECT
    id
  INTO
    STRICT v_type_mini
  FROM
    public.exam_types
  WHERE
    code = 'MINI_TRYOUT';
  SELECT
    id
  INTO
    STRICT v_type_full
  FROM
    public.exam_types
  WHERE
    code = 'FULL_TRYOUT';
  -- Wallet balance for existing UI guards. Actual V2 exam debit remains disabled for now.
  INSERT INTO public.wallets (user_id, wallet_type, balance, updated_at)
    VALUES (v_user, 'exam_token', 50, now())
  ON CONFLICT (user_id, wallet_type)
    DO UPDATE SET
      balance = greatest (public.wallets.balance, excluded.balance),
      updated_at = now()
    RETURNING
      id
    INTO
      v_wallet;

  IF NOT EXISTS (
    SELECT
      1
    FROM
      public.wallet_transactions
    WHERE
      wallet_id = v_wallet
      AND source_type = 'qa_seed') THEN
  INSERT INTO public.wallet_transactions (wallet_id, type, amount, source_type, source_id, balance_after)
    VALUES (v_wallet, 'credit', 50, 'qa_seed', NULL, 50);
END IF;
  -- One visible drill material per CPNS section.
  INSERT INTO public.knowledge_nodes (subject_id, parent_id, code, name, slug, node_type, description, depth, sort_order, status)
    VALUES (v_twk, NULL, 'QA-TWK-PILAR', 'Pilar Negara', 'pilar-negara', 'topic', '[QA] Materi pengujian TWK Schema V2.', 0, 1, 'active')
  ON CONFLICT (subject_id, slug)
    DO UPDATE SET
      code = excluded.code,
      name = excluded.name,
      description = excluded.description,
      node_type = excluded.node_type,
      depth = excluded.depth,
      sort_order = excluded.sort_order,
      status = 'active',
      updated_at = now()
    RETURNING
      id
    INTO
      v_node_twk;

  INSERT INTO public.knowledge_nodes (subject_id, parent_id, code, name, slug, node_type, description, depth, sort_order, status)
    VALUES (v_tiu, NULL, 'QA-TIU-NUMERIK', 'Kemampuan Numerik', 'kemampuan-numerik', 'topic', '[QA] Materi pengujian TIU Schema V2.', 0, 1, 'active')
  ON CONFLICT (subject_id, slug)
    DO UPDATE SET
      code = excluded.code,
      name = excluded.name,
      description = excluded.description,
      node_type = excluded.node_type,
      depth = excluded.depth,
      sort_order = excluded.sort_order,
      status = 'active',
      updated_at = now()
    RETURNING
      id
    INTO
      v_node_tiu;

  INSERT INTO public.knowledge_nodes (subject_id, parent_id, code, name, slug, node_type, description, depth, sort_order, status)
    VALUES (v_tkp, NULL, 'QA-TKP-PELAYANAN', 'Pelayanan Publik', 'pelayanan-publik', 'topic', '[QA] Materi pengujian TKP Schema V2.', 0, 1, 'active')
  ON CONFLICT (subject_id, slug)
    DO UPDATE SET
      code = excluded.code,
      name = excluded.name,
      description = excluded.description,
      node_type = excluded.node_type,
      depth = excluded.depth,
      sort_order = excluded.sort_order,
      status = 'active',
      updated_at = now()
    RETURNING
      id
    INTO
      v_node_tkp;

  INSERT INTO public.knowledge_node_paths (ancestor_id, descendant_id, depth)
  VALUES
    (v_node_twk, v_node_twk, 0),
    (v_node_tiu, v_node_tiu, 0),
    (v_node_tkp, v_node_tkp, 0)
  ON CONFLICT (ancestor_id, descendant_id)
    DO UPDATE SET
      depth = excluded.depth;
  -- TWK: 30 questions. A = correct / 5 points.
  FOR i IN 1..30 LOOP
    INSERT INTO public.questions (question_code, program_id, track_id, subject_id, question_type, stem, difficulty, source_type, source_reference, estimated_seconds, status, version, author_id, reviewer_id, published_at, updated_at)
      VALUES ('QA-TWK-' || lpad(i::text, 3, '0'), v_program, v_track, v_twk, 'single_choice', '[QA] TWK #' || lpad(i::text, 2, '0') || ': pilih opsi A untuk menguji jawaban benar dan scoring 5 poin.', 'easy', 'qa_seed', 'schema-v2-qa', 30, 'published', 1, v_user, v_user, now(), now())
    ON CONFLICT (question_code)
      DO UPDATE SET
        program_id = excluded.program_id,
        track_id = excluded.track_id,
        subject_id = excluded.subject_id,
        stem = excluded.stem,
        status = 'published',
        version = 1,
        reviewer_id = v_user,
        published_at = coalesce(public.questions.published_at, now()),
        updated_at = now()
      RETURNING
        id
      INTO
        v_question;

    INSERT INTO public.question_options (question_id, option_key, content, is_correct, score, sort_order)
    VALUES
      (v_question, 'A', 'Opsi A — jawaban benar QA', TRUE, 5, 1),
      (v_question, 'B', 'Opsi B — jawaban salah QA', FALSE, 0, 2),
      (v_question, 'C', 'Opsi C — jawaban salah QA', FALSE, 0, 3),
      (v_question, 'D', 'Opsi D — jawaban salah QA', FALSE, 0, 4)
    ON CONFLICT (question_id, option_key)
      DO UPDATE SET
        content = excluded.content,
        is_correct = excluded.is_correct,
        score = excluded.score,
        sort_order = excluded.sort_order;

    INSERT INTO public.question_knowledge_nodes (question_id, knowledge_node_id, relation_type)
      VALUES (v_question, v_node_twk, 'primary')
    ON CONFLICT (question_id, knowledge_node_id)
      DO UPDATE SET
        relation_type = 'primary';

    DELETE FROM public.question_explanations
    WHERE question_id = v_question
      AND content LIKE '[QA]%';
    INSERT INTO public.question_explanations (question_id, content, format, version)
      VALUES (v_question, '[QA] Opsi A bernilai 5 dan digunakan untuk memvalidasi scoring TWK.', 'markdown', 1);
  END LOOP;
  -- TIU: 35 questions. A = correct / 5 points.
  FOR i IN 1..35 LOOP
    INSERT INTO public.questions (question_code, program_id, track_id, subject_id, question_type, stem, difficulty, source_type, source_reference, estimated_seconds, status, version, author_id, reviewer_id, published_at, updated_at)
      VALUES ('QA-TIU-' || lpad(i::text, 3, '0'), v_program, v_track, v_tiu, 'single_choice', '[QA] TIU #' || lpad(i::text, 2, '0') || ': pilih opsi A untuk menguji jawaban benar dan scoring 5 poin.', 'easy', 'qa_seed', 'schema-v2-qa', 30, 'published', 1, v_user, v_user, now(), now())
    ON CONFLICT (question_code)
      DO UPDATE SET
        program_id = excluded.program_id,
        track_id = excluded.track_id,
        subject_id = excluded.subject_id,
        stem = excluded.stem,
        status = 'published',
        version = 1,
        reviewer_id = v_user,
        published_at = coalesce(public.questions.published_at, now()),
        updated_at = now()
      RETURNING
        id
      INTO
        v_question;

    INSERT INTO public.question_options (question_id, option_key, content, is_correct, score, sort_order)
    VALUES
      (v_question, 'A', 'Opsi A — jawaban benar QA', TRUE, 5, 1),
      (v_question, 'B', 'Opsi B — jawaban salah QA', FALSE, 0, 2),
      (v_question, 'C', 'Opsi C — jawaban salah QA', FALSE, 0, 3),
      (v_question, 'D', 'Opsi D — jawaban salah QA', FALSE, 0, 4)
    ON CONFLICT (question_id, option_key)
      DO UPDATE SET
        content = excluded.content,
        is_correct = excluded.is_correct,
        score = excluded.score,
        sort_order = excluded.sort_order;

    INSERT INTO public.question_knowledge_nodes (question_id, knowledge_node_id, relation_type)
      VALUES (v_question, v_node_tiu, 'primary')
    ON CONFLICT (question_id, knowledge_node_id)
      DO UPDATE SET
        relation_type = 'primary';

    DELETE FROM public.question_explanations
    WHERE question_id = v_question
      AND content LIKE '[QA]%';
    INSERT INTO public.question_explanations (question_id, content, format, version)
      VALUES (v_question, '[QA] Opsi A bernilai 5 dan digunakan untuk memvalidasi scoring TIU.', 'markdown', 1);
  END LOOP;
  -- TKP: 45 weighted questions. A=1, B=2, C=3, D=4, E=5.
  FOR i IN 1..45 LOOP
    INSERT INTO public.questions (question_code, program_id, track_id, subject_id, question_type, stem, difficulty, source_type, source_reference, estimated_seconds, status, version, author_id, reviewer_id, published_at, updated_at)
      VALUES ('QA-TKP-' || lpad(i::text, 3, '0'), v_program, v_track, v_tkp, 'single_choice', '[QA] TKP #' || lpad(i::text, 2, '0') || ': pilih respons A–E untuk menguji skor bertingkat 1 sampai 5; opsi E bernilai tertinggi.', 'easy', 'qa_seed', 'schema-v2-qa', 30, 'published', 1, v_user, v_user, now(), now())
    ON CONFLICT (question_code)
      DO UPDATE SET
        program_id = excluded.program_id,
        track_id = excluded.track_id,
        subject_id = excluded.subject_id,
        stem = excluded.stem,
        status = 'published',
        version = 1,
        reviewer_id = v_user,
        published_at = coalesce(public.questions.published_at, now()),
        updated_at = now()
      RETURNING
        id
      INTO
        v_question;

    INSERT INTO public.question_options (question_id, option_key, content, is_correct, score, sort_order)
    VALUES
      (v_question, 'A', 'Respons A — 1 poin QA', FALSE, 1, 1),
      (v_question, 'B', 'Respons B — 2 poin QA', FALSE, 2, 2),
      (v_question, 'C', 'Respons C — 3 poin QA', FALSE, 3, 3),
      (v_question, 'D', 'Respons D — 4 poin QA', FALSE, 4, 4),
      (v_question, 'E', 'Respons E — 5 poin QA', TRUE, 5, 5)
    ON CONFLICT (question_id, option_key)
      DO UPDATE SET
        content = excluded.content,
        is_correct = excluded.is_correct,
        score = excluded.score,
        sort_order = excluded.sort_order;

    INSERT INTO public.question_knowledge_nodes (question_id, knowledge_node_id, relation_type)
      VALUES (v_question, v_node_tkp, 'primary')
    ON CONFLICT (question_id, knowledge_node_id)
      DO UPDATE SET
        relation_type = 'primary';

    DELETE FROM public.question_explanations
    WHERE question_id = v_question
      AND content LIKE '[QA]%';
    INSERT INTO public.question_explanations (question_id, content, format, version)
      VALUES (v_question, '[QA] TKP memakai skor bertingkat: A=1, B=2, C=3, D=4, E=5.', 'markdown', 1);
  END LOOP;
  -- Helper pattern repeated below: one active exam + section(s), no feature gate, no token debit.
  INSERT INTO public.exams (program_id, track_id, exam_type_id, title, slug, description, duration_seconds, attempt_limit, question_order, result_visibility, access_type, status, starts_at, ends_at, created_by, required_feature_id, token_cost, updated_at)
    VALUES (v_program, v_track, v_type_mini, '[QA] Mini Tryout TWK', 'qa-cpns-mini-twk', 'Seed QA Schema V2 — 30 soal TWK.', 1800, NULL, 'random', 'instant', 'FREE', 'active', NULL, NULL, v_user, NULL, 0, now())
  ON CONFLICT (slug)
    DO UPDATE SET
      title = excluded.title,
      description = excluded.description,
      duration_seconds = excluded.duration_seconds,
      question_order = 'random',
      access_type = 'FREE',
      status = 'active',
      required_feature_id = NULL,
      token_cost = 0,
      updated_at = now()
    RETURNING
      id
    INTO
      v_exam;
  SELECT
    id
  INTO
    v_section
  FROM
    public.exam_sections
  WHERE
    exam_id = v_exam
    AND subject_id = v_twk
  ORDER BY
    sort_order,
    id
  LIMIT 1;
  IF v_section IS NULL THEN
    INSERT INTO public.exam_sections (exam_id, subject_id, title, sort_order, question_count, duration_seconds, config)
      VALUES (v_exam, v_twk, 'TWK', 1, 30, 1800, '{"passing_score":65}'::jsonb);
  ELSE
    UPDATE
      public.exam_sections
    SET
      title = 'TWK',
      sort_order = 1,
      question_count = 30,
      duration_seconds = 1800,
      config = '{"passing_score":65}'::jsonb
    WHERE
      id = v_section;
  END IF;

  INSERT INTO public.exams (program_id, track_id, exam_type_id, title, slug, description, duration_seconds, attempt_limit, question_order, result_visibility, access_type, status, starts_at, ends_at, created_by, required_feature_id, token_cost, updated_at)
    VALUES (v_program, v_track, v_type_mini, '[QA] Mini Tryout TIU', 'qa-cpns-mini-tiu', 'Seed QA Schema V2 — 35 soal TIU.', 2100, NULL, 'random', 'instant', 'FREE', 'active', NULL, NULL, v_user, NULL, 0, now())
  ON CONFLICT (slug)
    DO UPDATE SET
      title = excluded.title,
      description = excluded.description,
      duration_seconds = excluded.duration_seconds,
      question_order = 'random',
      access_type = 'FREE',
      status = 'active',
      required_feature_id = NULL,
      token_cost = 0,
      updated_at = now()
    RETURNING
      id
    INTO
      v_exam;
  v_section := NULL;
  SELECT
    id
  INTO
    v_section
  FROM
    public.exam_sections
  WHERE
    exam_id = v_exam
    AND subject_id = v_tiu
  ORDER BY
    sort_order,
    id
  LIMIT 1;
  IF v_section IS NULL THEN
    INSERT INTO public.exam_sections (exam_id, subject_id, title, sort_order, question_count, duration_seconds, config)
      VALUES (v_exam, v_tiu, 'TIU', 1, 35, 2100, '{"passing_score":80}'::jsonb);
  ELSE
    UPDATE
      public.exam_sections
    SET
      title = 'TIU',
      sort_order = 1,
      question_count = 35,
      duration_seconds = 2100,
      config = '{"passing_score":80}'::jsonb
    WHERE
      id = v_section;
  END IF;

  INSERT INTO public.exams (program_id, track_id, exam_type_id, title, slug, description, duration_seconds, attempt_limit, question_order, result_visibility, access_type, status, starts_at, ends_at, created_by, required_feature_id, token_cost, updated_at)
    VALUES (v_program, v_track, v_type_mini, '[QA] Mini Tryout TKP', 'qa-cpns-mini-tkp', 'Seed QA Schema V2 — 45 soal TKP.', 2700, NULL, 'random', 'instant', 'FREE', 'active', NULL, NULL, v_user, NULL, 0, now())
  ON CONFLICT (slug)
    DO UPDATE SET
      title = excluded.title,
      description = excluded.description,
      duration_seconds = excluded.duration_seconds,
      question_order = 'random',
      access_type = 'FREE',
      status = 'active',
      required_feature_id = NULL,
      token_cost = 0,
      updated_at = now()
    RETURNING
      id
    INTO
      v_exam;
  v_section := NULL;
  SELECT
    id
  INTO
    v_section
  FROM
    public.exam_sections
  WHERE
    exam_id = v_exam
    AND subject_id = v_tkp
  ORDER BY
    sort_order,
    id
  LIMIT 1;
  IF v_section IS NULL THEN
    INSERT INTO public.exam_sections (exam_id, subject_id, title, sort_order, question_count, duration_seconds, config)
      VALUES (v_exam, v_tkp, 'TKP', 1, 45, 2700, '{"passing_score":166}'::jsonb);
  ELSE
    UPDATE
      public.exam_sections
    SET
      title = 'TKP',
      sort_order = 1,
      question_count = 45,
      duration_seconds = 2700,
      config = '{"passing_score":166}'::jsonb
    WHERE
      id = v_section;
  END IF;

  INSERT INTO public.exams (program_id, track_id, exam_type_id, title, slug, description, duration_seconds, attempt_limit, question_order, result_visibility, access_type, status, starts_at, ends_at, created_by, required_feature_id, token_cost, updated_at)
    VALUES (v_program, v_track, v_type_drill, '[QA] Drill TWK', 'qa-cpns-drill-twk', 'Seed QA Schema V2 — Drill Pilar Negara.', 1800, NULL, 'random', 'instant', 'FREE', 'active', NULL, NULL, v_user, NULL, 0, now())
  ON CONFLICT (slug)
    DO UPDATE SET
      title = excluded.title,
      description = excluded.description,
      duration_seconds = 1800,
      question_order = 'random',
      access_type = 'FREE',
      status = 'active',
      required_feature_id = NULL,
      token_cost = 0,
      updated_at = now()
    RETURNING
      id
    INTO
      v_exam;
  v_section := NULL;
  SELECT
    id
  INTO
    v_section
  FROM
    public.exam_sections
  WHERE
    exam_id = v_exam
    AND subject_id = v_twk
  ORDER BY
    sort_order,
    id
  LIMIT 1;
  IF v_section IS NULL THEN
    INSERT INTO public.exam_sections (exam_id, subject_id, title, sort_order, question_count, duration_seconds, config)
      VALUES (v_exam, v_twk, 'Pilar Negara', 1, 30, 1800, '{"passing_score":65}'::jsonb);
  ELSE
    UPDATE
      public.exam_sections
    SET
      title = 'Pilar Negara',
      sort_order = 1,
      question_count = 30,
      duration_seconds = 1800,
      config = '{"passing_score":65}'::jsonb
    WHERE
      id = v_section;
  END IF;

  INSERT INTO public.exams (program_id, track_id, exam_type_id, title, slug, description, duration_seconds, attempt_limit, question_order, result_visibility, access_type, status, starts_at, ends_at, created_by, required_feature_id, token_cost, updated_at)
    VALUES (v_program, v_track, v_type_drill, '[QA] Drill TIU', 'qa-cpns-drill-tiu', 'Seed QA Schema V2 — Drill Kemampuan Numerik.', 1800, NULL, 'random', 'instant', 'FREE', 'active', NULL, NULL, v_user, NULL, 0, now())
  ON CONFLICT (slug)
    DO UPDATE SET
      title = excluded.title,
      description = excluded.description,
      duration_seconds = 1800,
      question_order = 'random',
      access_type = 'FREE',
      status = 'active',
      required_feature_id = NULL,
      token_cost = 0,
      updated_at = now()
    RETURNING
      id
    INTO
      v_exam;
  v_section := NULL;
  SELECT
    id
  INTO
    v_section
  FROM
    public.exam_sections
  WHERE
    exam_id = v_exam
    AND subject_id = v_tiu
  ORDER BY
    sort_order,
    id
  LIMIT 1;
  IF v_section IS NULL THEN
    INSERT INTO public.exam_sections (exam_id, subject_id, title, sort_order, question_count, duration_seconds, config)
      VALUES (v_exam, v_tiu, 'Kemampuan Numerik', 1, 30, 1800, '{"passing_score":80}'::jsonb);
  ELSE
    UPDATE
      public.exam_sections
    SET
      title = 'Kemampuan Numerik',
      sort_order = 1,
      question_count = 30,
      duration_seconds = 1800,
      config = '{"passing_score":80}'::jsonb
    WHERE
      id = v_section;
  END IF;

  INSERT INTO public.exams (program_id, track_id, exam_type_id, title, slug, description, duration_seconds, attempt_limit, question_order, result_visibility, access_type, status, starts_at, ends_at, created_by, required_feature_id, token_cost, updated_at)
    VALUES (v_program, v_track, v_type_drill, '[QA] Drill TKP', 'qa-cpns-drill-tkp', 'Seed QA Schema V2 — Drill Pelayanan Publik.', 1800, NULL, 'random', 'instant', 'FREE', 'active', NULL, NULL, v_user, NULL, 0, now())
  ON CONFLICT (slug)
    DO UPDATE SET
      title = excluded.title,
      description = excluded.description,
      duration_seconds = 1800,
      question_order = 'random',
      access_type = 'FREE',
      status = 'active',
      required_feature_id = NULL,
      token_cost = 0,
      updated_at = now()
    RETURNING
      id
    INTO
      v_exam;
  v_section := NULL;
  SELECT
    id
  INTO
    v_section
  FROM
    public.exam_sections
  WHERE
    exam_id = v_exam
    AND subject_id = v_tkp
  ORDER BY
    sort_order,
    id
  LIMIT 1;
  IF v_section IS NULL THEN
    INSERT INTO public.exam_sections (exam_id, subject_id, title, sort_order, question_count, duration_seconds, config)
      VALUES (v_exam, v_tkp, 'Pelayanan Publik', 1, 30, 1800, '{"passing_score":166}'::jsonb);
  ELSE
    UPDATE
      public.exam_sections
    SET
      title = 'Pelayanan Publik',
      sort_order = 1,
      question_count = 30,
      duration_seconds = 1800,
      config = '{"passing_score":166}'::jsonb
    WHERE
      id = v_section;
  END IF;
  -- Full Tryout SKD: 30 TWK + 35 TIU + 45 TKP = 110 questions / 100 minutes.
  INSERT INTO public.exams (program_id, track_id, exam_type_id, title, slug, description, duration_seconds, attempt_limit, question_order, result_visibility, access_type, status, starts_at, ends_at, created_by, required_feature_id, token_cost, updated_at)
    VALUES (v_program, v_track, v_type_full, '[QA] Full Tryout SKD 110', 'qa-cpns-full-skd', 'Seed QA Schema V2 — Full Tryout 110 soal.', 6000, NULL, 'random', 'instant', 'FREE', 'active', NULL, NULL, v_user, NULL, 0, now())
  ON CONFLICT (slug)
    DO UPDATE SET
      title = excluded.title,
      description = excluded.description,
      duration_seconds = 6000,
      question_order = 'random',
      access_type = 'FREE',
      status = 'active',
      required_feature_id = NULL,
      token_cost = 0,
      updated_at = now()
    RETURNING
      id
    INTO
      v_exam;

  v_section := NULL;
  SELECT
    id
  INTO
    v_section
  FROM
    public.exam_sections
  WHERE
    exam_id = v_exam
    AND subject_id = v_twk
  ORDER BY
    sort_order,
    id
  LIMIT 1;
  IF v_section IS NULL THEN
    INSERT INTO public.exam_sections (exam_id, subject_id, title, sort_order, question_count, duration_seconds, config)
      VALUES (v_exam, v_twk, 'TWK', 1, 30, NULL, '{"passing_score":65}'::jsonb);
  ELSE
    UPDATE
      public.exam_sections
    SET
      title = 'TWK',
      sort_order = 1,
      question_count = 30,
      duration_seconds = NULL,
      config = '{"passing_score":65}'::jsonb
    WHERE
      id = v_section;
  END IF;

  v_section := NULL;
  SELECT
    id
  INTO
    v_section
  FROM
    public.exam_sections
  WHERE
    exam_id = v_exam
    AND subject_id = v_tiu
  ORDER BY
    sort_order,
    id
  LIMIT 1;
  IF v_section IS NULL THEN
    INSERT INTO public.exam_sections (exam_id, subject_id, title, sort_order, question_count, duration_seconds, config)
      VALUES (v_exam, v_tiu, 'TIU', 2, 35, NULL, '{"passing_score":80}'::jsonb);
  ELSE
    UPDATE
      public.exam_sections
    SET
      title = 'TIU',
      sort_order = 2,
      question_count = 35,
      duration_seconds = NULL,
      config = '{"passing_score":80}'::jsonb
    WHERE
      id = v_section;
  END IF;

  v_section := NULL;
  SELECT
    id
  INTO
    v_section
  FROM
    public.exam_sections
  WHERE
    exam_id = v_exam
    AND subject_id = v_tkp
  ORDER BY
    sort_order,
    id
  LIMIT 1;
  IF v_section IS NULL THEN
    INSERT INTO public.exam_sections (exam_id, subject_id, title, sort_order, question_count, duration_seconds, config)
      VALUES (v_exam, v_tkp, 'TKP', 3, 45, NULL, '{"passing_score":166}'::jsonb);
  ELSE
    UPDATE
      public.exam_sections
    SET
      title = 'TKP',
      sort_order = 3,
      question_count = 45,
      duration_seconds = NULL,
      config = '{"passing_score":166}'::jsonb
    WHERE
      id = v_section;
  END IF;
END
$$;
COMMIT;
