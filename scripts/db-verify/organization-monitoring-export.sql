-- Verifikasi monitoring & data export (Fase 6–7 MVP CPNS Instansi Managed Service,
-- PRD §6.5, §6.6, §7.6, §7.7, §11, §12).
--
-- Cara pakai (staging):
--   supabase db query --linked --file scripts/db-verify/organization-monitoring-export.sql
--
-- Seluruh alur berjalan di dalam transaksi yang di-ROLLBACK.
--
-- Membuktikan: monitoring membedakan "belum mulai", "sedang mengerjakan", dan
-- "selesai"; export menghasilkan EMPAT kumpulan data dengan jumlah kolom sesuai
-- §7.7 (rekap 10, detail 17); ranking internal hanya memuat yang sudah selesai
-- (§7.6); no-show memuat yang belum mulai DAN yang belum selesai dengan keterangan
-- yang benar; serta yang paling penting — attempt B2C bernilai 999 TIDAK bocor ke
-- export instansi yang nilainya 275, memenuhi KPI §11 "0 data B2C tercampur".

create or replace function public.__test_monitoring_export() returns jsonb
language plpgsql security definer set search_path to '' as $$
declare
  v_admin uuid; v_org uuid; v_batch uuid; v_exam uuid; v_tpl uuid; v_user_b uuid;
  v_p1 uuid; v_p2 uuid; v_p3 uuid;
  v_mon jsonb; v_exp jsonb; v_out jsonb := '{}'::jsonb; v_msg text;
  v_subject uuid;
