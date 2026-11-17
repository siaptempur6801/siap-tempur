-- Schema V2 Admin CRUD QA harness
-- STAGING ONLY. Runs all writes inside a transaction and rolls them back.
-- Expected final result: admin_crud_database_qa = PASS.

begin;

do $$
declare
  v_program uuid;
  v_track uuid;
  v_event_type uuid;
  v_twk uuid;
  v_actor uuid;
  v_product uuid;
  v_exam uuid;
  v_section uuid;
  v_event uuid;
  v_session uuid;
  v_question uuid;
  v_count int;
  v_paid_order uuid;
  v_payment uuid;
begin
  if to_regclass('public.test_sessions') is not null then
    raise exception 'QA_ADMIN_V2_REFUSES_LEGACY_DATABASE';
  end if;

  select id into v_program from public.programs where code='CPNS';
  select id into v_track from public.tracks where program_id=v_program and code='SKD';
  select id into v_event_type from public.exam_types where code='EVENT';
  select id into v_twk from public.subjects where track_id=v_track and code='TWK';
  select p.id into v_actor
  from public.profiles p
  join public.user_roles ur on ur.user_id=p.id
  join public.roles r on r.id=ur.role_id
  where r.code in ('ADMIN','SUPER_ADMIN')
  order by case when r.code='ADMIN' then 0 else 1 end
  limit 1;

  if v_program is null or v_track is null or v_event_type is null or v_twk is null or v_actor is null then
    raise exception 'QA_ADMIN_V2_CATALOG_OR_ACTOR_MISSING';
  end if;

  -- PRODUCT
  insert into public.products(code,name,description,product_type,program_id,track_id,status)
  values('QA_ADMIN_CRUD_PRODUCT','[QA] Admin CRUD Product','create','EVENT_TICKET',v_program,v_track,'active')
  returning id into v_product;
  insert into public.product_prices(product_id,currency,amount,starts_at,status)
  values(v_product,'IDR',12345,now(),'active');
  update public.products set name='[QA] Admin CRUD Product Updated', description='updated', updated_at=now() where id=v_product;
  select count(*) into v_count
  from public.products p join public.product_prices pp on pp.product_id=p.id
  where p.id=v_product and p.name like '%Updated' and pp.amount=12345;
  if v_count<>1 then raise exception 'QA_PRODUCT_CRUD_FAILED'; end if;

  -- EXAM
  insert into public.exams(program_id,track_id,exam_type_id,title,slug,duration_seconds,attempt_limit,question_order,result_visibility,access_type,status,created_by,token_cost)
  values(v_program,v_track,v_event_type,'[QA] Admin CRUD Exam','qa-admin-crud-exam',3600,1,'random','instant','FREE','draft',v_actor,0)
  returning id into v_exam;
  insert into public.exam_sections(exam_id,subject_id,title,sort_order,question_count,duration_seconds,config)
  values(v_exam,v_twk,'TWK QA',1,5,600,'{"passing_score":65}') returning id into v_section;
  update public.exams set title='[QA] Admin CRUD Exam Updated',status='active',updated_at=now() where id=v_exam;
  update public.exam_sections set question_count=6 where id=v_section;
  select count(*) into v_count
  from public.exams e join public.exam_sections es on es.exam_id=e.id
  where e.id=v_exam and e.title like '%Updated' and e.status='active' and es.question_count=6;
  if v_count<>1 then raise exception 'QA_EXAM_CRUD_FAILED'; end if;

  -- EVENT
  insert into public.events(code,title,slug,event_type,program_id,track_id,registration_start,registration_end,starts_at,ends_at,status)
  values('QA-ADMIN-CRUD-EVENT','[QA] Admin CRUD Event','qa-admin-crud-event','tryout_akbar',v_program,v_track,now()-interval '1 hour',now()+interval '1 hour',now(),now()+interval '3 hours','draft')
  returning id into v_event;
  insert into public.event_sessions(event_id,exam_id,name,starts_at,ends_at,capacity,status)
  values(v_event,v_exam,'QA Session',now(),now()+interval '2 hours',50,'scheduled') returning id into v_session;
  insert into public.event_products(product_id,event_id,session_id,status) values(v_product,v_event,v_session,'active');
  update public.events set title='[QA] Admin CRUD Event Updated',status='live' where id=v_event;
  update public.event_sessions set capacity=75,status='live' where id=v_session;
  select count(*) into v_count
  from public.events ev
  join public.event_sessions es on es.event_id=ev.id
  join public.event_products ep on ep.event_id=ev.id
  where ev.id=v_event and ev.title like '%Updated' and es.capacity=75 and ep.product_id=v_product;
  if v_count<>1 then raise exception 'QA_EVENT_CRUD_FAILED'; end if;

  -- QUESTION + VERSION + OPTION REPLACEMENT
  insert into public.questions(question_code,program_id,track_id,subject_id,question_type,stem,difficulty,source_type,source_reference,status,version,author_id)
  values('QA-ADMIN-CRUD-Q',v_program,v_track,v_twk,'single_choice','QA question original?','medium','internal','qa-admin-crud','draft',1,v_actor)
  returning id into v_question;
  insert into public.question_options(question_id,option_key,content,is_correct,score,sort_order) values
    (v_question,'A','Jawaban benar',true,5,1),
    (v_question,'B','Jawaban salah',false,0,2),
    (v_question,'C','Opsi akan dihapus',false,0,3);
  insert into public.question_versions(question_id,version,snapshot,changed_by,change_reason)
  select v_question,1,
    jsonb_build_object(
      'question',to_jsonb(q),
      'options',(select jsonb_agg(to_jsonb(o) order by o.sort_order) from public.question_options o where o.question_id=v_question)
    ),
    v_actor,'QA edit'
  from public.questions q where q.id=v_question;
  update public.questions set stem='QA question updated?',version=2,updated_at=now() where id=v_question;
  update public.question_options set content='Jawaban benar updated' where question_id=v_question and option_key='A';
  delete from public.question_options where question_id=v_question and option_key='C';
  select count(*) into v_count from public.question_options where question_id=v_question;
  if v_count<>2 then raise exception 'QA_QUESTION_OPTION_REPLACEMENT_FAILED'; end if;
  select count(*) into v_count from public.question_versions where question_id=v_question and version=1;
  if v_count<>1 then raise exception 'QA_QUESTION_VERSION_FAILED'; end if;

  -- COMMERCE READ MODEL
  select o.id,p.id into v_paid_order,v_payment
  from public.orders o
  join public.payments p on p.order_id=o.id
  where lower(o.status)='paid' and lower(p.status) in ('settlement','capture')
  order by o.paid_at desc nulls last
  limit 1;
  if v_paid_order is null or v_payment is null then raise exception 'QA_COMMERCE_MONITOR_FAILED'; end if;

  -- ARCHIVE
  update public.products set status='archived',updated_at=now() where id=v_product;
  update public.events set status='archived' where id=v_event;
  update public.exams set status='archived',updated_at=now() where id=v_exam;
  update public.questions set status='archived',updated_at=now() where id=v_question;

  select count(*) into v_count from public.products where id=v_product and status='archived';
  if v_count<>1 then raise exception 'QA_PRODUCT_ARCHIVE_FAILED'; end if;
  select count(*) into v_count from public.events where id=v_event and status='archived';
  if v_count<>1 then raise exception 'QA_EVENT_ARCHIVE_FAILED'; end if;
  select count(*) into v_count from public.exams where id=v_exam and status='archived';
  if v_count<>1 then raise exception 'QA_EXAM_ARCHIVE_FAILED'; end if;
  select count(*) into v_count from public.questions where id=v_question and status='archived';
  if v_count<>1 then raise exception 'QA_QUESTION_ARCHIVE_FAILED'; end if;
end $$;

rollback;
select 'PASS' as admin_crud_database_qa, now() as checked_at;
