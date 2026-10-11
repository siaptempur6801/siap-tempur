-- =============================================
-- Migration: Add Dynamic Tryout Configurations
-- Date: 2024-02-25
-- Purpose: Create tryout_configurations table and rework start_tryout_session
-- =============================================
CREATE TABLE IF NOT EXISTS tryout_configurations (
  id uuid DEFAULT uuid_generate_v4 () PRIMARY KEY,
  type VARCHAR NOT NULL,
  sub_category varchar NOT NULL,
  question_count int NOT NULL DEFAULT 0,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT TRUE,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Bersihkan data duplikat lama
TRUNCATE TABLE tryout_configurations RESTART IDENTITY;

-- Force tambah UNIQUE constraint jika tabelnya sudah telanjur terbentuk tanpa unique
ALTER TABLE tryout_configurations
  DROP CONSTRAINT IF EXISTS tryout_configurations_type_sub_category_key;

ALTER TABLE tryout_configurations
  ADD CONSTRAINT tryout_configurations_type_sub_category_key UNIQUE (type, sub_category);

-- Default SKD Configuration (Total 110 soal)
INSERT INTO tryout_configurations (type, sub_category, question_count, sort_order)
VALUES
  ('TWK', 'Nasionalisme', 6, 1),
  ('TWK', 'Integritas', 6, 2),
  ('TWK', 'Bela Negara', 6, 3),
  ('TWK', 'Pilar Negara', 6, 4),
  ('TWK', 'Bahasa Negara', 6, 5),
  ('TIU', 'Analogi', 3, 6),
  ('TIU', 'Silogisme', 3, 7),
  ('TIU', 'Analitis', 4, 8),
  ('TIU', 'Berhitung', 5, 9),
  ('TIU', 'Deret Angka', 5, 10),
  ('TIU', 'Perbandingan Kuantitatif', 5, 11),
  ('TIU', 'Soal Cerita', 5, 12),
  ('TIU', 'Analogi Figural', 2, 13),
  ('TIU', 'Ketidaksamaan', 1, 14),
  ('TIU', 'Serial', 2, 15),
  ('TKP', 'Pelayanan Publik', 8, 16),
  ('TKP', 'Jejaring Kerja', 8, 17),
  ('TKP', 'Sosial Budaya', 7, 18),
  ('TKP', 'Teknologi Informasi dan Komunikasi', 7, 19),
  ('TKP', 'Profesionalisme', 7, 20),
  ('TKP', 'Anti-Radikalisme', 8, 21)
ON CONFLICT (type, sub_category)
  DO NOTHING;

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_tryout_configurations_updated_at ()
  RETURNS TRIGGER
  AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$
LANGUAGE 'plpgsql';

DROP TRIGGER IF EXISTS trg_update_tryout_configurations ON tryout_configurations;

CREATE TRIGGER trg_update_tryout_configurations
  BEFORE UPDATE ON tryout_configurations
  FOR EACH ROW
  EXECUTE FUNCTION update_tryout_configurations_updated_at ();

-- Drop old function
DROP FUNCTION IF EXISTS start_tryout_session (UUID);

-- Create new dynamic function
CREATE OR REPLACE FUNCTION start_tryout_session (p_user_id uuid)
  RETURNS TABLE (
    session_id uuid,
    questions json
  )
  AS $$
DECLARE
  v_session_id uuid;
  v_questions json;
  v_quota int;
BEGIN
  -- ==========================================
  -- 0. CHECK & CONSUME TOKEN (1 per session)
  -- ==========================================
  SELECT
    tryout_quota
  INTO
    v_quota
  FROM
    profiles
  WHERE
    id = p_user_id;

  IF v_quota IS NULL OR v_quota < 1 THEN
    RAISE EXCEPTION 'Not enough SKD tickets';
  END IF;

  UPDATE
    profiles
  SET
    tryout_quota = tryout_quota - 1
  WHERE
    id = p_user_id;
  -- ==========================================
  -- 1. CREATE SESSION
  -- ==========================================
  INSERT INTO test_sessions (user_id, mode, status, start_time)
    VALUES (p_user_id, 'tryout', 'in_progress', NOW())
  RETURNING
    id
  INTO
    v_session_id;
  -- ==========================================
  -- 2. DYNAMIC QUESTION SELECTION
  -- ==========================================
  -- We select required amount per sub_category dynamically based on configs
  CREATE TEMP TABLE temp_selected_questions (
    question_id uuid,
    sort_order int
  ) ON COMMIT DROP;

INSERT INTO temp_selected_questions (question_id, sort_order)
SELECT
  q.id,
  tc.sort_order
FROM
  tryout_configurations tc
  CROSS JOIN LATERAL (
    SELECT
      id
    FROM
      questions q_inner
    WHERE
      q_inner.type = tc.type::question_type
      AND q_inner.sub_category = tc.sub_category
    ORDER BY
      random()
    LIMIT tc.question_count) q
WHERE
  tc.is_active = TRUE;
  -- ==========================================
  -- 3. INSERT INTO TEST_ANSWERS
  -- ==========================================
  INSERT INTO test_answers (session_id, question_id)
  SELECT
    v_session_id,
    question_id
  FROM
    temp_selected_questions;
  -- ==========================================
  -- 4. BUILD RESPONSE JSON
  -- ==========================================
  SELECT
    json_agg(json_build_object('id', q.id, 'content', q.content, 'type', q.type, 'category', q.category, 'sub_category', q.sub_category, 'options', (
          SELECT
            json_agg(json_build_object('id', o.id, 'content', o.content)
          ORDER BY random())
        FROM options o
        WHERE
          o.question_id = q.id))
    ORDER BY tsq.sort_order, random())
  INTO
    v_questions
  FROM
    temp_selected_questions tsq
    JOIN questions q ON q.id = tsq.question_id;

  RETURN QUERY
  SELECT
    v_session_id,
    v_questions;
END;
$$
LANGUAGE plpgsql
SECURITY DEFINER;
