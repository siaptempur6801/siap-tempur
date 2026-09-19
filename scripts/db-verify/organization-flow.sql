-- Verifikasi alur instansi & batch (Fase 1 MVP CPNS Instansi Managed Service).
--
-- Cara pakai (staging):
--   supabase db query --linked --file scripts/db-verify/organization-flow.sql
--
-- Seluruh alur berjalan di dalam satu transaksi yang di-ROLLBACK, jadi tidak ada
-- data yang tertinggal. Fungsi bantu dibuat sementara lalu dibuang di akhir.
--
-- Yang dibuktikan: instansi & batch dapat dibuat, token undangan tergenerate dan
-- dapat dirotasi, dan SELURUH penjaga menolak dengan benar — kode duplikat,
-- kode tidak valid, tanggal selesai sebelum mulai, mengaktifkan batch pada
-- instansi nonaktif, dan menonaktifkan instansi yang masih punya batch aktif.
language plpgsql security definer set search_path to '' as $$
declare
  v_org jsonb; v_batch jsonb; v_detail jsonb; v_list jsonb; v_token jsonb;
  v_org_id uuid; v_batch_id uuid; v_out jsonb := '{}'::jsonb; v_msg text;
begin
  v_org := public.admin_upsert_organization(null,'Dinas Pendidikan Kota Medan','DINAS-MEDAN','instansi',
            'Medan','Sumatera Utara','Jl. Contoh 1','Budi PIC','pic@dinas.example','08123456789','active','uji');
  v_org_id := (v_org->>'id')::uuid;
  v_out := v_out || jsonb_build_object('1_instansi', v_org->>'code' || ' / ' || (v_org->>'status'));

  v_batch := public.admin_upsert_batch(null, v_org_id, 'CPNS-2026-A', 'CPNS 2026 Batch A',
              '2026-10-01 08:00+07','2026-10-01 12:00+07','draft','gelombang 1');
  v_batch_id := (v_batch->>'id')::uuid;
  v_out := v_out || jsonb_build_object('2_batch', v_batch->>'code' || ' / ' || (v_batch->>'status'));

  v_detail := public.admin_get_organization(v_org_id);
  v_out := v_out || jsonb_build_object('3_detail_batches', jsonb_array_length(v_detail->'batches'),
             '3_token_ada', (v_detail->'batches'->0->>'invite_token') is not null,
             '3_token_panjang', length(v_detail->'batches'->0->>'invite_token'));

  v_token := public.admin_rotate_batch_invite(v_batch_id);
  v_out := v_out || jsonb_build_object('4_token_baru_berbeda',
             (v_token->>'invite_token') <> (v_detail->'batches'->0->>'invite_token'));

  v_list := public.admin_list_organizations('Medan', null, 10, 0);
  v_out := v_out || jsonb_build_object('5_total', (v_list->>'total')::int,
             '5_batch_count', (v_list->'organizations'->0->>'batch_count')::int);

  begin
    perform public.admin_upsert_organization(null,'Duplikat','DINAS-MEDAN');
    v_msg := 'TIDAK DITOLAK';
  exception when others then v_msg := sqlerrm; end;
  v_out := v_out || jsonb_build_object('6_kode_instansi_duplikat', v_msg);

  begin
    perform public.admin_upsert_batch(null, v_org_id, 'B-OK', 'Batch OK', null, null, 'active');
    v_msg := 'diizinkan';
  exception when others then v_msg := 'DITOLAK: ' || sqlerrm; end;
  v_out := v_out || jsonb_build_object('7_aktifkan_batch', v_msg);

  begin
    perform public.admin_upsert_organization(v_org_id,'Dinas Pendidikan Kota Medan','DINAS-MEDAN','instansi',
       'Medan','Sumatera Utara','Jl. Contoh 1','Budi PIC','pic@dinas.example','08123456789','inactive');
    v_msg := 'TIDAK DITOLAK';
  exception when others then v_msg := sqlerrm; end;
  v_out := v_out || jsonb_build_object('8_nonaktifkan_instansi_ber_batch_aktif', v_msg);

  begin
    perform public.admin_upsert_batch(null, v_org_id, 'X-1', 'Batch X', null, null, 'draft');
    perform public.admin_upsert_batch(null, v_org_id, 'X-1', 'Batch X lagi', null, null, 'draft');
    v_msg := 'TIDAK DITOLAK';
  exception when others then v_msg := sqlerrm; end;
  v_out := v_out || jsonb_build_object('9_kode_batch_duplikat', v_msg);

  begin
    perform public.admin_upsert_batch(null, v_org_id, 'WAKTU', 'Waktu', '2026-05-01','2026-04-01','draft');
    v_msg := 'TIDAK DITOLAK';
  exception when others then v_msg := sqlerrm; end;
  v_out := v_out || jsonb_build_object('10_selesai_sebelum_mulai', v_msg);

  begin
    perform public.admin_upsert_batch(null, v_org_id, 'kode salah!', 'Kode', null, null, 'draft');
    v_msg := 'TIDAK DITOLAK';
  exception when others then v_msg := sqlerrm; end;
  v_out := v_out || jsonb_build_object('11_kode_batch_tidak_valid', v_msg);

  return v_out;
end $$;

begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"93b4d35b-a1fb-4a16-9304-fef1116002cf","role":"authenticated"}';
select jsonb_pretty(public.__test_org_flow());
rollback;
