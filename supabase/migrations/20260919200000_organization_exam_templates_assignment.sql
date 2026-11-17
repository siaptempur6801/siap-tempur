-- =============================================================================
-- MVP CPNS Instansi Managed Service — Fase 5: template ujian & assignment
--
-- Sumber: PRD §7.3 (template ujian), §7.4 (assignment ujian),
--         §6.4 (pelaksanaan ujian), §14 langkah 6.
--
-- KEPUTUSAN DESAIN (ditetapkan di Fase 1, dijalankan di sini)
--   `organization_exam_assignments.exam_id` TETAP NOT NULL. Template TIDAK
--   membuat mesin ujian paralel; ia MENGHASILKAN satu baris `exams` + section +
--   item soal, lalu assignment menunjuk ke exam itu. Dengan begitu mesin ujian,
--   penilaian, dan pembahasan yang sudah ada dipakai ulang, dan yang dipisahkan
--   hanya DATANYA (§7.6: ranking instansi tidak bercampur leaderboard nasional).
--
-- KENAPA KOMPOSISI MELAPORKAN KEKURANGAN, BUKAN GAGAL SEPIHAK
--   Produksi saat ini hanya punya 30 soal TWK terbit dan NOL soal TIU maupun TKP,
--   sehingga satu set Full Tryout (30 TWK + 35 TIU + 45 TKP) TIDAK DAPAT dibentuk.
--   Kalau fungsinya sekadar melempar galat, admin hanya tahu "gagal" tanpa tahu
--   APA yang kurang dan BERAPA banyak. Jadi kekurangan dikembalikan sebagai data
--   terstruktur per subjek, dan halaman menampilkannya sebagai daftar kerja.
--
-- CONSTRAINT YANG MENENTUKAN BENTUK FUNGSI
--   `exam_question_items` unik pada (exam_id, position) — jadi `position` harus
--   berurutan GLOBAL lintas section (1..110), bukan 1..30 per section.
--   `exams.slug` unik — slug selalu diberi sufiks acak pendek.
--
-- RANDOMISASI OPSI TIDAK DITERAPKAN
--   `organization_exam_templates.randomize_options` disimpan, tetapi mesin ujian
--   TIDAK mengacak urutan opsi: `tests/unit/option-ordering-source.test.ts`
--   mengunci keputusan itu secara eksplisit. Kolomnya dipertahankan karena PRD
--   §7.3 memintanya, dan halaman menandainya "belum diterapkan" supaya admin
--   tidak mengira fiturnya bekerja.
-- =============================================================================
-- -----------------------------------------------------------------------------
-- 1. Daftar template beserta KELAYAKAN komposisinya.
--    Permission: organization.manage.
--
--    Kelayakan dihitung dari jumlah soal TERBIT per subjek, sehingga admin tahu
--    sebelum menekan tombol apakah template ini bisa diwujudkan.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_list_org_templates (p_organization_id uuid DEFAULT NULL)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
DECLARE
  v_actor uuid := auth.uid ();
  v_track uuid;
  v_twk integer;
  v_tiu integer;
  v_tkp integer;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT app_private.current_user_has_permission ('organization.manage') THEN
    RAISE EXCEPTION 'Organization manage permission required';
  END IF;

  SELECT
    t.id
  INTO
    v_track
  FROM
    public.tracks t
    JOIN public.programs p ON p.id = t.program_id
  WHERE
    p.code = 'CPNS'
    AND t.code = 'SKD';

  SELECT
    count(*)
  INTO
    v_twk
  FROM
    public.questions q
    JOIN public.subjects s ON s.id = q.subject_id
  WHERE
    s.track_id = v_track
    AND s.code = 'TWK'
    AND q.status = 'published';
  SELECT
    count(*)
  INTO
    v_tiu
  FROM
    public.questions q
    JOIN public.subjects s ON s.id = q.subject_id
  WHERE
    s.track_id = v_track
    AND s.code = 'TIU'
    AND q.status = 'published';
  SELECT
    count(*)
  INTO
    v_tkp
  FROM
    public.questions q
    JOIN public.subjects s ON s.id = q.subject_id
  WHERE
    s.track_id = v_track
    AND s.code = 'TKP'
    AND q.status = 'published';

  RETURN jsonb_build_object('available', jsonb_build_object('TWK', v_twk, 'TIU', v_tiu, 'TKP', v_tkp), 'templates', coalesce((
      SELECT
        jsonb_agg(jsonb_build_object('id', t.id, 'organization_id', t.organization_id, 'name', t.name, 'twk_count', t.twk_count, 'tiu_count', t.tiu_count, 'tkp_count', t.tkp_count, 'duration_seconds', t.duration_seconds, 'max_attempts', t.max_attempts, 'randomize_questions', t.randomize_questions, 'randomize_options', t.randomize_options, 'show_explanation', t.show_explanation, 'ranking_visibility', t.ranking_visibility, 'status', t.status, 'ruleset', t.ruleset, 'created_at', t.created_at)
      ORDER BY t.name)
      FROM public.organization_exam_templates t
      WHERE
        p_organization_id IS NULL
        OR t.organization_id IS NULL
        OR t.organization_id = p_organization_id), '[]'::jsonb));
