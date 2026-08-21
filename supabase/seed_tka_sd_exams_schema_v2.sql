begin;

with actor as (
    select p.id
    from profiles p
    join user_roles ur on ur.user_id = p.id
    join roles r on r.id = ur.role_id
    where lower(p.status) = 'active'
      and r.code in ('ADMIN', 'SUPER_ADMIN')
    order by p.created_at asc
    limit 1
),
ctx as (
    select p.id as program_id, t.id as track_id
    from programs p
    join tracks t on t.program_id = p.id
    where p.code = 'TKA' and t.code = 'SD'
),
seed(slug,title,exam_type_code,duration_seconds,attempt_limit,question_order,result_visibility,access_type,status,token_cost) as (
    values
        ('tka-sd-full','Tryout Lengkap TKA SD','FULL_TRYOUT',4500,null::integer,'section_random','instant','FREE','draft',0),
        ('tka-sd-full-bahasa-inggris','Tryout Lengkap TKA SD + Bahasa Inggris','FULL_TRYOUT',6300,null::integer,'section_random','instant','FREE','draft',0),
        ('tka-sd-mini-matematika','Mini Tryout Matematika','MINI_TRYOUT',2400,null::integer,'section_random','instant','FREE','draft',0),
        ('tka-sd-mini-bahasa-indonesia','Mini Tryout Bahasa Indonesia','MINI_TRYOUT',2100,null::integer,'section_random','instant','FREE','draft',0),
        ('tka-sd-mini-bahasa-inggris','Mini Tryout Bahasa Inggris','MINI_TRYOUT',2280,null::integer,'section_random','instant','FREE','draft',0)
)
insert into exams (
    program_id,
    track_id,
    exam_type_id,
    title,
    slug,
    duration_seconds,
    attempt_limit,
    question_order,
    result_visibility,
    access_type,
    status,
    token_cost,
    created_by,
    updated_at
)
select
    ctx.program_id,
    ctx.track_id,
    et.id,
    seed.title,
    seed.slug,
    seed.duration_seconds,
    seed.attempt_limit,
    seed.question_order,
    seed.result_visibility,
    seed.access_type,
    seed.status,
    seed.token_cost,
    actor.id,
    now()
from seed
cross join ctx
cross join actor
join exam_types et on et.code = seed.exam_type_code
on conflict (slug) do update set
    program_id = excluded.program_id,
    track_id = excluded.track_id,
    exam_type_id = excluded.exam_type_id,
    title = excluded.title,
    duration_seconds = excluded.duration_seconds,
    attempt_limit = excluded.attempt_limit,
    question_order = excluded.question_order,
    result_visibility = excluded.result_visibility,
    access_type = excluded.access_type,
    status = excluded.status,
    token_cost = excluded.token_cost,
    updated_at = now();

delete from exam_sections
where exam_id in (
    select id
    from exams
    where slug in (
        'tka-sd-full',
        'tka-sd-full-bahasa-inggris',
        'tka-sd-mini-matematika',
        'tka-sd-mini-bahasa-indonesia',
        'tka-sd-mini-bahasa-inggris'
    )
);

with section_seed(exam_slug,subject_code,title,sort_order,question_count,duration_seconds) as (
    values
        ('tka-sd-full','MAT','Matematika',1,25,2400),
        ('tka-sd-full','BIN','Bahasa Indonesia',2,25,2100),
        ('tka-sd-full-bahasa-inggris','MAT','Matematika',1,25,2400),
        ('tka-sd-full-bahasa-inggris','BIN','Bahasa Indonesia',2,25,2100),
        ('tka-sd-full-bahasa-inggris','BIG','Bahasa Inggris',3,20,1800),
        ('tka-sd-mini-matematika','MAT','Matematika',1,25,2400),
        ('tka-sd-mini-bahasa-indonesia','BIN','Bahasa Indonesia',1,25,2100),
        ('tka-sd-mini-bahasa-inggris','BIG','Bahasa Inggris',1,25,2280)
),
ctx as (
    select t.id as track_id
    from programs p
    join tracks t on t.program_id = p.id
    where p.code = 'TKA' and t.code = 'SD'
)
insert into exam_sections (
    exam_id,
    subject_id,
    title,
    sort_order,
    question_count,
    duration_seconds,
    config
)
select
    e.id,
    s.id,
    ss.title,
    ss.sort_order,
    ss.question_count,
    ss.duration_seconds,
    jsonb_build_object(
        'scoring_strategy', 'standard',
        'legacy_source', 'production_tka_sd_published_config',
        'seed_version', 1
    )
from section_seed ss
join exams e on e.slug = ss.exam_slug
cross join ctx
join subjects s on s.track_id = ctx.track_id and s.code = ss.subject_code;

commit;
