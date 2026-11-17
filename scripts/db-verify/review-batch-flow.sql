-- Verifikasi aksi massal Review Queue (P2): submit/publish batch tanpa N+1.
--
-- Cara pakai (staging):
--   supabase db query --linked --file scripts/db-verify/review-batch-flow.sql
--
-- Seluruh alur berjalan di dalam transaksi yang di-ROLLBACK, jadi tidak ada data
-- yang tertinggal.
--
-- Membuktikan: tiga draft dikirim ke review dalam SATU panggilan (bukan tiga),
-- publish massal menolak soal non-approved dan tidak mengubah status, array
-- kosong mengembalikan nol, dan array di atas 1.000 ditolak.
create or replace function public.__test_review_batch_flow() returns jsonb
language plpgsql security definer set search_path to '' as $$
declare
  v_out jsonb := '{}'::jsonb;
  v_subject text;
  v_options jsonb;
  v_ids uuid[] := '{}';
  v_id uuid;
  v_i integer;
  v_result jsonb;
  v_msg text;
  v_statuses text[];
  v_pending integer;
begin
  select s.code into v_subject from public.subjects s
    join public.tracks t on t.id=s.track_id
    join public.programs p on p.id=t.program_id
   where p.code='CPNS' and t.code='SKD' and upper(s.status)='ACTIVE'
   order by s.sort_order limit 1;
  if v_subject is null then raise exception 'Tidak ada subject CPNS/SKD aktif'; end if;

  v_options := jsonb_build_array(
    jsonb_build_object('key','A','content','Opsi A','is_correct',true,'score',1),
    jsonb_build_object('key','B','content','Opsi B','is_correct',false,'score',0)
  );

  for v_i in 1..3 loop
    v_result := public.save_question_draft(null,'CPNS','SKD',v_subject,'single_choice','Stem batch '||v_i,'medium',
      null,null,null,null,null,null,v_options,'verifikasi batch',null,null);
    v_ids := v_ids || (v_result->>'question_id')::uuid;
  end loop;
  v_out := v_out || jsonb_build_object('1_draft_dibuat', array_length(v_ids,1));

  v_result := public.submit_questions_for_review(v_ids);
  v_out := v_out || jsonb_build_object('2_submit_batch', v_result->>'submitted');

  select array_agg(status order by status) into v_statuses from public.questions where id = any(v_ids);
  select count(*) into v_pending from public.content_reviews
   where entity_type='question' and entity_id = any(v_ids) and status='pending' and review_stage='editorial';
  v_out := v_out || jsonb_build_object('3_status', v_statuses, '3_pending_editorial', v_pending);

  begin
    perform public.publish_questions(v_ids);
    v_msg := 'TIDAK DITOLAK';
  exception when others then v_msg := sqlerrm; end;
  v_out := v_out || jsonb_build_object('4_publish_non_approved', v_msg);

  select array_agg(status order by status) into v_statuses from public.questions where id = any(v_ids);
  v_out := v_out || jsonb_build_object('5_status_tidak_berubah', v_statuses);

  v_out := v_out || jsonb_build_object(
    '6_array_kosong_submit', public.submit_questions_for_review('{}'::uuid[])->>'submitted',
    '6_array_kosong_publish', public.publish_questions('{}'::uuid[])->>'published'
  );

  begin
    perform public.submit_questions_for_review(array(select gen_random_uuid() from generate_series(1,1001)));
    v_msg := 'TIDAK DITOLAK';
  exception when others then v_msg := sqlerrm; end;
  v_out := v_out || jsonb_build_object('7_lebih_dari_1000', v_msg);

  return v_out;
end $$;

begin;

-- Aktor dicari dari DATABASE, bukan di-hardcode (lihat `_bootstrap.sql`).
do $$
declare v_admin uuid;
begin
  select ur.user_id into v_admin
    from public.user_roles ur join public.roles r on r.id = ur.role_id
   where r.code in ('SUPER_ADMIN','ADMIN')
   order by case when r.code='SUPER_ADMIN' then 0 else 1 end
   limit 1;
  if v_admin is null then raise exception 'Tidak ada pengguna berperan SUPER_ADMIN atau ADMIN'; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', v_admin::text, 'role', 'authenticated')::text, true);
end $$;
set local role authenticated;

select jsonb_pretty(public.__test_review_batch_flow());
rollback;

drop function if exists public.__test_review_batch_flow();
