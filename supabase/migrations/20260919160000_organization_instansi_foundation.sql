-- =============================================================================
-- MVP CPNS Instansi Managed Service — Fase 1: fondasi skema
--
-- Sumber: docs/notes/prd-cpns-instansi-managed-service.md
--   §6.1 Manajemen Instansi, §6.2 Manajemen Batch, §6.3 Manajemen Peserta,
--   §7.2 Data Peserta, §7.3 Template Ujian, §7.5 Session Ujian,
--   §8 Non-Fungsional, §9 Model Data, §14 urutan implementasi langkah 1–2.
--
-- KENAPA FASE INI ADA
--   PRD §9 menyarankan enam tabel: organizations, organization_members,
--   organization_batches, organization_participants, organization_exam_templates,
--   organization_exam_assignments. Yang ada di Schema V2 baru EMPAT —
--   organization_batches, organization_participants, dan
--   organization_exam_templates belum pernah dibuat. Tanpa ketiganya, §6.2 dan
--   §6.3 tidak punya tempat menyimpan apa pun.
--
-- PRD SUDAH TERTINGGAL DARI SCHEMA V2
--   §9 berbunyi "`test_sessions` ditambah metadata konteks instansi". Tabel itu
--   sekarang ada di `legacy_prod`, bukan `public`. Padanan V2-nya adalah
--   `exam_attempts`, dan itulah yang ditambahi metadata di sini.
--
-- KEPUTUSAN DESAIN
--
--   1. `organization_exam_assignments.exam_id` TETAP NOT NULL.
--      PRD §7.4 ingin assignment dibuat dari batch + template. Alih-alih
--      membuat mesin ujian paralel untuk instansi, assignment menunjuk ke
--      `exams` hasil komposisi template. Dengan begitu mesin ujian, penilaian,
--      dan pembahasan yang sudah ada dipakai ulang — dan yang dipisahkan hanya
--      DATANYA (PRD §7.6 menuntut ranking instansi tidak bercampur dengan
--      leaderboard nasional, bukan mesin ujian yang berbeda).
--
--   2. Satu baris `organization_participants` = satu partisipasi PADA SATU BATCH.
--      PRD §7.2 mencantumkan `organization_id` dan `batch_id` di tabel yang sama,
--      jadi seorang peserta yang ikut dua batch memperoleh dua baris. Ini
--      menjawab open question §13 "boleh ikut lebih dari satu batch?" tanpa
--      memaksakan pilihan: keduanya bisa.
--
--   3. Snapshot disimpan apa adanya (§7.2). Export harus tetap konsisten
--      walaupun pengguna mengubah profilnya setelah ujian; Risiko di §12
--      menyebut ini eksplisit.
--
--   4. Kolom eksplisit, bukan `metadata` jsonb, untuk konteks instansi pada
--      `exam_attempts` — §8 menuntut export dapat difilter CEPAT berdasarkan
--      organization_id dan batch_id, dan itu butuh index.
--
--   5. `user_id` pada peserta boleh NULL (§7.2, §13): peserta boleh dibuat
--      sebagai data lebih dulu, akunnya menyusul lewat self-onboarding.
--
-- ACL mengikuti konvensi repo: `authenticated` hanya SELECT (disaring RLS),
-- seluruh penulisan lewat RPC SECURITY DEFINER.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Instansi: lengkapi kontak PIC.
--    PRD §6.1 meminta "nama instansi, kode instansi, kontak PIC, dan status
--    aktif" — kolom kontak sama sekali belum ada.
-- -----------------------------------------------------------------------------
alter table public.organizations
    add column if not exists contact_name  text,
    add column if not exists contact_email text,
    add column if not exists contact_phone text,
    add column if not exists notes         text,
    add column if not exists created_by    uuid,
    add column if not exists updated_at    timestamptz not null default now();

create unique index if not exists organizations_code_key
    on public.organizations (upper(code));

comment on column public.organizations.contact_name is
    'Nama PIC instansi (PRD §6.1). Bukan akun pengguna — PIC tidak menjadi admin sistem pada MVP (§15).';

