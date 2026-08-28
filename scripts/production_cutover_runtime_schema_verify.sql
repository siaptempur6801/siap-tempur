-- Siap Tempur Schema V2 canonical runtime verifier
-- READ ONLY. No DDL/DML is permitted in this file.
--
-- Purpose:
--   1) verify an isolated reconstructed bootstrap against canonical staging runtime state;
--   2) verify production after an explicitly-authorized cutover.
--
-- Migration-only CPNS staging tables/views/functions are intentionally excluded.

-- 1) Runtime object fingerprints.
with
cols as (
 select c.relname,a.attnum,a.attname,
        pg_catalog.format_type(a.atttypid,a.atttypmod) data_type,
        a.attnotnull,
        coalesce(pg_get_expr(ad.adbin,ad.adrelid),'') default_expr,
        a.attidentity::text attidentity,
        a.attgenerated::text attgenerated
 from pg_class c
 join pg_namespace n on n.oid=c.relnamespace
 join pg_attribute a on a.attrelid=c.oid and a.attnum>0 and not a.attisdropped
 left join pg_attrdef ad on ad.adrelid=c.oid and ad.adnum=a.attnum
 where n.nspname='public' and c.relkind in ('r','p')
), cons as (
 select c.relname,con.conname,pg_get_constraintdef(con.oid,true) def
 from pg_constraint con
 join pg_class c on c.oid=con.conrelid
 join pg_namespace n on n.oid=c.relnamespace
 where n.nspname='public'
), idx as (
 select c.relname,i.relname index_name,pg_get_indexdef(i.oid) def
 from pg_index x
 join pg_class c on c.oid=x.indrelid
 join pg_namespace n on n.oid=c.relnamespace
 join pg_class i on i.oid=x.indexrelid
 where n.nspname='public'
), funcs as (
 select n.nspname,p.proname,pg_get_function_identity_arguments(p.oid) args,
        pg_get_functiondef(p.oid) def
 from pg_proc p
 join pg_namespace n on n.oid=p.pronamespace
 where n.nspname in ('public','app_private') and p.prokind in ('f','p')
   and not (n.nspname='app_private' and p.proname='validate_cpns_legacy_mapping_review')
   and not (n.nspname='public' and p.proname in (
     'get_cpns_legacy_import_summary',
     'import_reviewed_cpns_legacy_batch',
     'import_reviewed_cpns_legacy_question',
     'stage_cpns_legacy_question',
     'upsert_cpns_legacy_mapping_review'
   ))
), trgs as (
 select c.relname,t.tgname,pg_get_triggerdef(t.oid,true) def
 from pg_trigger t
 join pg_class c on c.oid=t.tgrelid
 join pg_namespace n on n.oid=c.relnamespace
 where n.nspname='public' and not t.tgisinternal
), pols as (
 select tablename,policyname,permissive,
        coalesce(array_to_string(roles,','),'') roles,
        cmd,coalesce(qual,'') qual,coalesce(with_check,'') with_check
 from pg_policies
 where schemaname='public'
), seqs as (
 select sequencename,
        coalesce(start_value::text,'')||'|'||coalesce(min_value::text,'')||'|'||
        coalesce(max_value::text,'')||'|'||coalesce(increment_by::text,'')||'|'||
        coalesce(cycle::text,'') def
 from pg_sequences
 where schemaname='public'
), actual as (
 select 'tables' category,
        (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace
         where n.nspname='public' and c.relkind in ('r','p'))::bigint count,
        md5(coalesce((select string_agg(c.relname,E'\n' order by c.relname)
                      from pg_class c join pg_namespace n on n.oid=c.relnamespace
                      where n.nspname='public' and c.relkind in ('r','p')),'')) hash
 union all
 select 'columns',count(*)::bigint,
        md5(coalesce(string_agg(relname||'|'||attnum::text||'|'||attname||'|'||data_type||'|'||attnotnull::text||'|'||default_expr||'|'||attidentity||'|'||attgenerated,E'\n' order by relname,attnum),''))
 from cols
 union all
 select 'constraints',count(*)::bigint,
        md5(coalesce(string_agg(relname||'|'||conname||'|'||def,E'\n' order by relname,conname),''))
 from cons
 union all
 select 'indexes',count(*)::bigint,
        md5(coalesce(string_agg(relname||'|'||index_name||'|'||def,E'\n' order by relname,index_name),''))
 from idx
 union all
 select 'runtime_functions',count(*)::bigint,
        md5(coalesce(string_agg(nspname||'.'||proname||'('||args||')|'||def,E'\n' order by nspname,proname,args),''))
 from funcs
 union all
 select 'runtime_public_triggers',count(*)::bigint,
        md5(coalesce(string_agg(relname||'|'||tgname||'|'||def,E'\n' order by relname,tgname),''))
 from trgs
 union all
 select 'policies',count(*)::bigint,
        md5(coalesce(string_agg(tablename||'|'||policyname||'|'||permissive||'|'||roles||'|'||cmd||'|'||qual||'|'||with_check,E'\n' order by tablename,policyname),''))
 from pols
 union all
 select 'sequences',count(*)::bigint,
        md5(coalesce(string_agg(sequencename||'|'||def,E'\n' order by sequencename),''))
 from seqs
), expected(category,count,hash) as (values
 ('tables',98::bigint,'31c5755439cc95afaa6048926bb45f23'),
 ('columns',823::bigint,'18bf18549161ffc7c28772fa6bd48771'),
 ('constraints',369::bigint,'18ea88a6124dcaa216afa16e410cdce8'),
 ('indexes',368::bigint,'1788349683b55f78fabdb8e986b60d52'),
 ('runtime_functions',80::bigint,'e147d38d3801ac4c02ad41e21c02fe2a'),
 ('runtime_public_triggers',11::bigint,'96b6d77f0c85d8a977cb18d5e1b108bc'),
 ('policies',95::bigint,'23530b7447a51944807e82e3231c3c68'),
 ('sequences',2::bigint,'ae1743f34f7a1648e378e6d346eef986')
)
select e.category,e.count expected_count,a.count actual_count,
       e.hash expected_hash,a.hash actual_hash,
       (e.count=a.count and e.hash=a.hash) as gate_ok
