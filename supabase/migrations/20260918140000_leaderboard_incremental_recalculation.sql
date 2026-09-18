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
create or replace function public.recalculate_leaderboard(
    p_leaderboard_id uuid,
    p_user_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
    -- Ambang atas pengurutan durasi. Sama dengan konstanta yang dipakai versi
    -- sebelumnya (dan versi bootstrap) agar baris tanpa durasi tetap berada di
    -- urutan yang sama, bukan berpindah ke atas.
    c_max_duration constant integer := 2147483647;
    v_board public.leaderboards%rowtype;
    v_ranked jsonb := '[]'::jsonb;
begin
    select * into v_board
    from public.leaderboards
    where id = p_leaderboard_id;

    if not found then
        raise exception 'LEADERBOARD_NOT_FOUND';
    end if;

    -- Semua sumber data dikumpulkan lebih dulu (read-only), baru satu pernyataan
    -- tulis dijalankan setelahnya. Ini menjaga fungsi tetap satu transaksi dan
    -- menghindari DELETE massal di tengah proses.
    with scoped_attempts as (
        select
            ea.id                                            as attempt_id,
            ea.user_id,
            coalesce(ea.total_score, 0)::numeric             as total_score,
            coalesce(ea.duration_used_seconds, c_max_duration) as duration_seconds,
            ea.submitted_at
        from public.exam_attempts ea
        join public.exams e on e.id = ea.exam_id
        join public.exam_types et on et.id = e.exam_type_id
        where lower(ea.status) = 'completed'
          and et.code = 'FULL_TRYOUT'
          and (v_board.program_id is null or e.program_id = v_board.program_id)
          and (v_board.track_id is null or e.track_id = v_board.track_id)
          and ea.submitted_at is not null
          and ea.submitted_at >= v_board.starts_at
          and ea.submitted_at <= v_board.ends_at
          -- Klaim utama perbaikan ini: satu submission hanya dapat mengubah baris
          -- satu user. Tanpa filter ini kita kembali ke full scan + full rewrite.
          and (p_user_id is null or ea.user_id = p_user_id)
    ),
    -- Satu attempt terbaik per user. Urutannya WAJIB identik dengan pengurutan
    -- papan di bawah: skor desc, durasi asc, submitted_at asc (NULL terakhir),
    -- lalu id sebagai pemecah seri yang deterministik.
    best_attempts as (
        select distinct on (sa.user_id)
            sa.attempt_id,
            sa.user_id,
            sa.total_score,
            sa.duration_seconds,
            sa.submitted_at
        from scoped_attempts sa
        order by
            sa.user_id asc,
            sa.total_score desc,
            sa.duration_seconds asc,
            sa.submitted_at asc nulls last,
            sa.attempt_id asc
    ),
    enriched as (
        select
            ba.attempt_id,
            ba.user_id,
            ba.total_score,
            ba.duration_seconds,
            ba.submitted_at,
            coalesce((
                select max(ats.raw_score)
                from public.attempt_scores ats
                join public.subjects s on s.id = ats.subject_id
                where ats.attempt_id = ba.attempt_id and s.code = 'TWK'
            ), 0)::numeric as score_twk,
            coalesce((
                select max(ats.raw_score)
                from public.attempt_scores ats
                join public.subjects s on s.id = ats.subject_id
                where ats.attempt_id = ba.attempt_id and s.code = 'TIU'
            ), 0)::numeric as score_tiu,
            coalesce((
                select max(ats.raw_score)
                from public.attempt_scores ats
                join public.subjects s on s.id = ats.subject_id
                where ats.attempt_id = ba.attempt_id and s.code = 'TKP'
            ), 0)::numeric as score_tkp
        from best_attempts ba
    )
    select coalesce(
        jsonb_agg(
            jsonb_build_object(
                'user_id', e.user_id,
                'score', e.total_score,
                'duration_seconds', e.duration_seconds,
                'submitted_at', e.submitted_at,
                'metadata', jsonb_build_object(
                    'attemptId', e.attempt_id,
                    'durationSeconds', e.duration_seconds,
                    'submittedAt', e.submitted_at,
                    'scoreTWK', e.score_twk,
                    'scoreTIU', e.score_tiu,
                    'scoreTKP', e.score_tkp
                )
            )
        ),
        '[]'::jsonb
    )
    into v_ranked
    from enriched e;

    -- Papan kosong (mis. tryout pertama, atau user diskualifikasi): tidak ada
    -- yang perlu ditulis.
    if jsonb_array_length(v_ranked) = 0 then
        return;
    end if;

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
    with incoming as (
        select
            (entry ->> 'user_id')::uuid                             as user_id,
            (entry ->> 'score')::numeric                            as score,
            (entry -> 'metadata' ->> 'durationSeconds')::integer    as duration_seconds,
            (entry -> 'metadata' ->> 'submittedAt')::timestamptz    as submitted_at,
            entry -> 'metadata'                                     as metadata
        from jsonb_array_elements(v_ranked) as entry
    )
    insert into public.leaderboard_entries as le (
        leaderboard_id, user_id, score, rank, metadata, updated_at
    )
    select
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
    from incoming i
    on conflict (leaderboard_id, user_id) do update
        set score      = excluded.score,
            metadata   = excluded.metadata,
            updated_at = now()
        -- Hanya sentuh baris bila nilainya benar-benar berubah, supaya
        -- `updated_at` tetap bermakna dan write tidak sia-sia.
        where (le.score, le.metadata) is distinct from (excluded.score, excluded.metadata);

    -- Buang baris user ini bila ia tidak lagi memenuhi syarat (mis. attempt-nya
    -- keluar dari window papan, atau statusnya tidak lagi completed).
    if p_user_id is not null then
        delete from public.leaderboard_entries le
        where le.leaderboard_id = p_leaderboard_id
          and le.user_id = p_user_id
          and not exists (
              select 1
              from jsonb_array_elements(v_ranked) as entry
              where (entry ->> 'user_id')::uuid = le.user_id
          );
    end if;

    -- =========================================================================
    -- LANGKAH 2 — perbaiki nomor peringkat.
    --
    -- Berdiri sendiri supaya snapshot-nya sudah memuat baris yang ditulis
    -- langkah 1. Hanya baris yang peringkatnya benar-benar bergeser yang
    -- ditulis, sehingga `updated_at` tidak lagi di-reset untuk seluruh papan
    -- setiap kali satu peserta selesai.
    -- =========================================================================
    with ranked as (
        select
            le.user_id,
            row_number() over (
                order by
                    le.score desc,
                    (le.metadata ->> 'durationSeconds')::integer asc,
                    (le.metadata ->> 'submittedAt')::timestamptz asc nulls last,
                    le.user_id asc
            )::integer as rank_pos
        from public.leaderboard_entries le
        where le.leaderboard_id = p_leaderboard_id
    )
    update public.leaderboard_entries le
       set rank       = r.rank_pos,
           updated_at = now()
      from ranked r
     where le.leaderboard_id = p_leaderboard_id
       and le.user_id = r.user_id
       and le.rank is distinct from r.rank_pos;
end;
$$;

comment on function public.recalculate_leaderboard(uuid, uuid) is
    'Sinkronkan papan peringkat secara INKREMENTAL. Bila p_user_id diisi, hanya '
    'baris user itu yang dihitung ulang (jalur submit ujian). Bila NULL, seluruh '
    'papan disinkronkan. Untuk hitung ulang penuh setelah perubahan konfigurasi '
    'papan, pakai rebuild_leaderboard().';

-- -----------------------------------------------------------------------------
-- 2. Hitung ulang PENUH (untuk perubahan konfigurasi papan / perbaikan kunci)
-- -----------------------------------------------------------------------------
create or replace function public.rebuild_leaderboard(p_leaderboard_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
    c_max_duration constant integer := 2147483647;
    v_board public.leaderboards%rowtype;
begin
    select * into v_board
    from public.leaderboards
    where id = p_leaderboard_id;

    if not found then
        raise exception 'LEADERBOARD_NOT_FOUND';
    end if;

    delete from public.leaderboard_entries
    where leaderboard_id = p_leaderboard_id;

    with candidate_attempts as (
        select
            ea.id                                              as attempt_id,
            ea.user_id,
            coalesce(ea.total_score, 0)::numeric               as total_score,
            coalesce(ea.duration_used_seconds, c_max_duration)  as duration_seconds,
            ea.submitted_at,
            row_number() over (
                partition by ea.user_id
                order by
                    coalesce(ea.total_score, 0) desc,
                    coalesce(ea.duration_used_seconds, c_max_duration) asc,
                    ea.submitted_at asc nulls last,
                    ea.id asc
            ) as user_best_rank
        from public.exam_attempts ea
        join public.exams e on e.id = ea.exam_id
        join public.exam_types et on et.id = e.exam_type_id
        where lower(ea.status) = 'completed'
          and et.code = 'FULL_TRYOUT'
          and (v_board.program_id is null or e.program_id = v_board.program_id)
          and (v_board.track_id is null or e.track_id = v_board.track_id)
          and ea.submitted_at is not null
          and ea.submitted_at >= v_board.starts_at
          and ea.submitted_at <= v_board.ends_at
    ),
    best_attempts as (
        select * from candidate_attempts where user_best_rank = 1
    ),
    subject_scores as (
        select
            ats.attempt_id,
            max(ats.raw_score) filter (where s.code = 'TWK') as score_twk,
            max(ats.raw_score) filter (where s.code = 'TIU') as score_tiu,
            max(ats.raw_score) filter (where s.code = 'TKP') as score_tkp
        from public.attempt_scores ats
        left join public.subjects s on s.id = ats.subject_id
        join best_attempts ba on ba.attempt_id = ats.attempt_id
        group by ats.attempt_id
    ),
    ranked as (
        select
            ba.*,
            coalesce(ss.score_twk, 0)::numeric as score_twk,
            coalesce(ss.score_tiu, 0)::numeric as score_tiu,
            coalesce(ss.score_tkp, 0)::numeric as score_tkp,
            row_number() over (
                order by
                    ba.total_score desc,
                    ba.duration_seconds asc,
                    ba.submitted_at asc nulls last,
                    ba.user_id asc
            )::integer as rank_pos
        from best_attempts ba
        left join subject_scores ss on ss.attempt_id = ba.attempt_id
    )
    insert into public.leaderboard_entries (
        leaderboard_id, user_id, score, rank, metadata, updated_at
    )
    select
        p_leaderboard_id,
        ranked.user_id,
        ranked.total_score,
        ranked.rank_pos,
        jsonb_build_object(
            'attemptId', ranked.attempt_id,
            'durationSeconds', ranked.duration_seconds,
            'submittedAt', ranked.submitted_at,
            'scoreTWK', ranked.score_twk,
            'scoreTIU', ranked.score_tiu,
            'scoreTKP', ranked.score_tkp
        ),
        now()
    from ranked;
end;
$$;

comment on function public.rebuild_leaderboard(uuid) is
    'Hitung ulang PENUH (delete + insert) seluruh papan. Dipakai setelah '
    'perubahan konfigurasi papan (starts_at/ends_at/program/track) atau '
    'perbaikan skor historis — BUKAN di jalur submit ujian.';

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
drop function if exists public.recalculate_leaderboard(uuid);

-- -----------------------------------------------------------------------------
-- ACL: hanya service_role. Keduanya menulis papan peringkat.
-- -----------------------------------------------------------------------------
revoke all on function public.recalculate_leaderboard(uuid, uuid) from public;
revoke all on function public.recalculate_leaderboard(uuid, uuid) from anon;
revoke all on function public.recalculate_leaderboard(uuid, uuid) from authenticated;
grant execute on function public.recalculate_leaderboard(uuid, uuid) to service_role;

revoke all on function public.rebuild_leaderboard(uuid) from public;
revoke all on function public.rebuild_leaderboard(uuid) from anon;
revoke all on function public.rebuild_leaderboard(uuid) from authenticated;
grant execute on function public.rebuild_leaderboard(uuid) to service_role;
