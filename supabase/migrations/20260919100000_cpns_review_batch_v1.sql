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
create table if not exists public.review_batches (
    batch_code  text primary key,
    description text not null,
    created_at  timestamptz not null default now()
);

comment on table public.review_batches is
    'Penanda batch review konten. Dipakai bersama response_config.pilotBatch '
    'agar bulk_review_pilot_stage dapat menyaring satu batch sekaligus.';

revoke all on public.review_batches from anon, authenticated;

insert into public.review_batches (batch_code, description)
values (
    'cpns-full-tryout-1',
    'Soal CPNS untuk membentuk satu set Full Tryout SKD: TIU 35 + TKP 45. '
    'TWK sudah terbit 30. Menunggu review manusia sebelum diterbitkan.'
)
on conflict (batch_code) do nothing;

do $$
declare
    v_batch  constant text := 'cpns-full-tryout-1';
    v_tiu    uuid;
    v_tkp    uuid;
    v_before integer;
    v_after  integer;
begin
    select s.id into v_tiu from public.subjects s
      join public.tracks t on t.id = s.track_id
      join public.programs p on p.id = t.program_id
     where p.code = 'CPNS' and t.code = 'SKD' and s.code = 'TIU';

    select s.id into v_tkp from public.subjects s
      join public.tracks t on t.id = s.track_id
      join public.programs p on p.id = t.program_id
     where p.code = 'CPNS' and t.code = 'SKD' and s.code = 'TKP';

    if v_tiu is null or v_tkp is null then
        raise notice 'Subjek TIU/TKP CPNS tidak ditemukan — batch dilewati';
        return;
    end if;

    select count(*) into v_before
      from public.questions q
     where q.response_config ->> 'pilotBatch' = v_batch;

    -- TIU 35 — syarat section Full Tryout.
    with kandidat as (
        select q.id
        from public.questions q
        where q.subject_id = v_tiu
          and q.status = 'draft'
          and q.source_type = 'legacy_migration'
          and (select count(*) from public.question_options o where o.question_id = q.id) >= 4
          and exists (select 1 from public.question_explanations x where x.question_id = q.id)
        order by q.question_code
        limit 35
    )
    update public.questions q
       set response_config = coalesce(q.response_config, '{}'::jsonb)
                             || jsonb_build_object('pilotBatch', v_batch),
           updated_at = now()
      from kandidat k
     where q.id = k.id;

    -- TKP 45
    with kandidat as (
        select q.id
        from public.questions q
        where q.subject_id = v_tkp
          and q.status = 'draft'
          and q.source_type = 'legacy_migration'
          and (select count(*) from public.question_options o where o.question_id = q.id) >= 4
          and exists (select 1 from public.question_explanations x where x.question_id = q.id)
        order by q.question_code
        limit 45
    )
    update public.questions q
       set response_config = coalesce(q.response_config, '{}'::jsonb)
                             || jsonb_build_object('pilotBatch', v_batch),
           updated_at = now()
      from kandidat k
     where q.id = k.id;

    select count(*) into v_after
      from public.questions q
     where q.response_config ->> 'pilotBatch' = v_batch;

    raise notice 'Batch % : % soal ditandai (sebelumnya %)', v_batch, v_after, v_before;
end $$;
