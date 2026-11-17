DELETE FROM public.role_permissions rp USING public.roles r, public.permissions p
WHERE rp.role_id = r.id
  AND rp.permission_id = p.id
  AND ((r.code = 'CONTENT_EDITOR'
    AND p.code = 'question.manage')
  OR (r.code = 'CONTENT_REVIEWER'
    AND p.code IN ('question.manage', 'exam.manage')));

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT
  r.id,
  p.id
FROM
  public.roles r
  JOIN public.permissions p ON ((r.code = 'CONTENT_EDITOR'
        AND p.code IN ('content.create', 'content.read', 'content.update'))
      OR (r.code = 'CONTENT_REVIEWER'
        AND p.code IN ('content.read', 'content.review', 'content.publish')))
WHERE
  NOT EXISTS (
    SELECT
      1
    FROM
      public.role_permissions rp
    WHERE
      rp.role_id = r.id
      AND rp.permission_id = p.id);
