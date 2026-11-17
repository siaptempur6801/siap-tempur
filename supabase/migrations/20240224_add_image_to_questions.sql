-- =============================================
-- Migration: Add Image Support for Questions
-- Date: 2024-02-24
-- Purpose: Add image_url column and question-images bucket
-- =============================================
-- 1. Add image_url to questions
ALTER TABLE questions
  ADD COLUMN IF NOT EXISTS image_url text;

-- 2. Create Storage Bucket for Question Images
INSERT INTO storage.buckets (id, name, public)
  VALUES ('question-images', 'question-images', TRUE)
ON CONFLICT (id)
  DO UPDATE SET
    public = TRUE;

-- 3. Set up Storage Policies for 'question-images'
-- Allow public read access to all images
DROP POLICY IF EXISTS "Public Access" ON storage.objects;

CREATE POLICY "Public read open to all" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'question-images');

-- Allow authenticated admins to insert/update/delete images
-- (Using the same logic as profile.role = 'admin')
DROP POLICY IF EXISTS "Admin Upload Access" ON storage.objects;

CREATE POLICY "Admin upload access" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'question-images'
  AND (
    SELECT
      ROLE
    FROM
      public.profiles
    WHERE
      id = auth.uid ()) = 'admin');

DROP POLICY IF EXISTS "Admin Update Access" ON storage.objects;

CREATE POLICY "Admin update access" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'question-images'
    AND (
      SELECT
        ROLE
      FROM
        public.profiles
      WHERE
        id = auth.uid ()) = 'admin');

DROP POLICY IF EXISTS "Admin Delete Access" ON storage.objects;

CREATE POLICY "Admin delete access" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'question-images'
    AND (
      SELECT
        ROLE
      FROM
        public.profiles
      WHERE
        id = auth.uid ()) = 'admin');

-- 4. Update RPCs to return image_url
-- A. Update start_practice_session
CREATE OR REPLACE FUNCTION start_practice_session (p_user_id uuid, p_type question_type, p_limit int DEFAULT 10)
  RETURNS TABLE (
    session_id uuid,
    questions json
  )
  AS $$
DECLARE
  v_session_id uuid;
  v_questions json;
BEGIN
  -- 1. Create Session
  INSERT INTO test_sessions (user_id, mode, status, start_time)
    VALUES (p_user_id, 'practice', 'in_progress', NOW())
  RETURNING
    id
  INTO
    v_session_id;
  -- 2. Select Random Questions & Insert into Test Answers
  WITH selected_questions AS (
    SELECT
      id,
      content,
      type,
      category,
      sub_category,
      image_url
    FROM
      questions
    WHERE
      type = p_type
    ORDER BY
      RANDOM()
    LIMIT p_limit
),
inserted_answers AS (
INSERT INTO test_answers (session_id, question_id)
  SELECT
    v_session_id,
    id
  FROM
    selected_questions
  RETURNING
    question_id)
  -- 3. Fetch Question Details to Return
  SELECT
    json_agg(json_build_object('id', q.id, 'content', q.content, 'type', q.type, 'category', q.category, 'sub_category', q.sub_category, 'image_url', q.image_url, 'options', (
          SELECT
            json_agg(json_build_object('id', o.id, 'content', o.content)
          ORDER BY RANDOM())
        FROM options o
        WHERE
          o.question_id = q.id)))
  INTO
    v_questions
  FROM
    selected_questions q
    JOIN inserted_answers ia ON ia.question_id = q.id;

  RETURN QUERY
  SELECT
    v_session_id,
    v_questions;
END;
$$
LANGUAGE plpgsql
SECURITY DEFINER;

