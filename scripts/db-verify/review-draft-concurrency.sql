-- Verifikasi Review Queue P1: optimistic concurrency + pelestarian ID opsi.
--
-- Cara pakai (staging):
--   supabase db query --linked --file scripts/db-verify/review-draft-concurrency.sql
--
-- Seluruh alur berjalan di dalam transaksi yang di-ROLLBACK, jadi tidak ada data
-- yang tertinggal.
--
-- Membuktikan: simpan kedua dengan token benar menaikkan versi TANPA mengubah ID
-- opsi; simpan dengan token basi ditolak QUESTION_VERSION_CONFLICT; token yang
-- dikirim untuk soal baru ditolak QUESTION_VERSION_INVALID.
create or replace function public.__test_review_draft_concurrency() returns jsonb
language plpgsql security definer set search_path to '' as $$
declare
  v_out jsonb := '{}'::jsonb;
  v_subject text;
  v_options jsonb;
  v_new jsonb;
  v_second jsonb;
  v_question_id uuid;
  v_version integer;
  v_updated_at timestamptz;
  v_first_ids uuid[];
  v_second_ids uuid[];
  v_msg text;
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

  v_new := public.save_question_draft(null,'CPNS','SKD',v_subject,'single_choice','Stem uji concurrency','medium',
    null,null,null,null,null,null,v_options,'verifikasi concurrency',null,null);
  v_question_id := (v_new->>'question_id')::uuid;
  v_out := v_out || jsonb_build_object('1_dibuat', (v_new->>'status') || ' v' || (v_new->>'version'));

  select version, updated_at into v_version, v_updated_at from public.questions where id=v_question_id;
  select array_agg(id order by option_key) into v_first_ids from public.question_options where question_id=v_question_id;

  v_second := public.save_question_draft(v_question_id,'CPNS','SKD',v_subject,'single_choice','Stem uji concurrency v2','medium',
    null,null,null,null,null,null,
    jsonb_build_array(
      jsonb_build_object('key','A','content','Opsi A diperbarui','is_correct',true,'score',2),
      jsonb_build_object('key','B','content','Opsi B','is_correct',false,'score',0)
    ),'verifikasi concurrency 2',v_version,v_updated_at);
  v_out := v_out || jsonb_build_object('2_simpan_kedua', 'v' || (v_second->>'version'));

  select array_agg(id order by option_key) into v_second_ids from public.question_options where question_id=v_question_id;
  v_out := v_out || jsonb_build_object('3_id_opsi_dipertahankan', v_first_ids = v_second_ids);

  begin
    perform public.save_question_draft(v_question_id,'CPNS','SKD',v_subject,'single_choice','Stem basi','medium',
      null,null,null,null,null,null,v_options,'token basi',v_version,v_updated_at);
    v_msg := 'TIDAK DITOLAK';
  exception when others then v_msg := sqlerrm; end;
  v_out := v_out || jsonb_build_object('4_token_basi', v_msg);

  begin
    perform public.save_question_draft(null,'CPNS','SKD',v_subject,'single_choice','Stem baru','medium',
      null,null,null,null,null,null,v_options,'token untuk soal baru',1,now());
    v_msg := 'TIDAK DITOLAK';
  exception when others then v_msg := sqlerrm; end;
  v_out := v_out || jsonb_build_object('5_token_untuk_soal_baru', v_msg);

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

select jsonb_pretty(public.__test_review_draft_concurrency());
rollback;

drop function if exists public.__test_review_draft_concurrency();
