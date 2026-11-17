-- =============================================================================
-- Batch update skor jawaban attempt (menghilangkan N+1 pada submit ujian CPNS)
--
-- MASALAH
--   `ScoringService.finishAttempt` (src/services/scoring.service.ts) memanggil
--   `attemptRepository.updateAnswerScore` di dalam loop soal. Full Tryout CPNS
--   berisi 110 soal, sehingga satu kali submit menjalankan 110 UPDATE berurutan
--   (round trip serial) di dalam request submit — tepat pada saat banyak peserta
--   menekan "kumpulkan" bersamaan. Latensi submit menjadi ~110x RTT dan berisiko
--   menembus batas waktu function.
--
-- PERBAIKAN
--   Satu fungsi yang menulis seluruh skor jawaban dalam SATU round trip.
--   Semantiknya identik dengan 110 UPDATE terpisah, tetapi atomik: tidak ada lagi
--   kondisi di mana sebagian jawaban sudah terskor dan sebagian belum.
--
-- KEAMANAN
--   - SECURITY DEFINER dengan `search_path = ''` (seluruh nama di-schema-qualify).
--   - EXECUTE hanya untuk `service_role`. `anon`/`authenticated` TIDAK boleh
--     memanggilnya: fungsi ini menulis skor, jadi permukaan serangannya harus nol.
--   - Kepemilikan attempt TIDAK diperiksa di sini karena pemanggilnya adalah
--     service role setelah `scoring_service` memverifikasi attempt milik user
--     (lihat `getAttemptBundle(userId, attemptId)`). Fungsi ini tidak menerima
--     `user_id` apa pun dari pemanggil, jadi tidak ada permukaan IDOR baru.
--
-- IDEMPOTEN
--   Murni UPDATE berdasarkan primary key; dijalankan dua kali menghasilkan state
--   yang sama. Baris yang tidak ada cukup diabaikan (tidak di-INSERT).
-- =============================================================================

create or replace function public.update_attempt_answer_scores(p_scores jsonb)
returns integer
language plpgsql
security definer
set search_path = ''
as $function$
declare
    v_updated integer;
begin
    if p_scores is null or jsonb_typeof(p_scores) <> 'array' then
        raise exception 'update_attempt_answer_scores expects a JSON array'
            using errcode = '22023';
    end if;

    with incoming as (
        select *
        from jsonb_to_recordset(p_scores) as x(
            id uuid,
            is_correct boolean,
            score_awarded numeric
        )
    )
    update public.attempt_answers aa
       set is_correct    = incoming.is_correct,
           score_awarded = incoming.score_awarded,
           updated_at    = now()
      from incoming
     where aa.id = incoming.id;

    get diagnostics v_updated = row_count;
    return v_updated;
end;
$function$;

comment on function public.update_attempt_answer_scores(jsonb) is
    'Menulis skor seluruh jawaban satu attempt dalam satu round trip. Hanya service_role.';

revoke all on function public.update_attempt_answer_scores(jsonb) from public;
revoke all on function public.update_attempt_answer_scores(jsonb) from anon;
revoke all on function public.update_attempt_answer_scores(jsonb) from authenticated;
grant execute on function public.update_attempt_answer_scores(jsonb) to service_role;
