delete from public.role_permissions rp
using public.roles r, public.permissions p
where rp.role_id=r.id
  and rp.permission_id=p.id
  and (
    (r.code='CONTENT_EDITOR' and p.code='question.manage')
    or
    (r.code='CONTENT_REVIEWER' and p.code in ('question.manage','exam.manage'))
  );

insert into public.role_permissions(role_id,permission_id)
select r.id,p.id
from public.roles r
join public.permissions p on (
  (r.code='CONTENT_EDITOR' and p.code in ('content.create','content.read','content.update'))
  or
  (r.code='CONTENT_REVIEWER' and p.code in ('content.read','content.review','content.publish'))
)
where not exists (
  select 1 from public.role_permissions rp
  where rp.role_id=r.id and rp.permission_id=p.id
);
