-- Schema V2 QA seed for Siap Tempur STAGING ONLY.
--
-- Purpose:
--   - Exercise Dashboard, Mini Tryout, Drill, Full Tryout, scoring, result, and history.
--   - Keep all synthetic content visibly namespaced with QA-/qa- markers.
--
-- Safety:
--   - Refuses to run against the legacy runtime schema (production currently has test_sessions).
--   - Requires the verified staging QA account dirga@siaptempur.id.
--   - QA exams use token_cost=0 until WalletService debit is implemented; the wallet is still
--     credited so existing UI token guards can be exercised.
--
-- This file is intentionally NOT merged into supabase/seed.sql. Run it explicitly on staging.

begin;

do $$
declare
  v_user uuid;
  v_program uuid;
  v_track uuid;
  v_twk uuid;
  v_tiu uuid;
  v_tkp uuid;
  v_type_drill uuid;
  v_type_mini uuid;
  v_type_full uuid;
  v_node_twk uuid;
  v_node_tiu uuid;
  v_node_tkp uuid;
  v_exam uuid;
  v_section uuid;
  v_question uuid;
  v_wallet uuid;
  i integer;
begin
  if to_regclass('public.test_sessions') is not null then
    raise exception 'Refusing Schema V2 QA seed: legacy table public.test_sessions exists';
  end if;

  if to_regclass('public.exam_attempts') is null
     or to_regclass('public.attempt_questions') is null
     or to_regclass('public.wallets') is null then
    raise exception 'Refusing Schema V2 QA seed: canonical Schema V2 tables are missing';
  end if;

  select id into strict v_user
  from auth.users
  where lower(email)='dirga@siaptempur.id';

  if not exists (
    select 1 from auth.users
    where id=v_user and email_confirmed_at is not null
  ) then
    raise exception 'QA user dirga@siaptempur.id must be email-confirmed first';
  end if;

  select id into strict v_program from public.programs where code='CPNS';
  select id into strict v_track from public.tracks where program_id=v_program and code='SKD';
  select id into strict v_twk from public.subjects where track_id=v_track and code='TWK';
  select id into strict v_tiu from public.subjects where track_id=v_track and code='TIU';
  select id into strict v_tkp from public.subjects where track_id=v_track and code='TKP';
  select id into strict v_type_drill from public.exam_types where code='DRILL';
  select id into strict v_type_mini from public.exam_types where code='MINI_TRYOUT';
  select id into strict v_type_full from public.exam_types where code='FULL_TRYOUT';

  -- Wallet balance for existing UI guards. Actual V2 exam debit remains disabled for now.
  insert into public.wallets (user_id, wallet_type, balance, updated_at)
  values (v_user, 'exam_token', 50, now())
  on conflict (user_id, wallet_type) do update
    set balance = greatest(public.wallets.balance, excluded.balance),
        updated_at = now()
  returning id into v_wallet;

  if not exists (
    select 1 from public.wallet_transactions
    where wallet_id=v_wallet and source_type='qa_seed'
  ) then
    insert into public.wallet_transactions
      (wallet_id, type, amount, source_type, source_id, balance_after)
    values
      (v_wallet, 'credit', 50, 'qa_seed', null, 50);
  end if;

  -- One visible drill material per CPNS section.
  insert into public.knowledge_nodes
    (subject_id, parent_id, code, name, slug, node_type, description, depth, sort_order, status)
  values
    (v_twk, null, 'QA-TWK-PILAR', 'Pilar Negara', 'pilar-negara', 'topic', '[QA] Materi pengujian TWK Schema V2.', 0, 1, 'active')
  on conflict (subject_id, slug) do update set
    code=excluded.code, name=excluded.name, description=excluded.description,
    node_type=excluded.node_type, depth=excluded.depth, sort_order=excluded.sort_order,
    status='active', updated_at=now()
  returning id into v_node_twk;

  insert into public.knowledge_nodes
    (subject_id, parent_id, code, name, slug, node_type, description, depth, sort_order, status)
  values
    (v_tiu, null, 'QA-TIU-NUMERIK', 'Kemampuan Numerik', 'kemampuan-numerik', 'topic', '[QA] Materi pengujian TIU Schema V2.', 0, 1, 'active')
  on conflict (subject_id, slug) do update set
    code=excluded.code, name=excluded.name, description=excluded.description,
    node_type=excluded.node_type, depth=excluded.depth, sort_order=excluded.sort_order,
    status='active', updated_at=now()
  returning id into v_node_tiu;

  insert into public.knowledge_nodes
    (subject_id, parent_id, code, name, slug, node_type, description, depth, sort_order, status)
  values
    (v_tkp, null, 'QA-TKP-PELAYANAN', 'Pelayanan Publik', 'pelayanan-publik', 'topic', '[QA] Materi pengujian TKP Schema V2.', 0, 1, 'active')
  on conflict (subject_id, slug) do update set
    code=excluded.code, name=excluded.name, description=excluded.description,
    node_type=excluded.node_type, depth=excluded.depth, sort_order=excluded.sort_order,
    status='active', updated_at=now()
  returning id into v_node_tkp;

  insert into public.knowledge_node_paths (ancestor_id, descendant_id, depth)
  values
    (v_node_twk, v_node_twk, 0),
    (v_node_tiu, v_node_tiu, 0),
    (v_node_tkp, v_node_tkp, 0)
  on conflict (ancestor_id, descendant_id) do update set depth=excluded.depth;

  -- TWK: 30 questions. A = correct / 5 points.
  for i in 1..30 loop
    insert into public.questions
      (question_code, program_id, track_id, subject_id, question_type, stem,
       difficulty, source_type, source_reference, estimated_seconds, status,
       version, author_id, reviewer_id, published_at, updated_at)
    values
      ('QA-TWK-' || lpad(i::text,3,'0'), v_program, v_track, v_twk, 'single_choice',
       '[QA] TWK #' || lpad(i::text,2,'0') || ': pilih opsi A untuk menguji jawaban benar dan scoring 5 poin.',
       'easy', 'qa_seed', 'schema-v2-qa', 30, 'published', 1, v_user, v_user, now(), now())
    on conflict (question_code) do update set
      program_id=excluded.program_id, track_id=excluded.track_id, subject_id=excluded.subject_id,
      stem=excluded.stem, status='published', version=1, reviewer_id=v_user,
      published_at=coalesce(public.questions.published_at, now()), updated_at=now()
    returning id into v_question;

    insert into public.question_options (question_id, option_key, content, is_correct, score, sort_order)
    values
      (v_question,'A','Opsi A — jawaban benar QA',true,5,1),
      (v_question,'B','Opsi B — jawaban salah QA',false,0,2),
      (v_question,'C','Opsi C — jawaban salah QA',false,0,3),
      (v_question,'D','Opsi D — jawaban salah QA',false,0,4)
    on conflict (question_id, option_key) do update set
      content=excluded.content, is_correct=excluded.is_correct, score=excluded.score, sort_order=excluded.sort_order;

    insert into public.question_knowledge_nodes (question_id, knowledge_node_id, relation_type)
    values (v_question, v_node_twk, 'primary')
    on conflict (question_id, knowledge_node_id) do update set relation_type='primary';

    delete from public.question_explanations where question_id=v_question and content like '[QA]%';
    insert into public.question_explanations (question_id, content, format, version)
    values (v_question, '[QA] Opsi A bernilai 5 dan digunakan untuk memvalidasi scoring TWK.', 'markdown', 1);
  end loop;

  -- TIU: 35 questions. A = correct / 5 points.
  for i in 1..35 loop
    insert into public.questions
      (question_code, program_id, track_id, subject_id, question_type, stem,
       difficulty, source_type, source_reference, estimated_seconds, status,
       version, author_id, reviewer_id, published_at, updated_at)
    values
      ('QA-TIU-' || lpad(i::text,3,'0'), v_program, v_track, v_tiu, 'single_choice',
       '[QA] TIU #' || lpad(i::text,2,'0') || ': pilih opsi A untuk menguji jawaban benar dan scoring 5 poin.',
       'easy', 'qa_seed', 'schema-v2-qa', 30, 'published', 1, v_user, v_user, now(), now())
    on conflict (question_code) do update set
      program_id=excluded.program_id, track_id=excluded.track_id, subject_id=excluded.subject_id,
      stem=excluded.stem, status='published', version=1, reviewer_id=v_user,
      published_at=coalesce(public.questions.published_at, now()), updated_at=now()
    returning id into v_question;

    insert into public.question_options (question_id, option_key, content, is_correct, score, sort_order)
    values
      (v_question,'A','Opsi A — jawaban benar QA',true,5,1),
      (v_question,'B','Opsi B — jawaban salah QA',false,0,2),
      (v_question,'C','Opsi C — jawaban salah QA',false,0,3),
      (v_question,'D','Opsi D — jawaban salah QA',false,0,4)
    on conflict (question_id, option_key) do update set
      content=excluded.content, is_correct=excluded.is_correct, score=excluded.score, sort_order=excluded.sort_order;

    insert into public.question_knowledge_nodes (question_id, knowledge_node_id, relation_type)
    values (v_question, v_node_tiu, 'primary')
    on conflict (question_id, knowledge_node_id) do update set relation_type='primary';

    delete from public.question_explanations where question_id=v_question and content like '[QA]%';
    insert into public.question_explanations (question_id, content, format, version)
    values (v_question, '[QA] Opsi A bernilai 5 dan digunakan untuk memvalidasi scoring TIU.', 'markdown', 1);
  end loop;

  -- TKP: 45 weighted questions. A=1, B=2, C=3, D=4, E=5.
  for i in 1..45 loop
    insert into public.questions
      (question_code, program_id, track_id, subject_id, question_type, stem,
       difficulty, source_type, source_reference, estimated_seconds, status,
       version, author_id, reviewer_id, published_at, updated_at)
    values
      ('QA-TKP-' || lpad(i::text,3,'0'), v_program, v_track, v_tkp, 'single_choice',
       '[QA] TKP #' || lpad(i::text,2,'0') || ': pilih respons A–E untuk menguji skor bertingkat 1 sampai 5; opsi E bernilai tertinggi.',
       'easy', 'qa_seed', 'schema-v2-qa', 30, 'published', 1, v_user, v_user, now(), now())
    on conflict (question_code) do update set
      program_id=excluded.program_id, track_id=excluded.track_id, subject_id=excluded.subject_id,
      stem=excluded.stem, status='published', version=1, reviewer_id=v_user,
      published_at=coalesce(public.questions.published_at, now()), updated_at=now()
    returning id into v_question;

    insert into public.question_options (question_id, option_key, content, is_correct, score, sort_order)
    values
      (v_question,'A','Respons A — 1 poin QA',false,1,1),
      (v_question,'B','Respons B — 2 poin QA',false,2,2),
      (v_question,'C','Respons C — 3 poin QA',false,3,3),
      (v_question,'D','Respons D — 4 poin QA',false,4,4),
      (v_question,'E','Respons E — 5 poin QA',true,5,5)
    on conflict (question_id, option_key) do update set
      content=excluded.content, is_correct=excluded.is_correct, score=excluded.score, sort_order=excluded.sort_order;

    insert into public.question_knowledge_nodes (question_id, knowledge_node_id, relation_type)
    values (v_question, v_node_tkp, 'primary')
    on conflict (question_id, knowledge_node_id) do update set relation_type='primary';

    delete from public.question_explanations where question_id=v_question and content like '[QA]%';
    insert into public.question_explanations (question_id, content, format, version)
    values (v_question, '[QA] TKP memakai skor bertingkat: A=1, B=2, C=3, D=4, E=5.', 'markdown', 1);
  end loop;

  -- Helper pattern repeated below: one active exam + section(s), no feature gate, no token debit.

  insert into public.exams
    (program_id, track_id, exam_type_id, title, slug, description, duration_seconds,
     attempt_limit, question_order, result_visibility, access_type, status,
     starts_at, ends_at, created_by, required_feature_id, token_cost, updated_at)
  values
    (v_program, v_track, v_type_mini, '[QA] Mini Tryout TWK', 'qa-cpns-mini-twk',
     'Seed QA Schema V2 — 30 soal TWK.', 1800, null, 'random', 'instant', 'FREE', 'active',
     null, null, v_user, null, 0, now())
  on conflict (slug) do update set
    title=excluded.title, description=excluded.description, duration_seconds=excluded.duration_seconds,
    question_order='random', access_type='FREE', status='active', required_feature_id=null, token_cost=0, updated_at=now()
  returning id into v_exam;
  select id into v_section from public.exam_sections where exam_id=v_exam and subject_id=v_twk order by sort_order,id limit 1;
  if v_section is null then
    insert into public.exam_sections (exam_id,subject_id,title,sort_order,question_count,duration_seconds,config)
    values (v_exam,v_twk,'TWK',1,30,1800,'{"passing_score":65}'::jsonb);
  else
    update public.exam_sections set title='TWK',sort_order=1,question_count=30,duration_seconds=1800,config='{"passing_score":65}'::jsonb where id=v_section;
  end if;

  insert into public.exams
    (program_id, track_id, exam_type_id, title, slug, description, duration_seconds,
     attempt_limit, question_order, result_visibility, access_type, status,
     starts_at, ends_at, created_by, required_feature_id, token_cost, updated_at)
  values
    (v_program, v_track, v_type_mini, '[QA] Mini Tryout TIU', 'qa-cpns-mini-tiu',
     'Seed QA Schema V2 — 35 soal TIU.', 2100, null, 'random', 'instant', 'FREE', 'active',
     null, null, v_user, null, 0, now())
  on conflict (slug) do update set
    title=excluded.title, description=excluded.description, duration_seconds=excluded.duration_seconds,
    question_order='random', access_type='FREE', status='active', required_feature_id=null, token_cost=0, updated_at=now()
  returning id into v_exam;
  v_section := null;
  select id into v_section from public.exam_sections where exam_id=v_exam and subject_id=v_tiu order by sort_order,id limit 1;
  if v_section is null then
    insert into public.exam_sections (exam_id,subject_id,title,sort_order,question_count,duration_seconds,config)
    values (v_exam,v_tiu,'TIU',1,35,2100,'{"passing_score":80}'::jsonb);
  else
    update public.exam_sections set title='TIU',sort_order=1,question_count=35,duration_seconds=2100,config='{"passing_score":80}'::jsonb where id=v_section;
  end if;

  insert into public.exams
    (program_id, track_id, exam_type_id, title, slug, description, duration_seconds,
     attempt_limit, question_order, result_visibility, access_type, status,
     starts_at, ends_at, created_by, required_feature_id, token_cost, updated_at)
  values
    (v_program, v_track, v_type_mini, '[QA] Mini Tryout TKP', 'qa-cpns-mini-tkp',
     'Seed QA Schema V2 — 45 soal TKP.', 2700, null, 'random', 'instant', 'FREE', 'active',
     null, null, v_user, null, 0, now())
  on conflict (slug) do update set
    title=excluded.title, description=excluded.description, duration_seconds=excluded.duration_seconds,
    question_order='random', access_type='FREE', status='active', required_feature_id=null, token_cost=0, updated_at=now()
  returning id into v_exam;
  v_section := null;
  select id into v_section from public.exam_sections where exam_id=v_exam and subject_id=v_tkp order by sort_order,id limit 1;
  if v_section is null then
    insert into public.exam_sections (exam_id,subject_id,title,sort_order,question_count,duration_seconds,config)
    values (v_exam,v_tkp,'TKP',1,45,2700,'{"passing_score":166}'::jsonb);
  else
    update public.exam_sections set title='TKP',sort_order=1,question_count=45,duration_seconds=2700,config='{"passing_score":166}'::jsonb where id=v_section;
  end if;

  insert into public.exams
    (program_id, track_id, exam_type_id, title, slug, description, duration_seconds,
     attempt_limit, question_order, result_visibility, access_type, status,
     starts_at, ends_at, created_by, required_feature_id, token_cost, updated_at)
  values
    (v_program, v_track, v_type_drill, '[QA] Drill TWK', 'qa-cpns-drill-twk',
     'Seed QA Schema V2 — Drill Pilar Negara.', 1800, null, 'random', 'instant', 'FREE', 'active',
     null, null, v_user, null, 0, now())
  on conflict (slug) do update set title=excluded.title,description=excluded.description,duration_seconds=1800,question_order='random',access_type='FREE',status='active',required_feature_id=null,token_cost=0,updated_at=now()
  returning id into v_exam;
  v_section := null;
  select id into v_section from public.exam_sections where exam_id=v_exam and subject_id=v_twk order by sort_order,id limit 1;
  if v_section is null then
    insert into public.exam_sections (exam_id,subject_id,title,sort_order,question_count,duration_seconds,config)
    values (v_exam,v_twk,'Pilar Negara',1,30,1800,'{"passing_score":65}'::jsonb);
  else
    update public.exam_sections set title='Pilar Negara',sort_order=1,question_count=30,duration_seconds=1800,config='{"passing_score":65}'::jsonb where id=v_section;
  end if;

  insert into public.exams
    (program_id, track_id, exam_type_id, title, slug, description, duration_seconds,
     attempt_limit, question_order, result_visibility, access_type, status,
     starts_at, ends_at, created_by, required_feature_id, token_cost, updated_at)
  values
    (v_program, v_track, v_type_drill, '[QA] Drill TIU', 'qa-cpns-drill-tiu',
     'Seed QA Schema V2 — Drill Kemampuan Numerik.', 1800, null, 'random', 'instant', 'FREE', 'active',
     null, null, v_user, null, 0, now())
  on conflict (slug) do update set title=excluded.title,description=excluded.description,duration_seconds=1800,question_order='random',access_type='FREE',status='active',required_feature_id=null,token_cost=0,updated_at=now()
  returning id into v_exam;
  v_section := null;
  select id into v_section from public.exam_sections where exam_id=v_exam and subject_id=v_tiu order by sort_order,id limit 1;
  if v_section is null then
    insert into public.exam_sections (exam_id,subject_id,title,sort_order,question_count,duration_seconds,config)
    values (v_exam,v_tiu,'Kemampuan Numerik',1,30,1800,'{"passing_score":80}'::jsonb);
  else
    update public.exam_sections set title='Kemampuan Numerik',sort_order=1,question_count=30,duration_seconds=1800,config='{"passing_score":80}'::jsonb where id=v_section;
  end if;

  insert into public.exams
    (program_id, track_id, exam_type_id, title, slug, description, duration_seconds,
     attempt_limit, question_order, result_visibility, access_type, status,
     starts_at, ends_at, created_by, required_feature_id, token_cost, updated_at)
  values
    (v_program, v_track, v_type_drill, '[QA] Drill TKP', 'qa-cpns-drill-tkp',
     'Seed QA Schema V2 — Drill Pelayanan Publik.', 1800, null, 'random', 'instant', 'FREE', 'active',
     null, null, v_user, null, 0, now())
  on conflict (slug) do update set title=excluded.title,description=excluded.description,duration_seconds=1800,question_order='random',access_type='FREE',status='active',required_feature_id=null,token_cost=0,updated_at=now()
  returning id into v_exam;
  v_section := null;
  select id into v_section from public.exam_sections where exam_id=v_exam and subject_id=v_tkp order by sort_order,id limit 1;
  if v_section is null then
    insert into public.exam_sections (exam_id,subject_id,title,sort_order,question_count,duration_seconds,config)
    values (v_exam,v_tkp,'Pelayanan Publik',1,30,1800,'{"passing_score":166}'::jsonb);
  else
    update public.exam_sections set title='Pelayanan Publik',sort_order=1,question_count=30,duration_seconds=1800,config='{"passing_score":166}'::jsonb where id=v_section;
  end if;

  -- Full Tryout SKD: 30 TWK + 35 TIU + 45 TKP = 110 questions / 100 minutes.
  insert into public.exams
    (program_id, track_id, exam_type_id, title, slug, description, duration_seconds,
     attempt_limit, question_order, result_visibility, access_type, status,
     starts_at, ends_at, created_by, required_feature_id, token_cost, updated_at)
  values
    (v_program, v_track, v_type_full, '[QA] Full Tryout SKD 110', 'qa-cpns-full-skd',
     'Seed QA Schema V2 — Full Tryout 110 soal.', 6000, null, 'random', 'instant', 'FREE', 'active',
     null, null, v_user, null, 0, now())
  on conflict (slug) do update set title=excluded.title,description=excluded.description,duration_seconds=6000,question_order='random',access_type='FREE',status='active',required_feature_id=null,token_cost=0,updated_at=now()
  returning id into v_exam;

  v_section := null;
  select id into v_section from public.exam_sections where exam_id=v_exam and subject_id=v_twk order by sort_order,id limit 1;
  if v_section is null then
    insert into public.exam_sections (exam_id,subject_id,title,sort_order,question_count,duration_seconds,config)
    values (v_exam,v_twk,'TWK',1,30,null,'{"passing_score":65}'::jsonb);
  else
    update public.exam_sections set title='TWK',sort_order=1,question_count=30,duration_seconds=null,config='{"passing_score":65}'::jsonb where id=v_section;
  end if;

  v_section := null;
  select id into v_section from public.exam_sections where exam_id=v_exam and subject_id=v_tiu order by sort_order,id limit 1;
  if v_section is null then
    insert into public.exam_sections (exam_id,subject_id,title,sort_order,question_count,duration_seconds,config)
    values (v_exam,v_tiu,'TIU',2,35,null,'{"passing_score":80}'::jsonb);
  else
    update public.exam_sections set title='TIU',sort_order=2,question_count=35,duration_seconds=null,config='{"passing_score":80}'::jsonb where id=v_section;
  end if;

  v_section := null;
  select id into v_section from public.exam_sections where exam_id=v_exam and subject_id=v_tkp order by sort_order,id limit 1;
  if v_section is null then
    insert into public.exam_sections (exam_id,subject_id,title,sort_order,question_count,duration_seconds,config)
    values (v_exam,v_tkp,'TKP',3,45,null,'{"passing_score":166}'::jsonb);
  else
    update public.exam_sections set title='TKP',sort_order=3,question_count=45,duration_seconds=null,config='{"passing_score":166}'::jsonb where id=v_section;
  end if;
end $$;

commit;
