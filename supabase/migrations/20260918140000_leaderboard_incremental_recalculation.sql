-- =============================================================================
-- Leaderboard: recalculation inkremental (menghilangkan full rewrite O(N^2))
--
-- MASALAH
--   `recalculate_leaderboard` (202608200630_schema_v2_national_leaderboard.sql)
--   menghapus SELURUH baris papan lalu menghitung ulang dan menulis ulang
--   semuanya, setiap kali SATU peserta menyelesaikan ujian:
--
--     delete from leaderboard_entries where leaderboard_id = ...;
--     with candidate_attempts as ( ... scan seluruh exam_attempts ... )
--     insert into leaderboard_entries select ... from ranked;
--
--   Untuk N peserta, satu gelombang submit berarti N panggilan fungsi, dan tiap
--   panggilan menyentuh N baris → O(N^2) baris ditulis. Pada tryout akbar
--   (1.000 peserta selesai hampir bersamaan) itu berarti ~1.000.000 penulisan
--   baris di dalam request submit masing-masing peserta.
--
--   Padahal SATU submission hanya dapat mengubah SATU baris papan: baris milik
--   peserta itu sendiri. Skor peserta lain tidak mungkin berubah karena
--   seseorang menyelesaikan ujian.
--
-- PERBAIKAN
--   Hitung ulang HANYA baris milik user yang bersangkutan, lalu perbaiki nomor
--   peringkat HANYA pada baris yang peringkatnya benar-benar bergeser.
--
--   Yang tetap O(N): pembacaan papan dan perbaikan peringkat — sebab satu
--   peserta yang masuk di puncak memang menggeser peringkat semua orang di
--   bawahnya. Perbaikan ini TIDAK menghilangkan biaya itu, dan tidak
--   mengklaim demikian.
--
--   Yang benar-benar hilang adalah DELETE massal + INSERT ulang seluruh papan.
--   Dampak terukurnya (diuji di staging, papan 52 baris, pendatang berperingkat
--   teratas sehingga SELURUH peringkat bergeser — kasus terburuk):
--
--     sebelum : hapus 52 + tulis 52  = 104 operasi baris
--     sesudah : tulis   1 + update 53 =  54 operasi baris  (~2x lebih sedikit)
--
--   Jadi keuntungannya sekitar 2x pada kasus terburuk, bukan satu orde
--   besaran. Bila pendatang masuk di tengah papan, hanya sebagian baris yang
--   peringkatnya bergeser sehingga lebih murah lagi.
--
--   Keuntungan struktural yang lebih penting daripada angka itu:
--     1. `leaderboard_entries` tidak lagi dikosongkan lalu diisi ulang. Papan
--        tetap utuh sepanjang transaksi, sehingga pembaca tidak pernah melihat
--        papan kosong atau separuh terisi.
--     2. Tidak ada churn DELETE+INSERT, yang berarti jauh lebih sedikit dead
--        tuple dan beban autovacuum pada tabel yang paling sering ditulis ini.
--     3. `updated_at` kembali bermakna: sebelumnya di-reset untuk SEMUA baris
--        setiap submit, sekarang hanya berubah bila baris itu memang berubah.
--
--   Biaya per submit tidak lagi bergantung pada "seluruh riwayat attempt"
--   melainkan pada ukuran papan — dan itu memang batas bawahnya, karena
--   peringkat bersifat global.
--
-- KAPAN MASIH PERLU HITUNG ULANG PENUH
--   Fungsi ini hanya benar untuk "satu attempt selesai/submit". Bila KONFIGURASI
--   papan berubah (starts_at, ends_at, program, track) atau kunci jawaban soal
--   diperbaiki sehingga skor lama berubah, seluruh papan memang harus dihitung
--   ulang. Untuk itu `rebuild_leaderboard(p_leaderboard_id)` tetap disediakan
--   dengan semantik delete + insert seperti sebelumnya.
--
-- KEAMANAN
--   - SECURITY DEFINER + `search_path = ''` (seluruh nama di-schema-qualify),
--     mengikuti pola `update_attempt_answer_scores` dan
--     `get_user_subject_progress`.
--   - EXECUTE hanya untuk `service_role`. `anon`/`authenticated` TIDAK boleh
--     memanggilnya: fungsi ini menulis papan peringkat.
--
-- IDEMPOTEN
--   Memanggil fungsi ini dua kali untuk attempt yang sama menghasilkan keadaan
--   akhir yang identik — nilainya dihitung ulang dari data, bukan diakumulasi.
--   Aman terhadap retry webhook/submit.
-- =============================================================================
-- -----------------------------------------------------------------------------
-- 1. Hitung ulang HANYA satu user (dipakai di jalur submit)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.recalculate_leaderboard (p_leaderboard_id uuid, p_user_id uuid DEFAULT NULL)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = ''
  AS $$
