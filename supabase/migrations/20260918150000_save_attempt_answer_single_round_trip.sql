-- =============================================================================
-- Simpan jawaban ujian dalam SATU round trip (menghilangkan 5 round trip/klik)
--
-- MASALAH
--   `AttemptAnswerService.saveAnswer` / `saveAnswerOptions`
--   (src/services/attempt-answer.service.ts) menjalankan lima panggilan
--   database BERURUTAN untuk setiap satu klik jawaban:
--
--     1. getActiveOwnedAttempt      (exam_attempts)
--     2. getAttemptQuestionRef      (attempt_questions)
--     3. getOptionForQuestion(s)    (question_options)
--     4. upsertAnswer(Options)      (attempt_answers, + select id)
--     5. touchAttempt               (exam_attempts)
--
--   Ditambah `auth.getUser()` di server action, satu klik jawaban menembus
--   jaringan enam kali. Pada latensi round trip Supabase yang terukur ~220 ms
--   (dari mesin pengembang ke staging), itu ~1,3 detik per klik — sementara
--   peserta dapat berpindah soal jauh lebih cepat daripada itu. Full Tryout
--   CPNS berisi 110 soal, jadi bebannya berlipat di seluruh sesi ujian.
--
-- PERBAIKAN
--   Satu fungsi yang menjalankan seluruh validasi dan penulisan yang sama
--   dalam SATU round trip. Yang menyusut adalah JUMLAH PERJALANAN, bukan
--   validasinya.
--
-- PARITAS VALIDASI (tidak ada yang dilonggarkan)
--   Seluruh pemeriksaan yang sebelumnya dilakukan di Node tetap dilakukan,
--   hanya berpindah ke database:
--     - attempt harus milik user dan berstatus aktif (in_progress/created);
--     - deadline ujian dari `metadata.durationSeconds` + toleransi 30 detik
--       (timer browser tetap hanya alat bantu; server tetap otoritatif);
--     - soal harus benar-benar dialokasikan ke attempt tersebut;
--     - SETIAP opsi harus benar-benar milik soal tersebut — inilah yang
--       mencegah klien nakal mengirim opsi dari soal lain untuk memanipulasi
--       skor, jadi pemeriksaan ini tidak boleh hilang;
--     - jumlah opsi valid harus sama dengan jumlah opsi yang diminta.
--
-- PARITAS SEMANTIK PENULISAN
--   `attempt_answers` di-upsert dengan `on conflict (attempt_question_id)`,
--   dan HANYA kolom ini yang disentuh: selected_option_id, answer_value,
--   answered_at, updated_at. `is_correct` dan `score_awarded` sengaja TIDAK
--   disentuh — sama seperti sebelumnya, keduanya diisi saat scoring.
--   `attempt_answer_options` ditulis idempoten (insert ... on conflict do
--   nothing) sehingga pemilihan ulang opsi yang sama tidak menghasilkan baris
--   ganda. `exam_attempts` diperbarui pada `last_question_position` dan
--   `last_saved_at` saja (bukan `updated_at`), persis seperti `touchAttempt`.
--
-- KODE ERROR
--   Dipakai kode bertanda kurung siku, mis. `[ATTEMPT_TIME_EXPIRED]`, supaya
--   repository dapat memetakannya kembali ke `PracticeDomainError` yang sama
--   tanpa bergantung pada teks pesan.
--
-- KEAMANAN
--   - SECURITY DEFINER + `search_path = ''` (seluruh nama di-schema-qualify).
--   - EXECUTE hanya untuk `service_role`. `anon`/`authenticated` TIDAK boleh
--     memanggilnya: fungsi ini menulis jawaban ujian dan menerima `p_user_id`
--     sebagai argumen, sehingga pemanggilnya wajib jalur server yang sudah
--     terautorisasi (server action memakai id user dari sesi, bukan dari klien).
--   - Tidak ada kunci jawaban yang dibaca maupun dikembalikan.
--
-- IDEMPOTEN
--   Menyimpan jawaban yang sama dua kali menghasilkan keadaan akhir identik.
--   Aman terhadap retry autosave.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.save_attempt_answer_for_user (p_user_id uuid, p_attempt_id uuid, p_question_id uuid, p_option_ids uuid[])
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = ''
  AS $$
DECLARE
  -- Harus sama dengan ANSWER_SAVE_GRACE_SECONDS di attempt-answer.service.ts.
  c_grace_seconds constant integer := 30;
  v_duration_seconds integer;
  v_started_at timestamptz;
  v_attempt_question_id uuid;
  v_position integer;
  v_selected uuid[] := coalesce(p_option_ids, ARRAY[]::uuid[]);
  v_requested_count integer;
  v_valid_count integer;
  v_answer_id uuid;
