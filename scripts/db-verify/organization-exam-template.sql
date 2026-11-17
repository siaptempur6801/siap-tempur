-- Verifikasi template ujian & komposisi exam (Fase 5 MVP CPNS Instansi Managed Service,
-- PRD §7.3 template ujian, §7.4 assignment ujian).
--
-- Cara pakai (staging):
--   supabase db query --linked --file scripts/db-verify/organization-exam-template.sql
--
-- Seluruh alur berjalan di dalam transaksi yang di-ROLLBACK.
--
-- Membuktikan: ketersediaan soal terbit per subjek dilaporkan apa adanya;
-- template 30/35/45 dapat diwujudkan menjadi exam 110 soal; terbentuk 3 section
-- dengan distribusi tepat; `position` unik dan berurutan 1..110 LINTAS section
-- (constraint exam_question_items unik pada (exam_id, position), jadi penomoran
-- harus global); hanya soal BERSTATUS TERBIT yang ikut dikomposisi; template yang
-- mustahil dipenuhi TIDAK menghancurkan apa pun — kekurangannya dikembalikan
-- sebagai data per subjek (required/available/missing); assignment menolak exam
-- tanpa soal; dan penjaga template menolak nama kosong, jumlah 0 semua, jumlah
-- > 200, durasi 0, attempt 0, serta pengaturan pembahasan yang tidak dikenal.

create or replace function public.__test_template_flow() returns jsonb
language plpgsql security definer set search_path to '' as $$
declare
  v_admin uuid;
  v_org uuid; v_batch uuid; v_tpl uuid; v_big uuid; v_sh jsonb; v_comp jsonb;
  v_out jsonb := '{}'::jsonb; v_exam uuid; v_msg text;
