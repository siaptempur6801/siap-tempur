-- =============================================================================
-- Nyalakan papan peringkat nasional CPNS/SKD + bersihkan cron Schema V1
--
-- LATAR
--   Halaman `/cpns/dashboard/ranking` menampilkan kosong di produksi. Setelah
--   ditelusuri, ada TIGA sebab terpisah — bukan satu:
--
--   1. Tabel `public.leaderboards` KOSONG. `getNationalLeaderboard` mencari
--      papan dengan `status='active'` DAN `starts_at <= now() <= ends_at`.
--      Tanpa baris papan, tidak ada yang bisa ditampilkan. Kodenya sendiri
--      sudah benar; konfigurasinya yang belum pernah dibuat.
--
--   2. Cron `refresh_leaderboard` GAGAL setiap minggu sejak cutover Schema V2
--      (2026-09-06): `ERROR: relation "leaderboard_snapshot" does not exist`.
--      Job itu sisa Schema V1 (memuat ulang materialized view yang sudah tidak
--      ada). Ia tidak merusak apa pun, tetapi gagal terus dan mengotori
--      `cron.job_run_details`.
--
--   3. (BUKAN migration ini) Tidak ada exam CPNS/SKD berstatus `active`.
--      Seluruh 395 attempt FULL_TRYOUT CPNS berasal dari exam
--      `legacy-history-skd-full` yang berstatus `draft`. Artinya papan ini akan
--      terisi data historis, tetapi TIDAK akan bertambah sampai ada Full Tryout
--      CPNS yang benar-benar bisa dimulai peserta. Itu keputusan konten/produk,
--      bukan skema.
--
-- YANG DIKERJAKAN MIGRATION INI
--   a. Membuang cron Schema V1 yang sudah mati.
--   b. Membuat papan peringkat nasional CPNS/SKD untuk musim 2026.
--   c. Mengisi papan dari 395 attempt historis yang sudah ada.
--   d. Menjadwalkan pemeliharaan papan lewat `rebuild_leaderboard`, sehingga
--      jalur submit tetap ringan (inkremental) dan papan tetap konsisten.
--
-- KENAPA JALUR SUBMIT TETAP INKREMENTAL
--   `recalculate_leaderboard(board, user_id)` sudah dipanggil setiap attempt
--   selesai (lihat `src/services/leaderboard.service.ts`). Cron di sini BUKAN
--   pengganti jalur itu, melainkan jaring pemeliharaan: ia memastikan tidak ada
--   drift, dan menjadi satu-satunya jalur yang benar bila ada perubahan
--   konfigurasi papan atau perbaikan skor historis.
--
-- CATATAN DATA HISTORIS (penting, jangan diabaikan)
--   `duration_used_seconds` pada attempt hasil migrasi legacy TIDAK wajar:
--   maksimum 10.140.223 detik (~117 hari), rata-rata ~359.423 detik (~4 hari).
--   Kolom itu jelas berisi sampah dari sistem lama.
--
--   Dampaknya: aturan peringkat memakai durasi sebagai pemecah seri pertama
--   (`skor desc, durasi asc`). Untuk 244 user historis ini, pemecah seri
--   berbasis durasi TIDAK bermakna dan bisa menempatkan orang secara salah.
--   Karena itu migration ini mengisi papan historis dengan urutan
--   **skor saja** (`durationSeconds` diset sama), sehingga seri jatuh ke
--   `submittedAt` lalu `user_id` — deterministik dan tidak memakai angka sampah.
--
--   Peserta BARU tidak terpengaruh: `duration_used_seconds` mereka dihitung
--   aplikasi dan tetap dipakai sebagai pemecah seri seperti biasa.
--
-- KEAMANAN
--   Tidak ada perubahan RLS, policy, atau ACL fungsi. Migration ini hanya
--   menyisipkan data konfigurasi dan menjadwalkan cron.
-- =============================================================================
-- -----------------------------------------------------------------------------
-- 1. Buang cron Schema V1 yang sudah mati
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT
      1
    FROM
      pg_extension
    WHERE
      extname = 'pg_cron') THEN
  PERFORM
    cron.unschedule (jobid)
  FROM
    cron.job
  WHERE
    jobname = 'refresh_leaderboard'
    AND command ILIKE '%leaderboard_snapshot%';
END IF;
END
$$;

-- -----------------------------------------------------------------------------
-- 2. Papan peringkat nasional CPNS/SKD untuk musim 2026
--
--    `ends_at` WAJIB diisi dan harus di masa depan: `getNationalLeaderboard`
--    memakai `.gte('ends_at', now())`, jadi papan dengan ends_at lampau akan
--    diam-diam tidak pernah tampil.
-- -----------------------------------------------------------------------------
INSERT INTO public.leaderboards (code, name, leaderboard_type, program_id, track_id, starts_at, ends_at, status)
SELECT
  'CPNS_NATIONAL_2026',
  'Peringkat Nasional SKD CPNS 2026',
  'national',
  p.id,
  t.id,
  timestamptz '2026-01-01 00:00:00+07',
  timestamptz '2026-12-31 23:59:59+07',
  'active'
FROM
  public.programs p
  JOIN public.tracks t ON t.program_id = p.id
WHERE
  p.code = 'CPNS'
  AND t.code = 'SKD'
ON CONFLICT (code)
  DO NOTHING;

