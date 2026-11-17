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
do $$
begin
    if exists (select 1 from pg_extension where extname = 'pg_cron') then
        perform cron.unschedule(jobid)
        from cron.job
        where jobname = 'refresh_leaderboard'
          and command ilike '%leaderboard_snapshot%';
    end if;
end $$;

-- -----------------------------------------------------------------------------
-- 2. Papan peringkat nasional CPNS/SKD untuk musim 2026
--
--    `ends_at` WAJIB diisi dan harus di masa depan: `getNationalLeaderboard`
--    memakai `.gte('ends_at', now())`, jadi papan dengan ends_at lampau akan
--    diam-diam tidak pernah tampil.
-- -----------------------------------------------------------------------------
insert into public.leaderboards (
    code, name, leaderboard_type, program_id, track_id, starts_at, ends_at, status
)
select
    'CPNS_NATIONAL_2026',
    'Peringkat Nasional SKD CPNS 2026',
    'national',
    p.id,
    t.id,
    timestamptz '2026-01-01 00:00:00+07',
    timestamptz '2026-12-31 23:59:59+07',
    'active'
from public.programs p
join public.tracks t on t.program_id = p.id
where p.code = 'CPNS'
  and t.code = 'SKD'
on conflict (code) do nothing;

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
do $$
declare
    v_board_id uuid;
    v_attempt  record;
begin
    select id into v_board_id from public.leaderboards where code = 'CPNS_NATIONAL_2026';
    if v_board_id is null then
        return;
    end if;

    -- Mulai dari keadaan bersih supaya migration ini idempoten.
    delete from public.leaderboard_entries where leaderboard_id = v_board_id;

    for v_attempt in
        select
            ea.user_id,
            ea.id                                            as attempt_id,
            coalesce(ea.total_score, 0)::numeric             as total_score,
            ea.submitted_at,
            coalesce((
                select max(ats.raw_score) from public.attempt_scores ats
                join public.subjects s on s.id = ats.subject_id
                where ats.attempt_id = ea.id and s.code = 'TWK'
            ), 0)::numeric as score_twk,
            coalesce((
                select max(ats.raw_score) from public.attempt_scores ats
                join public.subjects s on s.id = ats.subject_id
                where ats.attempt_id = ea.id and s.code = 'TIU'
            ), 0)::numeric as score_tiu,
            coalesce((
                select max(ats.raw_score) from public.attempt_scores ats
                join public.subjects s on s.id = ats.subject_id
                where ats.attempt_id = ea.id and s.code = 'TKP'
            ), 0)::numeric as score_tkp,
            row_number() over (
                partition by ea.user_id
                order by coalesce(ea.total_score, 0) desc,
                         ea.submitted_at asc nulls last,
                         ea.id asc
            ) as user_best_rank
        from public.exam_attempts ea
        join public.exams e on e.id = ea.exam_id
        join public.exam_types et on et.id = e.exam_type_id
        where lower(ea.status) = 'completed'
          and et.code = 'FULL_TRYOUT'
          and e.program_id = (select id from public.programs where code = 'CPNS')
          and e.track_id = (
              select t.id from public.tracks t
              join public.programs p on p.id = t.program_id
              where p.code = 'CPNS' and t.code = 'SKD'
          )
          and ea.submitted_at is not null
    loop
        -- Hanya attempt terbaik per user yang masuk papan.
        if v_attempt.user_best_rank = 1 then
            insert into public.leaderboard_entries (
                leaderboard_id, user_id, score, rank, metadata, updated_at
            )
            values (
                v_board_id,
                v_attempt.user_id,
                v_attempt.total_score,
                0,  -- peringkat sementara; dirapikan oleh rebuild di bawah
                jsonb_build_object(
                    'attemptId', v_attempt.attempt_id,
                    -- Durasi legacy tidak dipercaya: diset sama agar pemecah seri
                    -- jatuh ke submittedAt, bukan ke angka sampah.
                    'durationSeconds', 2147483647,
                    'submittedAt', v_attempt.submitted_at,
                    'scoreTWK', v_attempt.score_twk,
                    'scoreTIU', v_attempt.score_tiu,
                    'scoreTKP', v_attempt.score_tkp,
                    'legacyBackfill', true
                ),
                now()
            )
            on conflict (leaderboard_id, user_id) do nothing;
        end if;
    end loop;

    perform public.rebuild_leaderboard(v_board_id);
end $$;

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
do $$
begin
    if not exists (select 1 from pg_extension where extname = 'pg_cron') then
        return;
    end if;

    -- Idempoten: buang dulu bila job dengan nama ini sudah ada.
    perform cron.unschedule(jobid)
    from cron.job
    where jobname = 'maintain_leaderboards';

    perform cron.schedule(
        'maintain_leaderboards',
        '17 19 * * *',  -- 02:17 WIB setiap hari
        $cron$
        do $body$
        declare
            v_board uuid;
        begin
            for v_board in
                select id from public.leaderboards
                where status in ('active', 'ACTIVE')
                  and starts_at <= now()
                  and ends_at >= now()
            loop
                perform public.rebuild_leaderboard(v_board);
            end loop;
        end $body$;
        $cron$
    );
end $$;