from expected e left join actual a using(category)
order by e.category;

-- 2) Runtime ACL fingerprints.
with table_acl as (
  select n.nspname,c.relname,c.relkind::text relkind,
         coalesce(grantee.rolname,'PUBLIC') grantee,
         x.privilege_type,x.is_grantable
  from pg_class c
  join pg_namespace n on n.oid=c.relnamespace
  cross join lateral aclexplode(coalesce(c.relacl,acldefault(case when c.relkind='S' then 'S'::"char" else 'r'::"char" end,c.relowner))) x
  left join pg_roles grantee on grantee.oid=x.grantee
  where n.nspname='public' and c.relkind in ('r','p','v','m','S')
), function_acl as (
  select n.nspname,p.proname,pg_get_function_identity_arguments(p.oid) args,
         coalesce(grantee.rolname,'PUBLIC') grantee,
         x.privilege_type,x.is_grantable
  from pg_proc p
  join pg_namespace n on n.oid=p.pronamespace
  cross join lateral aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) x
  left join pg_roles grantee on grantee.oid=x.grantee
  where n.nspname in ('public','app_private') and p.prokind in ('f','p')
    and not (n.nspname='app_private' and p.proname='validate_cpns_legacy_mapping_review')
    and not (n.nspname='public' and p.proname in (
      'get_cpns_legacy_import_summary',
      'import_reviewed_cpns_legacy_batch',
      'import_reviewed_cpns_legacy_question',
      'stage_cpns_legacy_question',
      'upsert_cpns_legacy_mapping_review'
    ))
), schema_acl as (
  select n.nspname,coalesce(grantee.rolname,'PUBLIC') grantee,
         x.privilege_type,x.is_grantable
  from pg_namespace n
  cross join lateral aclexplode(coalesce(n.nspacl,acldefault('n',n.nspowner))) x
  left join pg_roles grantee on grantee.oid=x.grantee
  where n.nspname in ('public','app_private')
), actual as (
 select 'runtime_function_acl' category,count(*)::bigint count,
        md5(coalesce(string_agg(nspname||'.'||proname||'('||args||')|'||grantee||'|'||privilege_type||'|'||is_grantable::text,E'\n' order by nspname,proname,args,grantee,privilege_type,is_grantable),'')) hash
 from function_acl
 union all
 select 'runtime_schema_acl',count(*)::bigint,
        md5(coalesce(string_agg(nspname||'|'||grantee||'|'||privilege_type||'|'||is_grantable::text,E'\n' order by nspname,grantee,privilege_type,is_grantable),''))
 from schema_acl
 union all
 select 'runtime_table_acl',count(*)::bigint,
        md5(coalesce(string_agg(nspname||'.'||relname||'|'||relkind||'|'||grantee||'|'||privilege_type||'|'||is_grantable::text,E'\n' order by nspname,relname,grantee,privilege_type,is_grantable),''))
 from table_acl
), expected(category,count,hash) as (values
 ('runtime_function_acl',166::bigint,'fbfcd289d78e77af89e5d9117e8af833'),
 ('runtime_schema_acl',10::bigint,'28854a5ad42ca691a4c5700a9b8c3da7'),
 ('runtime_table_acl',1659::bigint,'c5fdcbcef6ef9ea81401b3b513c63d36')
)
select e.category,e.count expected_count,a.count actual_count,
       e.hash expected_hash,a.hash actual_hash,
       (e.count=a.count and e.hash=a.hash) as gate_ok
from expected e left join actual a using(category)
order by e.category;

-- 3) RLS posture and auth trigger/handler.
select
  (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace
   where n.nspname='public' and c.relkind in ('r','p') and c.relrowsecurity) = 98 as all_runtime_tables_rls_enabled,
  (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace
   where n.nspname='public' and c.relkind in ('r','p') and c.relforcerowsecurity) = 0 as no_force_rls_expected,
  coalesce((select md5(pg_get_triggerdef(t.oid,true))='786e53a33077b3a68f1ec248e238d18a'
            from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace
            where not t.tgisinternal and n.nspname='auth' and c.relname='users' and t.tgname='on_auth_user_created'),false) as auth_user_trigger_ok,
  coalesce((select md5(pg_get_functiondef(p.oid))='dbae3074708706cbe687389241c39a16'
            from pg_proc p join pg_namespace n on n.oid=p.pronamespace
            where n.nspname='public' and p.proname='handle_new_user' and pg_get_function_identity_arguments(p.oid)=''),false) as canonical_handle_new_user_ok;