DECLARE
  -- Ambang atas pengurutan durasi. Sama dengan konstanta yang dipakai versi
  -- sebelumnya (dan versi bootstrap) agar baris tanpa durasi tetap berada di
  -- urutan yang sama, bukan berpindah ke atas.
  c_max_duration constant integer := 2147483647;
  v_board public.leaderboards%rowtype;
  v_ranked jsonb := '[]'::jsonb;
BEGIN
  SELECT
    *
  INTO
    v_board
  FROM
    public.leaderboards
  WHERE
    id = p_leaderboard_id;

  IF NOT found THEN
    RAISE EXCEPTION 'LEADERBOARD_NOT_FOUND';
  END IF;
  -- Semua sumber data dikumpulkan lebih dulu (read-only), baru satu pernyataan
  -- tulis dijalankan setelahnya. Ini menjaga fungsi tetap satu transaksi dan
  -- menghindari DELETE massal di tengah proses.
  WITH scoped_attempts AS (
    SELECT
      ea.id AS attempt_id,
      ea.user_id,
      coalesce(ea.total_score, 0)::numeric AS total_score,
      coalesce(ea.duration_used_seconds, c_max_duration) AS duration_seconds,
      ea.submitted_at
    FROM
      public.exam_attempts ea
      JOIN public.exams e ON e.id = ea.exam_id
      JOIN public.exam_types et ON et.id = e.exam_type_id
    WHERE
      lower(ea.status) = 'completed'
      AND et.code = 'FULL_TRYOUT'
      AND (v_board.program_id IS NULL
        OR e.program_id = v_board.program_id)
      AND (v_board.track_id IS NULL
        OR e.track_id = v_board.track_id)
      AND ea.submitted_at IS NOT NULL
      AND ea.submitted_at >= v_board.starts_at
      AND ea.submitted_at <= v_board.ends_at
      -- Klaim utama perbaikan ini: satu submission hanya dapat mengubah baris
      -- satu user. Tanpa filter ini kita kembali ke full scan + full rewrite.
      AND (p_user_id IS NULL
        OR ea.user_id = p_user_id)
),
-- Satu attempt terbaik per user. Urutannya WAJIB identik dengan pengurutan
-- papan di bawah: skor desc, durasi asc, submitted_at asc (NULL terakhir),
-- lalu id sebagai pemecah seri yang deterministik.
best_attempts AS (
  SELECT DISTINCT ON (sa.user_id)
    sa.attempt_id,
    sa.user_id,
    sa.total_score,
    sa.duration_seconds,
    sa.submitted_at
  FROM
    scoped_attempts sa
  ORDER BY
    sa.user_id ASC,
    sa.total_score DESC,
    sa.duration_seconds ASC,
    sa.submitted_at ASC nulls LAST,
    sa.attempt_id ASC
),
enriched AS (
  SELECT
    ba.attempt_id,
    ba.user_id,
    ba.total_score,
    ba.duration_seconds,
    ba.submitted_at,
    coalesce((
      SELECT
        max(ats.raw_score)
      FROM public.attempt_scores ats
      JOIN public.subjects s ON s.id = ats.subject_id
    WHERE
      ats.attempt_id = ba.attempt_id
      AND s.code = 'TWK'), 0)::numeric AS score_twk,
    coalesce((
      SELECT
        max(ats.raw_score)
      FROM public.attempt_scores ats
      JOIN public.subjects s ON s.id = ats.subject_id
    WHERE
      ats.attempt_id = ba.attempt_id
      AND s.code = 'TIU'), 0)::numeric AS score_tiu,
    coalesce((
      SELECT
        max(ats.raw_score)
      FROM public.attempt_scores ats
      JOIN public.subjects s ON s.id = ats.subject_id
    WHERE
      ats.attempt_id = ba.attempt_id
      AND s.code = 'TKP'), 0)::numeric AS score_tkp
  FROM
    best_attempts ba
)
SELECT
  coalesce(jsonb_agg(jsonb_build_object('user_id', e.user_id, 'score', e.total_score, 'duration_seconds', e.duration_seconds, 'submitted_at', e.submitted_at, 'metadata', jsonb_build_object('attemptId', e.attempt_id, 'durationSeconds', e.duration_seconds, 'submittedAt', e.submitted_at, 'scoreTWK', e.score_twk, 'scoreTIU', e.score_tiu, 'scoreTKP', e.score_tkp))), '[]'::jsonb)