-- -----------------------------------------------------------------------------
-- 2. Batch (PRD §6.2).
--    `invite_token` adalah kode yang dibagikan instansi untuk self-onboarding
--    (§6.3, §10.3). Dibuat terpisah dari `code` supaya kode batch yang mudah
--    dibaca manusia tidak sekaligus menjadi rahasia yang bisa ditebak.
-- -----------------------------------------------------------------------------
create table if not exists public.organization_batches (
    id            uuid primary key default gen_random_uuid(),
    organization_id uuid not null references public.organizations (id) on delete cascade,
    code          text not null,
    name          text not null,
    invite_token  text not null default encode(extensions.gen_random_bytes(16), 'hex'),
    starts_at     timestamptz,
    ends_at       timestamptz,
    status        text not null default 'draft',
    notes         text,
    created_by    uuid references public.profiles (id) on delete set null,
    created_at    timestamptz not null default now(),
    updated_at    timestamptz not null default now(),
    constraint organization_batches_status_check
        check (status in ('draft', 'active', 'closed', 'archived')),
    constraint organization_batches_window_check
        check (ends_at is null or starts_at is null or ends_at >= starts_at)
);

create unique index if not exists organization_batches_org_code_key
    on public.organization_batches (organization_id, upper(code));
create unique index if not exists organization_batches_invite_token_key
    on public.organization_batches (invite_token);
create index if not exists organization_batches_org_status_idx
    on public.organization_batches (organization_id, status);

comment on column public.organization_batches.invite_token is
    'Token self-onboarding peserta (PRD §10.3). Terpisah dari `code` supaya kode batch yang mudah dibaca tidak sekaligus menjadi rahasia yang bisa ditebak.';

-- -----------------------------------------------------------------------------
-- 3. Peserta instansi (PRD §7.2).
--    Snapshot nama/email/telepon disimpan agar export tetap konsisten walau
--    profil pengguna berubah setelah ujian (§12).
-- -----------------------------------------------------------------------------
create table if not exists public.organization_participants (
    id                 uuid primary key default gen_random_uuid(),
    organization_id    uuid not null references public.organizations (id) on delete cascade,
    batch_id           uuid not null references public.organization_batches (id) on delete cascade,
    user_id            uuid references public.profiles (id) on delete set null,
    participant_code   text not null,
    full_name_snapshot text not null,
    email_snapshot     text,
    phone_snapshot     text,
    nik                text,
    unit               text,
    jabatan            text,
    custom_metadata    jsonb,
    status             text not null default 'registered',
    registered_at      timestamptz not null default now(),
    notes              text,
    created_at         timestamptz not null default now(),
    updated_at         timestamptz not null default now(),
    constraint organization_participants_status_check
        check (status in ('registered', 'active', 'completed', 'withdrawn'))
);

-- Kode peserta unik DI DALAM satu batch, bukan lintas instansi: dua instansi
-- berbeda boleh sama-sama memakai kode "001".
create unique index if not exists organization_participants_batch_code_key
    on public.organization_participants (batch_id, upper(participant_code));

-- Dedupe yang disarankan PRD §7.2.1: email, telepon, atau kode peserta.
-- Seorang peserta hanya boleh muncul sekali dalam satu batch.
create unique index if not exists organization_participants_batch_email_key
    on public.organization_participants (batch_id, lower(email_snapshot))
    where email_snapshot is not null;
create unique index if not exists organization_participants_batch_user_key
    on public.organization_participants (batch_id, user_id)
    where user_id is not null;

-- PRD §8: export harus dapat difilter cepat berdasarkan organization_id dan
-- batch_id.
create index if not exists organization_participants_org_batch_idx
    on public.organization_participants (organization_id, batch_id);
create index if not exists organization_participants_user_idx
    on public.organization_participants (user_id);

comment on table public.organization_participants is
    'Satu baris = satu partisipasi peserta pada SATU batch (PRD §7.2). Peserta yang mengikuti dua batch memperoleh dua baris.';