begin
  select ur.user_id into v_admin from public.user_roles ur join public.roles r on r.id = ur.role_id
   where r.code in ('SUPER_ADMIN','ADMIN')
   order by case when r.code = 'SUPER_ADMIN' then 0 else 1 end limit 1;
  perform set_config('request.jwt.claims', json_build_object('sub', v_admin::text, 'role','authenticated')::text, true);

  v_org := ((public.admin_upsert_organization(null,'Instansi Monitor','MON-1','instansi',null,null,null,null,null,null,'active',null))->>'id')::uuid;
  v_batch := ((public.admin_upsert_batch(null, v_org,'B-MON','Batch Monitor',null,null,'active',null))->>'id')::uuid;
  v_tpl := ((public.admin_upsert_org_template(null, v_org,'Tpl Monitor',30,35,45,6000,1,true,false,'after_exam','internal','active'))->>'id')::uuid;
  v_exam := (public.admin_compose_exam_from_template(v_tpl,'Ujian Monitor','active'))->>'exam_id';
  v_exam := v_exam::uuid;

  -- Tiga peserta: belum mulai, sedang mengerjakan, selesai
  -- Tiga peserta dengan tiga keadaan berbeda, supaya monitoring benar-benar
  -- membedakan "belum mulai", "sedang mengerjakan", dan "selesai".
  insert into public.organization_participants (organization_id,batch_id,user_id,participant_code,full_name_snapshot,email_snapshot,status)
  values (v_org,v_batch,null,'M-001','Belum Mulai','m1@x.id','registered'),
         (v_org,v_batch,null,'M-002','Sedang Mengerjakan','m2@x.id','active'),
         (v_org,v_batch,null,'M-003','Sudah Selesai','m3@x.id','active');

  select id into v_p1 from public.organization_participants where batch_id=v_batch and participant_code='M-001';
  select id into v_p2 from public.organization_participants where batch_id=v_batch and participant_code='M-002';
  select id into v_p3 from public.organization_participants where batch_id=v_batch and participant_code='M-003';

  -- Constraint (exam_id, user_id, attempt_number) unik, jadi dua attempt pada exam
  -- yang sama memerlukan pengguna berbeda atau nomor attempt berbeda.
  select pr.id into v_user_b from public.profiles pr where pr.id <> v_admin order by pr.created_at limit 1;

  -- attempt: satu in_progress, satu completed dengan skor per subjek
  insert into public.exam_attempts (exam_id,user_id,attempt_number,status,source,organization_id,batch_id,participant_id,started_at)
  values (v_exam,v_admin,1,'in_progress','organization',v_org,v_batch,v_p2,now());

  insert into public.exam_attempts (exam_id,user_id,attempt_number,status,source,organization_id,batch_id,participant_id,started_at,submitted_at,duration_used_seconds,total_score,percentage,passed)
  values (v_exam,v_user_b,1,'completed','organization',v_org,v_batch,v_p3,now()-interval '1 hour',now(),3200,275,78.5,true)
  returning id into v_exam;
  -- v_exam sekarang attempt id (dipakai untuk attempt_scores)

  for v_subject in select id from public.subjects s where s.code in ('TWK','TIU','TKP')
                     and s.track_id = (select t.id from public.tracks t join public.programs p on p.id=t.program_id where p.code='CPNS' and t.code='SKD')
  loop
    insert into public.attempt_scores (attempt_id,subject_id,raw_score,percentage,passed,correct_count)
    select v_exam, v_subject,
           case (select code from public.subjects where id=v_subject) when 'TWK' then 85 when 'TIU' then 95 else 95 end,
           80, true, 10;
  end loop;

  -- Attempt B2C untuk peserta yang sama: TIDAK BOLEH muncul di export instansi
  insert into public.exam_attempts (exam_id,user_id,attempt_number,status,source,started_at,submitted_at,total_score,passed)
  select e.id, v_user_b, 9, 'completed', 'b2c', now(), now(), 999, true from public.exams e where e.title='Ujian Monitor' limit 1;

  v_mon := public.admin_batch_monitoring(v_batch);
  v_out := v_out || jsonb_build_object(
    '1_total', (v_mon->'summary'->>'total')::int,
    '2_belum_mulai', (v_mon->'summary'->>'not_started')::int,
    '3_sedang', (v_mon->'summary'->>'in_progress')::int,
    '4_selesai', (v_mon->'summary'->>'completed')::int,
    '5_lulus', (v_mon->'summary'->>'passed')::int);

  v_exp := public.admin_export_organization(v_org, v_batch);
  v_out := v_out || jsonb_build_object(
    '6_rekap_baris', jsonb_array_length(v_exp->'rekap'->'rows'),
    '7_detail_baris', jsonb_array_length(v_exp->'detail'->'rows'),
    '8_ranking_baris', jsonb_array_length(v_exp->'ranking'->'rows'),
    '9_noshow_baris', jsonb_array_length(v_exp->'no_show'->'rows'),
    '10_rekap_kolom', jsonb_array_length(v_exp->'rekap'->'columns'),
    '11_detail_kolom', jsonb_array_length(v_exp->'detail'->'columns'));

  -- Skor B2C TIDAK boleh bocor: total_skor peserta selesai harus 275, bukan 999
  v_out := v_out || jsonb_build_object('12_skor_bukan_b2c',
    (select r->>15 from jsonb_array_elements(v_exp->'detail'->'rows') r where r->>0 = 'M-003'));

  -- No-show memuat yang belum mulai & belum selesai, bukan yang selesai
  v_out := v_out || jsonb_build_object('13_noshow_keterangan',
    (select jsonb_agg(r->>6 order by r->>0) from jsonb_array_elements(v_exp->'no_show'->'rows') r));

  -- Peringkat internal hanya untuk yang selesai
  v_out := v_out || jsonb_build_object('14_ranking_kode',
    (select r->>1 from jsonb_array_elements(v_exp->'ranking'->'rows') r));

  -- Pengguna tanpa izin ditolak
  begin
    perform set_config('request.jwt.claims', json_build_object('sub', gen_random_uuid()::text,'role','authenticated')::text, true);
    perform public.admin_batch_monitoring(v_batch);
    v_msg := 'TIDAK DITOLAK';
  exception when others then v_msg := sqlerrm; end;
  perform set_config('request.jwt.claims', json_build_object('sub', v_admin::text,'role','authenticated')::text, true);
  v_out := v_out || jsonb_build_object('15_tanpa_izin', v_msg);

  begin
    perform public.admin_batch_monitoring(gen_random_uuid());
    v_msg := 'TIDAK DITOLAK';
  exception when others then v_msg := sqlerrm; end;
  v_out := v_out || jsonb_build_object('16_batch_tidak_ada', v_msg);

  return v_out;
end $$;

begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000000","role":"authenticated"}';
select jsonb_pretty(public.__test_monitoring_export());
rollback;

drop function if exists public.__test_monitoring_export();
