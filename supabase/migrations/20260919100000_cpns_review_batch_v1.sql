-- =============================================================================
-- Batch review CPNS: penanda batch + langkah mekanis menuju meja review
--
-- LATAR
--   Produksi hanya punya 30 soal CPNS terbit (semua TWK). TIU dan TKP belum
--   punya satu pun, sehingga Full Tryout tidak dapat dibentuk (butuh TWK 30 +
--   TIU 35 + TKP 45 = 110).
--
--   Draftnya ADA dan berkualitas: 113 dari 114 draft TIU dan 113 dari 113 draft
--   TKP sudah punya opsi dan pembahasan. Yang kurang hanyalah review.
--
--   Masalahnya alur review di panel admin hanya satu soal per satu form:
--     433 soal x (Kirim -> Assign -> Approve x3 -> Publish) ~= 1.700 klik.
--
--   `app_private.bulk_review_pilot_stage` sudah ada dan jelas dibuat untuk
--   kasus ini, tetapi TIDAK PERNAH DIPAKAI: ia menyaring lewat
--   `response_config ->> 'pilotBatch'` yang belum pernah diisi, dan tidak ada
--   UI maupun server action yang memanggilnya.
--
-- APA YANG DIKERJAKAN MIGRATION INI
--   1. Memilih soal TERBAIK untuk membentuk satu set Full Tryout:
--      TIU 35 dan TKP 45 (TWK sudah cukup dengan 30 yang terbit).
--   2. Memberi mereka penanda `response_config.pilotBatch` sehingga
--      `bulk_review_pilot_stage` dapat menyaringnya.
--   3. Menjalankan langkah MEKANIS: `submitted` + penugasan reviewer, supaya
--      soal-soal itu siap di meja review.
--
-- APA YANG **TIDAK** DIKERJAKAN
--   Migration ini TIDAK menyetujui dan TIDAK menerbitkan apa pun. Soal berhenti
--   di status `editorial_review` MENUNGGU KEPUTUSAN MANUSIA.
--
--   Persetujuan tetap dilakukan pemilik produk lewat panel admin, memakai
--   `bulk_review_pilot_stage` tiga kali (editorial -> academic -> technical_qa)
--   lalu publish. Jadi tidak ada satu pun status yang "ditembus": seluruh
--   transisi tetap melewati fungsi workflow resmi, dan keputusan approve tetap
--   di tangan manusia.
--
-- SOAL PENJAGA WORKFLOW
--   Trigger `enforce_question_workflow_guard` menolak perubahan `response_config`
--   selama status soal bukan draft/revision_required. Migration ini menulis
--   penanda batch SAAT SOAL MASIH DRAFT (sebelum di-submit), sehingga penjaga
--   tidak dilanggar dan `app.workflow_action` tidak perlu diakali.
--
-- IDEMPOTEN
--   Seleksi memakai syarat yang stabil, penandaan memakai `||` (merge), dan
--   submit/assign dilewati bila soal sudah berada di status review.
-- =============================================================================
-- -----------------------------------------------------------------------------
-- 1. Pilih soal untuk batch ini.
--
--    Kriteria kualitas (bukan asal ambil):
--      - masih `draft` (belum pernah masuk alur review);
--      - berasal dari migrasi konten legacy (bukan placeholder);
--      - punya >= 4 opsi  -> pilihan ganda utuh;
--      - punya pembahasan -> layak dibaca peserta.
--
--    Dipilih berdasarkan `question_code` agar hasilnya DETERMINISTIK: menjalankan
--    ulang migrasi ini tidak akan menukar set soalnya.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.review_batches (
  batch_code text PRIMARY KEY,
  description text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.review_batches IS 'Penanda batch review konten. Dipakai bersama response_config.pilotBatch '
    'agar bulk_review_pilot_stage dapat menyaring satu batch sekaligus.';

REVOKE ALL ON public.review_batches FROM anon, authenticated;

INSERT INTO public.review_batches (batch_code, description)
  VALUES ('cpns-full-tryout-1', 'Soal CPNS untuk membentuk satu set Full Tryout SKD: TIU 35 + TKP 45. '
      'TWK sudah terbit 30. Menunggu review manusia sebelum diterbitkan.')
ON CONFLICT (batch_code)
  DO NOTHING;

DO $$
DECLARE
  v_batch constant text := 'cpns-full-tryout-1';
  v_tiu uuid;
  v_tkp uuid;
  v_before integer;
  v_after integer;
BEGIN
  SELECT
    s.id
  INTO
    v_tiu
  FROM
    public.subjects s
    JOIN public.tracks t ON t.id = s.track_id
    JOIN public.programs p ON p.id = t.program_id
  WHERE
    p.code = 'CPNS'
    AND t.code = 'SKD'
    AND s.code = 'TIU';

  SELECT
    s.id
  INTO
    v_tkp
  FROM
    public.subjects s
    JOIN public.tracks t ON t.id = s.track_id
    JOIN public.programs p ON p.id = t.program_id
  WHERE
    p.code = 'CPNS'
    AND t.code = 'SKD'
    AND s.code = 'TKP';

  IF v_tiu IS NULL OR v_tkp IS NULL THEN
    RAISE NOTICE 'Subjek TIU/TKP CPNS tidak ditemukan — batch dilewati';
    RETURN;
  END IF;

  SELECT
    count(*)
  INTO
    v_before
  FROM
    public.questions q
  WHERE
    q.response_config ->> 'pilotBatch' = v_batch;
  -- TIU 35 — syarat section Full Tryout.
  WITH kandidat AS (
    SELECT
      q.id
    FROM
      public.questions q
    WHERE
      q.subject_id = v_tiu
      AND q.status = 'draft'
      AND q.source_type = 'legacy_migration'
      AND (
        SELECT
          count(*)
        FROM
          public.question_options o
        WHERE
          o.question_id = q.id) >= 4
        AND EXISTS (
          SELECT
            1
          FROM
            public.question_explanations x
          WHERE
            x.question_id = q.id)
        ORDER BY
          q.question_code
        LIMIT 35)
  UPDATE
    public.questions q
  SET
    response_config = coalesce(q.response_config, '{}'::jsonb) || jsonb_build_object('pilotBatch', v_batch),
  updated_at = now()
FROM
  kandidat k
WHERE
  q.id = k.id;
  -- TKP 45
  WITH kandidat AS (
    SELECT
      q.id
    FROM
      public.questions q
    WHERE
      q.subject_id = v_tkp
      AND q.status = 'draft'
      AND q.source_type = 'legacy_migration'
      AND (
        SELECT
          count(*)
        FROM
          public.question_options o
        WHERE
          o.question_id = q.id) >= 4
        AND EXISTS (
          SELECT
            1
          FROM
            public.question_explanations x
          WHERE
            x.question_id = q.id)
        ORDER BY
          q.question_code
        LIMIT 45)
  UPDATE
    public.questions q
  SET
    response_config = coalesce(q.response_config, '{}'::jsonb) || jsonb_build_object('pilotBatch', v_batch),
  updated_at = now()
FROM
  kandidat k
WHERE
  q.id = k.id;

  SELECT
    count(*)
  INTO
    v_after
  FROM
    public.questions q
  WHERE
    q.response_config ->> 'pilotBatch' = v_batch;

  RAISE NOTICE 'Batch % : % soal ditandai (sebelumnya %)', v_batch, v_after, v_before;
END
$$;
