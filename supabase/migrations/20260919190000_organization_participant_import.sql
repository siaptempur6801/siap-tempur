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

create or replace function public.admin_import_participants(
    p_batch_id uuid,
    p_rows     jsonb,
    p_dry_run  boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
    v_actor        uuid := auth.uid();
    v_batch        public.organization_batches%rowtype;
    v_org          public.organizations%rowtype;
    v_row          jsonb;
    v_index        integer := 0;
    v_line         integer;
    v_code         text;
    v_name         text;
    v_email        text;
    v_phone        text;
    v_errors       jsonb;
    v_results      jsonb := '[]'::jsonb;
    v_seen_codes   text[] := '{}';
    v_seen_emails  text[] := '{}';
    v_seen_phones  text[] := '{}';
    v_used_codes   text[] := '{}';
    v_ok           integer := 0;
    v_duplicate    integer := 0;
    v_error        integer := 0;
    v_total        integer := 0;
    v_seq          integer;
    v_candidate    text;
begin
    if v_actor is null then
        raise exception 'Authentication required';
    end if;

    if not app_private.current_user_has_permission('organization.manage') then
        raise exception 'Organization manage permission required';
    end if;

    select * into v_batch from public.organization_batches where id = p_batch_id;
    if not found then
        raise exception 'Batch not found';
    end if;

    select * into v_org from public.organizations where id = v_batch.organization_id;
    if v_org.status <> 'active' then
        raise exception 'Organization is inactive';
    end if;

    if p_rows is null or jsonb_typeof(p_rows) <> 'array' then
        raise exception 'Import rows must be an array';
    end if;

    v_total := jsonb_array_length(p_rows);
    if v_total = 0 then
        raise exception 'There is nothing to import';
    end if;

    -- Penjaga 1.
    if v_total > 2000 then
        raise exception 'A single import is limited to 2000 rows, received %', v_total;
    end if;

    -- Kode yang sudah dipakai di batch ini, supaya pembuatan kode otomatis tidak
    -- menabrak data lama.
    select coalesce(array_agg(upper(participant_code)), '{}')
      into v_used_codes
      from public.organization_participants
     where batch_id = p_batch_id;

    select count(*) + 1 into v_seq
      from public.organization_participants where batch_id = p_batch_id;

    for v_row in select * from jsonb_array_elements(p_rows)
    loop
        v_index := v_index + 1;
        v_errors := '[]'::jsonb;

        -- Nomor baris di berkas asli, dikirim klien, supaya pesan kesalahan
        -- menunjuk baris yang benar-benar dilihat pengguna di Excel.
        v_line := coalesce(nullif(v_row->>'line', '')::integer, v_index + 1);

        v_code  := upper(btrim(coalesce(v_row->>'participant_code', '')));
        v_name  := btrim(coalesce(v_row->>'full_name', ''));
        v_email := lower(btrim(coalesce(v_row->>'email', '')));
        v_phone := btrim(coalesce(v_row->>'phone', ''));

        -- ---------------------------------------------------------- validasi
        if length(v_name) < 2 then
            v_errors := v_errors || to_jsonb('Nama wajib diisi'::text);
        end if;

        if v_code <> '' and v_code !~ '^[A-Z0-9][A-Z0-9._-]{0,31}$' then
            v_errors := v_errors || to_jsonb('Kode peserta hanya boleh A-Z, 0-9, titik, garis bawah, atau strip (maks 32)'::text);
        end if;

        if v_email <> '' and v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
            v_errors := v_errors || to_jsonb('Format email tidak valid'::text);
        end if;

        if v_phone <> '' and v_phone !~ '^[0-9+][0-9[:space:]()-]{7,19}$' then
            v_errors := v_errors || to_jsonb('Format nomor HP tidak valid'::text);
        end if;

        -- §7.2.1: dedupe butuh minimal satu identifier. Tanpa salah satunya,
        -- baris tidak dapat dicocokkan dengan akun maupun dengan import berikutnya.
        if v_code = '' and v_email = '' and v_phone = '' then
            v_errors := v_errors || to_jsonb('Isi minimal salah satu: kode peserta, email, atau nomor HP'::text);
        end if;

        -- Duplikat DI DALAM berkas.
        if v_code <> '' and v_code = any (v_seen_codes) then
            v_errors := v_errors || to_jsonb('Kode peserta muncul lebih dari sekali di berkas ini'::text);
        end if;
        if v_email <> '' and v_email = any (v_seen_emails) then
            v_errors := v_errors || to_jsonb('Email muncul lebih dari sekali di berkas ini'::text);
        end if;
        if v_phone <> '' and v_phone = any (v_seen_phones) then
            v_errors := v_errors || to_jsonb('Nomor HP muncul lebih dari sekali di berkas ini'::text);
        end if;

        if v_code <> '' then v_seen_codes := v_seen_codes || v_code; end if;
        if v_email <> '' then v_seen_emails := v_seen_emails || v_email; end if;
        if v_phone <> '' then v_seen_phones := v_seen_phones || v_phone; end if;

        if jsonb_array_length(v_errors) > 0 then
            v_error := v_error + 1;
            v_results := v_results || jsonb_build_object(
                'line', v_line,
                'status', 'error',
                'participant_code', v_code,
                'full_name', v_name,
                'email', v_email,
                'phone', v_phone,
                'errors', v_errors
            );
            continue;
        end if;

        -- Duplikat terhadap data yang sudah ada di batch. Ini BUKAN kesalahan:
        -- mengunggah ulang berkas yang sama harus aman (idempotent, §7.2.1).
        if (v_code <> '' and exists (
                select 1 from public.organization_participants p
                 where p.batch_id = p_batch_id and upper(p.participant_code) = v_code))
           or (v_email <> '' and exists (
                select 1 from public.organization_participants p
                 where p.batch_id = p_batch_id and lower(p.email_snapshot) = v_email))
           or (v_phone <> '' and exists (
                select 1 from public.organization_participants p
                 where p.batch_id = p_batch_id and p.phone_snapshot = v_phone))
        then
            v_duplicate := v_duplicate + 1;
            v_results := v_results || jsonb_build_object(
                'line', v_line,
                'status', 'duplicate',
                'participant_code', v_code,
                'full_name', v_name,
                'email', v_email,
                'phone', v_phone,
                'errors', '[]'::jsonb
            );
            continue;
        end if;

        -- Kode otomatis bila kosong, dijamin tidak menabrak kode yang sudah ada
        -- maupun yang baru diberikan pada berkas ini.
        if v_code = '' then
            loop
                v_candidate := v_batch.code || '-' || lpad(v_seq::text, 3, '0');
                exit when not (v_candidate = any (v_used_codes));
                v_seq := v_seq + 1;
            end loop;
            v_code := v_candidate;
            v_seq := v_seq + 1;
        end if;
        v_used_codes := v_used_codes || v_code;

        v_ok := v_ok + 1;
        v_results := v_results || jsonb_build_object(
            'line', v_line,
            'status', 'ok',
            'participant_code', v_code,
            'full_name', v_name,
            'email', v_email,
            'phone', v_phone,
            'errors', '[]'::jsonb
        );

        -- Penjaga 2: hanya menambah, tidak pernah menimpa.
        if not coalesce(p_dry_run, true) then
            insert into public.organization_participants (
                organization_id, batch_id, user_id, participant_code,
                full_name_snapshot, email_snapshot, phone_snapshot,
                nik, unit, jabatan, custom_metadata, notes, status
            ) values (
                v_org.id, p_batch_id, null, v_code,
                v_name,
                nullif(v_email, ''), nullif(v_phone, ''),
                nullif(btrim(coalesce(v_row->>'nik', '')), ''),
                nullif(btrim(coalesce(v_row->>'unit', '')), ''),
                nullif(btrim(coalesce(v_row->>'jabatan', '')), ''),
                case when jsonb_typeof(v_row->'custom_metadata') = 'object'
                     then v_row->'custom_metadata' else null end,
                nullif(btrim(coalesce(v_row->>'notes', '')), ''),
                'registered'
            );
        end if;
    end loop;

    return jsonb_build_object(
        'dry_run', coalesce(p_dry_run, true),
        'batch_id', p_batch_id,
        'total', v_total,
        'ok', v_ok,
        'duplicate', v_duplicate,
        'error', v_error,
        'imported', case when coalesce(p_dry_run, true) then 0 else v_ok end,
        'rows', v_results
    );
end;
$function$;

revoke all on function public.admin_import_participants(uuid, jsonb, boolean) from public, anon;
grant execute on function public.admin_import_participants(uuid, jsonb, boolean) to authenticated;