END;
$function$;

-- -----------------------------------------------------------------------------
-- 2. Kekurangan soal untuk sebuah template. Permission: organization.manage.
--    Dikembalikan sebagai daftar supaya halaman dapat menampilkannya sebagai
--    daftar kerja, bukan sekadar pesan gagal.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_template_shortages (p_template_id uuid)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
DECLARE
  v_actor uuid := auth.uid ();
  v_t public.organization_exam_templates%rowtype;
  v_track uuid;
  v_short jsonb := '[]'::jsonb;
  v_spec record;
  v_available integer;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT app_private.current_user_has_permission ('organization.manage') THEN
    RAISE EXCEPTION 'Organization manage permission required';
  END IF;

  SELECT
    *
  INTO
    v_t
  FROM
    public.organization_exam_templates
  WHERE
    id = p_template_id;
  IF NOT found THEN
    RAISE EXCEPTION 'Template not found';
  END IF;

  SELECT
    t.id
  INTO
    v_track
  FROM
    public.tracks t
    JOIN public.programs p ON p.id = t.program_id
  WHERE
    p.code = 'CPNS'
    AND t.code = 'SKD';

  FOR v_spec IN
  SELECT
    *
  FROM (
    VALUES ('TWK', v_t.twk_count),
      ('TIU', v_t.tiu_count),
      ('TKP', v_t.tkp_count)) AS spec (code, required)
    LOOP
      SELECT
        count(*)
INTO
  v_available
FROM
  public.questions q
  JOIN public.subjects s ON s.id = q.subject_id
WHERE
  s.track_id = v_track
  AND s.code = v_spec.code
  AND q.status = 'published';

    IF v_available < v_spec.required THEN
      v_short := v_short || jsonb_build_object('subject', v_spec.code, 'required', v_spec.required, 'available', v_available, 'missing', v_spec.required - v_available);
    END IF;
  END LOOP;

  RETURN jsonb_build_object('template_id', p_template_id, 'composable', jsonb_array_length(v_short) = 0, 'shortages', v_short);
END;
$function$;

