create or replace function app_private.get_user_authorization(
  p_user_id uuid,
  p_scope_type text default null,
  p_scope_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_roles jsonb;
  v_permissions jsonb;
begin
  if v_actor is null then raise exception 'Authentication required'; end if;
  if p_user_id is null then raise exception 'User id required'; end if;
  if p_user_id <> v_actor and not app_private.current_user_has_permission('admin.access') then
    raise exception 'Authorization lookup denied';
  end if;

  with assignments as (
    select ur.role_id
    from public.user_roles ur
    where ur.user_id=p_user_id
      and (
        (p_scope_type is null and ur.scope_type is null)
        or
        (p_scope_type is not null and (ur.scope_type is null or (ur.scope_type=p_scope_type and ur.scope_id=p_scope_id)))
      )
  ), role_codes as (
    select distinct r.code
    from assignments a join public.roles r on r.id=a.role_id
  )
  select coalesce(jsonb_agg(code order by code),'[]'::jsonb) into v_roles from role_codes;

  with assignments as (
    select ur.role_id
    from public.user_roles ur
    where ur.user_id=p_user_id
      and (
        (p_scope_type is null and ur.scope_type is null)
        or
        (p_scope_type is not null and (ur.scope_type is null or (ur.scope_type=p_scope_type and ur.scope_id=p_scope_id)))
      )
  ), permission_codes as (
    select distinct p.code
    from assignments a
    join public.role_permissions rp on rp.role_id=a.role_id
    join public.permissions p on p.id=rp.permission_id
  )
  select coalesce(jsonb_agg(code order by code),'[]'::jsonb) into v_permissions from permission_codes;

  return jsonb_build_object('user_id',p_user_id,'roles',v_roles,'permissions',v_permissions);
end;
$$;

create or replace function public.get_user_authorization(
  p_user_id uuid,
  p_scope_type text default null,
  p_scope_id uuid default null
)
returns jsonb
language sql
set search_path = ''
as $$ select app_private.get_user_authorization(p_user_id,p_scope_type,p_scope_id); $$;

revoke all on function public.get_user_authorization(uuid,text,uuid) from public,anon;
grant execute on function public.get_user_authorization(uuid,text,uuid) to authenticated;
grant execute on function app_private.get_user_authorization(uuid,text,uuid) to authenticated;