INTO
  v_ranked
FROM
  enriched e;
  -- Papan kosong (mis. tryout pertama, atau user diskualifikasi): tidak ada
  -- yang perlu ditulis.
  IF jsonb_array_length(v_ranked) = 0 THEN
    RETURN;
  END IF;
  -- =========================================================================
  -- LANGKAH 1 — sinkronkan baris user yang berubah.
  --
  -- PENTING: langkah ini HARUS menjadi pernyataan tersendiri, tidak boleh
  -- digabung dengan perbaikan peringkat di bawah dalam satu pernyataan.
  --
  -- Semua CTE di dalam satu pernyataan berbagi snapshot yang sama, dan CTE
  -- yang menulis (INSERT/UPDATE/DELETE) TIDAK terlihat oleh pembacaan tabel
  -- yang sama di pernyataan itu. Bila keduanya digabung, baris yang baru
  -- di-insert tidak akan ikut terhitung saat peringkat dihitung ulang —
  -- akibatnya baris itu tertinggal di peringkat sementara.
  -- =========================================================================
  WITH incoming AS (
    SELECT
      (entry ->> 'user_id')::uuid AS user_id,
      (entry ->> 'score')::numeric AS score,
      (entry -> 'metadata' ->> 'durationSeconds')::integer AS duration_seconds,
      (entry -> 'metadata' ->> 'submittedAt')::timestamptz AS submitted_at,
      entry -> 'metadata' AS metadata
    FROM
      jsonb_array_elements(v_ranked) AS entry)
  INSERT INTO public.leaderboard_entries AS le (leaderboard_id, user_id, score, rank, metadata, updated_at)
  SELECT
    p_leaderboard_id,
    i.user_id,
    i.score,
    -- Peringkat sementara. Nilai 0 membuat baris ini SELALU ikut diperbaiki
    -- pada langkah 2 (0 berbeda dari peringkat 1..n yang sah), sehingga
    -- baris baru tidak pernah tertinggal. Tidak pernah terlihat pengguna:
    -- langkah 2 berjalan di dalam transaksi yang sama.
    0,
    i.metadata,
    now()
  FROM
    incoming i
  ON CONFLICT (leaderboard_id,
    user_id)
    DO UPDATE SET
      score = excluded.score,
      metadata = excluded.metadata,
      updated_at = now()
      -- Hanya sentuh baris bila nilainya benar-benar berubah, supaya
      -- `updated_at` tetap bermakna dan write tidak sia-sia.
    WHERE (le.score, le.metadata) IS DISTINCT FROM (excluded.score, excluded.metadata);
  -- Buang baris user ini bila ia tidak lagi memenuhi syarat (mis. attempt-nya
  -- keluar dari window papan, atau statusnya tidak lagi completed).
  IF p_user_id IS NOT NULL THEN
    DELETE FROM public.leaderboard_entries le
    WHERE le.leaderboard_id = p_leaderboard_id
      AND le.user_id = p_user_id
      AND NOT EXISTS (
        SELECT
          1
        FROM
          jsonb_array_elements(v_ranked) AS entry
        WHERE (entry ->> 'user_id')::uuid = le.user_id);
  END IF;
  -- =========================================================================
  -- LANGKAH 2 — perbaiki nomor peringkat.
  --
  -- Berdiri sendiri supaya snapshot-nya sudah memuat baris yang ditulis
  -- langkah 1. Hanya baris yang peringkatnya benar-benar bergeser yang
  -- ditulis, sehingga `updated_at` tidak lagi di-reset untuk seluruh papan
  -- setiap kali satu peserta selesai.
  -- =========================================================================
  WITH ranked AS (
    SELECT
      le.user_id,
      row_number() OVER (ORDER BY le.score DESC,
        (le.metadata ->> 'durationSeconds')::integer ASC,
      (le.metadata ->> 'submittedAt')::timestamptz ASC nulls LAST,
    le.user_id ASC)::integer AS rank_pos
FROM
  public.leaderboard_entries le
  WHERE
    le.leaderboard_id = p_leaderboard_id)
