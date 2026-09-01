-- Staging-only canonical Event / Tryout Akbar QA seed.
-- Requires the existing Schema V2 CPNS QA bank and dirga@siaptempur.id staging account.

do $$
declare
    v_program uuid;
    v_track uuid;
    v_event_type uuid;
    v_user uuid;
    v_exam uuid;
    v_source_exam uuid;
    v_event uuid;
    v_start timestamptz := now() - interval '10 minutes';
    v_end timestamptz := now() + interval '6 hours';
begin
    if to_regclass('public.test_sessions') is not null then
        raise exception 'Refusing Schema V2 Event QA seed: legacy test_sessions exists';
    end if;

    select id into v_program from public.programs where code='CPNS';
    select id into v_track from public.tracks where program_id=v_program and code='SKD';
    select id into v_event_type from public.exam_types where code='EVENT';
    select id into v_user from auth.users where email='dirga@siaptempur.id' limit 1;
    select id into v_source_exam from public.exams where slug='qa-cpns-full-skd' limit 1;

    if v_program is null or v_track is null or v_event_type is null or v_user is null or v_source_exam is null then
        raise exception 'QA_EVENT_SEED_DEPENDENCY_MISSING';
    end if;

    insert into public.exams (
        program_id, track_id, exam_type_id, title, slug, description,
        duration_seconds, attempt_limit, question_order, result_visibility,
        access_type, status, starts_at, ends_at, created_by,
        required_feature_id, token_cost
    ) values (
        v_program, v_track, v_event_type,
        '[QA] Tryout Akbar Schema V2', 'qa-event-tryout-akbar-schema-v2',
        'QA event canonical Schema V2 - staging only',
        6000, 1, 'random', 'instant', 'FREE', 'active',
        v_start, v_end, v_user, null, 0
    )
    on conflict (slug) do update set
        title=excluded.title,
        description=excluded.description,
        duration_seconds=excluded.duration_seconds,
        attempt_limit=excluded.attempt_limit,
        question_order=excluded.question_order,
        result_visibility=excluded.result_visibility,
        access_type=excluded.access_type,
        status=excluded.status,
        starts_at=excluded.starts_at,
        ends_at=excluded.ends_at,
        required_feature_id=null,
        token_cost=0,
        updated_at=now()
    returning id into v_exam;

    if not exists (select 1 from public.exam_sections where exam_id=v_exam) then
        insert into public.exam_sections (exam_id, subject_id, title, question_count, sort_order, config)
        select v_exam, subject_id, title, question_count, sort_order, config
        from public.exam_sections
        where exam_id=v_source_exam
        order by sort_order;
    end if;

    insert into public.events (
        code,title,slug,event_type,program_id,track_id,description,
        registration_start,registration_end,starts_at,ends_at,status
    ) values (
        'QA-AKBAR-V2','[QA] Tryout Akbar Schema V2','qa-tryout-akbar-schema-v2','tryout_akbar',
        v_program,v_track,'Event QA gratis untuk validasi lifecycle Schema V2.',
        now()-interval '1 hour',now()+interval '4 hours',v_start,v_end,'live'
    )
    on conflict (code) do update set
        title=excluded.title,
        description=excluded.description,
        registration_start=excluded.registration_start,
        registration_end=excluded.registration_end,
        starts_at=excluded.starts_at,
        ends_at=excluded.ends_at,
        status='live'
    returning id into v_event;

    if exists (select 1 from public.event_sessions where event_id=v_event) then
        update public.event_sessions
           set exam_id=v_exam,
               name='Sesi QA Utama',
               starts_at=v_start,
               ends_at=v_end,
               capacity=500,
               status='live'
         where event_id=v_event;
    else
        insert into public.event_sessions (event_id,exam_id,name,starts_at,ends_at,capacity,status)
        values (v_event,v_exam,'Sesi QA Utama',v_start,v_end,500,'live');
    end if;
end $$;
