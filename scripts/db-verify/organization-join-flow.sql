-- Verifikasi self-onboarding peserta (Fase 3 MVP CPNS Instansi Managed Service).
--
-- Cara pakai (staging):
--   supabase db query --linked --file scripts/db-verify/organization-join-flow.sql
--
-- Seluruh alur berjalan di dalam transaksi yang di-ROLLBACK. Membuktikan:
--   1. batch & token undangan terbentuk;
--   2. pratinjau token menampilkan instansi dan status "bisa bergabung";
--   3. bergabung menghasilkan kode peserta otomatis;
--   4. bergabung ULANG bersifat idempoten (kode sama, tidak ada baris kedua);
--   5. token palsu ditolak;
--   6. batch yang sudah ditutup tidak menerima peserta baru;
--   7. baris peserta hasil IMPORT diklaim berdasarkan email, bukan diduplikasi —
--      kode import dipakai ulang, nama import dipertahankan, status naik
--      menjadi aktif, dan tetap hanya ada SATU baris.
declare
  v_org uuid; v_batch uuid; v_token text; v_out jsonb := '{}'::jsonb; v_msg text;
  v_admin uuid := '93b4d35b-a1fb-4a16-9304-fef1116002cf';
  v_other uuid := '1d6ec5f4-db90-4575-a679-5869adf43817';
  v_r1 jsonb; v_r2 jsonb; v_inv jsonb;
begin
  -- admin menyiapkan instansi + batch aktif
  perform set_config('request.jwt.claims', json_build_object('sub', v_admin::text, 'role','authenticated')::text, true);
  v_org := ((public.admin_upsert_organization(null,'SMAN 2 Tanjungbalai','SMAN2-TB','sekolah',
            'Tanjungbalai','Sumatera Utara',null,'Kepala Sekolah','pic@sman2.example','08123','active',null))->>'id')::uuid;
  perform set_config('request.jwt.claims', json_build_object('sub', v_admin::text, 'role','authenticated')::text, true);
  v_batch := ((public.admin_upsert_batch(null, v_org, 'CPNS-2026-A','CPNS 2026 Batch A',
              '2026-10-01 08:00+07','2026-10-01 12:00+07','active',null))->>'id')::uuid;
  v_token := (public.admin_get_organization(v_org))->'batches'->0->>'invite_token';
  v_out := v_out || jsonb_build_object('1_batch_dibuat', v_batch is not null, '1_token_ada', length(v_token) = 32);

  -- pratinjau sebelum join (sebagai peserta lain)
  perform set_config('request.jwt.claims', json_build_object('sub', v_other::text, 'role','authenticated')::text, true);
  v_inv := public.get_batch_invite(v_token);
  v_out := v_out || jsonb_build_object('2_pratinjau_found', (v_inv->>'found')::bool,
             '2_bisa_gabung', (v_inv->>'joinable')::bool,
             '2_nama_instansi', v_inv->'organization'->>'name');

  -- bergabung
  v_r1 := public.join_batch_with_invite(v_token, 'Peserta Uji', '08999', 'Unit A', 'Staf');
  v_out := v_out || jsonb_build_object('3_join', (v_r1->>'joined')::bool,
             '3_kode', v_r1->>'participant_code', '3_klaim', (v_r1->>'claimed')::bool);

  -- idempoten: join lagi
  v_r2 := public.join_batch_with_invite(v_token, 'Nama Lain');
  v_out := v_out || jsonb_build_object('4_join_ulang_idempoten',
             (v_r2->>'already_joined')::bool,
             '4_kode_sama', (v_r2->>'participant_code') = (v_r1->>'participant_code'));

  -- token palsu
  begin perform public.join_batch_with_invite('token-palsu'); v_msg := 'TIDAK DITOLAK';
  exception when others then v_msg := sqlerrm; end;
  v_out := v_out || jsonb_build_object('5_token_palsu', v_msg);

  -- batch ditutup -> tidak bisa join
  perform set_config('request.jwt.claims', json_build_object('sub', v_admin::text, 'role','authenticated')::text, true);
  perform public.admin_upsert_batch(v_batch, v_org, 'CPNS-2026-A','CPNS 2026 Batch A',
          '2026-10-01 08:00+07','2026-10-01 12:00+07','closed',null);
  perform set_config('request.jwt.claims', json_build_object('sub', v_other::text, 'role','authenticated')::text, true);
  begin perform public.join_batch_with_invite(v_token); v_msg := 'TIDAK DITOLAK';
  exception when others then v_msg := sqlerrm; end;
  v_out := v_out || jsonb_build_object('6_batch_ditutup', v_msg);

  -- keanggotaan milik peserta
  v_out := v_out || jsonb_build_object('7_keanggotaan', jsonb_array_length(
             (public.get_my_organization_memberships())->'memberships'));

  return v_out;
