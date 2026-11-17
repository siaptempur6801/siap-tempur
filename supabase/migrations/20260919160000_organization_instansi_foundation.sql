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
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS contact_name text,
  ADD COLUMN IF NOT EXISTS contact_email text,
  ADD COLUMN IF NOT EXISTS contact_phone text,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS organizations_code_key ON public.organizations (upper(code));

COMMENT ON COLUMN public.organizations.contact_name IS 'Nama PIC instansi (PRD §6.1). Bukan akun pengguna — PIC tidak menjadi admin sistem pada MVP (§15).';
-- -----------------------------------------------------------------------------
-- 2. Batch (PRD §6.2).
--    `invite_token` adalah kode yang dibagikan instansi untuk self-onboarding
--    (§6.3, §10.3). Dibuat terpisah dari `code` supaya kode batch yang mudah
--    dibaca manusia tidak sekaligus menjadi rahasia yang bisa ditebak.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.organization_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  organization_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  invite_token text NOT NULL DEFAULT encode(extensions.gen_random_bytes(16), 'hex'),
  starts_at timestamptz,
  ends_at timestamptz,
  status text NOT NULL DEFAULT 'draft',
  notes text,
  created_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT organization_batches_status_check CHECK (status IN ('draft', 'active', 'closed', 'archived')),
  CONSTRAINT organization_batches_window_check CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at >= starts_at)
);

CREATE UNIQUE INDEX IF NOT EXISTS organization_batches_org_code_key ON public.organization_batches (organization_id, upper(code));

CREATE UNIQUE INDEX IF NOT EXISTS organization_batches_invite_token_key ON public.organization_batches (invite_token);

CREATE INDEX IF NOT EXISTS organization_batches_org_status_idx ON public.organization_batches (organization_id, status);

COMMENT ON COLUMN public.organization_batches.invite_token IS 'Token self-onboarding peserta (PRD §10.3). Terpisah dari `code` supaya kode batch yang mudah dibaca tidak sekaligus menjadi rahasia yang bisa ditebak.';
-- -----------------------------------------------------------------------------
-- 3. Peserta instansi (PRD §7.2).
--    Snapshot nama/email/telepon disimpan agar export tetap konsisten walau
--    profil pengguna berubah setelah ujian (§12).
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.organization_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  organization_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  batch_id uuid NOT NULL REFERENCES public.organization_batches (id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  participant_code text NOT NULL,
  full_name_snapshot text NOT NULL,
  email_snapshot text,
  phone_snapshot text,
  nik text,
  unit text,
  jabatan text,
  custom_metadata jsonb,
  status text NOT NULL DEFAULT 'registered',
  registered_at timestamptz NOT NULL DEFAULT now(),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT organization_participants_status_check CHECK (status IN ('registered', 'active', 'completed', 'withdrawn'))
);

-- Kode peserta unik DI DALAM satu batch, bukan lintas instansi: dua instansi
-- berbeda boleh sama-sama memakai kode "001".
CREATE UNIQUE INDEX IF NOT EXISTS organization_participants_batch_code_key ON public.organization_participants (batch_id, upper(participant_code));

-- Dedupe yang disarankan PRD §7.2.1: email, telepon, atau kode peserta.
-- Seorang peserta hanya boleh muncul sekali dalam satu batch.
CREATE UNIQUE INDEX IF NOT EXISTS organization_participants_batch_email_key ON public.organization_participants (batch_id, lower(email_snapshot))
WHERE
  email_snapshot IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS organization_participants_batch_user_key ON public.organization_participants (batch_id, user_id)
WHERE
  user_id IS NOT NULL;

-- PRD §8: export harus dapat difilter cepat berdasarkan organization_id dan
-- batch_id.
CREATE INDEX IF NOT EXISTS organization_participants_org_batch_idx ON public.organization_participants (organization_id, batch_id);

CREATE INDEX IF NOT EXISTS organization_participants_user_idx ON public.organization_participants (user_id);

