-- =============================================================================
-- MVP CPNS Instansi Managed Service — Fase 3: self-onboarding peserta
--
-- Sumber: PRD §6.3 (manajemen peserta), §7.2 (data peserta), §7.2.1 (self-onboarding),
--         §10.3 (flow self-onboarding), §14 langkah 4.
--
-- ALUR YANG DIDUKUNG
--   1. Admin membuat batch  -> sistem menghasilkan invite_token (§10.3 langkah 2)
--   2. Instansi membagikan tautan /cpns/join/<token>
--   3. Peserta login atau membuat akun
--   4. Peserta melengkapi data minimum, lalu terhubung ke batch
--
-- PENJAGA
--   1. Batch hanya bisa dimasuki bila statusnya draft/active DAN instansinya
--      aktif. Batch yang sudah ditutup atau diarsipkan tidak menerima peserta
--      baru.
--   2. Bergabung bersifat IDEMPOTEN. Membuka tautan dua kali tidak membuat dua
--      baris peserta — dan itu ditegakkan lewat unique index (batch_id, user_id)
--      plus penguncian baris batch, bukan lewat pengecekan di UI.
--   3. Peserta yang SUDAH diimpor admin (belum punya akun, cocok berdasarkan
--      email) akan DIKLAIM, bukan diduplikasi. Tanpa ini, bulk import lalu
--      self-onboarding menghasilkan dua baris untuk orang yang sama — persis
--      risiko yang §7.2.1 ingin dicegah dengan dedupe email.
--   4. Peserta hanya boleh masuk sebagai DIRINYA SENDIRI; `p_user_id` tidak
--      pernah datang dari klien.
--   5. `participant_code` dibuat otomatis dan unik di dalam batch, dihasilkan
--      dari baris batch yang terkunci sehingga dua peserta yang bergabung
--      bersamaan tidak memperoleh kode yang sama.
-- =============================================================================
-- -----------------------------------------------------------------------------
-- 1. Pratinjau batch dari token undangan. Untuk halaman join SEBELUM bergabung.
--    Butuh login (PRD §10.3 langkah 4), jadi cukup `authenticated`.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_batch_invite (p_token text)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
DECLARE
  v_actor uuid := auth.uid ();
  v_token text := btrim(coalesce(p_token, ''));
  v_batch public.organization_batches%rowtype;
  v_org public.organizations%rowtype;
  v_already boolean := FALSE;
  v_joinable boolean;
  v_reason text := NULL;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF v_token = '' THEN
    RAISE EXCEPTION 'Invite token is required';
  END IF;

  SELECT
    *
  INTO
    v_batch
  FROM
    public.organization_batches
  WHERE
    invite_token = v_token;
  IF NOT found THEN
    RETURN jsonb_build_object('found', FALSE);
  END IF;

  SELECT
    *
  INTO
    v_org
  FROM
    public.organizations
  WHERE
    id = v_batch.organization_id;

  SELECT
    EXISTS (
      SELECT
        1
      FROM
        public.organization_participants p
      WHERE
        p.batch_id = v_batch.id
        AND p.user_id = v_actor)
  INTO
    v_already;
  -- Alasan tidak bisa bergabung dikembalikan apa adanya supaya halaman dapat
  -- menjelaskan, bukan sekadar menolak tanpa keterangan.
  IF v_already THEN
    v_joinable := FALSE;
    v_reason := 'already_joined';
  ELSIF v_batch.status NOT IN ('draft', 'active') THEN
    v_joinable := FALSE;
    v_reason := 'batch_closed';
  ELSIF v_org.status <> 'active' THEN
    v_joinable := FALSE;
    v_reason := 'organization_inactive';
  ELSE
    v_joinable := TRUE;
  END IF;

  RETURN jsonb_build_object('found', TRUE, 'joinable', v_joinable, 'reason', v_reason, 'already_joined', v_already, 'batch', jsonb_build_object('id', v_batch.id, 'code', v_batch.code, 'name', v_batch.name, 'status', v_batch.status, 'starts_at', v_batch.starts_at, 'ends_at', v_batch.ends_at), 'organization', jsonb_build_object('id', v_org.id, 'name', v_org.name, 'code', v_org.code, 'city', v_org.city, 'province', v_org.province, 'status', v_org.status));