-- -----------------------------------------------------------------------------
-- 3. Buat / ubah template. Permission: organization.manage.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_upsert_org_template (p_id uuid, p_organization_id uuid, p_name text, p_twk_count integer, p_tiu_count integer, p_tkp_count integer, p_duration_seconds integer, p_max_attempts integer, p_randomize_questions boolean, p_randomize_options boolean, p_show_explanation text, p_ranking_visibility text, p_status text)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
DECLARE
  v_actor uuid := auth.uid ();
  v_name text := btrim(coalesce(p_name, ''));
  v_id uuid := p_id;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT app_private.current_user_has_permission ('organization.manage') THEN
    RAISE EXCEPTION 'Organization manage permission required';
  END IF;

  IF length(v_name) < 2 THEN
    RAISE EXCEPTION 'Template name is required';
  END IF;

  IF p_organization_id IS NOT NULL AND NOT EXISTS (
    SELECT
      1
    FROM
      public.organizations
    WHERE
      id = p_organization_id) THEN
    RAISE EXCEPTION 'Organization not found';
  END IF;
  -- Batas atas menjaga agar salah ketik (mis. 450 bukan 45) tidak menghasilkan
  -- exam raksasa yang mustahil dipenuhi.
  IF coalesce(p_twk_count, 0) < 0 OR coalesce(p_tiu_count, 0) < 0 OR coalesce(p_tkp_count, 0) < 0 OR coalesce(p_twk_count, 0) > 200 OR coalesce(p_tiu_count, 0) > 200 OR coalesce(p_tkp_count, 0) > 200 THEN
    RAISE EXCEPTION 'Question counts must be between 0 and 200 per subject';
  END IF;

  IF coalesce(p_twk_count, 0) + coalesce(p_tiu_count, 0) + coalesce(p_tkp_count, 0) = 0 THEN
    RAISE EXCEPTION 'A template must contain at least one question';
  END IF;

  IF coalesce(p_duration_seconds, 0) <= 0 THEN
    RAISE EXCEPTION 'Duration must be greater than zero';
  END IF;

  IF coalesce(p_max_attempts, 1) < 1 THEN
    RAISE EXCEPTION 'Max attempts must be at least 1';
  END IF;

  IF coalesce(p_show_explanation, 'after_exam')
    NOT IN ('never', 'after_exam', 'after_close') THEN
    RAISE EXCEPTION 'Unknown explanation setting';
  END IF;

  IF coalesce(p_ranking_visibility, 'internal')
    NOT IN ('hidden', 'internal', 'public') THEN
    RAISE EXCEPTION 'Unknown ranking visibility';
  END IF;

  IF coalesce(p_status, 'draft')
    NOT IN ('draft', 'active', 'archived') THEN
    RAISE EXCEPTION 'Unknown template status';
  END IF;

  IF v_id IS NULL THEN
    INSERT INTO public.organization_exam_templates (organization_id, name, twk_count, tiu_count, tkp_count, duration_seconds, max_attempts, randomize_questions, randomize_options, show_explanation, ranking_visibility, status, created_by)
      VALUES (p_organization_id, v_name, p_twk_count, p_tiu_count, p_tkp_count, p_duration_seconds, coalesce(p_max_attempts, 1), coalesce(p_randomize_questions, TRUE), coalesce(p_randomize_options, FALSE), coalesce(p_show_explanation, 'after_exam'), coalesce(p_ranking_visibility, 'internal'), coalesce(p_status, 'draft'), v_actor)
    RETURNING
      id
    INTO
      v_id;
  ELSE
    IF NOT EXISTS (
      SELECT
        1
      FROM
        public.organization_exam_templates
      WHERE
        id = v_id) THEN
    RAISE EXCEPTION 'Template not found';
  END IF;

  UPDATE
    public.organization_exam_templates
  SET
    organization_id = p_organization_id,
    name = v_name,
    twk_count = p_twk_count,
    tiu_count = p_tiu_count,
    tkp_count = p_tkp_count,
    duration_seconds = p_duration_seconds,
    max_attempts = coalesce(p_max_attempts, 1),
    randomize_questions = coalesce(p_randomize_questions, TRUE),
    randomize_options = coalesce(p_randomize_options, FALSE),
    show_explanation = coalesce(p_show_explanation, 'after_exam'),
    ranking_visibility = coalesce(p_ranking_visibility, 'internal'),
    status = coalesce(p_status, 'draft'),
    updated_at = now()
  WHERE
    id = v_id;
END IF;

  RETURN jsonb_build_object('id', v_id, 'name', v_name);
END;
$function$;

