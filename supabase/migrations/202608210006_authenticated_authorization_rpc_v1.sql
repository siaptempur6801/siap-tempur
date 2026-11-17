CREATE OR REPLACE FUNCTION app_private.get_user_authorization (p_user_id uuid, p_scope_type text DEFAULT NULL, p_scope_id uuid DEFAULT NULL)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = ''
  AS $$
DECLARE
  v_actor uuid := auth.uid ();
  v_roles jsonb;
  v_permissions jsonb;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'User id required';
  END IF;
  IF p_user_id <> v_actor AND NOT app_private.current_user_has_permission ('admin.access') THEN
    RAISE EXCEPTION 'Authorization lookup denied';
  END IF;

  WITH assignments AS (
    SELECT
      ur.role_id
    FROM
      public.user_roles ur
    WHERE
      ur.user_id = p_user_id
      AND ((p_scope_type IS NULL
          AND ur.scope_type IS NULL)
        OR (p_scope_type IS NOT NULL
          AND (ur.scope_type IS NULL
            OR (ur.scope_type = p_scope_type
              AND ur.scope_id = p_scope_id))))
),
role_codes AS (
  SELECT DISTINCT
    r.code
  FROM
    assignments a
    JOIN public.roles r ON r.id = a.role_id
)
SELECT
  coalesce(jsonb_agg(code ORDER BY code), '[]'::jsonb)
INTO
  v_roles
FROM
  role_codes;

  WITH assignments AS (
    SELECT
      ur.role_id
    FROM
      public.user_roles ur
    WHERE
      ur.user_id = p_user_id
      AND ((p_scope_type IS NULL
          AND ur.scope_type IS NULL)
        OR (p_scope_type IS NOT NULL
          AND (ur.scope_type IS NULL
            OR (ur.scope_type = p_scope_type
              AND ur.scope_id = p_scope_id))))
),
permission_codes AS (
  SELECT DISTINCT
    p.code
  FROM
    assignments a
    JOIN public.role_permissions rp ON rp.role_id = a.role_id
    JOIN public.permissions p ON p.id = rp.permission_id
)
SELECT
  coalesce(jsonb_agg(code ORDER BY code), '[]'::jsonb)
INTO
  v_permissions
FROM
  permission_codes;

  RETURN jsonb_build_object('user_id', p_user_id, 'roles', v_roles, 'permissions', v_permissions);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_authorization (p_user_id uuid, p_scope_type text DEFAULT NULL, p_scope_id uuid DEFAULT NULL)
  RETURNS jsonb
  LANGUAGE sql
  SET search_path = ''
  AS $$
  SELECT
    app_private.get_user_authorization (p_user_id, p_scope_type, p_scope_id);
$$;

REVOKE ALL ON FUNCTION public.get_user_authorization (uuid, text, uuid) FROM public, anon;

GRANT EXECUTE ON FUNCTION public.get_user_authorization (uuid, text, uuid) TO authenticated;

GRANT EXECUTE ON FUNCTION app_private.get_user_authorization (uuid, text, uuid) TO authenticated;