-- -----------------------------------------------------------------------------
-- 4. Template ujian (PRD §7.3).
--    `organization_id` boleh NULL: NULL berarti template bersama yang dipakai
--    semua instansi, yang berguna karena komposisi SKD memang standar nasional
--    (30 TWK + 35 TIU + 45 TKP).
-- -----------------------------------------------------------------------------
create table if not exists public.organization_exam_templates (
    id                  uuid primary key default gen_random_uuid(),
    organization_id     uuid references public.organizations (id) on delete cascade,
    name                text not null,
    twk_count           integer not null default 30,
    tiu_count           integer not null default 35,
    tkp_count           integer not null default 45,
    duration_seconds    integer not null default 6000,
    max_attempts        integer not null default 1,
    randomize_questions boolean not null default true,
    randomize_options   boolean not null default false,
    show_explanation    text not null default 'after_exam',
    ranking_visibility  text not null default 'internal',
    ruleset             jsonb,
    status              text not null default 'draft',
    created_by          uuid references public.profiles (id) on delete set null,
    created_at          timestamptz not null default now(),
    updated_at          timestamptz not null default now(),
    constraint organization_exam_templates_status_check
        check (status in ('draft', 'active', 'archived')),
    constraint organization_exam_templates_counts_check
        check (twk_count >= 0 and tiu_count >= 0 and tkp_count >= 0
               and (twk_count + tiu_count + tkp_count) > 0),
    constraint organization_exam_templates_duration_check
        check (duration_seconds > 0),
    constraint organization_exam_templates_attempts_check
        check (max_attempts >= 1),
    constraint organization_exam_templates_explanation_check
        check (show_explanation in ('never', 'after_exam', 'after_close')),
    constraint organization_exam_templates_ranking_check
        check (ranking_visibility in ('hidden', 'internal', 'public'))
);

create index if not exists organization_exam_templates_org_idx
    on public.organization_exam_templates (organization_id, status);

-- -----------------------------------------------------------------------------
-- 5. Assignment ujian (PRD §7.4).
--    `exam_id` tetap NOT NULL — lihat "Keputusan desain" butir 1.
-- -----------------------------------------------------------------------------
alter table public.organization_exam_assignments
    add column if not exists batch_id    uuid references public.organization_batches (id) on delete cascade,
    add column if not exists template_id uuid references public.organization_exam_templates (id) on delete set null,
    add column if not exists is_active   boolean not null default true,
    add column if not exists notes       text;

create index if not exists organization_exam_assignments_batch_idx
    on public.organization_exam_assignments (batch_id, is_active);
create index if not exists organization_exam_assignments_org_idx
    on public.organization_exam_assignments (organization_id);

comment on column public.organization_exam_assignments.batch_id is
    'Batch yang mengerjakan assignment ini (PRD §7.4). NULL berarti assignment tingkat instansi.';

-- -----------------------------------------------------------------------------
-- 6. Metadata instansi pada attempt (PRD §7.5).
--
--    Kolom eksplisit, bukan `metadata` jsonb: PRD §8 menuntut export dapat
--    difilter CEPAT berdasarkan organization_id dan batch_id, dan itu butuh
--    index. `source` memisahkan data instansi dari B2C sejak awal — Risiko §12
--    "data B2C dan instansi bercampur" dicegah di tingkat skema, bukan di
--    tingkat query.
-- -----------------------------------------------------------------------------
alter table public.exam_attempts
    add column if not exists source         text not null default 'b2c',
    add column if not exists organization_id uuid references public.organizations (id) on delete set null,
    add column if not exists batch_id       uuid references public.organization_batches (id) on delete set null,
    add column if not exists assignment_id  uuid references public.organization_exam_assignments (id) on delete set null,
    add column if not exists participant_id uuid references public.organization_participants (id) on delete set null;

alter table public.exam_attempts
    drop constraint if exists exam_attempts_source_check;
alter table public.exam_attempts
    add constraint exam_attempts_source_check check (source in ('b2c', 'organization'));

-- Partial index: attempt B2C adalah mayoritas dan tidak pernah difilter dengan
-- kolom ini, jadi tidak perlu masuk index.
create index if not exists exam_attempts_org_batch_idx
    on public.exam_attempts (organization_id, batch_id)
    where source = 'organization';