COMMENT ON TABLE public.organization_participants IS 'Satu baris = satu partisipasi peserta pada SATU batch (PRD §7.2). Peserta yang mengikuti dua batch memperoleh dua baris.';
-- -----------------------------------------------------------------------------
-- 4. Template ujian (PRD §7.3).
--    `organization_id` boleh NULL: NULL berarti template bersama yang dipakai
--    semua instansi, yang berguna karena komposisi SKD memang standar nasional
--    (30 TWK + 35 TIU + 45 TKP).
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.organization_exam_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  organization_id uuid REFERENCES public.organizations (id) ON DELETE CASCADE,
  name text NOT NULL,
  twk_count integer NOT NULL DEFAULT 30,
  tiu_count integer NOT NULL DEFAULT 35,
  tkp_count integer NOT NULL DEFAULT 45,
  duration_seconds integer NOT NULL DEFAULT 6000,
  max_attempts integer NOT NULL DEFAULT 1,
  randomize_questions boolean NOT NULL DEFAULT TRUE,
  randomize_options boolean NOT NULL DEFAULT FALSE,
  show_explanation text NOT NULL DEFAULT 'after_exam',
  ranking_visibility text NOT NULL DEFAULT 'internal',
  ruleset jsonb,
  status text NOT NULL DEFAULT 'draft',
  created_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT organization_exam_templates_status_check CHECK (status IN ('draft', 'active', 'archived')),
  CONSTRAINT organization_exam_templates_counts_check CHECK (twk_count >= 0 AND tiu_count >= 0 AND tkp_count >= 0 AND (twk_count + tiu_count + tkp_count) > 0),
  CONSTRAINT organization_exam_templates_duration_check CHECK (duration_seconds > 0),
  CONSTRAINT organization_exam_templates_attempts_check CHECK (max_attempts >= 1),
  CONSTRAINT organization_exam_templates_explanation_check CHECK (show_explanation IN ('never', 'after_exam', 'after_close')),
  CONSTRAINT organization_exam_templates_ranking_check CHECK (ranking_visibility IN ('hidden', 'internal', 'public'))
);

CREATE INDEX IF NOT EXISTS organization_exam_templates_org_idx ON public.organization_exam_templates (organization_id, status);