-- B. Update start_tryout_session
DROP FUNCTION IF EXISTS start_tryout_session (UUID);

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
  -- 0. CHECK & CONSUME TOKEN
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
  -- 1. CREATE SESSION
  INSERT INTO test_sessions (user_id, mode, status, start_time)
    VALUES (p_user_id, 'tryout', 'in_progress', NOW())
  RETURNING
    id
  INTO
    v_session_id;
  -- 2. BLUEPRINT RANDOMIZER (110 Soal Total)
  WITH slot_twk_nasionalisme AS (
    SELECT
      id
    FROM
      questions
    WHERE
      type = 'TWK'
      AND sub_category = 'Nasionalisme'
    ORDER BY
      random()
    LIMIT 6
),
slot_twk_integritas AS (
  SELECT
    id
  FROM
    questions
  WHERE
    type = 'TWK'
    AND sub_category = 'Integritas'
  ORDER BY
    random()
  LIMIT 6
),
slot_twk_bela_negara AS (
  SELECT
    id
  FROM
    questions
  WHERE
    type = 'TWK'
    AND sub_category = 'Bela Negara'
  ORDER BY
    random()
  LIMIT 6
),
slot_twk_pilar_negara AS (
  SELECT
    id
  FROM
    questions
  WHERE
    type = 'TWK'
    AND sub_category = 'Pilar Negara'
  ORDER BY
    random()
  LIMIT 6
),
slot_twk_bahasa_negara AS (
  SELECT
    id
  FROM
    questions
  WHERE
    type = 'TWK'
    AND sub_category = 'Bahasa Negara'
  ORDER BY
    random()
  LIMIT 6
),
slot_tiu_analogi AS (
  SELECT
    id
  FROM
    questions
  WHERE
    type = 'TIU'
    AND sub_category = 'Analogi'
  ORDER BY
    random()
  LIMIT 3
),
slot_tiu_silogisme AS (
  SELECT
    id
  FROM
    questions
  WHERE
    type = 'TIU'
    AND sub_category = 'Silogisme'
  ORDER BY
    random()
  LIMIT 3
),
slot_tiu_analitis AS (
  SELECT
    id
  FROM
    questions
  WHERE
    type = 'TIU'
    AND sub_category = 'Analitis'
  ORDER BY
    random()
  LIMIT 4
),
slot_tiu_berhitung AS (
  SELECT
    id
  FROM
    questions
  WHERE
    type = 'TIU'
    AND sub_category = 'Berhitung'
  ORDER BY
    random()
  LIMIT 5
),
slot_tiu_deret_angka AS (
  SELECT
    id
  FROM
    questions
  WHERE
    type = 'TIU'
    AND sub_category = 'Deret Angka'
  ORDER BY
    random()
  LIMIT 5
),
slot_tiu_perbandingan AS (
  SELECT
    id
  FROM
    questions
  WHERE
    type = 'TIU'
    AND sub_category = 'Perbandingan Kuantitatif'
  ORDER BY
    random()
  LIMIT 5
),
slot_tiu_soal_cerita AS (
  SELECT
    id
  FROM
    questions
  WHERE
    type = 'TIU'
    AND sub_category = 'Soal Cerita'
  ORDER BY
    random()
  LIMIT 5
),
slot_tiu_analogi_figural AS (
  SELECT
    id
  FROM
    questions
  WHERE
    type = 'TIU'
    AND sub_category = 'Analogi Figural'
  ORDER BY
    random()
  LIMIT 2
),
slot_tiu_ketidaksamaan AS (
  SELECT
    id
  FROM
    questions
  WHERE
    type = 'TIU'
    AND sub_category = 'Ketidaksamaan'
  ORDER BY
    random()
  LIMIT 1
),
slot_tiu_serial AS (
  SELECT
    id
  FROM
    questions
  WHERE
    type = 'TIU'
    AND sub_category = 'Serial'
  ORDER BY
    random()
  LIMIT 2
),
slot_tkp_pelayanan AS (
  SELECT
    id
  FROM
    questions
  WHERE
    type = 'TKP'
    AND sub_category = 'Pelayanan Publik'
  ORDER BY
    random()
  LIMIT 8
),
slot_tkp_jejaring AS (
  SELECT
    id
  FROM
    questions
  WHERE
    type = 'TKP'
    AND sub_category = 'Jejaring Kerja'
  ORDER BY
    random()
  LIMIT 8
),
slot_tkp_sosial AS (
  SELECT
    id
  FROM
    questions
  WHERE
    type = 'TKP'
    AND sub_category = 'Sosial Budaya'
  ORDER BY
    random()
  LIMIT 7
),
slot_tkp_tik AS (
  SELECT
    id
  FROM
    questions
  WHERE
    type = 'TKP'
    AND sub_category = 'Teknologi Informasi dan Komunikasi'
  ORDER BY
    random()
  LIMIT 7
),
slot_tkp_profesionalisme AS (
  SELECT
    id
  FROM
    questions
  WHERE
    type = 'TKP'
    AND sub_category = 'Profesionalisme'
  ORDER BY
    random()
  LIMIT 7
),
slot_tkp_anti_radikalisme AS (
  SELECT
    id
  FROM
    questions
  WHERE
    type = 'TKP'
    AND sub_category = 'Anti-Radikalisme'
  ORDER BY
    random()
  LIMIT 8
),
all_selected AS (
  SELECT
    id
  FROM
    slot_twk_nasionalisme
  UNION ALL
  SELECT
    id
  FROM
    slot_twk_integritas
  UNION ALL
  SELECT
    id
  FROM
    slot_twk_bela_negara
  UNION ALL
  SELECT
    id
  FROM
    slot_twk_pilar_negara
  UNION ALL
  SELECT
    id
  FROM
    slot_twk_bahasa_negara
  UNION ALL
  SELECT
    id
  FROM
    slot_tiu_analogi
  UNION ALL
  SELECT
    id
  FROM
    slot_tiu_silogisme
  UNION ALL
  SELECT
    id
  FROM
    slot_tiu_analitis
  UNION ALL
  SELECT
    id
  FROM
    slot_tiu_berhitung
  UNION ALL
  SELECT
    id
  FROM
    slot_tiu_deret_angka
  UNION ALL
  SELECT
    id
  FROM
    slot_tiu_perbandingan
  UNION ALL
  SELECT
    id
  FROM
    slot_tiu_soal_cerita
  UNION ALL
  SELECT
    id
  FROM
    slot_tiu_analogi_figural
  UNION ALL
  SELECT
    id
  FROM
    slot_tiu_ketidaksamaan
  UNION ALL
  SELECT
    id
  FROM
    slot_tiu_serial
  UNION ALL
  SELECT
    id
  FROM
    slot_tkp_pelayanan
  UNION ALL
  SELECT
    id
  FROM
    slot_tkp_jejaring
  UNION ALL
  SELECT
    id
  FROM
    slot_tkp_sosial
  UNION ALL
  SELECT
    id
  FROM
    slot_tkp_tik
  UNION ALL
  SELECT
    id
  FROM
    slot_tkp_profesionalisme
  UNION ALL
  SELECT
    id
  FROM
    slot_tkp_anti_radikalisme
),
inserted_answers AS (
INSERT INTO test_answers (session_id, question_id)
  SELECT
    v_session_id,
    id
  FROM
    all_selected
  RETURNING
    question_id)
  -- 4. BUILD RESPONSE JSON
  SELECT
    json_agg(json_build_object('id', q.id, 'content', q.content, 'type', q.type, 'category', q.category, 'sub_category', q.sub_category, 'image_url', q.image_url, 'options', (
          SELECT
            json_agg(json_build_object('id', o.id, 'content', o.content)
          ORDER BY random())
        FROM options o
      WHERE
        o.question_id = q.id))
  ORDER BY CASE q.sub_category
    WHEN 'Nasionalisme' THEN
      1
    WHEN 'Integritas' THEN
      2
    WHEN 'Bela Negara' THEN
      3
    WHEN 'Pilar Negara' THEN
      4
    WHEN 'Bahasa Negara' THEN
      5
    WHEN 'Analogi' THEN
      6
    WHEN 'Silogisme' THEN
      7
    WHEN 'Analitis' THEN
      8
    WHEN 'Berhitung' THEN
      9
    WHEN 'Deret Angka' THEN
      10
    WHEN 'Perbandingan Kuantitatif' THEN
      11
    WHEN 'Soal Cerita' THEN
      12
    WHEN 'Analogi Figural' THEN
      13
    WHEN 'Ketidaksamaan' THEN
      14
    WHEN 'Serial' THEN
      15
    WHEN 'Pelayanan Publik' THEN
      16
    WHEN 'Jejaring Kerja' THEN
      17
    WHEN 'Sosial Budaya' THEN
      18
    WHEN 'Teknologi Informasi dan Komunikasi' THEN
      19
    WHEN 'Profesionalisme' THEN
      20
    WHEN 'Anti-Radikalisme' THEN
      21
    END, random())
  INTO
    v_questions
  FROM
    questions q
    JOIN inserted_answers ia ON ia.question_id = q.id;

  RETURN QUERY
  SELECT
    v_session_id,
    v_questions;
END;
$$
LANGUAGE plpgsql
SECURITY DEFINER;