create index if not exists exam_attempts_participant_idx
    on public.exam_attempts (participant_id)
    where participant_id is not null;

comment on column public.exam_attempts.source is
    'Pemisah data B2C vs instansi (PRD §7.5, Risiko §12). Export instansi WAJIB memfilter source = ''organization''.';

-- -----------------------------------------------------------------------------
-- 7. RLS.
--    Pola repo: `authenticated` hanya SELECT dan disaring RLS; seluruh
--    penulisan lewat RPC SECURITY DEFINER yang memeriksa `organization.manage`.
--    Tidak ada policy tulis sama sekali — jadi walaupun GRANT bocor, tulis
--    langsung tetap ditolak.
-- -----------------------------------------------------------------------------
alter table public.organization_batches           enable row level security;
alter table public.organization_participants      enable row level security;
alter table public.organization_exam_templates    enable row level security;

-- Anggota instansi boleh membaca batch instansinya sendiri.
drop policy if exists organization_batches_member_read on public.organization_batches;
create policy organization_batches_member_read on public.organization_batches
    for select to authenticated
    using (exists (
        select 1 from public.organization_members m
         where m.organization_id = organization_batches.organization_id
           and m.user_id = (select auth.uid())
           and m.status = 'active'
    ));

-- Peserta boleh membaca baris partisipasinya SENDIRI; anggota instansi boleh
-- membaca seluruh peserta instansinya.
drop policy if exists organization_participants_member_read on public.organization_participants;
create policy organization_participants_member_read on public.organization_participants
    for select to authenticated
    using (
        user_id = (select auth.uid())
        or exists (
            select 1 from public.organization_members m
             where m.organization_id = organization_participants.organization_id
               and m.user_id = (select auth.uid())
               and m.status = 'active'
        )
    );

drop policy if exists organization_exam_templates_member_read on public.organization_exam_templates;
create policy organization_exam_templates_member_read on public.organization_exam_templates
    for select to authenticated
    using (
        organization_id is null
        or exists (
            select 1 from public.organization_members m
             where m.organization_id = organization_exam_templates.organization_id
               and m.user_id = (select auth.uid())
               and m.status = 'active'
        )
    );

-- -----------------------------------------------------------------------------
-- 8. ACL: SELECT untuk `authenticated`, penuh hanya untuk `service_role`.
--    INSERT/UPDATE/DELETE sengaja TIDAK diberikan ke `authenticated`.
-- -----------------------------------------------------------------------------
revoke all on public.organization_batches        from anon;
revoke all on public.organization_participants   from anon;
revoke all on public.organization_exam_templates from anon;

revoke insert, update, delete, truncate, references, trigger on public.organization_batches        from authenticated;
revoke insert, update, delete, truncate, references, trigger on public.organization_participants   from authenticated;
revoke insert, update, delete, truncate, references, trigger on public.organization_exam_templates from authenticated;

grant select on public.organization_batches        to authenticated;
grant select on public.organization_participants   to authenticated;
grant select on public.organization_exam_templates to authenticated;

grant all on public.organization_batches        to service_role;
grant all on public.organization_participants   to service_role;
grant all on public.organization_exam_templates to service_role;

-- -----------------------------------------------------------------------------
-- 9. Kualifikasi schema untuk pgcrypto.
--
--    `gen_random_bytes` TIDAK ada di pg_catalog melainkan di schema
--    `extensions`, sehingga tidak dapat diresolusi ketika sebuah fungsi berjalan
--    dengan `search_path = ''` — konvensi wajib repo ini untuk SECURITY DEFINER.
--    Default kolom di atas sudah memakai `extensions.gen_random_bytes`, dan
--    pernyataan ALTER berikut menegaskannya untuk database yang tabelnya sudah
--    terlanjur dibuat dengan bentuk tak terkualifikasi.
-- -----------------------------------------------------------------------------
alter table public.organization_batches
    alter column invite_token set default encode(extensions.gen_random_bytes(16), 'hex');