-- -----------------------------------------------------------------------------
-- 5. Assignment ujian (PRD §7.4).
--    `exam_id` tetap NOT NULL — lihat "Keputusan desain" butir 1.
-- -----------------------------------------------------------------------------
ALTER TABLE public.organization_exam_assignments
  ADD COLUMN IF NOT EXISTS batch_id uuid REFERENCES public.organization_batches (id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS template_id uuid REFERENCES public.organization_exam_templates (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS notes text;

CREATE INDEX IF NOT EXISTS organization_exam_assignments_batch_idx ON public.organization_exam_assignments (batch_id, is_active);

CREATE INDEX IF NOT EXISTS organization_exam_assignments_org_idx ON public.organization_exam_assignments (organization_id);

COMMENT ON COLUMN public.organization_exam_assignments.batch_id IS 'Batch yang mengerjakan assignment ini (PRD §7.4). NULL berarti assignment tingkat instansi.';
-- -----------------------------------------------------------------------------
-- 6. Metadata instansi pada attempt (PRD §7.5).
--
--    Kolom eksplisit, bukan `metadata` jsonb: PRD §8 menuntut export dapat
--    difilter CEPAT berdasarkan organization_id dan batch_id, dan itu butuh
--    index. `source` memisahkan data instansi dari B2C sejak awal — Risiko §12
--    "data B2C dan instansi bercampur" dicegah di tingkat skema, bukan di
--    tingkat query.
-- -----------------------------------------------------------------------------
ALTER TABLE public.exam_attempts
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'b2c',
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS batch_id uuid REFERENCES public.organization_batches (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assignment_id uuid REFERENCES public.organization_exam_assignments (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS participant_id uuid REFERENCES public.organization_participants (id) ON DELETE SET NULL;

ALTER TABLE public.exam_attempts
  DROP CONSTRAINT IF EXISTS exam_attempts_source_check;

ALTER TABLE public.exam_attempts
  ADD CONSTRAINT exam_attempts_source_check CHECK (source IN ('b2c', 'organization'));

-- Partial index: attempt B2C adalah mayoritas dan tidak pernah difilter dengan
-- kolom ini, jadi tidak perlu masuk index.
CREATE INDEX IF NOT EXISTS exam_attempts_org_batch_idx ON public.exam_attempts (organization_id, batch_id)
WHERE
  source = 'organization';

CREATE INDEX IF NOT EXISTS exam_attempts_participant_idx ON public.exam_attempts (participant_id)
WHERE
  participant_id IS NOT NULL;

COMMENT ON COLUMN public.exam_attempts.source IS 'Pemisah data B2C vs instansi (PRD §7.5, Risiko §12). Export instansi WAJIB memfilter source = ''organization''.';
-- -----------------------------------------------------------------------------
-- 7. RLS.
--    Pola repo: `authenticated` hanya SELECT dan disaring RLS; seluruh
--    penulisan lewat RPC SECURITY DEFINER yang memeriksa `organization.manage`.
--    Tidak ada policy tulis sama sekali — jadi walaupun GRANT bocor, tulis
--    langsung tetap ditolak.
-- -----------------------------------------------------------------------------
ALTER TABLE public.organization_batches ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.organization_participants ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.organization_exam_templates ENABLE ROW LEVEL SECURITY;

-- Anggota instansi boleh membaca batch instansinya sendiri.
DROP POLICY IF EXISTS organization_batches_member_read ON public.organization_batches;

CREATE POLICY organization_batches_member_read ON public.organization_batches
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT
      1
    FROM
      public.organization_members m
    WHERE
      m.organization_id = organization_batches.organization_id
      AND m.user_id = (
        SELECT
          auth.uid ())
          AND m.status = 'active'));

-- Peserta boleh membaca baris partisipasinya SENDIRI; anggota instansi boleh
-- membaca seluruh peserta instansinya.
DROP POLICY IF EXISTS organization_participants_member_read ON public.organization_participants;

CREATE POLICY organization_participants_member_read ON public.organization_participants
  FOR SELECT TO authenticated
  USING (user_id = (
    SELECT
      auth.uid ())
      OR EXISTS (
        SELECT
          1
        FROM
          public.organization_members m
        WHERE
          m.organization_id = organization_participants.organization_id
          AND m.user_id = (
            SELECT
              auth.uid ())
              AND m.status = 'active'));

DROP POLICY IF EXISTS organization_exam_templates_member_read ON public.organization_exam_templates;

CREATE POLICY organization_exam_templates_member_read ON public.organization_exam_templates
  FOR SELECT TO authenticated
  USING (organization_id IS NULL
    OR EXISTS (
      SELECT
        1
      FROM
        public.organization_members m
      WHERE
        m.organization_id = organization_exam_templates.organization_id
        AND m.user_id = (
          SELECT
            auth.uid ())
            AND m.status = 'active'));

-- -----------------------------------------------------------------------------
-- 8. ACL: SELECT untuk `authenticated`, penuh hanya untuk `service_role`.
--    INSERT/UPDATE/DELETE sengaja TIDAK diberikan ke `authenticated`.
-- -----------------------------------------------------------------------------
REVOKE ALL ON public.organization_batches FROM anon;

REVOKE ALL ON public.organization_participants FROM anon;

REVOKE ALL ON public.organization_exam_templates FROM anon;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.organization_batches FROM authenticated;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.organization_participants FROM authenticated;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.organization_exam_templates FROM authenticated;

GRANT SELECT ON public.organization_batches TO authenticated;

GRANT SELECT ON public.organization_participants TO authenticated;

GRANT SELECT ON public.organization_exam_templates TO authenticated;

GRANT ALL ON public.organization_batches TO service_role;

GRANT ALL ON public.organization_participants TO service_role;

GRANT ALL ON public.organization_exam_templates TO service_role;

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
ALTER TABLE public.organization_batches
  ALTER COLUMN invite_token SET DEFAULT encode(extensions.gen_random_bytes(16), 'hex');