END;
$function$;

-- -----------------------------------------------------------------------------
-- 2. Bergabung ke batch dengan token undangan.
--    Selalu bertindak atas nama `auth.uid()` — tidak menerima user_id dari klien.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.join_batch_with_invite (p_token text, p_full_name text DEFAULT NULL, p_phone text DEFAULT NULL, p_unit text DEFAULT NULL, p_jabatan text DEFAULT NULL)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
DECLARE
  v_actor uuid := auth.uid ();
  v_token text := btrim(coalesce(p_token, ''));
  v_batch public.organization_batches%rowtype;
  v_org public.organizations%rowtype;
  v_existing public.organization_participants%rowtype;
  v_profile public.profiles%rowtype;
  v_email text;
  v_name text;
  v_code text;
  v_seq integer;
  v_pid uuid;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF v_token = '' THEN
    RAISE EXCEPTION 'Invite token is required';
  END IF;
  -- Kunci baris batch: menyerialkan pembuatan kode peserta sekaligus
  -- mencegah dua permintaan bersamaan membuat dua baris untuk user yang sama.
  SELECT
    *
  INTO
    v_batch
  FROM
    public.organization_batches
  WHERE
    invite_token = v_token
  FOR UPDATE;

  IF NOT found THEN
    RAISE EXCEPTION 'Invite link is not valid';
  END IF;

  SELECT
    *
  INTO
    v_org
  FROM
    public.organizations
  WHERE
    id = v_batch.organization_id;

  IF v_batch.status NOT IN ('draft', 'active') THEN
    RAISE EXCEPTION 'This batch is no longer open';
  END IF;

  IF v_org.status <> 'active' THEN
    RAISE EXCEPTION 'This organization is inactive';
  END IF;
  -- Sudah pernah bergabung -> idempoten, kembalikan baris yang ada.
  SELECT
    *
  INTO
    v_existing
  FROM
    public.organization_participants
  WHERE
    batch_id = v_batch.id
    AND user_id = v_actor;

  IF found THEN
    RETURN jsonb_build_object('joined', TRUE, 'already_joined', TRUE, 'participant_id', v_existing.id, 'participant_code', v_existing.participant_code, 'batch_id', v_batch.id, 'organization_id', v_org.id);
  END IF;

  SELECT
    *
  INTO
    v_profile
  FROM
    public.profiles
  WHERE
    id = v_actor;
  SELECT
    au.email::text
  INTO
    v_email
  FROM
    auth.users au
  WHERE
    au.id = v_actor;

  v_name := nullif (btrim(coalesce(p_full_name, '')), '');
  IF v_name IS NULL THEN
    v_name := nullif (btrim(coalesce(v_profile.full_name, '')), '');
  END IF;
  IF v_name IS NULL THEN
    v_name := nullif (btrim(coalesce(v_profile.display_name, '')), '');
  END IF;
  IF v_name IS NULL THEN
    v_name := split_part(coalesce(v_email, 'Peserta'), '@', 1);
  END IF;
  -- Penjaga 3: klaim baris hasil import yang cocok berdasarkan email, jangan
  -- buat baris kedua untuk orang yang sama.
  IF v_email IS NOT NULL THEN
    SELECT
      *
    INTO
      v_existing
    FROM
      public.organization_participants
    WHERE
      batch_id = v_batch.id
      AND user_id IS NULL
      AND lower(email_snapshot) = lower(v_email)
    FOR UPDATE;

    IF found THEN
      UPDATE
        public.organization_participants
      SET
        user_id = v_actor,
        full_name_snapshot = CASE WHEN btrim(coalesce(full_name_snapshot, '')) = '' THEN
          v_name
        ELSE
          full_name_snapshot
        END, phone_snapshot = coalesce(phone_snapshot, nullif (btrim(coalesce(p_phone, '')), '')), unit = coalesce(unit, nullif (btrim(coalesce(p_unit, '')), '')), jabatan = coalesce(jabatan, nullif (btrim(coalesce(p_jabatan, '')), '')), status = CASE WHEN status = 'registered' THEN
                      'active'
                    ELSE
                      status
                    END, updated_at = now()
                  WHERE
                    id = v_existing.id;

      RETURN jsonb_build_object('joined', TRUE, 'claimed', TRUE, 'already_joined', FALSE, 'participant_id', v_existing.id, 'participant_code', v_existing.participant_code, 'batch_id', v_batch.id, 'organization_id', v_org.id);
    END IF;
  END IF;
  -- Kode peserta otomatis: <KODE-BATCH>-NNN, unik di dalam batch.
  SELECT
    count(*) + 1
  INTO
    v_seq
  FROM
    public.organization_participants
  WHERE
    batch_id = v_batch.id;

  LOOP
    v_code := v_batch.code || '-' || lpad(v_seq::text, 3, '0');
    exit
    WHEN NOT EXISTS (
        SELECT
          1
        FROM
          public.organization_participants
        WHERE
          batch_id = v_batch.id
          AND upper(participant_code) = upper(v_code));
    v_seq := v_seq + 1;
  END LOOP;

  INSERT INTO public.organization_participants (organization_id, batch_id, user_id, participant_code, full_name_snapshot, email_snapshot, phone_snapshot, unit, jabatan, status)
    VALUES (v_org.id, v_batch.id, v_actor, v_code, v_name, v_email, nullif (btrim(coalesce(p_phone, '')), ''), nullif (btrim(coalesce(p_unit, '')), ''), nullif (btrim(coalesce(p_jabatan, '')), ''), 'active')
              RETURNING
                id
              INTO
                v_pid;

  RETURN jsonb_build_object('joined', TRUE, 'claimed', FALSE, 'already_joined', FALSE, 'participant_id', v_pid, 'participant_code', v_code, 'batch_id', v_batch.id, 'organization_id', v_org.id);
