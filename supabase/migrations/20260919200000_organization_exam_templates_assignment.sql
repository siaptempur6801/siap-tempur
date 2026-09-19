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
create or replace function public.admin_list_org_templates(p_organization_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
    v_actor uuid := auth.uid();
    v_track uuid;
    v_twk integer; v_tiu integer; v_tkp integer;
begin
    if v_actor is null then
        raise exception 'Authentication required';
    end if;

    if not app_private.current_user_has_permission('organization.manage') then
        raise exception 'Organization manage permission required';
    end if;

    select t.id into v_track
      from public.tracks t join public.programs p on p.id = t.program_id
     where p.code = 'CPNS' and t.code = 'SKD';

    select count(*) into v_twk from public.questions q join public.subjects s on s.id = q.subject_id
     where s.track_id = v_track and s.code = 'TWK' and q.status = 'published';
    select count(*) into v_tiu from public.questions q join public.subjects s on s.id = q.subject_id
     where s.track_id = v_track and s.code = 'TIU' and q.status = 'published';
    select count(*) into v_tkp from public.questions q join public.subjects s on s.id = q.subject_id
     where s.track_id = v_track and s.code = 'TKP' and q.status = 'published';

    return jsonb_build_object(
        'available', jsonb_build_object('TWK', v_twk, 'TIU', v_tiu, 'TKP', v_tkp),
        'templates', coalesce((
            select jsonb_agg(jsonb_build_object(
                'id', t.id,
                'organization_id', t.organization_id,
                'name', t.name,
                'twk_count', t.twk_count,
                'tiu_count', t.tiu_count,
                'tkp_count', t.tkp_count,
                'duration_seconds', t.duration_seconds,
                'max_attempts', t.max_attempts,
                'randomize_questions', t.randomize_questions,
                'randomize_options', t.randomize_options,
                'show_explanation', t.show_explanation,
                'ranking_visibility', t.ranking_visibility,
                'status', t.status,
                'ruleset', t.ruleset,
                'created_at', t.created_at
            ) order by t.name)
              from public.organization_exam_templates t
             where p_organization_id is null
                or t.organization_id is null
                or t.organization_id = p_organization_id
        ), '[]'::jsonb)
    );
end;
$function$;

-- -----------------------------------------------------------------------------
-- 2. Kekurangan soal untuk sebuah template. Permission: organization.manage.
--    Dikembalikan sebagai daftar supaya halaman dapat menampilkannya sebagai
--    daftar kerja, bukan sekadar pesan gagal.
-- -----------------------------------------------------------------------------
create or replace function public.admin_template_shortages(p_template_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
    v_actor uuid := auth.uid();
    v_t public.organization_exam_templates%rowtype;
    v_track uuid;
    v_short jsonb := '[]'::jsonb;
    v_spec record;
    v_available integer;
begin
    if v_actor is null then
        raise exception 'Authentication required';
    end if;

    if not app_private.current_user_has_permission('organization.manage') then
        raise exception 'Organization manage permission required';
    end if;

    select * into v_t from public.organization_exam_templates where id = p_template_id;
    if not found then
        raise exception 'Template not found';
    end if;

    select t.id into v_track
      from public.tracks t join public.programs p on p.id = t.program_id
     where p.code = 'CPNS' and t.code = 'SKD';

    for v_spec in
        select * from (values ('TWK', v_t.twk_count), ('TIU', v_t.tiu_count), ('TKP', v_t.tkp_count))
          as spec(code, required)
    loop
        select count(*) into v_available
          from public.questions q join public.subjects s on s.id = q.subject_id
         where s.track_id = v_track and s.code = v_spec.code and q.status = 'published';

        if v_available < v_spec.required then
            v_short := v_short || jsonb_build_object(
                'subject', v_spec.code,
                'required', v_spec.required,
                'available', v_available,
                'missing', v_spec.required - v_available
            );
        end if;
    end loop;

    return jsonb_build_object(
        'template_id', p_template_id,
        'composable', jsonb_array_length(v_short) = 0,
        'shortages', v_short
    );
end;
$function$;

-- -----------------------------------------------------------------------------
-- 3. Buat / ubah template. Permission: organization.manage.
-- -----------------------------------------------------------------------------
create or replace function public.admin_upsert_org_template(
    p_id                  uuid,
    p_organization_id     uuid,
    p_name                text,
    p_twk_count           integer,
    p_tiu_count           integer,
    p_tkp_count           integer,
    p_duration_seconds    integer,
    p_max_attempts        integer,
    p_randomize_questions boolean,
    p_randomize_options   boolean,
    p_show_explanation    text,
    p_ranking_visibility  text,
    p_status              text
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
    v_actor uuid := auth.uid();
    v_name  text := btrim(coalesce(p_name, ''));
    v_id    uuid := p_id;
begin
    if v_actor is null then
        raise exception 'Authentication required';
    end if;

    if not app_private.current_user_has_permission('organization.manage') then
        raise exception 'Organization manage permission required';
    end if;

    if length(v_name) < 2 then
        raise exception 'Template name is required';
    end if;

    if p_organization_id is not null
       and not exists (select 1 from public.organizations where id = p_organization_id) then
        raise exception 'Organization not found';
    end if;

    -- Batas atas menjaga agar salah ketik (mis. 450 bukan 45) tidak menghasilkan
    -- exam raksasa yang mustahil dipenuhi.
    if coalesce(p_twk_count, 0) < 0 or coalesce(p_tiu_count, 0) < 0 or coalesce(p_tkp_count, 0) < 0
       or coalesce(p_twk_count, 0) > 200 or coalesce(p_tiu_count, 0) > 200 or coalesce(p_tkp_count, 0) > 200 then
        raise exception 'Question counts must be between 0 and 200 per subject';
    end if;

    if coalesce(p_twk_count, 0) + coalesce(p_tiu_count, 0) + coalesce(p_tkp_count, 0) = 0 then
        raise exception 'A template must contain at least one question';
    end if;

    if coalesce(p_duration_seconds, 0) <= 0 then
        raise exception 'Duration must be greater than zero';
    end if;

    if coalesce(p_max_attempts, 1) < 1 then
        raise exception 'Max attempts must be at least 1';
    end if;

    if coalesce(p_show_explanation, 'after_exam') not in ('never', 'after_exam', 'after_close') then
        raise exception 'Unknown explanation setting';
    end if;

    if coalesce(p_ranking_visibility, 'internal') not in ('hidden', 'internal', 'public') then
        raise exception 'Unknown ranking visibility';
    end if;

    if coalesce(p_status, 'draft') not in ('draft', 'active', 'archived') then
        raise exception 'Unknown template status';
    end if;

    if v_id is null then
        insert into public.organization_exam_templates (
            organization_id, name, twk_count, tiu_count, tkp_count, duration_seconds,
            max_attempts, randomize_questions, randomize_options, show_explanation,
            ranking_visibility, status, created_by
        ) values (
            p_organization_id, v_name, p_twk_count, p_tiu_count, p_tkp_count, p_duration_seconds,
            coalesce(p_max_attempts, 1), coalesce(p_randomize_questions, true),
            coalesce(p_randomize_options, false), coalesce(p_show_explanation, 'after_exam'),
            coalesce(p_ranking_visibility, 'internal'), coalesce(p_status, 'draft'), v_actor
        ) returning id into v_id;
    else
        if not exists (select 1 from public.organization_exam_templates where id = v_id) then
            raise exception 'Template not found';
        end if;

        update public.organization_exam_templates
           set organization_id = p_organization_id,
               name = v_name,
               twk_count = p_twk_count,
               tiu_count = p_tiu_count,
               tkp_count = p_tkp_count,
               duration_seconds = p_duration_seconds,
               max_attempts = coalesce(p_max_attempts, 1),
               randomize_questions = coalesce(p_randomize_questions, true),
               randomize_options = coalesce(p_randomize_options, false),
               show_explanation = coalesce(p_show_explanation, 'after_exam'),
               ranking_visibility = coalesce(p_ranking_visibility, 'internal'),
               status = coalesce(p_status, 'draft'),
               updated_at = now()
         where id = v_id;
    end if;

    return jsonb_build_object('id', v_id, 'name', v_name);
end;
$function$;

-- -----------------------------------------------------------------------------
-- 4. Wujudkan template menjadi exam nyata. Permission: organization.manage.
--
--    Mengembalikan `composed: false` beserta daftar kekurangan bila soal terbit
--    belum cukup — BUKAN melempar galat — supaya halaman dapat menampilkan apa
--    yang perlu dilengkapi.
-- -----------------------------------------------------------------------------
create or replace function public.admin_compose_exam_from_template(
    p_template_id uuid,
    p_title       text default null,
    p_status      text default 'draft'
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
    v_actor   uuid := auth.uid();
    v_t       public.organization_exam_templates%rowtype;
    v_track   uuid;
    v_program uuid;
    v_type    uuid;
    v_short   jsonb;
    v_total   integer;
    v_exam    uuid;
    v_slug    text;
    v_title   text;
    v_spec    record;
    v_subject uuid;
    v_section uuid;
    v_position integer := 0;
    v_section_duration integer;
begin
    if v_actor is null then
        raise exception 'Authentication required';
    end if;

    if not app_private.current_user_has_permission('organization.manage') then
        raise exception 'Organization manage permission required';
    end if;

    if coalesce(p_status, 'draft') not in ('draft', 'active', 'archived') then
        raise exception 'Unknown exam status';
    end if;

    select * into v_t from public.organization_exam_templates where id = p_template_id;
    if not found then
        raise exception 'Template not found';
    end if;

    -- Kelayakan diperiksa lebih dulu; hasilnya dikembalikan, bukan dilempar.
    v_short := public.admin_template_shortages(p_template_id);
    if not (v_short->>'composable')::boolean then
        return jsonb_build_object(
            'composed', false,
            'template_id', p_template_id,
            'shortages', v_short->'shortages'
        );
    end if;

    select t.id, t.program_id into v_track, v_program
      from public.tracks t join public.programs p on p.id = t.program_id
     where p.code = 'CPNS' and t.code = 'SKD';

    select id into v_type from public.exam_types where code = 'FULL_TRYOUT';

    v_total := v_t.twk_count + v_t.tiu_count + v_t.tkp_count;
    v_title := coalesce(nullif(btrim(coalesce(p_title, '')), ''), v_t.name);
    -- `exams.slug` unik; sufiks acak pendek menghindari tabrakan tanpa perlu
    -- menebak slug mana yang sudah dipakai.
    v_slug := lower(regexp_replace(v_title, '[^a-zA-Z0-9]+', '-', 'g'));
    v_slug := trim(both '-' from v_slug);
    v_slug := left(coalesce(nullif(v_slug, ''), 'ujian-instansi'), 60) || '-' || encode(extensions.gen_random_bytes(4), 'hex');

    insert into public.exams (
        program_id, track_id, exam_type_id, title, slug, description,
        duration_seconds, attempt_limit, question_order, result_visibility,
        access_type, status, created_by
    ) values (
        v_program, v_track, v_type, v_title, v_slug,
        'Dibentuk dari template ' || v_t.name,
        v_t.duration_seconds, v_t.max_attempts,
        case when v_t.randomize_questions then 'section_random' else 'fixed' end,
        'instant',
        -- Nilai yang SUDAH dipakai sistem, bukan nilai baru yang tidak dikenal
        -- kode mana pun: `exam-access-policy.ts` hanya mengkhususkan FREEMIUM,
        -- dan `result_visibility` hanya pernah bernilai 'instant' di seluruh
        -- database. Peserta instansi tidak membayar per ujian, jadi FREE dengan
        -- token_cost 0 adalah padanan yang tepat.
        'FREE', coalesce(p_status, 'draft'), v_actor
    ) returning id into v_exam;

    -- `position` harus unik GLOBAL per exam (constraint exam_question_items),
    -- jadi penghitungnya berlanjut lintas section.
    for v_spec in
        select * from (values
            ('TWK', v_t.twk_count, 1),
            ('TIU', v_t.tiu_count, 2),
            ('TKP', v_t.tkp_count, 3)
        ) as spec(code, required, sort_order)
    loop
        continue when v_spec.required = 0;

        select s.id into v_subject from public.subjects s
         where s.track_id = v_track and s.code = v_spec.code;

        -- Durasi dibagi proporsional terhadap jumlah soal supaya totalnya tetap
        -- sama dengan durasi template.
        v_section_duration := greatest(1, round(v_t.duration_seconds::numeric * v_spec.required / v_total));

        insert into public.exam_sections (exam_id, subject_id, title, sort_order, question_count, duration_seconds)
        values (v_exam, v_subject, v_spec.code, v_spec.sort_order, v_spec.required, v_section_duration)
        returning id into v_section;

        -- `candidates` di-MATERIALIZED secara eksplisit: `random()` adalah fungsi
        -- VOLATILE, dan tanpa materialisasi ia dapat dievaluasi ulang saat
        -- penomoran sehingga urutan yang dipilih berbeda dari urutan yang
        -- dinomori. Postgres boleh meng-inline CTE biasa, jadi kata kunci
        -- `materialized` di sini bukan hiasan.
        with candidates as materialized (
            select q.id, q.version, q.question_code,
                   case when v_t.randomize_questions then random() else 0 end as sort_key
              from public.questions q
             where q.subject_id = v_subject and q.status = 'published'
        ), picked as (
            select id, version,
                   row_number() over (order by sort_key, question_code) as rn
              from candidates
        )
        insert into public.exam_question_items (exam_id, section_id, question_id, question_version, position)
        select v_exam, v_section, picked.id, picked.version, v_position + picked.rn
          from picked
         order by picked.rn
         limit v_spec.required;

        v_position := v_position + v_spec.required;
    end loop;

    return jsonb_build_object(
        'composed', true,
        'template_id', p_template_id,
        'exam_id', v_exam,
        'slug', v_slug,
        'title', v_title,
        'total_questions', v_total,
        'shortages', '[]'::jsonb
    );
end;
$function$;

-- -----------------------------------------------------------------------------
-- 5. Daftar assignment sebuah batch. Permission: organization.manage.
-- -----------------------------------------------------------------------------
create or replace function public.admin_list_assignments(p_batch_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
    v_actor uuid := auth.uid();
begin
    if v_actor is null then
        raise exception 'Authentication required';
    end if;

    if not app_private.current_user_has_permission('organization.manage') then
        raise exception 'Organization manage permission required';
    end if;

    return jsonb_build_object(
        'assignments', coalesce((
            select jsonb_agg(jsonb_build_object(
                'id', a.id,
                'batch_id', a.batch_id,
                'exam_id', a.exam_id,
                'template_id', a.template_id,
                'is_active', a.is_active,
                'starts_at', a.starts_at,
                'due_at', a.due_at,
                'notes', a.notes,
                'exam_title', e.title,
                'exam_status', e.status,
                'question_count', (select count(*) from public.exam_question_items i where i.exam_id = a.exam_id),
                'attempt_count', (
                    select count(*) from public.exam_attempts at
                     where at.assignment_id = a.id and at.source = 'organization'
                )
            ) order by a.created_at desc)
              from public.organization_exam_assignments a
              left join public.exams e on e.id = a.exam_id
             where p_batch_id is null or a.batch_id = p_batch_id
        ), '[]'::jsonb)
    );
end;
$function$;

-- -----------------------------------------------------------------------------
-- 6. Buat / ubah assignment. Permission: organization.manage.
--    PENJAGA: exam yang belum punya satu pun soal tidak boleh di-assign —
--    peserta akan membuka ujian kosong.
-- -----------------------------------------------------------------------------
create or replace function public.admin_upsert_assignment(
    p_id         uuid,
    p_batch_id   uuid,
    p_exam_id    uuid,
    p_template_id uuid,
    p_starts_at  timestamptz,
    p_due_at     timestamptz,
    p_is_active  boolean,
    p_notes      text
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
    v_actor uuid := auth.uid();
    v_org   uuid;
    v_items integer;
    v_id    uuid := p_id;
begin
    if v_actor is null then
        raise exception 'Authentication required';
    end if;

    if not app_private.current_user_has_permission('organization.manage') then
        raise exception 'Organization manage permission required';
    end if;

    select organization_id into v_org from public.organization_batches where id = p_batch_id;
    if v_org is null then
        raise exception 'Batch not found';
    end if;

    if not exists (select 1 from public.exams where id = p_exam_id) then
        raise exception 'Exam not found';
    end if;

    if p_starts_at is not null and p_due_at is not null and p_due_at < p_starts_at then
        raise exception 'Assignment due must not be before its start';
    end if;

    select count(*) into v_items from public.exam_question_items where exam_id = p_exam_id;
    if v_items = 0 then
        raise exception 'Cannot assign an exam that has no questions';
    end if;

    if v_id is null then
        insert into public.organization_exam_assignments (
            organization_id, batch_id, exam_id, template_id,
            assigned_by, starts_at, due_at, is_active, notes
        ) values (
            v_org, p_batch_id, p_exam_id, p_template_id,
            v_actor, p_starts_at, p_due_at, coalesce(p_is_active, true),
            nullif(btrim(coalesce(p_notes, '')), '')
        ) returning id into v_id;
    else
        if not exists (select 1 from public.organization_exam_assignments where id = v_id) then
            raise exception 'Assignment not found';
        end if;

        update public.organization_exam_assignments
           set batch_id = p_batch_id,
               exam_id = p_exam_id,
               template_id = p_template_id,
               starts_at = p_starts_at,
               due_at = p_due_at,
               is_active = coalesce(p_is_active, true),
               notes = nullif(btrim(coalesce(p_notes, '')), '')
         where id = v_id;
    end if;

    return jsonb_build_object('id', v_id, 'batch_id', p_batch_id, 'exam_id', p_exam_id);
end;
$function$;

-- -----------------------------------------------------------------------------
-- ACL.
-- -----------------------------------------------------------------------------
revoke all on function public.admin_list_org_templates(uuid) from public, anon;
revoke all on function public.admin_template_shortages(uuid) from public, anon;
revoke all on function public.admin_upsert_org_template(uuid, uuid, text, integer, integer, integer, integer, integer, boolean, boolean, text, text, text) from public, anon;
revoke all on function public.admin_compose_exam_from_template(uuid, text, text) from public, anon;
revoke all on function public.admin_list_assignments(uuid) from public, anon;
revoke all on function public.admin_upsert_assignment(uuid, uuid, uuid, uuid, timestamptz, timestamptz, boolean, text) from public, anon;

grant execute on function public.admin_list_org_templates(uuid) to authenticated;
grant execute on function public.admin_template_shortages(uuid) to authenticated;
grant execute on function public.admin_upsert_org_template(uuid, uuid, text, integer, integer, integer, integer, integer, boolean, boolean, text, text, text) to authenticated;
grant execute on function public.admin_compose_exam_from_template(uuid, text, text) to authenticated;
grant execute on function public.admin_list_assignments(uuid) to authenticated;
grant execute on function public.admin_upsert_assignment(uuid, uuid, uuid, uuid, timestamptz, timestamptz, boolean, text) to authenticated;