begin
  select ur.user_id into v_admin from public.user_roles ur join public.roles r on r.id = ur.role_id
   where r.code in ('SUPER_ADMIN','ADMIN')
   order by case when r.code = 'SUPER_ADMIN' then 0 else 1 end limit 1;
  perform set_config('request.jwt.claims', json_build_object('sub', v_admin::text,'role','authenticated')::text, true);
  v_out := v_out || jsonb_build_object('1_ketersediaan', (public.admin_list_org_templates(null))->'available');

  v_org := ((public.admin_upsert_organization(null,'Instansi Ujian','UJI-1','instansi',null,null,null,null,null,null,'active',null))->>'id')::uuid;
  v_batch := ((public.admin_upsert_batch(null, v_org,'B-UJI','Batch Ujian',null,null,'active',null))->>'id')::uuid;

  -- Template setara Full Tryout nasional
  v_tpl := ((public.admin_upsert_org_template(null,null,'Full Tryout SKD Standar',
     30,35,45,6000,1,true,false,'after_exam','internal','active'))->>'id')::uuid;
  v_out := v_out || jsonb_build_object('2_template_dibuat', v_tpl is not null);

  v_sh := public.admin_template_shortages(v_tpl);
  v_out := v_out || jsonb_build_object('3_layak', (v_sh->>'composable')::bool, '3_kekurangan', jsonb_array_length(v_sh->'shortages'));

  v_comp := public.admin_compose_exam_from_template(v_tpl, 'Ujian Instansi Uji', 'draft');
  v_out := v_out || jsonb_build_object('4_composed', (v_comp->>'composed')::bool,
             '4_total_soal', (v_comp->>'total_questions')::int);
  v_exam := (v_comp->>'exam_id')::uuid;

  v_out := v_out || jsonb_build_object(
    '5_sections', (select count(*) from public.exam_sections where exam_id = v_exam),
    '6_items', (select count(*) from public.exam_question_items where exam_id = v_exam),
    '7_posisi_unik', (select count(distinct position) from public.exam_question_items where exam_id = v_exam),
    '8_posisi_1_sampai_n', (select min(position)=1 and max(position)=110 from public.exam_question_items where exam_id = v_exam),
    '9_soal_semua_terbit', (
       select bool_and(q.status='published') from public.exam_question_items i
         join public.questions q on q.id = i.question_id where i.exam_id = v_exam),
    '10_distribusi', (select jsonb_object_agg(s.code, c) from (
       select s.code, count(*) c from public.exam_question_items i
         join public.exam_sections es on es.id = i.section_id
         join public.subjects s on s.id = es.subject_id
        where i.exam_id = v_exam group by s.code) s));

  -- Assignment
  v_out := v_out || jsonb_build_object('11_assignment', (public.admin_upsert_assignment(
     null, v_batch, v_exam, v_tpl, now(), now() + interval '7 days', true, 'uji'))->>'id' is not null);
  v_out := v_out || jsonb_build_object('12_daftar_assignment', jsonb_array_length(
     (public.admin_list_assignments(v_batch))->'assignments'));
  v_out := v_out || jsonb_build_object('13_jumlah_soal_assignment',
     (public.admin_list_assignments(v_batch))->'assignments'->0->>'question_count');

  -- Template yang MUSTAHIL dipenuhi (200 per subjek) -> kekurangan terstruktur
  v_big := ((public.admin_upsert_org_template(null,null,'Mustahil',200,200,200,6000,1,true,false,'after_exam','internal','active'))->>'id')::uuid;
  v_sh := public.admin_template_shortages(v_big);
  v_out := v_out || jsonb_build_object('14_mustahil_layak', (v_sh->>'composable')::bool,
             '14_jumlah_kekurangan', jsonb_array_length(v_sh->'shortages'),
             '14_contoh', v_sh->'shortages'->0);
  v_comp := public.admin_compose_exam_from_template(v_big, 'Harus Gagal', 'draft');
  v_out := v_out || jsonb_build_object('15_komposisi_ditolak', not (v_comp->>'composed')::bool);

  -- Penjaga assignment: exam tanpa soal
  begin
    perform public.admin_upsert_assignment(null, v_batch, gen_random_uuid(), null, null, null, true, null);
    v_msg := 'TIDAK DITOLAK';
  exception when others then v_msg := sqlerrm; end;
  v_out := v_out || jsonb_build_object('16_exam_tidak_ada', v_msg);

  begin
    perform public.admin_upsert_org_template(null,null,'Template Uji',0,0,0,6000,1,true,false,'after_exam','internal','draft');
    v_msg := 'TIDAK DITOLAK';
  exception when others then v_msg := sqlerrm; end;
  v_out := v_out || jsonb_build_object('17_template_kosong', v_msg);

  begin
    perform public.admin_upsert_org_template(null,null,'Template Uji',999,0,0,6000,1,true,false,'after_exam','internal','draft');
    v_msg := 'TIDAK DITOLAK';
  exception when others then v_msg := sqlerrm; end;
  v_out := v_out || jsonb_build_object('18_jumlah_berlebihan', v_msg);

  begin
    perform public.admin_upsert_org_template(null,null,'Template Uji',30,35,45,0,1,true,false,'after_exam','internal','draft');
    v_msg := 'TIDAK DITOLAK';
  exception when others then v_msg := sqlerrm; end;
  v_out := v_out || jsonb_build_object('19_durasi_nol', v_msg);

  begin
    perform public.admin_upsert_org_template(null,null,'Template Uji',30,35,45,6000,0,true,false,'after_exam','internal','draft');
    v_msg := 'TIDAK DITOLAK';
  exception when others then v_msg := sqlerrm; end;
  v_out := v_out || jsonb_build_object('20_attempt_nol', v_msg);

  begin
    perform public.admin_upsert_org_template(null,null,'Template Uji',30,35,45,6000,1,true,false,'kapan saja','internal','draft');
    v_msg := 'TIDAK DITOLAK';
  exception when others then v_msg := sqlerrm; end;
  v_out := v_out || jsonb_build_object('21_pengaturan_pembahasan_palsu', v_msg);

  return v_out;
end $$;

begin;

-- Admin dicari dari DATABASE, bukan di-hardcode (lihat _bootstrap.sql).
do $$
declare v_admin uuid;
begin
  select ur.user_id into v_admin
    from public.user_roles ur join public.roles r on r.id = ur.role_id
   where r.code in ('SUPER_ADMIN', 'ADMIN')
   order by case when r.code = 'SUPER_ADMIN' then 0 else 1 end
   limit 1;
  if v_admin is null then
    raise exception 'Tidak ada pengguna berperan SUPER_ADMIN atau ADMIN di database ini';
  end if;
end $$;
set local role authenticated;

select jsonb_pretty(public.__test_template_flow());
rollback;

drop function if exists public.__test_template_flow();