BEGIN
  -- 1. Attempt harus milik user dan masih aktif.
  SELECT
    nullif (ea.metadata ->> 'durationSeconds', '')::integer,
    ea.started_at
  INTO
    v_duration_seconds,
    v_started_at
  FROM
    public.exam_attempts ea
  WHERE
    ea.id = p_attempt_id
    AND ea.user_id = p_user_id
    AND lower(ea.status) IN ('in_progress', 'created');

  IF NOT found THEN
    RAISE EXCEPTION '[EXAM_CONFIGURATION_ERROR] Attempt is not active or does not belong to user';
  END IF;
  -- 2. Deadline ujian. Timer browser hanya alat bantu; batas waktu wajib
  --    ditegakkan di server. Attempt tanpa durasi (drill/latihan) tidak dibatasi.
  IF v_duration_seconds IS NOT NULL AND v_duration_seconds > 0 AND v_started_at IS NOT NULL AND now() > v_started_at + make_interval(secs => v_duration_seconds + c_grace_seconds) THEN
    RAISE EXCEPTION '[ATTEMPT_TIME_EXPIRED] Waktu ujian sudah berakhir';
  END IF;
  -- 3. Soal harus dialokasikan ke attempt ini.
  SELECT
    aq.id,
    aq.position
  INTO
    v_attempt_question_id,
    v_position
  FROM
    public.attempt_questions aq
  WHERE
    aq.attempt_id = p_attempt_id
    AND aq.question_id = p_question_id;

  IF v_attempt_question_id IS NULL THEN
    RAISE EXCEPTION '[EXAM_CONFIGURATION_ERROR] Question is not allocated to this attempt';
  END IF;
  -- 4. SEMUA opsi harus milik soal ini. Pemeriksaan anti-manipulasi skor.
  v_requested_count := coalesce(array_length(v_selected, 1), 0);
  SELECT
    count(*)
  INTO
    v_valid_count
  FROM
    public.question_options qo
  WHERE
    qo.question_id = p_question_id
    AND qo.id = ANY (v_selected);

  IF v_valid_count <> v_requested_count THEN
    RAISE EXCEPTION '[EXAM_CONFIGURATION_ERROR] One or more options do not belong to this question';
  END IF;
  -- 5. Tulis jawaban. Hanya kolom ini yang disentuh — `is_correct` dan
  --    `score_awarded` diisi saat scoring, bukan di sini.
  INSERT INTO public.attempt_answers AS aa (attempt_question_id, selected_option_id, answer_value, answered_at, updated_at)
    VALUES (v_attempt_question_id, CASE WHEN v_requested_count = 1 THEN
        v_selected[1]
      ELSE
        NULL
      END, NULL, now(), now())
  ON CONFLICT (attempt_question_id)
    DO UPDATE SET
      selected_option_id = CASE WHEN v_requested_count = 1 THEN
        v_selected[1]
      ELSE
        NULL
      END,
      answer_value = NULL,
      answered_at = now(),
      updated_at = now()
    RETURNING
      aa.id
    INTO
      v_answer_id;
  -- Pilihan ganda: satu baris per opsi, idempoten.
  IF v_requested_count > 0 AND v_requested_count <> 1 THEN
    INSERT INTO public.attempt_answer_options (attempt_answer_id, option_id)
    SELECT
      v_answer_id,
      unnest(v_selected)
    ON CONFLICT (attempt_answer_id,
      option_id)
      DO NOTHING;
  END IF;
  -- 6. Tandai attempt tersentuh pada posisi soal terakhir.
  UPDATE
    public.exam_attempts
  SET
    last_question_position = v_position,
    last_saved_at = now()
  WHERE
    id = p_attempt_id;

  RETURN jsonb_build_object('attempt_question_id', v_attempt_question_id, 'saved', TRUE);
END;
$$;

COMMENT ON FUNCTION public.save_attempt_answer_for_user (uuid, uuid, uuid, uuid[]) IS TEXTVALUE0E; REVOKE ALL ON FUNCTION public.save_attempt_answer_for_user (uuid, uuid, uuid, uuid[]) FROM public;

REVOKE ALL ON FUNCTION public.save_attempt_answer_for_user (uuid, uuid, uuid, uuid[]) FROM anon;

REVOKE ALL ON FUNCTION public.save_attempt_answer_for_user (uuid, uuid, uuid, uuid[]) FROM authenticated;

GRANT EXECUTE ON FUNCTION public.save_attempt_answer_for_user (uuid, uuid, uuid, uuid[]) TO service_role;
