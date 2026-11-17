-- =============================================================================
-- MVP CPNS Instansi Managed Service — Fase 4: bulk import peserta
--
-- Sumber: PRD §6.3 (manajemen peserta), §7.2 (data peserta),
--         §7.2.1 (Bulk Import), §14 langkah 5.
--
-- KEBUTUHAN §7.2.1 DAN CARA DIPENUHINYA
--   "template Excel atau CSV baku"        -> kolom tetap, lihat app/admin/organizations
--   "preview data sebelum submit"         -> p_dry_run
--   "validasi per baris"                  -> hasil per baris, bukan gagal total
--   "dedupe berdasarkan identifier utama" -> kode peserta, email, telepon
--   "import yang idempotent"              -> mengulang berkas yang sama tidak
--                                            menambah baris (dilaporkan `duplicate`)
--   "file error yang bisa diunduh"        -> baris berstatus error dikembalikan
--                                            lengkap beserta nomor barisnya
--
-- KENAPA SATU FUNGSI UNTUK PREVIEW DAN COMMIT
--   Validasi ada di SATU jalur kode dengan `p_dry_run`. Kalau preview divalidasi
--   di TypeScript dan commit divalidasi di SQL, keduanya pasti menyimpang cepat
--   atau lambat — dan pengguna akan melihat "preview bersih" lalu ditolak saat
--   menekan Impor, atau sebaliknya.
--
-- PENJAGA
--   1. `p_rows` dibatasi 2000 baris: satu permintaan tidak boleh menyita
--      transaksi tanpa batas.
--   2. Import HANYA menambah. Peserta yang sudah ada tidak pernah ditimpa —
--      snapshot dan status yang sudah berjalan (mis. sudah mengerjakan ujian)
--      tidak boleh berubah karena unggahan berkas.
--   3. Baris bermasalah tidak membatalkan baris yang sah. Import sebagian jauh
--      lebih berguna daripada gagal total, dan hasilnya dilaporkan per baris
--      supaya sisanya bisa diperbaiki lalu diunggah ulang.
--   4. Kode peserta yang kosong dibuat otomatis dan dijamin unik di dalam batch,
--      baik terhadap data yang sudah ada maupun antar baris dalam berkas.
--   5. `participant_code` yang sudah dipakai di batch lain TIDAK masalah — kode
--      hanya unik per batch.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.admin_import_participants (p_batch_id uuid, p_rows jsonb, p_dry_run boolean DEFAULT TRUE)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
DECLARE
  v_actor uuid := auth.uid ();
  v_batch public.organization_batches%rowtype;
  v_org public.organizations%rowtype;
  v_row jsonb;
  v_index integer := 0;
  v_line integer;
  v_code text;
  v_name text;
  v_email text;
  v_phone text;
  v_errors jsonb;
  v_results jsonb := '[]'::jsonb;
  v_seen_codes text[] := '{}';
  v_seen_emails text[] := '{}';
  v_seen_phones text[] := '{}';
  v_used_codes text[] := '{}';
  v_ok integer := 0;
  v_duplicate integer := 0;
  v_error integer := 0;
  v_total integer := 0;
  v_seq integer;
  v_candidate text;
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
    v_batch
  FROM
    public.organization_batches
  WHERE
    id = p_batch_id;
  IF NOT found THEN
    RAISE EXCEPTION 'Batch not found';
  END IF;

  SELECT
    *
  INTO
    v_org
  FROM
    public.organizations
  WHERE
    id = v_batch.organization_id;
  IF v_org.status <> 'active' THEN
    RAISE EXCEPTION 'Organization is inactive';
  END IF;

  IF p_rows IS NULL OR jsonb_typeof(p_rows) <> 'array' THEN
    RAISE EXCEPTION 'Import rows must be an array';
  END IF;

  v_total := jsonb_array_length(p_rows);
  IF v_total = 0 THEN
    RAISE EXCEPTION 'There is nothing to import';
  END IF;
  -- Penjaga 1.
  IF v_total > 2000 THEN
    RAISE EXCEPTION 'A single import is limited to 2000 rows, received %', v_total;
  END IF;
  -- Kode yang sudah dipakai di batch ini, supaya pembuatan kode otomatis tidak
  -- menabrak data lama.
  SELECT
    coalesce(array_agg(upper(participant_code)), '{}')
  INTO
    v_used_codes
  FROM
    public.organization_participants
  WHERE
    batch_id = p_batch_id;

  SELECT
    count(*) + 1
  INTO
    v_seq
  FROM
    public.organization_participants
  WHERE
    batch_id = p_batch_id;

  FOR v_row IN
  SELECT
    *
  FROM
    jsonb_array_elements(p_rows)
    LOOP
      v_index := v_index + 1;
      v_errors := '[]'::jsonb;
      -- Nomor baris di berkas asli, dikirim klien, supaya pesan kesalahan
      -- menunjuk baris yang benar-benar dilihat pengguna di Excel.
      v_line := coalesce(nullif (v_row ->> 'line', '')::integer, v_index + 1);

      v_code := upper(btrim(coalesce(v_row ->> 'participant_code', '')));
      v_name := btrim(coalesce(v_row ->> 'full_name', ''));
      v_email := lower(btrim(coalesce(v_row ->> 'email', '')));
      v_phone := btrim(coalesce(v_row ->> 'phone', ''));
      -- ---------------------------------------------------------- validasi
      IF length(v_name) < 2 THEN
        v_errors := v_errors || to_jsonb ('Nama wajib diisi'::text);
      END IF;

      IF v_code <> '' AND v_code !~ '^[A-Z0-9][A-Z0-9._-]{0,31}$' THEN
        v_errors := v_errors || to_jsonb ('Kode peserta hanya boleh A-Z, 0-9, titik, garis bawah, atau strip (maks 32)'::text);
      END IF;

      IF v_email <> '' AND v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' THEN
        v_errors := v_errors || to_jsonb ('Format email tidak valid'::text);
      END IF;

      IF v_phone <> '' AND v_phone !~ '^[0-9+][0-9[:space:]()-]{7,19}$' THEN
        v_errors := v_errors || to_jsonb ('Format nomor HP tidak valid'::text);
      END IF;
      -- §7.2.1: dedupe butuh minimal satu identifier. Tanpa salah satunya,
      -- baris tidak dapat dicocokkan dengan akun maupun dengan import berikutnya.
      IF v_code = '' and v_email = '' AND v_phone = '' THEN
        v_errors := v_errors || to_jsonb ('Isi minimal salah satu: kode peserta, email, atau nomor HP'::text);
      END IF;
      -- Duplikat DI DALAM berkas.
      IF v_code <> '' AND v_code = ANY (v_seen_codes) THEN
        v_errors := v_errors || to_jsonb ('Kode peserta muncul lebih dari sekali di berkas ini'::text);
      END IF;
      IF v_email <> '' AND v_email = ANY (v_seen_emails) THEN
        v_errors := v_errors || to_jsonb ('Email muncul lebih dari sekali di berkas ini'::text);
      END IF;
      IF v_phone <> '' AND v_phone = ANY (v_seen_phones) THEN
        v_errors := v_errors || to_jsonb ('Nomor HP muncul lebih dari sekali di berkas ini'::text);
      END IF;

      IF v_code <> '' THEN
        v_seen_codes := v_seen_codes || v_code;
      END IF;
      IF v_email <> '' THEN
        v_seen_emails := v_seen_emails || v_email;
      END IF;
      IF v_phone <> '' THEN
        v_seen_phones := v_seen_phones || v_phone;
      END IF;

      IF jsonb_array_length(v_errors) > 0 THEN
        v_error := v_error + 1;
        v_results := v_results || jsonb_build_object('line', v_line, 'status', 'error', 'participant_code', v_code, 'full_name', v_name, 'email', v_email, 'phone', v_phone, 'errors', v_errors);
        CONTINUE;
      END IF;
      -- Duplikat terhadap data yang sudah ada di batch. Ini BUKAN kesalahan:
      -- mengunggah ulang berkas yang sama harus aman (idempotent, §7.2.1).
      IF (v_code <> '' AND EXISTS (
        SELECT
          1
        FROM
          public.organization_participants p
        WHERE
          p.batch_id = p_batch_id AND upper(p.participant_code) = v_code)) OR (v_email <> '' AND EXISTS (
    SELECT
      1
    FROM
      public.organization_participants p
    WHERE
      p.batch_id = p_batch_id AND lower(p.email_snapshot) = v_email)) OR (v_phone <> '' AND EXISTS (
SELECT
  1
FROM
  public.organization_participants p
WHERE
  p.batch_id = p_batch_id AND p.phone_snapshot = v_phone)) THEN
        v_duplicate := v_duplicate + 1;
        v_results := v_results || jsonb_build_object('line', v_line, 'status', 'duplicate', 'participant_code', v_code, 'full_name', v_name, 'email', v_email, 'phone', v_phone, 'errors', '[]'::jsonb);
        CONTINUE;
      END IF;
      -- Kode otomatis bila kosong, dijamin tidak menabrak kode yang sudah ada
      -- maupun yang baru diberikan pada berkas ini.
      IF v_code = '' THEN
        LOOP
          v_candidate := v_batch.code || '-' || lpad(v_seq::text, 3, '0');
          exit
          WHEN NOT (v_candidate = ANY (v_used_codes));
          v_seq := v_seq + 1;
        END LOOP;
        v_code := v_candidate;
        v_seq := v_seq + 1;
      END IF;
      v_used_codes := v_used_codes || v_code;

      v_ok := v_ok + 1;
      v_results := v_results || jsonb_build_object('line', v_line, 'status', 'ok', 'participant_code', v_code, 'full_name', v_name, 'email', v_email, 'phone', v_phone, 'errors', '[]'::jsonb);
      -- Penjaga 2: hanya menambah, tidak pernah menimpa.
      IF NOT coalesce(p_dry_run, TRUE) THEN
        INSERT INTO public.organization_participants (organization_id, batch_id, user_id, participant_code, full_name_snapshot, email_snapshot, phone_snapshot, nik, unit, jabatan, custom_metadata, notes, status)
          VALUES (v_org.id, p_batch_id, NULL, v_code, v_name, nullif (v_email, ''), nullif(v_phone, ''), nullif (btrim(coalesce(v_row ->> 'nik', '')), ''), nullif (btrim(coalesce(v_row ->> 'unit', '')), ''), nullif (btrim(coalesce(v_row ->> 'jabatan', '')), ''), CASE WHEN jsonb_typeof(v_row -> 'custom_metadata') = 'object' THEN
                          v_row -> 'custom_metadata'
                        ELSE
                          NULL
                        END, nullif (btrim(coalesce(v_row ->> 'notes', '')), ''), 'registered');
      END IF;
    END LOOP;

  RETURN jsonb_build_object('dry_run', coalesce(p_dry_run, TRUE), 'batch_id', p_batch_id, 'total', v_total, 'ok', v_ok, 'duplicate', v_duplicate, 'error', v_error, 'imported', CASE WHEN coalesce(p_dry_run, TRUE) THEN
      0
    ELSE
      v_ok
    END, 'rows', v_results);
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_import_participants (uuid, jsonb, boolean) FROM public, anon;

GRANT EXECUTE ON FUNCTION public.admin_import_participants (uuid, jsonb, boolean) TO authenticated;
