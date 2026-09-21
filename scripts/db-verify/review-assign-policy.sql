-- Verifikasi kebijakan penugasan reviewer (aturan C).
--
-- Cara pakai (staging/produksi, aman: seluruhnya ROLLBACK):
--   supabase db query --linked --file scripts/db-verify/review-assign-policy.sql
--
-- Membuktikan:
--   1. Manager (question.manage) dapat menugaskan soal ke reviewer lain.
--   2. Reviewer TIDAK dapat menugaskan ke orang lain.
--   3. Reviewer dapat mengklaim untuk dirinya sendiri.
--   4. Reviewer tidak dapat merebut review yang dipegang reviewer lain.
--   5. Manager dapat memindahkan review yang sudah dipegang.
--   6. Permission `content.assign` tidak diberikan ke role non-manager.
--
-- Bila environment tidak punya reviewer non-manager (mis. produksi), skrip
-- melaporkan `skipped` alih-alih gagal.
create or replace function public.__test_review_assign_policy() returns jsonb
language plpgsql security definer set search_path to '' as $$
declare
  v_manager uuid;
  v_reviewer uuid;
  v_other uuid;
  v_subject text;
  v_options jsonb;
  v_q1 uuid;
  v_q2 uuid;
  v_q3 uuid;
  v_out jsonb := '{}'::jsonb;
begin
  select ur.user_id into v_manager
    from public.user_roles ur join public.roles r on r.id=ur.role_id
   where r.code in ('SUPER_ADMIN','ADMIN')
   order by case when r.code='SUPER_ADMIN' then 0 else 1 end
   limit 1;

  select ur.user_id into v_reviewer
    from public.user_roles ur
    join public.role_permissions rp on rp.role_id=ur.role_id
    join public.permissions pe on pe.id=rp.permission_id
   where pe.code='content.review'
     and not exists (
       select 1 from public.user_roles ur2
       join public.role_permissions rp2 on rp2.role_id=ur2.role_id
       join public.permissions pe2 on pe2.id=rp2.permission_id
       where ur2.user_id=ur.user_id and pe2.code='question.manage'
     )
   limit 1;

  -- Target "orang lain" yang bukan author: user content.review mana pun selain
  -- reviewer dan manager (di staging: admin kedua).
  select ur.user_id into v_other
    from public.user_roles ur
    join public.role_permissions rp on rp.role_id=ur.role_id
    join public.permissions pe on pe.id=rp.permission_id
   where pe.code='content.review' and ur.user_id not in (v_reviewer, v_manager)
   limit 1;

  if v_manager is null then raise exception 'Tidak ada pengguna berperan SUPER_ADMIN atau ADMIN'; end if;
  if v_reviewer is null then
    return jsonb_build_object('skipped','Tidak ada pengguna content.review tanpa question.manage di environment ini');
  end if;

  select s.code into v_subject from public.subjects s
    join public.tracks t on t.id=s.track_id
    join public.programs p on p.id=t.program_id
   where p.code='CPNS' and t.code='SKD' and upper(s.status)='ACTIVE'
   order by s.sort_order limit 1;
  if v_subject is null then raise exception 'Tidak ada subject CPNS/SKD aktif'; end if;

  v_options := jsonb_build_array(
    jsonb_build_object('key','A','content','Benar','is_correct',true,'score',1),
    jsonb_build_object('key','B','content','Salah','is_correct',false,'score',0)
  );

  -- 1. Manager membuat + mengirim soal, lalu menugaskan ke reviewer.
  perform set_config('request.jwt.claims', json_build_object('sub', v_manager::text, 'role','authenticated')::text, true);
  v_q1 := (public.save_question_draft(null,'CPNS','SKD',v_subject,'single_choice','Policy q1','medium',
    null,null,null,null,null,null,v_options,'policy',null,null)->>'question_id')::uuid;
  perform public.submit_question_for_review(v_q1);
  begin
    perform public.assign_question_reviewer(v_q1, v_reviewer);
    v_out := v_out || jsonb_build_object('1_manager_assign_ke_reviewer','ok');
  exception when others then
    v_out := v_out || jsonb_build_object('1_manager_assign_ke_reviewer', sqlerrm);
  end;

  -- 2 & 3. Reviewer tidak boleh menugaskan ke orang lain, tetapi boleh klaim diri.
  v_q2 := (public.save_question_draft(null,'CPNS','SKD',v_subject,'single_choice','Policy q2','medium',
    null,null,null,null,null,null,v_options,'policy',null,null)->>'question_id')::uuid;
  perform public.submit_question_for_review(v_q2);

  perform set_config('request.jwt.claims', json_build_object('sub', v_reviewer::text, 'role','authenticated')::text, true);
  if v_other is null then
    v_out := v_out || jsonb_build_object('2_reviewer_assign_ke_orang_lain','skipped: tidak ada target lain');
  else
    begin
      perform public.assign_question_reviewer(v_q2, v_other);
      v_out := v_out || jsonb_build_object('2_reviewer_assign_ke_orang_lain','TIDAK DITOLAK');
    exception when others then
      v_out := v_out || jsonb_build_object('2_reviewer_assign_ke_orang_lain', sqlerrm);
    end;
  end if;

  begin
    perform public.assign_question_reviewer(v_q2, v_reviewer);
    v_out := v_out || jsonb_build_object('3_reviewer_klaim_diri','ok');
  exception when others then
    v_out := v_out || jsonb_build_object('3_reviewer_klaim_diri', sqlerrm);
  end;

  -- 4. Review yang sudah dipegang reviewer lain tidak bisa direbut lewat klaim.
  perform set_config('request.jwt.claims', json_build_object('sub', v_manager::text, 'role','authenticated')::text, true);
  v_q3 := (public.save_question_draft(null,'CPNS','SKD',v_subject,'single_choice','Policy q3','medium',
    null,null,null,null,null,null,v_options,'policy',null,null)->>'question_id')::uuid;
  perform public.submit_question_for_review(v_q3);
  update public.content_reviews set reviewer_id=v_manager
   where entity_type='question' and entity_id=v_q3 and status='pending';
  update public.questions set reviewer_id=v_manager where id=v_q3;

  perform set_config('request.jwt.claims', json_build_object('sub', v_reviewer::text, 'role','authenticated')::text, true);
  begin
    perform public.assign_question_reviewer(v_q3, v_reviewer);
    v_out := v_out || jsonb_build_object('4_reviewer_rebut_review','TIDAK DITOLAK');
  exception when others then
    v_out := v_out || jsonb_build_object('4_reviewer_rebut_review', sqlerrm);
  end;

  -- 5. Manager tetap dapat memindahkan review yang sudah dipegang.
  perform set_config('request.jwt.claims', json_build_object('sub', v_manager::text, 'role','authenticated')::text, true);
  begin
    perform public.assign_question_reviewer(v_q3, v_reviewer);
    v_out := v_out || jsonb_build_object('5_manager_pindahkan','ok');
  exception when others then
    v_out := v_out || jsonb_build_object('5_manager_pindahkan', sqlerrm);
  end;

  -- 6. Permission hanya untuk manager.
  v_out := v_out || jsonb_build_object('6_grant_non_manager',
    (select count(*)
       from public.role_permissions rp
       join public.permissions pe on pe.id=rp.permission_id
       join public.roles r on r.id=rp.role_id
      where pe.code='content.assign' and r.code not in ('ADMIN','SUPER_ADMIN')));

  return v_out;
end $$;

begin;

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

select jsonb_pretty(public.__test_review_assign_policy());
rollback;

drop function if exists public.__test_review_assign_policy();
