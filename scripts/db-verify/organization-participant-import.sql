-- Verifikasi bulk import peserta (Fase 4 MVP CPNS Instansi Managed Service, PRD §7.2.1).
--
-- Cara pakai (staging):
--   supabase db query --linked --file scripts/db-verify/organization-participant-import.sql
--
-- Seluruh alur berjalan di dalam transaksi yang di-ROLLBACK. Membuktikan:
--   1. dry-run TIDAK menulis apa pun, tetapi tetap melaporkan hasil per baris;
--   2. validasi menolak nama kosong, email salah format, kode ganda di dalam
--      berkas, dan baris tanpa identifier sama sekali;
--   3. kode peserta kosong dibuat otomatis dari kode batch;
--   4. commit hanya memasukkan baris yang sah — baris bermasalah tidak
--      membatalkan baris lainnya;
--   5. mengunggah ULANG berkas yang sama bersifat idempoten: baris yang sudah ada
--      dilaporkan `duplicate`, bukan digandakan maupun ditimpa;
--   6. penjaga menolak batch tidak dikenal, berkas kosong, dan lebih dari 2000 baris.
declare
  v_admin uuid := '93b4d35b-a1fb-4a16-9304-fef1116002cf';
  v_org uuid; v_batch uuid; v_out jsonb := '{}'::jsonb;
  v_dry jsonb; v_commit jsonb; v_again jsonb; v_cnt integer;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', v_admin::text,'role','authenticated')::text, true);
  v_org := ((public.admin_upsert_organization(null,'Instansi Import','IMP-1','instansi',null,null,null,null,null,null,'active',null))->>'id')::uuid;
  v_batch := ((public.admin_upsert_batch(null, v_org,'B-IMP','Batch Import',null,null,'active',null))->>'id')::uuid;

  -- Berkas: 2 sah, 1 tanpa nama, 1 email salah, 1 duplikat dalam berkas,
  -- 1 tanpa identifier, 1 kode kosong (harus dibuat otomatis)
  v_dry := public.admin_import_participants(v_batch, '[
    {"line":2,"participant_code":"A-001","full_name":"Andi","email":"andi@x.id","phone":"081234567890"},
    {"line":3,"participant_code":"A-002","full_name":"Budi","email":"budi@x.id"},
    {"line":4,"participant_code":"A-003","email":"tanpa-nama@x.id"},
    {"line":5,"participant_code":"A-004","full_name":"Email Salah","email":"bukan-email"},
    {"line":6,"participant_code":"A-005","full_name":"Duplikat Kode","email":"dup@x.id"},
    {"line":7,"participant_code":"A-005","full_name":"Duplikat Kode Lagi","email":"dup2@x.id"},
    {"line":8,"full_name":"Tanpa Identifier"},
    {"line":9,"full_name":"Kode Otomatis","email":"otomatis@x.id"}
  ]'::jsonb, true);

  v_out := v_out || jsonb_build_object(
    '1_dry_run', v_dry->>'dry_run',
    '2_total', (v_dry->>'total')::int,
    '3_ok', (v_dry->>'ok')::int,
    '4_error', (v_dry->>'error')::int,
    '5_duplicate', (v_dry->>'duplicate')::int,
    '6_imported_nol_saat_dry', (v_dry->>'imported')::int);

  select count(*) into v_cnt from public.organization_participants where batch_id = v_batch;
  v_out := v_out || jsonb_build_object('7_dry_run_tidak_menulis', v_cnt = 0);

  -- Kode otomatis pada baris 9 harus memakai kode batch
  v_out := v_out || jsonb_build_object('8_kode_otomatis',
    (select r->>'participant_code' from jsonb_array_elements(v_dry->'rows') r where (r->>'line')::int = 9));

  -- Pesan kesalahan per baris
  v_out := v_out || jsonb_build_object('9_error_baris_4',
    (select r->'errors'->>0 from jsonb_array_elements(v_dry->'rows') r where (r->>'line')::int = 4),
    '10_error_baris_8',
    (select r->'errors'->>0 from jsonb_array_elements(v_dry->'rows') r where (r->>'line')::int = 8));

  -- Commit
  v_commit := public.admin_import_participants(v_batch, '[
    {"line":2,"participant_code":"A-001","full_name":"Andi","email":"andi@x.id","phone":"081234567890"},
    {"line":3,"participant_code":"A-002","full_name":"Budi","email":"budi@x.id"},
    {"line":4,"participant_code":"A-003","email":"tanpa-nama@x.id"},
    {"line":5,"participant_code":"A-004","full_name":"Email Salah","email":"bukan-email"},
    {"line":6,"participant_code":"A-005","full_name":"Duplikat Kode","email":"dup@x.id"},
    {"line":7,"participant_code":"A-005","full_name":"Duplikat Kode Lagi","email":"dup2@x.id"},
    {"line":8,"full_name":"Tanpa Identifier"},
    {"line":9,"full_name":"Kode Otomatis","email":"otomatis@x.id"}
  ]'::jsonb, false);

  select count(*) into v_cnt from public.organization_participants where batch_id = v_batch;
  v_out := v_out || jsonb_build_object('11_commit_imported', (v_commit->>'imported')::int, '12_baris_di_db', v_cnt);

  -- Idempotensi: unggah berkas yang SAMA lagi
  v_again := public.admin_import_participants(v_batch, '[
    {"line":2,"participant_code":"A-001","full_name":"Andi","email":"andi@x.id","phone":"081234567890"},
    {"line":3,"participant_code":"A-002","full_name":"Budi","email":"budi@x.id"},
    {"line":4,"participant_code":"A-003","full_name":"Tanpa Nama","email":"tanpa-nama@x.id"}
  ]'::jsonb, false);

  select count(*) into v_cnt from public.organization_participants where batch_id = v_batch;
  v_out := v_out || jsonb_build_object(
    '13_ulang_imported', (v_again->>'imported')::int,
    '14_ulang_duplicate', (v_again->>'duplicate')::int,
    '15_baris_tetap', v_cnt = 5,
    '16_nama_lama_dipertahankan',
      (select full_name_snapshot from public.organization_participants where batch_id = v_batch and participant_code = 'A-003') = 'Tanpa Nama');

  -- Penjaga: batch tidak ada, dan batas 2000 baris
  begin perform public.admin_import_participants(gen_random_uuid(), '[{"full_name":"X"}]'::jsonb, true);
    v_out := v_out || jsonb_build_object('17_batch_tidak_ada','TIDAK DITOLAK');
  exception when others then v_out := v_out || jsonb_build_object('17_batch_tidak_ada', sqlerrm); end;

  begin perform public.admin_import_participants(v_batch, '[]'::jsonb, true);
    v_out := v_out || jsonb_build_object('18_berkas_kosong','TIDAK DITOLAK');
  exception when others then v_out := v_out || jsonb_build_object('18_berkas_kosong', sqlerrm); end;

  begin perform public.admin_import_participants(v_batch,
      (select jsonb_agg(jsonb_build_object('full_name','X','email','x'||i||'@y.id')) from generate_series(1,2001) i), true);
    v_out := v_out || jsonb_build_object('19_lebih_2000','TIDAK DITOLAK');
  exception when others then v_out := v_out || jsonb_build_object('19_lebih_2000', sqlerrm); end;

  return v_out;
end $$;

begin;
select jsonb_pretty(public.__test_import_flow());
rollback;

drop function if exists public.__test_import_flow();