end $$;
declare
  v_org uuid; v_batch uuid; v_token text; v_out jsonb := '{}'::jsonb;
  v_admin uuid := '93b4d35b-a1fb-4a16-9304-fef1116002cf';
  v_peserta uuid := '4cf7114c-7613-4676-9aa9-64793f855f04';
  v_email text; v_r jsonb; v_row record; v_before int; v_after int;
begin
  select au.email::text into v_email from auth.users au where au.id = v_peserta;
  v_out := v_out || jsonb_build_object('0_email_peserta', v_email);

  perform set_config('request.jwt.claims', json_build_object('sub', v_admin::text,'role','authenticated')::text, true);
  v_org := ((public.admin_upsert_organization(null,'Instansi Klaim','KLAIM-1','instansi',
            null,null,null,null,null,null,'active',null))->>'id')::uuid;
  v_batch := ((public.admin_upsert_batch(null, v_org,'B-KLAIM','Batch Klaim',null,null,'active',null))->>'id')::uuid;
  v_token := (public.admin_get_organization(v_org))->'batches'->0->>'invite_token';

  -- admin "mengimpor" peserta: baris tanpa akun, email cocok dengan pengguna nanti
  insert into public.organization_participants (
    organization_id, batch_id, user_id, participant_code, full_name_snapshot, email_snapshot, status
  ) values (v_org, v_batch, null, 'IMP-001', 'Nama Dari Import', v_email, 'registered');

  select count(*) into v_before from public.organization_participants where batch_id = v_batch;

  perform set_config('request.jwt.claims', json_build_object('sub', v_peserta::text,'role','authenticated')::text, true);
  v_r := public.join_batch_with_invite(v_token, 'Nama Dari Peserta');

  select count(*) into v_after from public.organization_participants where batch_id = v_batch;
  select * into v_row from public.organization_participants where batch_id = v_batch;

  v_out := v_out || jsonb_build_object(
    '1_diklaim', (v_r->>'claimed')::bool,
    '2_kode_dipakai_ulang', (v_r->>'participant_code') = 'IMP-001',
    '3_tidak_ada_duplikat', v_before = 1 and v_after = 1,
    '4_nama_import_dipertahankan', v_row.full_name_snapshot = 'Nama Dari Import',
    '5_status_naik_jadi_aktif', v_row.status = 'active',
    '6_user_tertaut', v_row.user_id = v_peserta);

  -- kedua kali: idempoten, tetap satu baris
  v_r := public.join_batch_with_invite(v_token);
  select count(*) into v_after from public.organization_participants where batch_id = v_batch;
  v_out := v_out || jsonb_build_object('7_ulang_idempoten', (v_r->>'already_joined')::bool, '8_tetap_satu_baris', v_after = 1);

  return v_out;
end $$;

begin;
select jsonb_pretty(jsonb_build_object(
  'alur_join', public.__test_join_flow(),
  'alur_klaim_import', public.__test_claim_flow()
));
rollback;

drop function if exists public.__test_join_flow();
drop function if exists public.__test_claim_flow();