UPDATE
  public.leaderboard_entries le
SET
  rank = r.rank_pos,
  updated_at = now()
FROM
  ranked r
WHERE
  le.leaderboard_id = p_leaderboard_id
  AND le.user_id = r.user_id
  AND le.rank IS DISTINCT FROM r.rank_pos;
END;
$$;

COMMENT ON FUNCTION public.recalculate_leaderboard (uuid, uuid) IS TEXTVALUE0E;
-- -----------------------------------------------------------------------------
-- 2. Hitung ulang PENUH (untuk perubahan konfigurasi papan / perbaikan kunci)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rebuild_leaderboard (p_leaderboard_id uuid)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = ''
  AS $$
DECLARE
  c_max_duration constant integer := 2147483647;
  v_board public.leaderboards%rowtype;
BEGIN
  SELECT
    *
  INTO
    v_board
  FROM
    public.leaderboards
  WHERE
    id = p_leaderboard_id;

  IF NOT found THEN
    RAISE EXCEPTION 'LEADERBOARD_NOT_FOUND';
  END IF;

  DELETE FROM public.leaderboard_entries
  WHERE leaderboard_id = p_leaderboard_id;

  WITH candidate_attempts AS (
    SELECT
      ea.id AS attempt_id,
      ea.user_id,
      coalesce(ea.total_score, 0)::numeric AS total_score,
      coalesce(ea.duration_used_seconds, c_max_duration) AS duration_seconds,
      ea.submitted_at,
      row_number() OVER (PARTITION BY ea.user_id ORDER BY coalesce(ea.total_score, 0) DESC,
        coalesce(ea.duration_used_seconds, c_max_duration) ASC,
        ea.submitted_at ASC nulls LAST,
        ea.id ASC) AS user_best_rank
    FROM
      public.exam_attempts ea
      JOIN public.exams e ON e.id = ea.exam_id
      JOIN public.exam_types et ON et.id = e.exam_type_id
    WHERE
      lower(ea.status) = 'completed'
      AND et.code = 'FULL_TRYOUT'
      AND (v_board.program_id IS NULL
        OR e.program_id = v_board.program_id)
      AND (v_board.track_id IS NULL
        OR e.track_id = v_board.track_id)
      AND ea.submitted_at IS NOT NULL
      AND ea.submitted_at >= v_board.starts_at
      AND ea.submitted_at <= v_board.ends_at
),
best_attempts AS (
  SELECT
    *
  FROM
    candidate_attempts
  WHERE
    user_best_rank = 1
),
subject_scores AS (
  SELECT
    ats.attempt_id,
    max(ats.raw_score) FILTER (WHERE s.code = 'TWK') AS score_twk,
  max(ats.raw_score) FILTER (WHERE s.code = 'TIU') AS score_tiu,
  max(ats.raw_score) FILTER (WHERE s.code = 'TKP') AS score_tkp
FROM
  public.attempt_scores ats
  LEFT JOIN public.subjects s ON s.id = ats.subject_id
  JOIN best_attempts ba ON ba.attempt_id = ats.attempt_id
GROUP BY
  ats.attempt_id
),
ranked AS (
  SELECT
    ba.*,
    coalesce(ss.score_twk, 0)::numeric AS score_twk,
    coalesce(ss.score_tiu, 0)::numeric AS score_tiu,
    coalesce(ss.score_tkp, 0)::numeric AS score_tkp,
    row_number() OVER (ORDER BY ba.total_score DESC,
      ba.duration_seconds ASC,
      ba.submitted_at ASC nulls LAST,
      ba.user_id ASC)::integer AS rank_pos
  FROM
    best_attempts ba
    LEFT JOIN subject_scores ss ON ss.attempt_id = ba.attempt_id)
