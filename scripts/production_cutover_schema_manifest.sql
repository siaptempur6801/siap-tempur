-- Siap Tempur Schema V2 production cutover readiness
-- READ ONLY. This file must never contain INSERT/UPDATE/DELETE/DDL.
-- Run independently against canonical staging and legacy production.
-- Approved refs:
--   staging    lpgrivowdcepcxradavu
--   production llnttutwhtvxtdktiizo

-- 1) Global DDL fingerprints for public + app_private.
with
cols as (
  select n.nspname as schema_name, c.relname as object_name, a.attnum,
         a.attname,
         pg_catalog.format_type(a.atttypid,a.atttypmod) as data_type,
         a.attnotnull,
         coalesce(pg_get_expr(ad.adbin,ad.adrelid),'') as default_expr,
         a.attidentity::text as attidentity,
         a.attgenerated::text as attgenerated
  from pg_class c
  join pg_namespace n on n.oid=c.relnamespace
  join pg_attribute a on a.attrelid=c.oid and a.attnum>0 and not a.attisdropped
  left join pg_attrdef ad on ad.adrelid=c.oid and ad.adnum=a.attnum
  where n.nspname in ('public','app_private') and c.relkind in ('r','p')
), cons as (
  select n.nspname as schema_name,c.relname as object_name,con.conname,
         pg_get_constraintdef(con.oid,true) as def
  from pg_constraint con
  join pg_class c on c.oid=con.conrelid
  join pg_namespace n on n.oid=c.relnamespace
  where n.nspname in ('public','app_private')
), idx as (
  select n.nspname as schema_name,c.relname as object_name,i.relname as index_name,
         pg_get_indexdef(i.oid) as def
  from pg_index x
  join pg_class c on c.oid=x.indrelid
  join pg_namespace n on n.oid=c.relnamespace
  join pg_class i on i.oid=x.indexrelid
  where n.nspname in ('public','app_private')
), funcs as (
  select n.nspname as schema_name,p.proname,pg_get_function_identity_arguments(p.oid) as args,
         pg_get_functiondef(p.oid) as def
  from pg_proc p
  join pg_namespace n on n.oid=p.pronamespace
  where n.nspname in ('public','app_private') and p.prokind in ('f','p')
), trgs as (
  select n.nspname as schema_name,c.relname as object_name,t.tgname,
         pg_get_triggerdef(t.oid,true) as def
  from pg_trigger t
  join pg_class c on c.oid=t.tgrelid
  join pg_namespace n on n.oid=c.relnamespace
  where n.nspname in ('public','app_private') and not t.tgisinternal
), pols as (
  select schemaname as schema_name,tablename as object_name,policyname,permissive,
         coalesce(array_to_string(roles,','),'') as roles,cmd,
         coalesce(qual,'') as qual,coalesce(with_check,'') as with_check
  from pg_policies
  where schemaname in ('public','app_private')
), views as (
  select n.nspname as schema_name,c.relname as object_name,c.relkind::text as relkind,
         pg_get_viewdef(c.oid,true) as def
  from pg_class c
  join pg_namespace n on n.oid=c.relnamespace
  where n.nspname in ('public','app_private') and c.relkind in ('v','m')
), seqs as (
  select schemaname as schema_name,sequencename as object_name,
         coalesce(start_value::text,'')||'|'||coalesce(min_value::text,'')||'|'||
         coalesce(max_value::text,'')||'|'||coalesce(increment_by::text,'')||'|'||
         coalesce(cycle::text,'') as def
  from pg_sequences
  where schemaname in ('public','app_private')
), rows as (
 select 'columns' category,count(*)::bigint count,
        md5(coalesce(string_agg(schema_name||'.'||object_name||'|'||attnum::text||'|'||attname||'|'||data_type||'|'||attnotnull::text||'|'||default_expr||'|'||attidentity||'|'||attgenerated,E'\n' order by schema_name,object_name,attnum),'')) hash
 from cols
 union all
 select 'constraints',count(*)::bigint,
        md5(coalesce(string_agg(schema_name||'.'||object_name||'|'||conname||'|'||def,E'\n' order by schema_name,object_name,conname),''))
 from cons
 union all
 select 'indexes',count(*)::bigint,
        md5(coalesce(string_agg(schema_name||'.'||object_name||'|'||index_name||'|'||def,E'\n' order by schema_name,object_name,index_name),''))
 from idx
 union all
 select 'functions',count(*)::bigint,
        md5(coalesce(string_agg(schema_name||'.'||proname||'('||args||')|'||def,E'\n' order by schema_name,proname,args),''))
 from funcs
 union all
 select 'triggers',count(*)::bigint,
        md5(coalesce(string_agg(schema_name||'.'||object_name||'|'||tgname||'|'||def,E'\n' order by schema_name,object_name,tgname),''))
 from trgs
 union all
 select 'policies',count(*)::bigint,
        md5(coalesce(string_agg(schema_name||'.'||object_name||'|'||policyname||'|'||permissive||'|'||roles||'|'||cmd||'|'||qual||'|'||with_check,E'\n' order by schema_name,object_name,policyname),''))
 from pols
 union all
 select 'views',count(*)::bigint,
        md5(coalesce(string_agg(schema_name||'.'||object_name||'|'||relkind||'|'||def,E'\n' order by schema_name,object_name),''))
 from views
 union all
 select 'sequences',count(*)::bigint,
        md5(coalesce(string_agg(schema_name||'.'||object_name||'|'||def,E'\n' order by schema_name,object_name),''))
 from seqs
)
select category,count,hash from rows order by category;

-- 2) Per-table public schema signatures.
with table_cols as (
 select c.oid,c.relname,c.relrowsecurity,
        count(a.*)::int as column_count,
        md5(string_agg(
          a.attnum::text||'|'||a.attname||'|'||
          pg_catalog.format_type(a.atttypid,a.atttypmod)||'|'||
          a.attnotnull::text||'|'||coalesce(pg_get_expr(ad.adbin,ad.adrelid),''),
          E'\n' order by a.attnum)) as column_hash
 from pg_class c
 join pg_namespace n on n.oid=c.relnamespace
 join pg_attribute a on a.attrelid=c.oid and a.attnum>0 and not a.attisdropped
 left join pg_attrdef ad on ad.adrelid=c.oid and ad.adnum=a.attnum
 where n.nspname='public' and c.relkind in ('r','p')
 group by c.oid,c.relname,c.relrowsecurity
), con as (
 select c.oid,count(*)::int as constraint_count,
        md5(string_agg(con.conname||'|'||pg_get_constraintdef(con.oid,true),E'\n' order by con.conname)) as constraint_hash
 from pg_constraint con
 join pg_class c on c.oid=con.conrelid
 join pg_namespace n on n.oid=c.relnamespace
 where n.nspname='public'
 group by c.oid
)
select t.relname as table_name,
       t.column_count,
       t.column_hash,
       coalesce(con.constraint_count,0) as constraint_count,
       coalesce(con.constraint_hash,md5('')) as constraint_hash,
       t.relrowsecurity as rls_enabled
from table_cols t
left join con on con.oid=t.oid
order by t.relname;
