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
seed(slug,title,exam_type_code,duration_seconds,attempt_limit,question_order,result_visibility,access_type,status,token_cost,required_feature_code) as (
    values
        ('tka-sd-full','Tryout Lengkap TKA SD','FULL_TRYOUT',4500,null::integer,'section_random','instant','PREMIUM','active',0,'tka.sd.full_tryout.regular'),
        ('tka-sd-full-bahasa-inggris','Tryout Lengkap TKA SD + Bahasa Inggris','FULL_TRYOUT',6300,null::integer,'section_random','instant','PREMIUM','active',0,'tka.sd.full_tryout.regular'),
        ('tka-sd-mini-matematika','Mini Tryout Matematika','MINI_TRYOUT',2400,1,'section_random','instant','FREEMIUM','active',0,'tka.sd.mini_tryout.unlimited'),
        ('tka-sd-mini-bahasa-indonesia','Mini Tryout Bahasa Indonesia','MINI_TRYOUT',2100,1,'section_random','instant','FREEMIUM','active',0,'tka.sd.mini_tryout.unlimited'),
        ('tka-sd-mini-bahasa-inggris','Mini Tryout Bahasa Inggris','MINI_TRYOUT',2280,1,'section_random','instant','FREEMIUM','active',0,'tka.sd.mini_tryout.unlimited')
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

-- Update existing section rows in place so attempt_questions.section_id remains valid.
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
),
resolved as (
    select
        e.id as exam_id,
        s.id as subject_id,
        ss.title,
        ss.sort_order,
        ss.question_count,
        ss.duration_seconds,
        jsonb_build_object(
            'scoring_strategy', 'standard',
            'legacy_source', 'production_tka_sd_published_config',
            'seed_version', 4,
            'access_policy', case when e.access_type = 'FREEMIUM' then 'one_free_then_pass' else 'pass_required' end
        ) as config
    from section_seed ss
    join exams e on e.slug = ss.exam_slug
    cross join ctx
    join subjects s on s.track_id = ctx.track_id and s.code = ss.subject_code
)
update exam_sections es
set title = r.title,
    sort_order = r.sort_order,
    question_count = r.question_count,
    duration_seconds = r.duration_seconds,
    config = r.config
from resolved r
where es.exam_id = r.exam_id
  and es.subject_id = r.subject_id;

-- Insert only section pairs that do not exist yet; never replace IDs used by attempt snapshots.
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
),
resolved as (
    select
        e.id as exam_id,
        s.id as subject_id,
        ss.title,
        ss.sort_order,
        ss.question_count,
        ss.duration_seconds,
        jsonb_build_object(
            'scoring_strategy', 'standard',
            'legacy_source', 'production_tka_sd_published_config',
            'seed_version', 4,
            'access_policy', case when e.access_type = 'FREEMIUM' then 'one_free_then_pass' else 'pass_required' end
        ) as config
    from section_seed ss
    join exams e on e.slug = ss.exam_slug
    cross join ctx
    join subjects s on s.track_id = ctx.track_id and s.code = ss.subject_code
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
    r.config
from resolved r
where not exists (
    select 1
    from exam_sections es
    where es.exam_id = r.exam_id
      and es.subject_id = r.subject_id
);

-- Launch catalog for TKA SD Tempur Pass. IDs are resolved dynamically from catalog codes.
with ctx as (
    select p.id as program_id, t.id as track_id
    from programs p
    join tracks t on t.program_id = p.id
    where p.code = 'TKA' and t.code = 'SD'
),
pass_seed(code,name,description,duration_days,status) as (
    values
        ('TKA_SD_PASS_30','Tempur Pass TKA SD 30 Hari','Akses Full Tryout TKA SD dan Mini Tryout unlimited selama 30 hari.',30,'ACTIVE'),
        ('TKA_SD_PASS_90','Tempur Pass TKA SD 90 Hari','Akses Full Tryout TKA SD dan Mini Tryout unlimited selama 90 hari.',90,'ACTIVE')
)
insert into products (
    code,
    name,
    description,
    product_type,
    program_id,
    track_id,
    duration_days,
    status,
    updated_at
)
select
    ps.code,
    ps.name,
    ps.description,
    'PASS',
    ctx.program_id,
    ctx.track_id,
    ps.duration_days,
    ps.status,
    now()
from pass_seed ps
cross join ctx
on conflict (code) do update set
    name = excluded.name,
    description = excluded.description,
    product_type = excluded.product_type,
    program_id = excluded.program_id,
    track_id = excluded.track_id,
    duration_days = excluded.duration_days,
    status = excluded.status,
    updated_at = now();

-- Preserve the canonical 10-feature bundle. Only features with implemented runtime
-- should be advertised to users; full/mini tryout are the launch access gates.
with feature_seed(code) as (
    values
        ('tka.sd.full_tryout.regular'),
        ('tka.sd.mini_tryout.unlimited'),
        ('tka.sd.drill.unlimited'),
        ('tka.sd.material.premium'),
        ('tka.sd.analytics.full'),
        ('tka.sd.explanation.full'),
        ('tka.sd.wrong_questions'),
        ('tka.sd.remedial.auto'),
        ('tka.sd.recommendation'),
        ('tka.sd.progress.history')
)
insert into product_features (product_id, feature_id, limit_value, config)
select
    p.id,
    f.id,
    null,
    '{}'::jsonb
from products p
cross join feature_seed fs
join features f on f.code = fs.code
where p.code in ('TKA_SD_PASS_30','TKA_SD_PASS_90')
on conflict (product_id, feature_id) do update set
    limit_value = excluded.limit_value,
    config = product_features.config || excluded.config;

-- Keep one open-ended active launch price per pass; close any mismatched active price.
with desired(code,amount) as (
    values
        ('TKA_SD_PASS_30',29000::numeric),
        ('TKA_SD_PASS_90',69000::numeric)
),
targets as (
    select p.id as product_id, d.code, d.amount
    from desired d
    join products p on p.code = d.code
)
update product_prices pp
set status = 'INACTIVE',
    ends_at = coalesce(pp.ends_at, now())
from targets t
where pp.product_id = t.product_id
  and lower(pp.status) = 'active'
  and (
      pp.currency <> 'IDR'
      or pp.amount <> t.amount
      or pp.ends_at is not null
  );

with desired(code,amount) as (
    values
        ('TKA_SD_PASS_30',29000::numeric),
        ('TKA_SD_PASS_90',69000::numeric)
),
targets as (
    select p.id as product_id, d.amount
    from desired d
    join products p on p.code = d.code
)
insert into product_prices (product_id, currency, amount, starts_at, ends_at, status)
select t.product_id, 'IDR', t.amount, now(), null, 'ACTIVE'
from targets t
where not exists (
    select 1
    from product_prices pp
    where pp.product_id = t.product_id
      and pp.currency = 'IDR'
      and pp.amount = t.amount
      and lower(pp.status) = 'active'
      and pp.ends_at is null
);

commit;
