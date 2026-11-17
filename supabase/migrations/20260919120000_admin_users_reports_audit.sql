-- =============================================================================
-- Modul admin: Users & Roles, Reports, Audit Log
--
-- LATAR
--   Tujuh peran ada di database, tetapi hanya empat yang punya tempat mendarat:
--   SUPER_ADMIN dan ADMIN (semua modul), CONTENT_EDITOR dan CONTENT_REVIEWER
--   (lewat Review Queue). Tiga sisanya tidak:
--
--     FINANCE       admin.access, order.read, payment.manage, report.read,
--                   entitlement.manage  -> hanya Commerce yang punya halaman
--     SUPPORT       admin.access, user.read, user.manage, order.read
--                   -> TIDAK ADA halaman user management sama sekali
--     SCHOOL_ADMIN  organization.manage, report.read
--                   -> tanpa admin.access, jadi dilempar ke /cpns/dashboard
--
--   Akibatnya sejumlah permission (`user.read`, `user.manage`, `role.manage`,
--   `audit.read`, `report.read`, `organization.manage`, `entitlement.manage`)
--   tidak punya UI apa pun, dan `SCHOOL_ADMIN` mengalami dead-end navigation.
--
-- KENAPA RPC, BUKAN SELECT LANGSUNG
--   `user_roles`, `roles`, `permissions`, dan `audit_logs` mengaktifkan RLS
--   TANPA satu pun policy — jadi `authenticated` tidak bisa membacanya sama
--   sekali (deny by default). `profiles` pun hanya punya policy
--   `id = auth.uid() OR has_permission('admin.access')`, yang tidak mengenal
--   `user.read`. Konsisten dengan arsitektur RPC-first repo ini, seluruh akses
--   lewat fungsi SECURITY DEFINER yang memeriksa permission di dalamnya.
--
-- PENJAGA ANTI-LOCKOUT
--   Operasi tulis di sini bisa mencabut akses admin dari seseorang — termasuk
--   dari diri sendiri. Tiga penjaga ditanam di DATABASE, bukan di UI:
--     1. tidak boleh mencabut peran sendiri;
--     2. tidak boleh menonaktifkan akun sendiri;
--     3. tidak boleh menghilangkan SUPER_ADMIN terakhir (atau yang terakhir aktif).
--   Ketiganya ditegakkan di dalam fungsi supaya tidak bisa dilewati lewat
--   server action, API, maupun SQL langsung.
-- =============================================================================
-- -----------------------------------------------------------------------------
-- 1. Daftar pengguna + peran + status.
--    Permission: user.read atau user.manage.
--    `total` dihitung lewat window function supaya tabel hanya dipindai sekali.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_list_users (p_search text DEFAULT NULL, p_role text DEFAULT NULL, p_status text DEFAULT NULL, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
DECLARE
  v_actor uuid := auth.uid ();
  v_limit integer := least (greatest (coalesce(p_limit, 50), 1), 200);
  v_offset integer := greatest (coalesce(p_offset, 0), 0);
  v_rows jsonb;
  v_total integer := 0;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT (app_private.current_user_has_permission ('user.read') OR app_private.current_user_has_permission ('user.manage')) THEN
    RAISE EXCEPTION 'User read permission required';
  END IF;

  WITH filtered AS (
    SELECT
      pr.id,
      pr.full_name,
      pr.display_name,
      pr.status,
      pr.created_at,
      pr.onboarding_completed,
      au.email::text AS email,
      au.last_sign_in_at,
      coalesce((
        SELECT
          jsonb_agg(DISTINCT r.code ORDER BY r.code)
        FROM public.user_roles ur
        JOIN public.roles r ON r.id = ur.role_id
        WHERE
          ur.user_id = pr.id), '[]'::jsonb) AS roles,
      (
        SELECT
          count(*)
        FROM
          public.exam_attempts a
        WHERE
          a.user_id = pr.id) AS attempt_count
    FROM
      public.profiles pr
    LEFT JOIN auth.users au ON au.id = pr.id
  WHERE (p_search IS NULL
    OR p_search = ''
    OR pr.full_name ILIKE '%' || p_search || '%'
    OR pr.display_name ILIKE '%' || p_search || '%'
    OR au.email ILIKE '%' || p_search || '%')
    AND (p_status IS NULL
      OR p_status = ''
      OR pr.status = p_status)
    AND (p_role IS NULL
      OR p_role = ''
      OR EXISTS (
        SELECT
          1
        FROM
          public.user_roles ur
          JOIN public.roles r ON r.id = ur.role_id
        WHERE
          ur.user_id = pr.id
          AND r.code = p_role))
),
paged AS (
  SELECT
    f.*,
    count(*) OVER () AS total_count
FROM
  filtered f
ORDER BY
  f.created_at DESC,
  f.id
LIMIT v_limit OFFSET v_offset
)
SELECT
  coalesce(jsonb_agg(to_jsonb (paged) - 'total_count'), '[]'::jsonb),
  coalesce(max(paged.total_count), 0)
INTO
  v_rows,
  v_total
FROM
  paged;

  RETURN jsonb_build_object('users', v_rows, 'total', v_total, 'limit', v_limit, 'offset', v_offset);
END;
$function$;

-- -----------------------------------------------------------------------------
-- 2. Daftar peran beserta permission dan jumlah pemegangnya.
--    Permission: user.read, user.manage, atau role.manage.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_list_roles ()
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
DECLARE
  v_actor uuid := auth.uid ();
  v_rows jsonb;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT (app_private.current_user_has_permission ('user.read') OR app_private.current_user_has_permission ('user.manage') OR app_private.current_user_has_permission ('role.manage')) THEN
    RAISE EXCEPTION 'Role read permission required';
  END IF;

  SELECT
    coalesce(jsonb_agg(role_row ORDER BY role_row ->> 'code'), '[]'::jsonb)
  INTO
    v_rows
  FROM (
    SELECT
      jsonb_build_object('code', r.code, 'name', r.name, 'description', r.description, 'permissions', coalesce((
          SELECT
            jsonb_agg(p.code ORDER BY p.code)
          FROM public.role_permissions rp
          JOIN public.permissions p ON p.id = rp.permission_id
          WHERE
            rp.role_id = r.id), '[]'::jsonb), 'holder_count', (
          SELECT
            count(DISTINCT ur.user_id)
          FROM public.user_roles ur
        WHERE
          ur.role_id = r.id)) AS role_row
    FROM
      public.roles r) x;

  RETURN jsonb_build_object('roles', v_rows);
END;
$function$;

-- -----------------------------------------------------------------------------
-- 3. Beri peran ke pengguna. Permission: role.manage.
--    Idempoten: memberi peran yang sudah dimiliki tidak menambah baris ganda.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_assign_user_role (p_user_id uuid, p_role_code text)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
DECLARE
  v_actor uuid := auth.uid ();
  v_role_id uuid;
  v_role_code text;
  v_inserted integer := 0;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT app_private.current_user_has_permission ('role.manage') THEN
    RAISE EXCEPTION 'Role manage permission required';
  END IF;

  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'User is required';
  END IF;

  SELECT
    id,
    code
  INTO
    v_role_id,
    v_role_code
  FROM
    public.roles
  WHERE
    code = upper(trim(coalesce(p_role_code, '')));
  IF v_role_id IS NULL THEN
    RAISE EXCEPTION 'Unknown role';
  END IF;

  IF NOT EXISTS (
    SELECT
      1
    FROM
      public.profiles
    WHERE
      id = p_user_id) THEN
  RAISE EXCEPTION 'User profile not found';
END IF;

INSERT INTO public.user_roles (user_id, role_id)
SELECT
  p_user_id,
  v_role_id
WHERE
  NOT EXISTS (
    SELECT
      1
    FROM
      public.user_roles
    WHERE
      user_id = p_user_id
      AND role_id = v_role_id
      AND scope_type IS NULL
      AND scope_id IS NULL);
  get diagnostics v_inserted = row_count;

  RETURN jsonb_build_object('user_id', p_user_id, 'role', v_role_code, 'granted', v_inserted > 0, 'already_held', v_inserted = 0);
END;
$function$;

-- -----------------------------------------------------------------------------
-- 4. Cabut peran dari pengguna. Permission: role.manage.
--    PENJAGA: tidak boleh mencabut peran sendiri, dan tidak boleh menghilangkan
--    SUPER_ADMIN terakhir.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_revoke_user_role (p_user_id uuid, p_role_code text)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
DECLARE
  v_actor uuid := auth.uid ();
  v_role_id uuid;
  v_role_code text;
  v_deleted integer := 0;
  v_remaining integer;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT app_private.current_user_has_permission ('role.manage') THEN
    RAISE EXCEPTION 'Role manage permission required';
  END IF;

  SELECT
    id,
    code
  INTO
    v_role_id,
    v_role_code
  FROM
    public.roles
  WHERE
    code = upper(trim(coalesce(p_role_code, '')));
  IF v_role_id IS NULL THEN
    RAISE EXCEPTION 'Unknown role';
  END IF;
  -- Penjaga 1: jangan biarkan admin mengunci dirinya sendiri.
  IF p_user_id = v_actor THEN
    RAISE EXCEPTION 'Cannot revoke your own role';
  END IF;
  -- Penjaga 2: SUPER_ADMIN terakhir tidak boleh hilang.
  IF v_role_code = 'SUPER_ADMIN' THEN
    SELECT
      count(DISTINCT ur.user_id)
    INTO
      v_remaining
    FROM
      public.user_roles ur
    WHERE
      ur.role_id = v_role_id
      AND ur.user_id <> p_user_id;

    IF v_remaining = 0 THEN
      RAISE EXCEPTION 'Cannot remove the last SUPER_ADMIN';
    END IF;
  END IF;

  DELETE FROM public.user_roles
  WHERE user_id = p_user_id
    AND role_id = v_role_id
    AND scope_type IS NULL
    AND scope_id IS NULL;
  get diagnostics v_deleted = row_count;

  RETURN jsonb_build_object('user_id', p_user_id, 'role', v_role_code, 'revoked', v_deleted > 0);
END;
$function$;

-- -----------------------------------------------------------------------------
-- 5. Ubah status akun. Permission: user.manage.
--    PENJAGA: tidak boleh menonaktifkan akun sendiri, dan tidak boleh
--    menonaktifkan SUPER_ADMIN aktif terakhir.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_set_user_status (p_user_id uuid, p_status text)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
DECLARE
  v_actor uuid := auth.uid ();
  v_status text := lower(trim(coalesce(p_status, '')));
  v_previous text;
  v_active_supers integer;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT app_private.current_user_has_permission ('user.manage') THEN
    RAISE EXCEPTION 'User manage permission required';
  END IF;

  IF v_status NOT IN ('active', 'inactive', 'suspended') THEN
    RAISE EXCEPTION 'Invalid user status';
  END IF;

  SELECT
    status
  INTO
    v_previous
  FROM
    public.profiles
  WHERE
    id = p_user_id;
  IF v_previous IS NULL THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;

  IF p_user_id = v_actor AND v_status <> 'active' THEN
    RAISE EXCEPTION 'Cannot deactivate your own account';
  END IF;
  -- Penjaga ini HANYA berlaku bila target memang SUPER_ADMIN.
  --
  -- Versi pertama fungsi ini lupa memeriksa hal itu dan langsung menghitung
  -- "berapa SUPER_ADMIN aktif selain target". Di lingkungan yang tidak punya
  -- SUPER_ADMIN sama sekali (staging), hasilnya selalu 0 — sehingga
  -- menonaktifkan pengguna BIASA pun ditolak dengan alasan yang menyesatkan.
  -- Ketahuan hanya karena fungsinya benar-benar dipanggil, bukan sekadar
  -- dibuat.
  IF v_status <> 'active' AND v_previous = 'active' AND EXISTS (
    SELECT
      1
    FROM
      public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
    WHERE
      ur.user_id = p_user_id AND r.code = 'SUPER_ADMIN') THEN
    SELECT
      count(DISTINCT pr.id)
    INTO
      v_active_supers
    FROM
      public.profiles pr
      JOIN public.user_roles ur ON ur.user_id = pr.id
      JOIN public.roles r ON r.id = ur.role_id
    WHERE
      r.code = 'SUPER_ADMIN'
      AND pr.status = 'active'
      AND pr.id <> p_user_id;

    IF v_active_supers = 0 THEN
      RAISE EXCEPTION 'Cannot deactivate the last active SUPER_ADMIN';
    END IF;
  END IF;

  UPDATE
    public.profiles
  SET
    status = v_status,
    updated_at = now()
  WHERE
    id = p_user_id;

  RETURN jsonb_build_object('user_id', p_user_id, 'previous_status', v_previous, 'status', v_status);
END;
$function$;

-- -----------------------------------------------------------------------------
-- 6. Ringkasan laporan lintas modul. Permission: report.read.
--    Angka dihitung dari tabel sumber, bukan tabel ringkasan yang bisa basi.
--
--    CATATAN NAMA TABEL/KOLOM: tabelnya `exam_attempts` (bukan `attempts`),
--    sertifikat memakai `issued_at` (bukan `created_at`), dan order memakai
--    `total_amount` (bukan `amount`). Ketiganya diverifikasi ke katalog
--    information_schema sebelum migration ini ditulis.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_report_overview (p_program_code text DEFAULT 'CPNS', p_track_code text DEFAULT 'SKD')
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
DECLARE
  v_actor uuid := auth.uid ();
  v_program uuid;
  v_track uuid;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT app_private.current_user_has_permission ('report.read') THEN
    RAISE EXCEPTION 'Report read permission required';
  END IF;

  SELECT
    id
  INTO
    v_program
  FROM
    public.programs
  WHERE
    code = upper(trim(coalesce(p_program_code, 'CPNS')));
  SELECT
    id
  INTO
    v_track
  FROM
    public.tracks
  WHERE
    code = upper(trim(coalesce(p_track_code, 'SKD')))
    AND (v_program IS NULL
      OR program_id = v_program);

  RETURN jsonb_build_object('context', jsonb_build_object('program', upper(trim(coalesce(p_program_code, 'CPNS'))), 'track', upper(trim(coalesce(p_track_code, 'SKD'))), 'resolved', (v_program IS NOT NULL
        AND v_track IS NOT NULL)), 'users', jsonb_build_object('total', (
        SELECT
          count(*)
        FROM public.profiles), 'active', (
        SELECT
          count(*)
        FROM public.profiles
        WHERE
          status = 'active'), 'onboarded', (
          SELECT
            count(*)
          FROM public.profiles
        WHERE
          onboarding_completed), 'new_last_30d', (
          SELECT
            count(*)
          FROM public.profiles
        WHERE
          created_at > now() - interval '30 days')), 'attempts', jsonb_build_object('total', (
        SELECT
          count(*)
        FROM public.exam_attempts), 'last_30d', (
        SELECT
          count(*)
        FROM public.exam_attempts
      WHERE
        started_at > now() - interval '30 days'), 'in_progress', (
      SELECT
        count(*)
      FROM public.exam_attempts
    WHERE
      status = 'in_progress'), 'completed', (
      SELECT
        count(*)
      FROM public.exam_attempts
    WHERE
      status = 'completed')), 'certificates', jsonb_build_object('total', (
      SELECT
        count(*)
      FROM public.certificates), 'last_30d', (
      SELECT
        count(*)
      FROM public.certificates
    WHERE
      issued_at > now() - interval '30 days')), 'events', jsonb_build_object('total', (
    SELECT
      count(*)
    FROM public.events), 'active', (
    SELECT
      count(*)
    FROM public.events
  WHERE
    status IN ('active', 'published', 'registration_open')), 'registrations', (
    SELECT
      count(*)
    FROM public.event_registrations)), 'orders', jsonb_build_object('total', (
    SELECT
      count(*)
    FROM public.orders), 'paid', (
    SELECT
      count(*)
    FROM public.orders
  WHERE
    status = 'paid'), 'pending', (
    SELECT
      count(*)
    FROM public.orders
  WHERE
    status = 'pending'), 'revenue_paid', (
    SELECT
      coalesce(sum(total_amount), 0)
    FROM public.orders
  WHERE
    status = 'paid')), 'content', jsonb_build_object('questions_total', (
    SELECT
      count(*)
    FROM public.questions), 'questions_published', (
    SELECT
      count(*)
    FROM public.questions
  WHERE
    status = 'published'), 'questions_draft', (
    SELECT
      count(*)
    FROM public.questions
  WHERE
    status = 'draft'), 'awaiting_review', (
    SELECT
      count(*)
    FROM public.questions
  WHERE
    status IN ('submitted', 'editorial_review', 'academic_review', 'technical_qa')), 'articles_published', (
    SELECT
      count(*)
    FROM public.articles
  WHERE
    status = 'published')));
END;
$function$;

-- -----------------------------------------------------------------------------
-- 7. Jejak audit. Permission: audit.read.
--    `old_data`/`new_data` dapat memuat isi soal, jadi penyaringan dilakukan di
--    database dan jumlah baris dibatasi.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_list_audit_logs (p_action text DEFAULT NULL, p_entity_type text DEFAULT NULL, p_actor_id uuid DEFAULT NULL, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
DECLARE
  v_actor uuid := auth.uid ();
  v_limit integer := least (greatest (coalesce(p_limit, 50), 1), 200);
  v_offset integer := greatest (coalesce(p_offset, 0), 0);
  v_rows jsonb;
  v_total integer := 0;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT app_private.current_user_has_permission ('audit.read') THEN
    RAISE EXCEPTION 'Audit read permission required';
  END IF;

  WITH filtered AS (
    SELECT
      al.id,
      al.action,
      al.entity_type,
      al.entity_id,
      al.actor_user_id,
      al.created_at,
      pr.full_name AS actor_name,
      al.old_data,
      al.new_data
    FROM
      public.audit_logs al
    LEFT JOIN public.profiles pr ON pr.id = al.actor_user_id
  WHERE (p_action IS NULL
    OR p_action = ''
    OR al.action = p_action)
    AND (p_entity_type IS NULL
      OR p_entity_type = ''
      OR al.entity_type = p_entity_type)
    AND (p_actor_id IS NULL
      OR al.actor_user_id = p_actor_id)
),
paged AS (
  SELECT
    f.*,
    count(*) OVER () AS total_count
  FROM
    filtered f
  ORDER BY
    f.created_at DESC,
    f.id DESC
  LIMIT v_limit OFFSET v_offset
)
SELECT
  coalesce(jsonb_agg(to_jsonb (paged) - 'total_count'), '[]'::jsonb),
  coalesce(max(paged.total_count), 0)
INTO
  v_rows,
  v_total
FROM
  paged;

  RETURN jsonb_build_object('logs', v_rows, 'total', v_total, 'limit', v_limit, 'offset', v_offset);
END;
$function$;

-- -----------------------------------------------------------------------------
-- 8. Nilai filter untuk halaman audit, supaya UI tidak menebak-nebak dan tidak
--    perlu menarik seluruh tabel hanya untuk menyusun dropdown.
--    Permission: audit.read.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_audit_facets ()
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
DECLARE
  v_actor uuid := auth.uid ();
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT app_private.current_user_has_permission ('audit.read') THEN
    RAISE EXCEPTION 'Audit read permission required';
  END IF;

  RETURN jsonb_build_object('actions', coalesce((
      SELECT
        jsonb_agg(x.action ORDER BY x.action)
      FROM ( SELECT DISTINCT
          action
        FROM public.audit_logs) x), '[]'::jsonb), 'entity_types', coalesce((
    SELECT
      jsonb_agg(x.entity_type ORDER BY x.entity_type)
  FROM ( SELECT DISTINCT
      entity_type
    FROM public.audit_logs) x), '[]'::jsonb));
END;
$function$;

-- -----------------------------------------------------------------------------
-- ACL: `anon` tidak diberi akses sama sekali, dan setiap fungsi tetap memeriksa
-- permission-nya sendiri sehingga grant ke `authenticated` tidak cukup untuk
-- memakainya tanpa izin.
-- -----------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.admin_list_users (text, text, text, integer, integer) FROM public, anon;

REVOKE ALL ON FUNCTION public.admin_list_roles () FROM public, anon;

REVOKE ALL ON FUNCTION public.admin_assign_user_role (uuid, text) FROM public, anon;

REVOKE ALL ON FUNCTION public.admin_revoke_user_role (uuid, text) FROM public, anon;

REVOKE ALL ON FUNCTION public.admin_set_user_status (uuid, text) FROM public, anon;

REVOKE ALL ON FUNCTION public.admin_report_overview (text, text) FROM public, anon;

REVOKE ALL ON FUNCTION public.admin_list_audit_logs (text, text, uuid, integer, integer) FROM public, anon;

REVOKE ALL ON FUNCTION public.admin_audit_facets () FROM public, anon;

GRANT EXECUTE ON FUNCTION public.admin_list_users (text, text, text, integer, integer) TO authenticated;

GRANT EXECUTE ON FUNCTION public.admin_list_roles () TO authenticated;

GRANT EXECUTE ON FUNCTION public.admin_assign_user_role (uuid, text) TO authenticated;

GRANT EXECUTE ON FUNCTION public.admin_revoke_user_role (uuid, text) TO authenticated;

GRANT EXECUTE ON FUNCTION public.admin_set_user_status (uuid, text) TO authenticated;

GRANT EXECUTE ON FUNCTION public.admin_report_overview (text, text) TO authenticated;

GRANT EXECUTE ON FUNCTION public.admin_list_audit_logs (text, text, uuid, integer, integer) TO authenticated;

GRANT EXECUTE ON FUNCTION public.admin_audit_facets () TO authenticated;