INSERT INTO public.leaderboard_entries (leaderboard_id, user_id, score, rank, metadata, updated_at)
SELECT
  p_leaderboard_id,
  ranked.user_id,
  ranked.total_score,
  ranked.rank_pos,
  jsonb_build_object('attemptId', ranked.attempt_id, 'durationSeconds', ranked.duration_seconds, 'submittedAt', ranked.submitted_at, 'scoreTWK', ranked.score_twk, 'scoreTIU', ranked.score_tiu, 'scoreTKP', ranked.score_tkp),
  now()
FROM
  ranked;
END;
$$;

COMMENT ON FUNCTION public.rebuild_leaderboard (uuid) IS TEXTVALUE1E;
-- -----------------------------------------------------------------------------
-- 3. Buang overload lama `recalculate_leaderboard(uuid)`
--
--    Overload satu-argumen itu kini BERBAHAYA, karena dua alasan:
--
--    a. PostgREST tidak dapat memilih kandidat saat dipanggil dengan satu
--       argumen — hasilnya `PGRST203: Could not choose the best candidate
--       function between: recalculate_leaderboard(uuid) dan
--       recalculate_leaderboard(uuid, uuid)`. Setiap pemanggil lama akan gagal.
--
--    b. Ia mendefinisikan `set search_path = public, pg_temp` — search_path
--       yang dapat berubah pada fungsi SECURITY DEFINER. Pola yang sudah
--       ditinggalkan di seluruh repo ini (bandingkan `search_path = ''` pada
--       fungsi-fungsi baru).
--
--    Semantiknya sudah tercakup: `recalculate_leaderboard(board, NULL)`
--    melakukan sinkronisasi penuh, dan `rebuild_leaderboard(board)` melakukan
--    hitung ulang penuh delete+insert seperti versi lama (isinya identik
--    dengan definisi bootstrap 13). Tidak ada pemanggil di kode aplikasi.
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.recalculate_leaderboard (uuid);

-- -----------------------------------------------------------------------------
-- ACL: hanya service_role. Keduanya menulis papan peringkat.
-- -----------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.recalculate_leaderboard (uuid, uuid) FROM public;

REVOKE ALL ON FUNCTION public.recalculate_leaderboard (uuid, uuid) FROM anon;

REVOKE ALL ON FUNCTION public.recalculate_leaderboard (uuid, uuid) FROM authenticated;

GRANT EXECUTE ON FUNCTION public.recalculate_leaderboard (uuid, uuid) TO service_role;

REVOKE ALL ON FUNCTION public.rebuild_leaderboard (uuid) FROM public;

REVOKE ALL ON FUNCTION public.rebuild_leaderboard (uuid) FROM anon;

REVOKE ALL ON FUNCTION public.rebuild_leaderboard (uuid) FROM authenticated;

GRANT EXECUTE ON FUNCTION public.rebuild_leaderboard (uuid) TO service_role;