-- -----------------------------------------------------------------------------
-- 4. Wujudkan template menjadi exam nyata. Permission: organization.manage.
--
--    Mengembalikan `composed: false` beserta daftar kekurangan bila soal terbit
--    belum cukup — BUKAN melempar galat — supaya halaman dapat menampilkan apa
--    yang perlu dilengkapi.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_compose_exam_from_template (p_template_id uuid, p_title text DEFAULT NULL, p_status text DEFAULT 'draft')
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
DECLARE
  v_actor uuid := auth.uid ();
  v_t public.organization_exam_templates%rowtype;
  v_track uuid;
  v_program uuid;
  v_type uuid;
  v_short jsonb;
  v_total integer;
  v_exam uuid;
  v_slug text;
  v_title text;
  v_spec record;
  v_subject uuid;
  v_section uuid;
  v_position integer := 0;
  v_section_duration integer;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT app_private.current_user_has_permission ('organization.manage') THEN
    RAISE EXCEPTION 'Organization manage permission required';
  END IF;

  IF coalesce(p_status, 'draft')
    NOT IN ('draft', 'active', 'archived') THEN
    RAISE EXCEPTION 'Unknown exam status';
  END IF;

  SELECT
    *
  INTO
    v_t
  FROM
    public.organization_exam_templates
  WHERE
    id = p_template_id;
  IF NOT found THEN
    RAISE EXCEPTION 'Template not found';
  END IF;
  -- Kelayakan diperiksa lebih dulu; hasilnya dikembalikan, bukan dilempar.
  v_short := public.admin_template_shortages (p_template_id);
  IF NOT (v_short ->> 'composable')::boolean THEN
    RETURN jsonb_build_object('composed', FALSE, 'template_id', p_template_id, 'shortages', v_short -> 'shortages');
  END IF;

  SELECT
    t.id,
    t.program_id
  INTO
    v_track,
    v_program
  FROM
    public.tracks t
    JOIN public.programs p ON p.id = t.program_id
  WHERE
    p.code = 'CPNS'
    AND t.code = 'SKD';

  SELECT
    id
  INTO
    v_type
  FROM
    public.exam_types
  WHERE
    code = 'FULL_TRYOUT';

  v_total := v_t.twk_count + v_t.tiu_count + v_t.tkp_count;
  v_title := coalesce(nullif (btrim(coalesce(p_title, '')), ''), v_t.name);
  -- `exams.slug` unik; sufiks acak pendek menghindari tabrakan tanpa perlu
  -- menebak slug mana yang sudah dipakai.
  v_slug := lower(regexp_replace(v_title, '[^a-zA-Z0-9]+', '-', 'g'));
  v_slug := trim(BOTH '-' FROM v_slug);
  v_slug :=
  LEFT (coalesce(nullif (v_slug, ''), 'ujian-instansi'),
    60) || '-' || encode(extensions.gen_random_bytes(4), 'hex');

  INSERT INTO public.exams (program_id, track_id, exam_type_id, title, slug, description, duration_seconds, attempt_limit, question_order, result_visibility, access_type, status, created_by)
    VALUES (v_program, v_track, v_type, v_title, v_slug, 'Dibentuk dari template ' || v_t.name, v_t.duration_seconds, v_t.max_attempts, CASE WHEN v_t.randomize_questions THEN
        'section_random'
      ELSE
        'fixed'
      END, 'instant',
      -- Nilai yang SUDAH dipakai sistem, bukan nilai baru yang tidak dikenal
      -- kode mana pun: `exam-access-policy.ts` hanya mengkhususkan FREEMIUM,
      -- dan `result_visibility` hanya pernah bernilai 'instant' di seluruh
      -- database. Peserta instansi tidak membayar per ujian, jadi FREE dengan
      -- token_cost 0 adalah padanan yang tepat.
      'FREE', coalesce(p_status, 'draft'), v_actor)
  RETURNING
    id
  INTO
    v_exam;
  -- `position` harus unik GLOBAL per exam (constraint exam_question_items),
  -- jadi penghitungnya berlanjut lintas section.
  FOR v_spec IN
  SELECT
    *
  FROM (
    VALUES ('TWK', v_t.twk_count, 1),
      ('TIU', v_t.tiu_count, 2),
      ('TKP', v_t.tkp_count, 3)) AS spec (code, required, sort_order)
    LOOP
      CONTINUE
      WHEN v_spec.required = 0;

    SELECT
      s.id
    INTO
      v_subject
    FROM
      public.subjects s
    WHERE
      s.track_id = v_track
      AND s.code = v_spec.code;
    -- Durasi dibagi proporsional terhadap jumlah soal supaya totalnya tetap
    -- sama dengan durasi template.
    v_section_duration := greatest (1, round(v_t.duration_seconds::numeric * v_spec.required / v_total));

    INSERT INTO public.exam_sections (exam_id, subject_id, title, sort_order, question_count, duration_seconds)
      VALUES (v_exam, v_subject, v_spec.code, v_spec.sort_order, v_spec.required, v_section_duration)
    RETURNING
      id
    INTO
      v_section;
    -- `candidates` di-MATERIALIZED secara eksplisit: `random()` adalah fungsi
    -- VOLATILE, dan tanpa materialisasi ia dapat dievaluasi ulang saat
    -- penomoran sehingga urutan yang dipilih berbeda dari urutan yang
    -- dinomori. Postgres boleh meng-inline CTE biasa, jadi kata kunci
    -- `materialized` di sini bukan hiasan.
    WITH candidates AS MATERIALIZED (
      SELECT
        q.id,
        q.version,
        q.question_code,
        CASE WHEN v_t.randomize_questions THEN
          random(
)
        ELSE
          0
        END AS sort_key
      FROM
        public.questions q
      WHERE
        q.subject_id = v_subject
        AND q.status = 'published'
),
    picked AS (
      SELECT
        id,
        version,
        row_number() OVER (ORDER BY sort_key,
          question_code) AS rn
    FROM
      candidates)
  INSERT INTO public.exam_question_items (exam_id, section_id, question_id, question_version, position)
  SELECT
    v_exam,
    v_section,
    picked.id,
    picked.version,
    v_position + picked.rn
  FROM
    picked
  ORDER BY
    picked.rn
  LIMIT v_spec.required;

    v_position := v_position + v_spec.required;
  END LOOP;

  RETURN jsonb_build_object('composed', TRUE, 'template_id', p_template_id, 'exam_id', v_exam, 'slug', v_slug, 'title', v_title, 'total_questions', v_total, 'shortages', '[]'::jsonb);
