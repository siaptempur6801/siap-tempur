-- Generated from canonical staging lpgrivowdcepcxradavu via pg_get_functiondef().
-- Large public runtime functions: drill admin, exam token debit, paid-order fulfillment.
-- DO NOT apply to production before explicit final GO.

CREATE OR REPLACE FUNCTION public.admin_upsert_drill_exam_v1(p_exam_id uuid, p_program_code text, p_track_code text, p_subject_code text, p_knowledge_node_id uuid, p_title text, p_slug text, p_duration_seconds integer, p_attempt_limit integer, p_question_count integer, p_question_order text, p_result_visibility text, p_access_type text, p_status text, p_token_cost integer, p_actor_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_program_id uuid;
  v_track_id uuid;
  v_subject_id uuid;
  v_subject_name text;
  v_node_name text;
  v_node_status text;
  v_drill_type_id uuid;
  v_exam_id uuid := p_exam_id;
  v_blueprint_id uuid;
  v_section_id uuid;
  v_current_type_id uuid;
  v_section_count integer;
  v_available_count integer;
  v_materialized_count integer;
begin
  if p_actor_id is null or not exists (
    select 1 from public.profiles p where p.id=p_actor_id and p.status='active'
  ) then
    raise exception 'DRILL_ACTOR_INVALID';
  end if;
  if p_title is null or btrim(p_title)='' or p_slug is null or btrim(p_slug)='' then
    raise exception 'EXAM_TITLE_REQUIRED';
  end if;
  if p_duration_seconds is null or p_duration_seconds <= 0 then raise exception 'EXAM_DURATION_INVALID'; end if;
  if p_attempt_limit is null or p_attempt_limit <= 0 then raise exception 'EXAM_ATTEMPT_LIMIT_INVALID'; end if;
  if p_question_count is null or p_question_count <= 0 then raise exception 'DRILL_QUESTION_COUNT_INVALID'; end if;
  if p_token_cost is null or p_token_cost < 0 then raise exception 'EXAM_TOKEN_COST_INVALID'; end if;

  select id into v_program_id from public.programs where upper(code)=upper(btrim(p_program_code)) limit 1;
  if v_program_id is null then raise exception 'PROGRAM_NOT_FOUND'; end if;
  select id into v_track_id from public.tracks where program_id=v_program_id and upper(code)=upper(btrim(p_track_code)) limit 1;
  if v_track_id is null then raise exception 'TRACK_NOT_FOUND'; end if;
  select id,name into v_subject_id,v_subject_name from public.subjects where track_id=v_track_id and upper(code)=upper(btrim(p_subject_code)) limit 1;
  if v_subject_id is null then raise exception 'SUBJECT_INVALID'; end if;
  select name,status into v_node_name,v_node_status from public.knowledge_nodes where id=p_knowledge_node_id and subject_id=v_subject_id;
  if v_node_name is null then raise exception 'DRILL_KNOWLEDGE_NODE_INVALID'; end if;
  if lower(coalesce(v_node_status,'')) <> 'active' then raise exception 'DRILL_KNOWLEDGE_NODE_INACTIVE'; end if;
  select id into v_drill_type_id from public.exam_types where upper(code)='DRILL' limit 1;
  if v_drill_type_id is null then raise exception 'EXAM_TYPE_INVALID'; end if;

  perform pg_advisory_xact_lock(hashtextextended(coalesce(v_exam_id::text,btrim(p_slug)),0));

  if v_exam_id is not null then
    select e.exam_type_id,e.blueprint_id into v_current_type_id,v_blueprint_id
    from public.exams e
    where e.id=v_exam_id and e.program_id=v_program_id and e.track_id=v_track_id
    for update;
    if not found then raise exception 'EXAM_NOT_FOUND'; end if;
    if v_current_type_id <> v_drill_type_id then raise exception 'DRILL_TYPE_IMMUTABLE'; end if;
    if exists(select 1 from public.exam_attempts ea where ea.exam_id=v_exam_id and ea.status='in_progress') then
      raise exception 'DRILL_ACTIVE_ATTEMPT_LOCKED';
    end if;
  end if;

  select count(distinct q.id)::integer into v_available_count
  from public.questions q
  join public.question_knowledge_nodes qkn on qkn.question_id=q.id and qkn.relation_type='primary'
  join public.knowledge_node_paths knp on knp.descendant_id=qkn.knowledge_node_id
  join public.question_versions qv on qv.question_id=q.id and qv.version=q.version
  where q.program_id=v_program_id
    and q.track_id=v_track_id
    and q.subject_id=v_subject_id
    and q.status in ('approved','published')
    and knp.ancestor_id=p_knowledge_node_id;

  if v_available_count < p_question_count then
    raise exception 'DRILL_QUESTION_POOL_INSUFFICIENT:%/%',v_available_count,p_question_count;
  end if;

  if v_blueprint_id is null then
    insert into public.exam_blueprints(name,program_id,track_id,period_id,description,status,created_at,updated_at)
    values('Drill · '||v_subject_name||' · '||v_node_name,v_program_id,v_track_id,null,'Auto-managed blueprint untuk Drill submateri.','active',now(),now())
    returning id into v_blueprint_id;
  else
    update public.exam_blueprints
       set name='Drill · '||v_subject_name||' · '||v_node_name,
           description='Auto-managed blueprint untuk Drill submateri.',status='active',updated_at=now()
     where id=v_blueprint_id;
  end if;

  if v_exam_id is null then
    insert into public.exams(
      program_id,track_id,exam_type_id,blueprint_id,title,slug,duration_seconds,attempt_limit,
      question_order,result_visibility,access_type,status,created_by,token_cost,created_at,updated_at
    ) values (
      v_program_id,v_track_id,v_drill_type_id,v_blueprint_id,btrim(p_title),btrim(p_slug),p_duration_seconds,p_attempt_limit,
      coalesce(nullif(btrim(p_question_order),''),'random'),coalesce(nullif(btrim(p_result_visibility),''),'instant'),
      coalesce(nullif(btrim(p_access_type),''),'FREE'),coalesce(nullif(btrim(p_status),''),'draft'),p_actor_id,p_token_cost,now(),now()
    ) returning id into v_exam_id;
  else
    update public.exams set
      blueprint_id=v_blueprint_id,
      title=btrim(p_title),slug=btrim(p_slug),duration_seconds=p_duration_seconds,attempt_limit=p_attempt_limit,
      question_order=coalesce(nullif(btrim(p_question_order),''),'random'),
      result_visibility=coalesce(nullif(btrim(p_result_visibility),''),'instant'),
      access_type=coalesce(nullif(btrim(p_access_type),''),'FREE'),
      status=coalesce(nullif(btrim(p_status),''),'draft'),token_cost=p_token_cost,updated_at=now()
    where id=v_exam_id;
  end if;

  delete from public.exam_blueprint_rules where blueprint_id=v_blueprint_id;
  insert into public.exam_blueprint_rules(blueprint_id,subject_id,knowledge_node_id,difficulty,question_count,weight,sort_order)
  values(v_blueprint_id,v_subject_id,p_knowledge_node_id,null,p_question_count,1,1);

  select count(*)::integer into v_section_count from public.exam_sections where exam_id=v_exam_id;
  select id into v_section_id from public.exam_sections where exam_id=v_exam_id order by sort_order,id limit 1;
  if v_section_count > 1 then raise exception 'DRILL_SECTION_CONFLICT'; end if;
  if v_section_id is null then
    insert into public.exam_sections(exam_id,subject_id,title,sort_order,question_count,duration_seconds,config)
    values(v_exam_id,v_subject_id,v_node_name,1,p_question_count,p_duration_seconds,jsonb_build_object('mode','drill','knowledge_node_id',p_knowledge_node_id))
    returning id into v_section_id;
  else
    update public.exam_sections set
      subject_id=v_subject_id,title=v_node_name,sort_order=1,question_count=p_question_count,
      duration_seconds=p_duration_seconds,config=jsonb_build_object('mode','drill','knowledge_node_id',p_knowledge_node_id)
    where id=v_section_id;
  end if;

  delete from public.exam_question_items where exam_id=v_exam_id;
  with eligible as (
    select distinct q.id,q.version,q.question_code
    from public.questions q
    join public.question_knowledge_nodes qkn on qkn.question_id=q.id and qkn.relation_type='primary'
    join public.knowledge_node_paths knp on knp.descendant_id=qkn.knowledge_node_id
    join public.question_versions qv on qv.question_id=q.id and qv.version=q.version
    where q.program_id=v_program_id
      and q.track_id=v_track_id
      and q.subject_id=v_subject_id
      and q.status in ('approved','published')
      and knp.ancestor_id=p_knowledge_node_id
  ), chosen as (
    select *,row_number() over(order by md5(v_exam_id::text||':'||id::text)) as pos
    from eligible
    order by md5(v_exam_id::text||':'||id::text)
    limit p_question_count
  )
  insert into public.exam_question_items(exam_id,section_id,question_id,question_version,position,score_weight)
  select v_exam_id,v_section_id,id,version,pos,1 from chosen;
  get diagnostics v_materialized_count=row_count;

  if v_materialized_count <> p_question_count then
    raise exception 'DRILL_MATERIALIZATION_MISMATCH:%/%',v_materialized_count,p_question_count;
  end if;

  return jsonb_build_object(
    'exam_id',v_exam_id,'blueprint_id',v_blueprint_id,'section_id',v_section_id,
    'subject_id',v_subject_id,'knowledge_node_id',p_knowledge_node_id,
    'available_question_count',v_available_count,'question_count',v_materialized_count
  );
end;
$function$

CREATE OR REPLACE FUNCTION public.debit_exam_token_once(p_user_id uuid, p_attempt_id uuid)
 RETURNS TABLE(debited boolean, balance_after integer, amount integer)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
    v_wallet_id uuid;
    v_balance integer;
    v_token_cost integer;
    v_existing_balance integer;
begin
    select e.token_cost
      into v_token_cost
      from public.exam_attempts a
      join public.exams e on e.id = a.exam_id
     where a.id = p_attempt_id
       and a.user_id = p_user_id
       and lower(a.status) in ('created', 'in_progress', 'completed');

    if not found then
        raise exception 'ATTEMPT_NOT_CHARGEABLE'
            using errcode = 'P0001';
    end if;

    v_token_cost := coalesce(v_token_cost, 0);

    select w.id, w.balance
      into v_wallet_id, v_balance
      from public.wallets w
     where w.user_id = p_user_id
       and w.wallet_type = 'exam_token'
     for update;

    if not found then
        if v_token_cost = 0 then
            return query select false, 0, 0;
            return;
        end if;

        raise exception 'WALLET_NOT_FOUND'
            using errcode = 'P0001';
    end if;

    select wt.balance_after
      into v_existing_balance
      from public.wallet_transactions wt
     where wt.wallet_id = v_wallet_id
       and wt.source_type = 'exam_attempt'
       and wt.source_id = p_attempt_id
       and wt.type = 'debit'
     limit 1;

    if found then
        return query select false, v_existing_balance, v_token_cost;
        return;
    end if;

    if v_token_cost = 0 then
        return query select false, v_balance, 0;
        return;
    end if;

    if v_balance < v_token_cost then
        raise exception 'INSUFFICIENT_TOKEN_BALANCE'
            using errcode = 'P0001';
    end if;

    v_balance := v_balance - v_token_cost;

    update public.wallets
       set balance = v_balance,
           updated_at = now()
     where id = v_wallet_id;

    insert into public.wallet_transactions (
        wallet_id,
        type,
        amount,
        source_type,
        source_id,
        balance_after
    ) values (
        v_wallet_id,
        'debit',
        -v_token_cost,
        'exam_attempt',
        p_attempt_id,
        v_balance
    );

    return query select true, v_balance, v_token_cost;
end;
$function$

CREATE OR REPLACE FUNCTION public.fulfill_paid_order(p_order_id uuid, p_provider text, p_status text, p_provider_transaction_id text, p_payment_method text, p_amount numeric, p_raw_response jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_order public.orders%rowtype;
  v_item record;
  v_grant record;
  v_feature record;
  v_event_product record;
  v_wallet_id uuid;
  v_balance integer;
  v_credit integer;
  v_paid_at timestamptz;
  v_entitlement_starts_at timestamptz;
  v_latest_entitlement_expiry timestamptz;
  v_registration_number text;
  v_success boolean := lower(p_status) in ('capture', 'settlement');
begin
  select * into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'ORDER_NOT_FOUND';
  end if;

  if p_amount is null or p_amount <> v_order.total_amount then
    raise exception 'PAYMENT_AMOUNT_MISMATCH';
  end if;

  insert into public.payments (
    order_id, provider, provider_transaction_id, payment_method,
    amount, status, paid_at, raw_response, created_at, updated_at
  ) values (
    v_order.id,
    lower(p_provider),
    nullif(p_provider_transaction_id, ''),
    nullif(p_payment_method, ''),
    p_amount,
    lower(p_status),
    case when v_success then coalesce(v_order.paid_at, now()) else null end,
    coalesce(p_raw_response, '{}'::jsonb),
    now(),
    now()
  )
  on conflict (order_id, provider) do update set
    provider_transaction_id = coalesce(excluded.provider_transaction_id, public.payments.provider_transaction_id),
    payment_method = coalesce(excluded.payment_method, public.payments.payment_method),
    amount = excluded.amount,
    status = case
      when lower(public.payments.status) in ('capture', 'settlement') then public.payments.status
      else excluded.status
    end,
    paid_at = case
      when lower(public.payments.status) in ('capture', 'settlement') then public.payments.paid_at
      when excluded.status in ('capture', 'settlement') then coalesce(public.payments.paid_at, excluded.paid_at, now())
      else public.payments.paid_at
    end,
    raw_response = coalesce(public.payments.raw_response, '{}'::jsonb) || coalesce(excluded.raw_response, '{}'::jsonb),
    updated_at = now();

  if not v_success then
    if lower(v_order.status) <> 'paid' then
      update public.orders
      set status = case lower(p_status)
        when 'pending' then 'pending'
        when 'expire' then 'expired'
        when 'cancel' then 'cancelled'
        when 'deny' then 'failed'
        else lower(p_status)
      end
      where id = v_order.id;
    end if;
    return;
  end if;

  v_paid_at := coalesce(v_order.paid_at, now());
  update public.orders
  set status = 'paid', paid_at = v_paid_at
  where id = v_order.id;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('commerce-fulfillment-user:' || v_order.user_id::text, 0)
  );

  for v_item in
    select oi.*, p.duration_days, p.product_type
    from public.order_items oi
    join public.products p on p.id = oi.product_id
    where oi.order_id = v_order.id
    order by oi.id
  loop
    for v_grant in
      select wallet_type, amount
      from public.product_wallet_grants
      where product_id = v_item.product_id
    loop
      insert into public.wallets(user_id, wallet_type, balance, updated_at)
      values (v_order.user_id, v_grant.wallet_type, 0, now())
      on conflict (user_id, wallet_type) do nothing;

      select id, balance into v_wallet_id, v_balance
      from public.wallets
      where user_id = v_order.user_id
        and wallet_type = v_grant.wallet_type
      for update;

      if not exists (
        select 1
        from public.wallet_transactions wt
        where wt.wallet_id = v_wallet_id
          and wt.source_type = 'order_item'
          and wt.source_id = v_item.id
          and wt.type = 'credit'
      ) then
        v_credit := v_grant.amount * v_item.quantity;
        update public.wallets
        set balance = balance + v_credit, updated_at = now()
        where id = v_wallet_id
        returning balance into v_balance;

        insert into public.wallet_transactions(
          wallet_id, type, amount, source_type, source_id, balance_after, created_at
        ) values (
          v_wallet_id, 'credit', v_credit, 'order_item', v_item.id, v_balance, now()
        );
      end if;
    end loop;

    for v_feature in
      select pf.feature_id, pf.limit_value
      from public.product_features pf
      where pf.product_id = v_item.product_id
    loop
      v_entitlement_starts_at := v_paid_at;

      if lower(coalesce(v_item.product_type, '')) = 'pass'
         and v_item.duration_days is not null then
        select max(en.expires_at)
          into v_latest_entitlement_expiry
        from public.entitlements en
        where en.user_id = v_order.user_id
          and en.feature_id = v_feature.feature_id
          and lower(en.status) = 'active'
          and en.expires_at is not null
          and en.expires_at > v_paid_at
          and not (
            en.source_type = 'order_item'
            and en.source_id = v_item.id
          );

        v_entitlement_starts_at := greatest(
          v_paid_at,
          coalesce(v_latest_entitlement_expiry, v_paid_at)
        );
      end if;

      insert into public.entitlements(
        user_id, feature_id, source_type, source_id,
        starts_at, expires_at, usage_limit, usage_count, status, created_at
      ) values (
        v_order.user_id,
        v_feature.feature_id,
        'order_item',
        v_item.id,
        v_entitlement_starts_at,
        case
          when v_item.duration_days is null then null
          else v_entitlement_starts_at + make_interval(days => v_item.duration_days)
        end,
        v_feature.limit_value,
        0,
        'active',
        now()
      )
      on conflict (user_id, feature_id, source_type, source_id)
      where source_id is not null and source_type = 'order_item'
      do nothing;
    end loop;

    select ep.product_id, ep.event_id, ep.session_id, e.code
    into v_event_product
    from public.event_products ep
    join public.events e on e.id = ep.event_id
    where ep.product_id = v_item.product_id
      and lower(ep.status) = 'active'
    limit 1;

    if found then
      if v_event_product.session_id is null then
        raise exception 'EVENT_PRODUCT_SESSION_REQUIRED';
      end if;

      v_registration_number := 'EVT-' || v_event_product.code || '-' || upper(substr(md5(v_item.id::text), 1, 8));

      insert into public.event_registrations(
        event_id, session_id, user_id, order_id,
        registration_number, status, created_at
      ) values (
        v_event_product.event_id,
        v_event_product.session_id,
        v_order.user_id,
        v_order.id,
        v_registration_number,
        'registered',
        now()
      )
      on conflict (event_id, user_id) do update set
        session_id = coalesce(public.event_registrations.session_id, excluded.session_id),
        order_id = coalesce(public.event_registrations.order_id, excluded.order_id),
        status = case
          when lower(public.event_registrations.status) in ('started', 'completed') then public.event_registrations.status
          else 'registered'
        end;
    end if;
  end loop;
end;
$function$
