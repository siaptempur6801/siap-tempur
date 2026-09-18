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

create or replace function public.save_attempt_answer_for_user(
    p_user_id     uuid,
    p_attempt_id  uuid,
    p_question_id uuid,
    p_option_ids  uuid[]
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    -- Harus sama dengan ANSWER_SAVE_GRACE_SECONDS di attempt-answer.service.ts.
    c_grace_seconds constant integer := 30;

    v_duration_seconds integer;
    v_started_at       timestamptz;
    v_attempt_question_id uuid;
    v_position         integer;
    v_selected         uuid[] := coalesce(p_option_ids, array[]::uuid[]);
    v_requested_count  integer;
    v_valid_count      integer;
    v_answer_id        uuid;
begin
    -- 1. Attempt harus milik user dan masih aktif.
    select nullif(ea.metadata ->> 'durationSeconds', '')::integer, ea.started_at
      into v_duration_seconds, v_started_at
    from public.exam_attempts ea
    where ea.id = p_attempt_id
      and ea.user_id = p_user_id
      and lower(ea.status) in ('in_progress', 'created');

    if not found then
        raise exception '[EXAM_CONFIGURATION_ERROR] Attempt is not active or does not belong to user';
    end if;

    -- 2. Deadline ujian. Timer browser hanya alat bantu; batas waktu wajib
    --    ditegakkan di server. Attempt tanpa durasi (drill/latihan) tidak dibatasi.
    if v_duration_seconds is not null
       and v_duration_seconds > 0
       and v_started_at is not null
       and now() > v_started_at + make_interval(secs => v_duration_seconds + c_grace_seconds)
    then
        raise exception '[ATTEMPT_TIME_EXPIRED] Waktu ujian sudah berakhir';
    end if;

    -- 3. Soal harus dialokasikan ke attempt ini.
    select aq.id, aq.position
      into v_attempt_question_id, v_position
    from public.attempt_questions aq
    where aq.attempt_id = p_attempt_id
      and aq.question_id = p_question_id;

    if v_attempt_question_id is null then
        raise exception '[EXAM_CONFIGURATION_ERROR] Question is not allocated to this attempt';
    end if;

    -- 4. SEMUA opsi harus milik soal ini. Pemeriksaan anti-manipulasi skor.
    v_requested_count := coalesce(array_length(v_selected, 1), 0);
    select count(*)
      into v_valid_count
    from public.question_options qo
    where qo.question_id = p_question_id
      and qo.id = any(v_selected);

    if v_valid_count <> v_requested_count then
        raise exception '[EXAM_CONFIGURATION_ERROR] One or more options do not belong to this question';
    end if;

    -- 5. Tulis jawaban. Hanya kolom ini yang disentuh — `is_correct` dan
    --    `score_awarded` diisi saat scoring, bukan di sini.
    insert into public.attempt_answers as aa (
        attempt_question_id, selected_option_id, answer_value, answered_at, updated_at
    )
    values (
        v_attempt_question_id,
        case when v_requested_count = 1 then v_selected[1] else null end,
        null,
        now(),
        now()
    )
    on conflict (attempt_question_id) do update
        set selected_option_id = case when v_requested_count = 1 then v_selected[1] else null end,
            answer_value       = null,
            answered_at        = now(),
            updated_at         = now()
    returning aa.id into v_answer_id;

    -- Pilihan ganda: satu baris per opsi, idempoten.
    if v_requested_count > 0 and v_requested_count <> 1 then
        insert into public.attempt_answer_options (attempt_answer_id, option_id)
        select v_answer_id, unnest(v_selected)
        on conflict (attempt_answer_id, option_id) do nothing;
    end if;

    -- 6. Tandai attempt tersentuh pada posisi soal terakhir.
    update public.exam_attempts
       set last_question_position = v_position,
           last_saved_at          = now()
     where id = p_attempt_id;

    return jsonb_build_object('attempt_question_id', v_attempt_question_id, 'saved', true);
end;
$$;

comment on function public.save_attempt_answer_for_user(uuid, uuid, uuid, uuid[]) is
    'Simpan jawaban satu soal dalam SATU round trip: validasi kepemilikan attempt, '
    'deadline ujian, alokasi soal, dan kepemilikan opsi — lalu upsert jawaban. '
    'Menggantikan lima panggilan PostgREST berurutan. Hanya service_role.';

revoke all on function public.save_attempt_answer_for_user(uuid, uuid, uuid, uuid[]) from public;
revoke all on function public.save_attempt_answer_for_user(uuid, uuid, uuid, uuid[]) from anon;
revoke all on function public.save_attempt_answer_for_user(uuid, uuid, uuid, uuid[]) from authenticated;
grant execute on function public.save_attempt_answer_for_user(uuid, uuid, uuid, uuid[]) to service_role;
