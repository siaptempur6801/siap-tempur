do $$
declare
    v_target_count integer;
begin
    select count(*)
      into v_target_count
      from public.exams e
      join public.exam_types et on et.id = e.exam_type_id
      join public.tracks t on t.id = e.track_id
      join public.programs p on p.id = t.program_id
     where upper(p.code) = 'CPNS'
       and upper(t.code) = 'SKD'
       and upper(et.code) = 'FULL_TRYOUT'
       and lower(e.status) = 'active';

    if v_target_count <> 1 then
        raise exception 'Expected exactly one active CPNS/SKD FULL_TRYOUT exam, found %', v_target_count;
    end if;

    update public.exams e
       set token_cost = 1,
           updated_at = now()
      from public.exam_types et,
           public.tracks t,
           public.programs p
     where et.id = e.exam_type_id
       and t.id = e.track_id
       and p.id = t.program_id
       and upper(p.code) = 'CPNS'
       and upper(t.code) = 'SKD'
       and upper(et.code) = 'FULL_TRYOUT'
       and lower(e.status) = 'active'
       and e.token_cost is distinct from 1;
end
$$;
