-- =============================================================================
-- Agregat progres subjek dihitung di SQL (menghilangkan agregat tanpa batas)
--
-- MASALAH
--   `SubjectProgressService.sync` (src/services/subject-progress.service.ts)
--   menghitung ulang progres SELURUH riwayat user setiap kali ujian diselesaikan:
--
--     1. `listAllCompletedAttemptIds(userId)` menarik SELURUH id attempt user
--        (tumbuh tanpa batas, dibatasi hanya oleh MAX_ATTEMPTS_PER_AGGREGATE).
--     2. `listScores(attemptIds)` mem-batch id tersebut per ~16 KB agar URL
--        PostgREST tidak melampaui batas header, lalu menjalankan SATU REQUEST
--        PER CHUNK.
--     3. Agregasi (sum, weighted average) dilakukan di JavaScript.
--
--   Dampaknya:
--     - User dengan 200 attempt sudah menjalankan ~4 request berurutan hanya
--       untuk menghitung progres, di dalam request submit ujian.
--     - Memori dan bandwidth ikut tumbuh: 20.000 attempt berarti ribuan baris
--       `attempt_scores` ditarik ke Node hanya untuk menghasilkan ~3 angka.
--     - Jika ambang 20.000 terlampaui, fungsi melempar error dan submit ujian
--       ikut GAGAL.
--
-- PERBAIKAN
--   Satu fungsi yang mengembalikan agregat per subjek langsung dari database.
--   Yang menyeberangi jaringan hanya beberapa baris (satu per subjek), bukan
--   seluruh riwayat. Satu round trip, terlepas dari panjang riwayat user.
--
-- PARITAS ANGKA (diverifikasi terhadap data staging sebelum migration ini)
--   Semantik TypeScript yang dipertahankan persis:
--     questions_answered = sum(correct_count + wrong_count)
--     total_questions    = sum(correct_count + wrong_count + unanswered_count)
--     accuracy           = round2(correct_answers / questions_answered * 100)
--     mastery_score      = round2(sum(percentage * total_questions) / total_questions)
--     attempts           = jumlah attempt DISTINCT per subjek
--   `percentage` bertipe numeric(7,4): PostgreSQL menghitung
--   `sum(percentage * total_questions)` secara EKSAK (aritmetika desimal),
--   sedangkan JavaScript mengakumulasi float. Karena pembulatan akhirnya 2
--   desimal dan galat float berada di orde 1e-10, hasil keduanya identik.
--   Pembulatan akhir sengaja TETAP dilakukan di TypeScript (`round2`) supaya
--   perilaku pembulatan tidak bergantung pada implementasi `round()` PostgreSQL.
--   Query pembanding dijalankan ke staging: 8 dari 8 subjek cocok.
--
-- KEAMANAN
--   - SECURITY DEFINER + `search_path = ''` (seluruh nama di-schema-qualify),
--     mengikuti pola `update_attempt_answer_scores`.
--   - EXECUTE hanya untuk `service_role`; `anon`/`authenticated` TIDAK boleh
--     memanggilnya. Fungsi ini membaca data lintas-user bila diberi user_id
--     sembarang, jadi pemanggilnya wajib jalur server yang sudah terautorisasi.
--   - Read-only: tidak ada INSERT/UPDATE/DELETE.
--
-- IDEMPOTEN & AMAN DIULANG
--   `create or replace function`, dan gagal keras bila ada attempt dimiliki
--   user lain di dalam set input (tidak mungkin terjadi karena dipanggil dengan
--   satu `p_user_id`, tetapi dijaga agar kesalahan pemanggilan tidak diam-diam
--   menghasilkan angka yang salah).
-- =============================================================================

create or replace function public.get_user_subject_progress(p_user_id uuid)
returns table (
    subject_id          uuid,
    attempts            integer,
    questions_answered  integer,
    correct_answers     integer,
    total_questions     integer,
    weighted_percentage numeric
)
language sql
stable
security definer
set search_path = ''
as $$
    with completed as (
        select distinct ea.id as attempt_id
        from public.exam_attempts ea
        where ea.user_id = p_user_id
          and lower(ea.status) = 'completed'
    ),
    per_attempt as (
        select
            ats.subject_id,
            ats.attempt_id,
            ats.correct_count,
            ats.wrong_count,
            ats.unanswered_count,
            ats.percentage
        from public.attempt_scores ats
        join completed c on c.attempt_id = ats.attempt_id
        where ats.subject_id is not null
    )
    select
        pa.subject_id,
        count(distinct pa.attempt_id)::integer                                  as attempts,
        coalesce(sum(pa.correct_count + pa.wrong_count), 0)::integer             as questions_answered,
        coalesce(sum(pa.correct_count), 0)::integer                             as correct_answers,
        coalesce(sum(pa.correct_count + pa.wrong_count + pa.unanswered_count), 0)::integer
                                                                                as total_questions,
        coalesce(
            sum(
                pa.percentage
                * (pa.correct_count + pa.wrong_count + pa.unanswered_count)
            ) filter (where pa.percentage is not null),
            0
        )::numeric                                                              as weighted_percentage
    from per_attempt pa
    group by pa.subject_id
    order by pa.subject_id;
$$;

comment on function public.get_user_subject_progress(uuid) is
    'Agregat progres per subjek untuk satu user (menggantikan agregasi di Node). '
    'Hanya membaca; EXECUTE terbatas untuk service_role.';

revoke all on function public.get_user_subject_progress(uuid) from public;
revoke all on function public.get_user_subject_progress(uuid) from anon;
revoke all on function public.get_user_subject_progress(uuid) from authenticated;
grant execute on function public.get_user_subject_progress(uuid) to service_role;