END;
$function$;

-- -----------------------------------------------------------------------------
-- 5. Daftar assignment sebuah batch. Permission: organization.manage.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_list_assignments (p_batch_id uuid)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
DECLARE
  v_actor uuid := auth.uid ();
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT app_private.current_user_has_permission ('organization.manage') THEN
    RAISE EXCEPTION 'Organization manage permission required';
  END IF;

  RETURN jsonb_build_object('assignments', coalesce((
      SELECT
        jsonb_agg(jsonb_build_object('id', a.id, 'batch_id', a.batch_id, 'exam_id', a.exam_id, 'template_id', a.template_id, 'is_active', a.is_active, 'starts_at', a.starts_at, 'due_at', a.due_at, 'notes', a.notes, 'exam_title', e.title, 'exam_status', e.status, 'question_count', (
              SELECT
                count(*)
            FROM public.exam_question_items i
            WHERE
              i.exam_id = a.exam_id), 'attempt_count', (
            SELECT
              count(*)
            FROM public.exam_attempts at
          WHERE
            at.assignment_id = a.id
            AND at.source = 'organization'))
      ORDER BY a.created_at DESC)
      FROM public.organization_exam_assignments a
    LEFT JOIN public.exams e ON e.id = a.exam_id
  WHERE
    p_batch_id IS NULL
    OR a.batch_id = p_batch_id), '[]'::jsonb));
END;
$function$;

