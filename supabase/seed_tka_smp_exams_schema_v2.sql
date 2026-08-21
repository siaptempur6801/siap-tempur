begin;

-- TKA SMP canonical blueprint aligned to the 2026 official assessment model.
-- Official exam subjects: Matematika + Bahasa Indonesia.
-- Bahasa Inggris + IPA remain available in the catalog as enrichment only.

with ctx as (
    select t.id as track_id
    from programs p
    join tracks t on t.program_id = p.id
    where p.code = 'TKA'
      and t.code = 'SMP'
)
update subjects s
set subject_type = case
        when s.code in ('MAT', 'BIN') then 'mandatory'
        when s.code in ('BIG', 'IPA') then 'enrichment'
        else s.subject_type
    end,
    updated_at = now()
from ctx
where s.track_id = ctx.track_id
  and s.code in ('MAT', 'BIN', 'BIG', 'IPA');

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
    where p.code = 'TKA'
      and t.code = 'SMP'
),
seed(
    slug,
    title,
    exam_type_code,
    duration_seconds,
    attempt_limit,
    question_order,
    result_visibility,
    access_type,
    status,
    token_cost,
    required_feature_code
) as (
    values
        (
            'tka-smp-full',
            'Tryout Lengkap TKA SMP',
            'FULL_TRYOUT',
            9000,
            null::integer,
            'section_random',
            'instant',
            'PREMIUM',
            'draft',
            0,
            'tka.smp.full_tryout.regular'
        ),
        (
            'tka-smp-mini-matematika',
            'Mini Tryout Matematika TKA SMP',
            'MINI_TRYOUT',
            4500,
            1,
            'section_random',
            'instant',
            'FREEMIUM',
            'draft',
            0,
            'tka.smp.mini_tryout.unlimited'
        ),
        (
            'tka-smp-mini-bahasa-indonesia',
            'Mini Tryout Bahasa Indonesia TKA SMP',
            'MINI_TRYOUT',
            4500,
            1,
            'section_random',
            'instant',
            'FREEMIUM',
            'draft',
            0,
            'tka.smp.mini_tryout.unlimited'
        )
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
    required_feature_id,
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
    f.id,
    actor.id,
    now()
from seed
cross join ctx
cross join actor
join exam_types et on et.code = seed.exam_type_code
join features f on f.code = seed.required_feature_code
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
    required_feature_id = excluded.required_feature_id,
    updated_at = now();

-- Update existing section rows in place so historical attempt snapshots never lose FK targets.
with section_seed(
    exam_slug,
    subject_code,
    title,
    sort_order,
    question_count,
    duration_seconds
) as (
    values
        ('tka-smp-full', 'MAT', 'Matematika', 1, 30, 4500),
        ('tka-smp-full', 'BIN', 'Bahasa Indonesia', 2, 30, 4500),
        ('tka-smp-mini-matematika', 'MAT', 'Matematika', 1, 30, 4500),
        ('tka-smp-mini-bahasa-indonesia', 'BIN', 'Bahasa Indonesia', 1, 30, 4500)
),
ctx as (
    select t.id as track_id
    from programs p
    join tracks t on t.program_id = p.id
    where p.code = 'TKA'
      and t.code = 'SMP'
),
resolved as (
    select
        e.id as exam_id,
        s.id as subject_id,
        ss.title,
        ss.sort_order,
        ss.question_count,
        ss.duration_seconds,
        e.access_type
    from section_seed ss
    join exams e on e.slug = ss.exam_slug
    cross join ctx
    join subjects s on s.track_id = ctx.track_id
                   and s.code = ss.subject_code
)
update exam_sections es
set title = r.title,
    sort_order = r.sort_order,
    question_count = r.question_count,
    duration_seconds = r.duration_seconds,
    config = coalesce(es.config, '{}'::jsonb) || jsonb_build_object(
        'scoring_strategy', 'standard',
        'blueprint', 'official_tka_smp_2026',
        'official_subject', true,
        'access_policy', case
            when r.access_type = 'FREEMIUM' then 'one_free_then_pass'
            else 'pass_required'
        end
    )
from resolved r
where es.exam_id = r.exam_id
  and es.subject_id = r.subject_id;

with section_seed(
    exam_slug,
    subject_code,
    title,
    sort_order,
    question_count,
    duration_seconds
) as (
    values
        ('tka-smp-full', 'MAT', 'Matematika', 1, 30, 4500),
        ('tka-smp-full', 'BIN', 'Bahasa Indonesia', 2, 30, 4500),
        ('tka-smp-mini-matematika', 'MAT', 'Matematika', 1, 30, 4500),
        ('tka-smp-mini-bahasa-indonesia', 'BIN', 'Bahasa Indonesia', 1, 30, 4500)
),
ctx as (
    select t.id as track_id
    from programs p
    join tracks t on t.program_id = p.id
    where p.code = 'TKA'
      and t.code = 'SMP'
),
resolved as (
    select
        e.id as exam_id,
        s.id as subject_id,
        ss.title,
        ss.sort_order,
        ss.question_count,
        ss.duration_seconds,
        e.access_type
    from section_seed ss
    join exams e on e.slug = ss.exam_slug
    cross join ctx
    join subjects s on s.track_id = ctx.track_id
                   and s.code = ss.subject_code
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
    r.exam_id,
    r.subject_id,
    r.title,
    r.sort_order,
    r.question_count,
    r.duration_seconds,
    jsonb_build_object(
        'scoring_strategy', 'standard',
        'blueprint', 'official_tka_smp_2026',
        'official_subject', true,
        'access_policy', case
            when r.access_type = 'FREEMIUM' then 'one_free_then_pass'
            else 'pass_required'
        end
    )
from resolved r
where not exists (
    select 1
    from exam_sections es
    where es.exam_id = r.exam_id
      and es.subject_id = r.subject_id
);

-- Keep SMP pass products unavailable until the SMP question bank and E2E gates pass.
update products p
set status = 'DRAFT',
    updated_at = now()
where p.code in ('TKA_SMP_PASS_30', 'TKA_SMP_PASS_90');

commit;
