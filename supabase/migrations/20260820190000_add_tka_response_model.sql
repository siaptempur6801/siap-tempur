create table if not exists public.question_stimuli (
    id uuid primary key default gen_random_uuid(),
    stimulus_code text not null,
    program_id uuid not null references public.programs(id) on delete restrict,
    track_id uuid not null references public.tracks(id) on delete restrict,
    subject_id uuid not null references public.subjects(id) on delete restrict,
    title text,
    content text not null,
    image_url text,
    source_reference text,
    status text not null default 'draft',
    metadata jsonb not null default '{}'::jsonb,
    created_by uuid,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (program_id, track_id, subject_id, stimulus_code)
);

create index if not exists idx_question_stimuli_catalog
    on public.question_stimuli(program_id, track_id, subject_id);
create index if not exists idx_question_stimuli_status
    on public.question_stimuli(status);

alter table public.questions
    add column if not exists stimulus_id uuid,
    add column if not exists stimulus_order integer not null default 1,
    add column if not exists response_config jsonb not null default '{}'::jsonb;

do $$
begin
    if not exists (
        select 1
        from pg_constraint
        where conname = 'questions_stimulus_id_fkey'
          and conrelid = 'public.questions'::regclass
    ) then
        alter table public.questions
            add constraint questions_stimulus_id_fkey
            foreign key (stimulus_id)
            references public.question_stimuli(id)
            on delete set null;
    end if;
end $$;

create index if not exists idx_questions_stimulus_id
    on public.questions(stimulus_id);

alter table public.question_options
    add column if not exists image_url text,
    add column if not exists response_group text,
    add column if not exists response_group_order integer,
    add column if not exists metadata jsonb not null default '{}'::jsonb;

create index if not exists idx_question_options_group
    on public.question_options(question_id, response_group_order, sort_order);

alter table public.question_stimuli enable row level security;
revoke all on table public.question_stimuli from anon, authenticated;