-- -----------------------------------------------------------------------------
-- 6. Buat / ubah assignment. Permission: organization.manage.
--    PENJAGA: exam yang belum punya satu pun soal tidak boleh di-assign —
--    peserta akan membuka ujian kosong.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_upsert_assignment (p_id uuid, p_batch_id uuid, p_exam_id uuid, p_template_id uuid, p_starts_at timestamptz, p_due_at timestamptz, p_is_active boolean, p_notes text)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
DECLARE
  v_actor uuid := auth.uid ();
  v_org uuid;
  v_items integer;
  v_id uuid := p_id;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT app_private.current_user_has_permission ('organization.manage') THEN
    RAISE EXCEPTION 'Organization manage permission required';
  END IF;

  SELECT
    organization_id
  INTO
    v_org
  FROM
    public.organization_batches
  WHERE
    id = p_batch_id;
  IF v_org IS NULL THEN
    RAISE EXCEPTION 'Batch not found';
  END IF;

  IF NOT EXISTS (
    SELECT
      1
    FROM
      public.exams
    WHERE
      id = p_exam_id) THEN
  RAISE EXCEPTION 'Exam not found';
END IF;

  IF p_starts_at IS NOT NULL AND p_due_at IS NOT NULL AND p_due_at < p_starts_at THEN
    RAISE EXCEPTION 'Assignment due must not be before its start';
  END IF;

  SELECT
    count(*)
  INTO
    v_items
  FROM
    public.exam_question_items
  WHERE
    exam_id = p_exam_id;
  IF v_items = 0 THEN
    RAISE EXCEPTION 'Cannot assign an exam that has no questions';
  END IF;

  IF v_id IS NULL THEN
    INSERT INTO public.organization_exam_assignments (organization_id, batch_id, exam_id, template_id, assigned_by, starts_at, due_at, is_active, notes)
      VALUES (v_org, p_batch_id, p_exam_id, p_template_id, v_actor, p_starts_at, p_due_at, coalesce(p_is_active, TRUE), nullif (btrim(coalesce(p_notes, '')), ''))
        RETURNING
          id
        INTO
          v_id;
  ELSE
    IF NOT EXISTS (
      SELECT
        1
      FROM
        public.organization_exam_assignments
      WHERE
        id = v_id) THEN
    RAISE EXCEPTION 'Assignment not found';
  END IF;

  UPDATE
    public.organization_exam_assignments
  SET
    batch_id = p_batch_id,
    exam_id = p_exam_id,
    template_id = p_template_id,
    starts_at = p_starts_at,
    due_at = p_due_at,
    is_active = coalesce(p_is_active, TRUE),
    notes = nullif (btrim(coalesce(p_notes, '')), '')
        WHERE
          id = v_id;
END IF;

  RETURN jsonb_build_object('id', v_id, 'batch_id', p_batch_id, 'exam_id', p_exam_id);
END;
$function$;

-- -----------------------------------------------------------------------------
-- ACL.
-- -----------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.admin_list_org_templates (uuid) FROM public, anon;

REVOKE ALL ON FUNCTION public.admin_template_shortages (uuid) FROM public, anon;

REVOKE ALL ON FUNCTION public.admin_upsert_org_template (uuid, uuid, text, integer, integer, integer, integer, integer, boolean, boolean, text, text, text) FROM public, anon;

REVOKE ALL ON FUNCTION public.admin_compose_exam_from_template (uuid, text, text) FROM public, anon;

REVOKE ALL ON FUNCTION public.admin_list_assignments (uuid) FROM public, anon;

REVOKE ALL ON FUNCTION public.admin_upsert_assignment (uuid, uuid, uuid, uuid, timestamptz, timestamptz, boolean, text) FROM public, anon;

GRANT EXECUTE ON FUNCTION public.admin_list_org_templates (uuid) TO authenticated;

GRANT EXECUTE ON FUNCTION public.admin_template_shortages (uuid) TO authenticated;

GRANT EXECUTE ON FUNCTION public.admin_upsert_org_template (uuid, uuid, text, integer, integer, integer, integer, integer, boolean, boolean, text, text, text) TO authenticated;

GRANT EXECUTE ON FUNCTION public.admin_compose_exam_from_template (uuid, text, text) TO authenticated;

GRANT EXECUTE ON FUNCTION public.admin_list_assignments (uuid) TO authenticated;

GRANT EXECUTE ON FUNCTION public.admin_upsert_assignment (uuid, uuid, uuid, uuid, timestamptz, timestamptz, boolean, text) TO authenticated;
