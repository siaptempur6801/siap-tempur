-- Siap Tempur Schema V2 ACL verifier
-- READ ONLY. No DDL/DML is permitted in this file.
-- Verifies ACL details that are not covered by production_cutover_runtime_schema_verify.sql.

-- 1) Column-level grants: canonical target = 9 entries.
with column_acl as (
  select c.relname,a.attname,
         coalesce(r.rolname,'PUBLIC') grantee,
         x.privilege_type,x.is_grantable
  from pg_attribute a
  join pg_class c on c.oid=a.attrelid
  join pg_namespace n on n.oid=c.relnamespace
  cross join lateral aclexplode(a.attacl) x
  left join pg_roles r on r.oid=x.grantee
  where n.nspname='public'
    and c.relkind='r'
    and a.attnum>0
    and not a.attisdropped
    and a.attacl is not null
), actual as (
  select count(*)::bigint count,
         md5(coalesce(string_agg(
           relname||'|'||attname||'|'||grantee||'|'||privilege_type||'|'||is_grantable::text,
           E'\n' order by relname,attname,grantee,privilege_type,is_grantable
         ),'')) hash
  from column_acl
)
select
  9::bigint as expected_count,
  count as actual_count,
  '209cfe23d54fce5cd041b94209d596b6' as expected_hash,
  hash as actual_hash,
  (count=9 and hash='209cfe23d54fce5cd041b94209d596b6') as gate_ok
from actual;

-- 2) postgres default privileges in public: canonical target = 24 entries.
with default_acl as (
  select coalesce(n.nspname,'<global>') schema_name,
         d.defaclobjtype::text defaclobjtype,
         coalesce(g.rolname,'PUBLIC') grantee,
         x.privilege_type,x.is_grantable
  from pg_default_acl d
  join pg_roles owner on owner.oid=d.defaclrole and owner.rolname='postgres'
  left join pg_namespace n on n.oid=d.defaclnamespace
  cross join lateral aclexplode(d.defaclacl) x
  left join pg_roles g on g.oid=x.grantee
  where n.nspname='public'
), actual as (
  select count(*)::bigint count,
         md5(coalesce(string_agg(
           schema_name||'|'||defaclobjtype||'|'||grantee||'|'||privilege_type||'|'||is_grantable::text,
           E'\n' order by schema_name,defaclobjtype,grantee,privilege_type,is_grantable
         ),'')) hash
  from default_acl
)
select
  24::bigint as expected_count,
  count as actual_count,
  '9919ee686742866fd139b906c31c17a0' as expected_hash,
  hash as actual_hash,
  (count=24 and hash='9919ee686742866fd139b906c31c17a0') as gate_ok
from actual;

-- 3) Sequence ownership must match canonical runtime.
select
  coalesce(pg_get_serial_sequence('public.attempt_events','id')='public.attempt_events_id_seq',false)
    as attempt_events_sequence_owned,
  coalesce(pg_get_serial_sequence('public.audit_logs','id')='public.audit_logs_id_seq',false)
    as audit_logs_sequence_owned;
