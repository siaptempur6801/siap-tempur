-- =============================================================================
-- MVP CPNS Instansi Managed Service — Fase 1b: RPC pengelolaan instansi & batch
--
-- Sumber: PRD §6.1 (manajemen instansi), §6.2 (manajemen batch), §14 langkah 1&3.
--
-- KENAPA RPC
--   `authenticated` hanya memegang SELECT pada tabel instansi (lihat migration
--   fondasi). Seluruh penulisan lewat fungsi SECURITY DEFINER yang memeriksa
--   `organization.manage` di dalamnya — bukan di UI, bukan di server action.
--
-- PENJAGA
--   1. Kode instansi/batch divalidasi bentuknya dan dijaga unik tanpa peduli
--      besar-kecil huruf, karena kode itu dibagikan ke manusia.
--   2. Batch tidak boleh diaktifkan bila instansinya nonaktif — peserta akan
--      memakai kode batch yang organisasinya sudah tidak berjalan.
--   3. `invite_token` TIDAK PERNAH ditampilkan pada daftar, hanya pada detail
--      batch, dan bisa dirotasi. Token itu kunci masuk peserta.
--   4. Menutup batch tidak menghapus apa pun; `archived` hanya menyembunyikan.
-- =============================================================================
-- -----------------------------------------------------------------------------
-- 1. Daftar instansi + jumlah batch/peserta. Permission: organization.manage.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_list_organizations (p_search text DEFAULT NULL, p_status text DEFAULT NULL, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
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

  IF NOT app_private.current_user_has_permission ('organization.manage') THEN
    RAISE EXCEPTION 'Organization manage permission required';
  END IF;

  WITH filtered AS (
    SELECT
      o.id,
      o.type,
      o.name,
      o.code,
      o.address,
      o.city,
      o.province,
      o.contact_name,
      o.contact_email,
      o.contact_phone,
      o.status,
      o.notes,
      o.created_at,
      o.updated_at,
      (
        SELECT
          count(*)
        FROM
          public.organization_batches b
        WHERE
          b.organization_id = o.id) AS batch_count,
      (
        SELECT
          count(*)
        FROM
          public.organization_batches b
        WHERE
          b.organization_id = o.id
          AND b.status = 'active') AS active_batch_count,
      (
        SELECT
          count(*)
        FROM
          public.organization_participants p
        WHERE
          p.organization_id = o.id) AS participant_count,
      (
        SELECT
          count(*)
        FROM
          public.organization_members m
        WHERE
          m.organization_id = o.id) AS member_count
    FROM
      public.organizations o
    WHERE (p_status IS NULL
      OR p_status = ''
      OR o.status = p_status)
    AND (p_search IS NULL
      OR p_search = ''
      OR o.name ILIKE '%' || p_search || '%'
      OR o.code ILIKE '%' || p_search || '%'
      OR o.city ILIKE '%' || p_search || '%'
      OR o.contact_name ILIKE '%' || p_search || '%')
),
paged AS (
  SELECT
    f.*,
    count(*) OVER () AS total_count
  FROM
    filtered f
  ORDER BY
    f.name
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

  RETURN jsonb_build_object('organizations', v_rows, 'total', v_total);
END;
$function$;

-- -----------------------------------------------------------------------------
-- 2. Buat / ubah instansi. Permission: organization.manage.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_upsert_organization (p_id uuid, p_name text, p_code text, p_type text DEFAULT 'instansi', p_city text DEFAULT NULL, p_province text DEFAULT NULL, p_address text DEFAULT NULL, p_contact_name text DEFAULT NULL, p_contact_email text DEFAULT NULL, p_contact_phone text DEFAULT NULL, p_status text DEFAULT 'active', p_notes text DEFAULT NULL)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
DECLARE
  v_actor uuid := auth.uid ();
  v_name text := btrim(coalesce(p_name, ''));
  v_code text := upper(btrim(coalesce(p_code, '')));
  v_type text := lower(btrim(coalesce(p_type, 'instansi')));
  v_status text := lower(btrim(coalesce(p_status, 'active')));
  v_id uuid := p_id;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT app_private.current_user_has_permission ('organization.manage') THEN
    RAISE EXCEPTION 'Organization manage permission required';
  END IF;

  IF length(v_name) < 2 THEN
    RAISE EXCEPTION 'Organization name is required';
  END IF;
  -- Kode dibagikan ke manusia dan dipakai pada export, jadi bentuknya dijaga.
  IF v_code !~ '^[A-Z0-9][A-Z0-9-]{1,23}$' THEN
    RAISE EXCEPTION 'Organization code must be 2-24 characters of A-Z, 0-9 or -';
  END IF;

  IF v_type NOT IN ('instansi', 'sekolah', 'komunitas', 'lainnya') THEN
    RAISE EXCEPTION 'Unknown organization type';
  END IF;

  IF v_status NOT IN ('active', 'inactive') THEN
    RAISE EXCEPTION 'Unknown organization status';
  END IF;

  IF EXISTS (
    SELECT
      1
    FROM
      public.organizations o
    WHERE
      upper(o.code) = v_code
      AND o.id IS DISTINCT FROM v_id) THEN
  RAISE EXCEPTION 'Organization code % is already used', v_code;
END IF;

  IF v_id IS NULL THEN
    INSERT INTO public.organizations (name, code, type, city, province, address, contact_name, contact_email, contact_phone, status, notes, created_by)
      VALUES (v_name, v_code, v_type, nullif (btrim(coalesce(p_city, '')), ''), nullif (btrim(coalesce(p_province, '')), ''), nullif (btrim(coalesce(p_address, '')), ''), nullif (btrim(coalesce(p_contact_name, '')), ''), nullif (btrim(coalesce(p_contact_email, '')), ''), nullif (btrim(coalesce(p_contact_phone, '')), ''), v_status, nullif (btrim(coalesce(p_notes, '')), ''), v_actor)
                                RETURNING
                                  id
                                INTO
                                  v_id;
  ELSE
    IF NOT EXISTS (
      SELECT
        1
      FROM
        public.organizations
      WHERE
        id = v_id) THEN
    RAISE EXCEPTION 'Organization not found';
  END IF;
  -- Menonaktifkan instansi sementara masih ada batch aktif akan membuat
  -- peserta memakai kode batch yang organisasinya sudah tidak berjalan.
  IF v_status = 'inactive' AND EXISTS (
    SELECT
      1
    FROM
      public.organization_batches b
    WHERE
      b.organization_id = v_id AND b.status = 'active') THEN
    RAISE EXCEPTION 'Cannot deactivate an organization that still has active batches';
  END IF;

  UPDATE
    public.organizations
  SET
    name = v_name,
    code = v_code,
    type = v_type,
    city = nullif (btrim(coalesce(p_city, '')), ''), province = nullif (btrim(coalesce(p_province, '')), ''), address = nullif (btrim(coalesce(p_address, '')), ''), contact_name = nullif (btrim(coalesce(p_contact_name, '')), ''), contact_email = nullif (btrim(coalesce(p_contact_email, '')), ''), contact_phone = nullif (btrim(coalesce(p_contact_phone, '')), ''), status = v_status, notes = nullif (btrim(coalesce(p_notes, '')), ''), updated_at = now()
                              WHERE
                                id = v_id;
END IF;

  RETURN jsonb_build_object('id', v_id, 'name', v_name, 'code', v_code, 'status', v_status);
END;
$function$;

-- -----------------------------------------------------------------------------
-- 3. Detail instansi + batch + hitungan peserta. Permission: organization.manage.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_get_organization (p_id uuid)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
DECLARE
  v_actor uuid := auth.uid ();
  v_org jsonb;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT app_private.current_user_has_permission ('organization.manage') THEN
    RAISE EXCEPTION 'Organization manage permission required';
  END IF;

  SELECT
    to_jsonb (o)
  INTO
    v_org
  FROM
    public.organizations o
  WHERE
    o.id = p_id;
  IF v_org IS NULL THEN
    RAISE EXCEPTION 'Organization not found';
  END IF;

  RETURN jsonb_build_object('organization', v_org - 'created_by', 'batches', coalesce((
      SELECT
        jsonb_agg(jsonb_build_object('id', b.id, 'code', b.code, 'name', b.name, 'invite_token', b.invite_token, 'starts_at', b.starts_at, 'ends_at', b.ends_at, 'status', b.status, 'notes', b.notes, 'created_at', b.created_at, 'participant_count', (
              SELECT
                count(*)
            FROM public.organization_participants p
            WHERE
              p.batch_id = b.id), 'linked_count', (
            SELECT
              count(*)
            FROM public.organization_participants p
          WHERE
            p.batch_id = b.id
            AND p.user_id IS NOT NULL))
      ORDER BY b.created_at DESC)
      FROM public.organization_batches b
    WHERE
      b.organization_id = p_id), '[]'::jsonb));
END;
$function$;

-- -----------------------------------------------------------------------------
-- 4. Buat / ubah batch. Permission: organization.manage.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_upsert_batch (p_id uuid, p_organization_id uuid, p_code text, p_name text, p_starts_at timestamptz DEFAULT NULL, p_ends_at timestamptz DEFAULT NULL, p_status text DEFAULT 'draft', p_notes text DEFAULT NULL)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
DECLARE
  v_actor uuid := auth.uid ();
  v_code text := upper(btrim(coalesce(p_code, '')));
  v_name text := btrim(coalesce(p_name, ''));
  v_status text := lower(btrim(coalesce(p_status, 'draft')));
  v_org_status text;
  v_id uuid := p_id;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT app_private.current_user_has_permission ('organization.manage') THEN
    RAISE EXCEPTION 'Organization manage permission required';
  END IF;

  IF p_organization_id IS NULL THEN
    RAISE EXCEPTION 'Organization is required';
  END IF;

  SELECT
    status
  INTO
    v_org_status
  FROM
    public.organizations
  WHERE
    id = p_organization_id;
  IF v_org_status IS NULL THEN
    RAISE EXCEPTION 'Organization not found';
  END IF;

  IF length(v_name) < 2 THEN
    RAISE EXCEPTION 'Batch name is required';
  END IF;

  IF v_code !~ '^[A-Z0-9][A-Z0-9-]{1,23}$' THEN
    RAISE EXCEPTION 'Batch code must be 2-24 characters of A-Z, 0-9 or -';
  END IF;

  IF v_status NOT IN ('draft', 'active', 'closed', 'archived') THEN
    RAISE EXCEPTION 'Unknown batch status';
  END IF;

  IF p_starts_at IS NOT NULL AND p_ends_at IS NOT NULL AND p_ends_at < p_starts_at THEN
    RAISE EXCEPTION 'Batch end must not be before its start';
  END IF;
  -- Batch aktif hanya masuk akal bila instansinya aktif.
  IF v_status = 'active' AND v_org_status <> 'active' THEN
    RAISE EXCEPTION 'Cannot activate a batch whose organization is inactive';
  END IF;

  IF EXISTS (
    SELECT
      1
    FROM
      public.organization_batches b
    WHERE
      b.organization_id = p_organization_id
      AND upper(b.code) = v_code
      AND b.id IS DISTINCT FROM v_id) THEN
  RAISE EXCEPTION 'Batch code % is already used in this organization', v_code;
END IF;

  IF v_id IS NULL THEN
    INSERT INTO public.organization_batches (organization_id, code, name, starts_at, ends_at, status, notes, created_by)
      VALUES (p_organization_id, v_code, v_name, p_starts_at, p_ends_at, v_status, nullif (btrim(coalesce(p_notes, '')), ''), v_actor)
        RETURNING
          id
        INTO
          v_id;
  ELSE
    IF NOT EXISTS (
      SELECT
        1
      FROM
        public.organization_batches
      WHERE
        id = v_id
        AND organization_id = p_organization_id) THEN
    RAISE EXCEPTION 'Batch not found in this organization';
  END IF;

  UPDATE
    public.organization_batches
  SET
    code = v_code,
    name = v_name,
    starts_at = p_starts_at,
    ends_at = p_ends_at,
    status = v_status,
    notes = nullif (btrim(coalesce(p_notes, '')), ''), updated_at = now()
      WHERE
        id = v_id;
END IF;

  RETURN jsonb_build_object('id', v_id, 'code', v_code, 'name', v_name, 'status', v_status);
END;
$function$;

-- -----------------------------------------------------------------------------
-- 5. Rotasi token undangan batch. Permission: organization.manage.
--
--    Dipakai bila tautan undangan terlanjur tersebar. Token lama langsung tidak
--    berlaku, dan itu tindakan yang disengaja — bukan efek samping.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_rotate_batch_invite (p_batch_id uuid)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
DECLARE
  v_actor uuid := auth.uid ();
  v_token text;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT app_private.current_user_has_permission ('organization.manage') THEN
    RAISE EXCEPTION 'Organization manage permission required';
  END IF;

  UPDATE
    public.organization_batches
  SET
    invite_token = encode(extensions.gen_random_bytes(16), 'hex'),
    updated_at = now()
  WHERE
    id = p_batch_id
  RETURNING
    invite_token
  INTO
    v_token;

  IF v_token IS NULL THEN
    RAISE EXCEPTION 'Batch not found';
  END IF;

  RETURN jsonb_build_object('id', p_batch_id, 'invite_token', v_token);
END;
$function$;

-- -----------------------------------------------------------------------------
-- 6. Daftar peserta sebuah batch. Permission: organization.manage.
--    Dipakai halaman detail batch, monitoring (§6.5), dan export (§6.6).
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_list_participants (p_organization_id uuid DEFAULT NULL, p_batch_id uuid DEFAULT NULL, p_search text DEFAULT NULL, p_status text DEFAULT NULL, p_limit integer DEFAULT 100, p_offset integer DEFAULT 0)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
DECLARE
  v_actor uuid := auth.uid ();
  v_limit integer := least (greatest (coalesce(p_limit, 100), 1), 500);
  v_offset integer := greatest (coalesce(p_offset, 0), 0);
  v_rows jsonb;
  v_total integer := 0;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT app_private.current_user_has_permission ('organization.manage') THEN
    RAISE EXCEPTION 'Organization manage permission required';
  END IF;

  WITH filtered AS (
    SELECT
      p.id,
      p.organization_id,
      p.batch_id,
      p.user_id,
      p.participant_code,
      p.full_name_snapshot,
      p.email_snapshot,
      p.phone_snapshot,
      p.nik,
      p.unit,
      p.jabatan,
      p.status,
      p.registered_at,
      p.notes,
      b.code AS batch_code,
      b.name AS batch_name,
      o.code AS organization_code,
      o.name AS organization_name
    FROM
      public.organization_participants p
      JOIN public.organization_batches b ON b.id = p.batch_id
      JOIN public.organizations o ON o.id = p.organization_id
    WHERE (p_organization_id IS NULL
      OR p.organization_id = p_organization_id)
    AND (p_batch_id IS NULL
      OR p.batch_id = p_batch_id)
    AND (p_status IS NULL
      OR p_status = ''
      OR p.status = p_status)
    AND (p_search IS NULL
      OR p_search = ''
      OR p.participant_code ILIKE '%' || p_search || '%'
      OR p.full_name_snapshot ILIKE '%' || p_search || '%'
      OR p.email_snapshot ILIKE '%' || p_search || '%'
      OR p.phone_snapshot ILIKE '%' || p_search || '%')
),
paged AS (
  SELECT
    f.*,
    count(*) OVER () AS total_count
  FROM
    filtered f
  ORDER BY
    f.full_name_snapshot
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

  RETURN jsonb_build_object('participants', v_rows, 'total', v_total);
END;
$function$;

-- -----------------------------------------------------------------------------
-- ACL.
-- -----------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.admin_list_organizations (text, text, integer, integer) FROM public, anon;

REVOKE ALL ON FUNCTION public.admin_upsert_organization (uuid, text, text, text, text, text, text, text, text, text, text, text) FROM public, anon;

REVOKE ALL ON FUNCTION public.admin_get_organization (uuid) FROM public, anon;

REVOKE ALL ON FUNCTION public.admin_upsert_batch (uuid, uuid, text, text, timestamptz, timestamptz, text, text) FROM public, anon;

REVOKE ALL ON FUNCTION public.admin_rotate_batch_invite (uuid) FROM public, anon;

REVOKE ALL ON FUNCTION public.admin_list_participants (uuid, uuid, text, text, integer, integer) FROM public, anon;

GRANT EXECUTE ON FUNCTION public.admin_list_organizations (text, text, integer, integer) TO authenticated;

GRANT EXECUTE ON FUNCTION public.admin_upsert_organization (uuid, text, text, text, text, text, text, text, text, text, text, text) TO authenticated;

GRANT EXECUTE ON FUNCTION public.admin_get_organization (uuid) TO authenticated;

GRANT EXECUTE ON FUNCTION public.admin_upsert_batch (uuid, uuid, text, text, timestamptz, timestamptz, text, text) TO authenticated;

GRANT EXECUTE ON FUNCTION public.admin_rotate_batch_invite (uuid) TO authenticated;

GRANT EXECUTE ON FUNCTION public.admin_list_participants (uuid, uuid, text, text, integer, integer) TO authenticated;

-- -----------------------------------------------------------------------------
-- 7. Hapus instansi. Permission: organization.manage.
--
--    Ditambahkan setelah terlihat bahwa instansi yang salah ketik TIDAK PERNAH
--    bisa dihapus — satu-satunya jalan adalah menonaktifkannya, dan daftar
--    instansi jadi penuh sampah.
--
--    PENJAGA: instansi yang sudah punya peserta TIDAK boleh dihapus. Peserta
--    membawa snapshot dan riwayat partisipasi yang menjadi dasar export (§7.7)
--    serta KPI "0 data antar instansi tercampur" (§11). Batch ikut terhapus
--    lewat ON DELETE CASCADE hanya bila instansinya memang masih kosong.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_delete_organization (p_id uuid)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
DECLARE
  v_actor uuid := auth.uid ();
  v_name text;
  v_peserta integer;
  v_deleted integer := 0;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT app_private.current_user_has_permission ('organization.manage') THEN
    RAISE EXCEPTION 'Organization manage permission required';
  END IF;

  SELECT
    name
  INTO
    v_name
  FROM
    public.organizations
  WHERE
    id = p_id;
  IF v_name IS NULL THEN
    RAISE EXCEPTION 'Organization not found';
  END IF;

  SELECT
    count(*)
  INTO
    v_peserta
  FROM
    public.organization_participants
  WHERE
    organization_id = p_id;

  IF v_peserta > 0 THEN
    RAISE EXCEPTION 'Cannot delete an organization that has % participants', v_peserta;
  END IF;

  DELETE FROM public.organizations
  WHERE id = p_id;
  get diagnostics v_deleted = row_count;

  RETURN jsonb_build_object('id', p_id, 'name', v_name, 'deleted', v_deleted > 0);
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_delete_organization (uuid) FROM public, anon;

GRANT EXECUTE ON FUNCTION public.admin_delete_organization (uuid) TO authenticated;

-- -----------------------------------------------------------------------------
-- 8. Keluarkan peserta dari batch. Permission: organization.manage.
--
--    Dibutuhkan karena peserta bisa bergabung ke batch yang salah lewat tautan
--    undangan, dan tanpa ini satu-satunya jalan adalah menghapus seluruh
--    instansi — yang justru ditolak bila sudah ada peserta lain.
--
--    PENJAGA: peserta yang SUDAH mengerjakan ujian tidak boleh dihapus. Attempt
--    instansi adalah dasar export (§7.7), ranking (§7.6), dan KPI "0 data antar
--    instansi tercampur" (§11); menghapus barisnya akan membuat attempt itu
--    kehilangan konteks instansi. Untuk kasus itu, ubah statusnya menjadi
--    'withdrawn'.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_remove_participant (p_participant_id uuid)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
DECLARE
  v_actor uuid := auth.uid ();
  v_row public.organization_participants%rowtype;
  v_attempts integer;
  v_deleted integer := 0;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT app_private.current_user_has_permission ('organization.manage') THEN
    RAISE EXCEPTION 'Organization manage permission required';
  END IF;

  SELECT
    *
  INTO
    v_row
  FROM
    public.organization_participants
  WHERE
    id = p_participant_id
  FOR UPDATE;
  IF NOT found THEN
    RAISE EXCEPTION 'Participant not found';
  END IF;

  SELECT
    count(*)
  INTO
    v_attempts
  FROM
    public.exam_attempts a
  WHERE
    a.participant_id = p_participant_id;

  IF v_attempts > 0 THEN
    RAISE EXCEPTION 'Cannot remove a participant who has already taken % exam(s)', v_attempts;
  END IF;

  DELETE FROM public.organization_participants
  WHERE id = p_participant_id;
  get diagnostics v_deleted = row_count;

  RETURN jsonb_build_object('id', p_participant_id, 'participant_code', v_row.participant_code, 'deleted', v_deleted > 0);
END;
$function$;

-- -----------------------------------------------------------------------------
-- 9. Ubah status peserta. Permission: organization.manage.
--    Jalur untuk peserta yang sudah mengerjakan ujian: tandai mundur tanpa
--    menghapus riwayatnya.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_set_participant_status (p_participant_id uuid, p_status text)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
DECLARE
  v_actor uuid := auth.uid ();
  v_status text := lower(btrim(coalesce(p_status, '')));
  v_updated integer := 0;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT app_private.current_user_has_permission ('organization.manage') THEN
    RAISE EXCEPTION 'Organization manage permission required';
  END IF;

  IF v_status NOT IN ('registered', 'active', 'completed', 'withdrawn') THEN
    RAISE EXCEPTION 'Unknown participant status';
  END IF;

  UPDATE
    public.organization_participants
  SET
    status = v_status,
    updated_at = now()
  WHERE
    id = p_participant_id;
  get diagnostics v_updated = row_count;

  IF v_updated = 0 THEN
    RAISE EXCEPTION 'Participant not found';
  END IF;

  RETURN jsonb_build_object('id', p_participant_id, 'status', v_status);
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_remove_participant (uuid) FROM public, anon;

REVOKE ALL ON FUNCTION public.admin_set_participant_status (uuid, text) FROM public, anon;

GRANT EXECUTE ON FUNCTION public.admin_remove_participant (uuid) TO authenticated;

GRANT EXECUTE ON FUNCTION public.admin_set_participant_status (uuid, text) TO authenticated;