END;
$function$;

-- -----------------------------------------------------------------------------
-- 3. Keanggotaan instansi milik pemanggil, untuk dashboard peserta (PRD §10A.3).
--    Hanya membaca; tidak butuh organization.manage karena ini data sendiri.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_my_organization_memberships ()
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

  RETURN jsonb_build_object('memberships', coalesce((
      SELECT
        jsonb_agg(jsonb_build_object('participant_id', p.id, 'participant_code', p.participant_code, 'status', p.status, 'batch_id', b.id, 'batch_code', b.code, 'batch_name', b.name, 'batch_status', b.status, 'starts_at', b.starts_at, 'ends_at', b.ends_at, 'organization_id', o.id, 'organization_name', o.name, 'organization_code', o.code)
      ORDER BY b.created_at DESC)
      FROM public.organization_participants p
      JOIN public.organization_batches b ON b.id = p.batch_id
      JOIN public.organizations o ON o.id = p.organization_id
      WHERE
        p.user_id = v_actor
        AND p.status <> 'withdrawn'), '[]'::jsonb));
END;
$function$;

-- -----------------------------------------------------------------------------
-- ACL.
-- -----------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.get_batch_invite (text) FROM public, anon;

REVOKE ALL ON FUNCTION public.join_batch_with_invite (text, text, text, text, text) FROM public, anon;

REVOKE ALL ON FUNCTION public.get_my_organization_memberships () FROM public, anon;

GRANT EXECUTE ON FUNCTION public.get_batch_invite (text) TO authenticated;

GRANT EXECUTE ON FUNCTION public.join_batch_with_invite (text, text, text, text, text) TO authenticated;

GRANT EXECUTE ON FUNCTION public.get_my_organization_memberships () TO authenticated;