-- -----------------------------------------------------------------------------
-- 3. Isi papan dari attempt historis
--
--    Diisi dengan urutan SKOR SAJA (lihat catatan durasi legacy di atas), lalu
--    `rebuild_leaderboard` dipanggil untuk menormalkan peringkat.
--
--    `rebuild_leaderboard` memakai urutan standar (skor, durasi, submitted_at).
--    Karena seluruh baris historis diberi `durationSeconds` yang sama, pemecah
--    serinya otomatis jatuh ke `submittedAt` — sesuai maksud di atas.
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  v_board_id uuid;
  v_attempt record;
BEGIN
  SELECT
    id
  INTO
    v_board_id
  FROM
    public.leaderboards
  WHERE
    code = 'CPNS_NATIONAL_2026';
  IF v_board_id IS NULL THEN
    RETURN;
  END IF;
  -- Mulai dari keadaan bersih supaya migration ini idempoten.
  DELETE FROM public.leaderboard_entries
  WHERE leaderboard_id = v_board_id;

  FOR v_attempt IN
  SELECT
    ea.user_id,
    ea.id AS attempt_id,
    coalesce(ea.total_score, 0)::numeric AS total_score,
    ea.submitted_at,
    coalesce((
      SELECT
        max(ats.raw_score)
      FROM public.attempt_scores ats
      JOIN public.subjects s ON s.id = ats.subject_id
      WHERE
        ats.attempt_id = ea.id
        AND s.code = 'TWK'), 0)::numeric AS score_twk,
    coalesce((
      SELECT
        max(ats.raw_score)
      FROM public.attempt_scores ats
      JOIN public.subjects s ON s.id = ats.subject_id
      WHERE
        ats.attempt_id = ea.id
        AND s.code = 'TIU'), 0)::numeric AS score_tiu,
    coalesce((
      SELECT
        max(ats.raw_score)
      FROM public.attempt_scores ats
      JOIN public.subjects s ON s.id = ats.subject_id
    WHERE
      ats.attempt_id = ea.id
      AND s.code = 'TKP'), 0)::numeric AS score_tkp,
    row_number() OVER (PARTITION BY ea.user_id ORDER BY coalesce(ea.total_score, 0) DESC,
      ea.submitted_at ASC nulls LAST,
      ea.id ASC) AS user_best_rank
  FROM
    public.exam_attempts ea
    JOIN public.exams e ON e.id = ea.exam_id
    JOIN public.exam_types et ON et.id = e.exam_type_id
  WHERE
    lower(ea.status) = 'completed'
    AND et.code = 'FULL_TRYOUT'
    AND e.program_id = (
      SELECT
        id
      FROM
        public.programs
      WHERE
        code = 'CPNS')
    AND e.track_id = (
      SELECT
        t.id
      FROM
        public.tracks t
        JOIN public.programs p ON p.id = t.program_id
      WHERE
        p.code = 'CPNS'
        AND t.code = 'SKD')
    AND ea.submitted_at IS NOT NULL LOOP
      -- Hanya attempt terbaik per user yang masuk papan.
      IF v_attempt.user_best_rank = 1 THEN
        INSERT INTO public.leaderboard_entries (leaderboard_id, user_id, score, rank, metadata, updated_at)
          VALUES (v_board_id, v_attempt.user_id, v_attempt.total_score, 0, -- peringkat sementara; dirapikan oleh rebuild di bawah
            jsonb_build_object('attemptId', v_attempt.attempt_id,
              -- Durasi legacy tidak dipercaya: diset sama agar pemecah seri
              -- jatuh ke submittedAt, bukan ke angka sampah.
              'durationSeconds', 2147483647, 'submittedAt', v_attempt.submitted_at, 'scoreTWK', v_attempt.score_twk, 'scoreTIU', v_attempt.score_tiu, 'scoreTKP', v_attempt.score_tkp, 'legacyBackfill', TRUE), now())
        ON CONFLICT (leaderboard_id, user_id)
          DO NOTHING;
      END IF;
    END LOOP;

  PERFORM
    public.rebuild_leaderboard (v_board_id);
END
$$;

-- -----------------------------------------------------------------------------
-- 4. Pemeliharaan papan terjadwal
--
--    Menghitung ulang penuh seluruh papan aktif setiap hari pada jam sepi, dan
--    setiap Senin dini hari setelah musim sibuk akhir pekan. Ini JARING
--    PEMELIHARAAN, bukan jalur utama: jalur utama tetap inkremental per submit.
--
--    Frekuensi sengaja rendah. `rebuild_leaderboard` menghapus lalu menulis
--    ulang seluruh papan, jadi menjalankannya sering berarti membuang manfaat
--    optimasi inkremental.
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT
      1
    FROM
      pg_extension
    WHERE
      extname = 'pg_cron') THEN
  RETURN;
END IF;
  -- Idempoten: buang dulu bila job dengan nama ini sudah ada.
  PERFORM
    cron.unschedule (jobid)
  FROM
    cron.job
  WHERE
    jobname = 'maintain_leaderboards';

  PERFORM
    cron.schedule ('maintain_leaderboards', '17 19 * * *', -- 02:17 WIB setiap hari
      $cron$ DO $body$
DECLARE
  v_board uuid;
BEGIN
  FOR v_board IN
  SELECT
    id
  FROM
    public.leaderboards
  WHERE
    status IN ('active', 'ACTIVE')
    AND starts_at <= now()
    AND ends_at >= now()
    LOOP
      PERFORM
        public.rebuild_leaderboard (v_board);
    END LOOP;
END $body$;
  $cron$);
END
$$;
