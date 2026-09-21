-- Paritas validasi opsi antara dua jalur tulis.
--
-- Cara pakai (staging/produksi, aman: seluruhnya ROLLBACK):
--   supabase db query --linked --file scripts/db-verify/question-option-parity.sql
--
-- KENAPA
--   Soal dapat ditulis lewat dua RPC: `mutate_question_bank` (Question Bank) dan
--   `save_question_draft` (Review Queue). Keduanya memuat aturan validasi opsi
--   sendiri-sendiri, sehingga aturan bisa berbeda diam-diam — persis kelas bug
--   yang dulu membuat editor menerima nilai yang ditolak server.
--
--   Skrip ini menjalankan matriks payload melalui KEDUA jalur dan melaporkan
--   apakah keduanya sepakat (sama-sama menerima atau sama-sama menolak).
create or replace function public.__test_question_option_parity() returns jsonb
language plpgsql security definer set search_path to '' as $$
declare
  v_subject text;
  v_cases jsonb;
  v_case jsonb;
  v_options jsonb;
  v_qb_options jsonb;
  v_type text;
  v_qb_ok boolean;
  v_rv_ok boolean;
  v_out jsonb := '{}'::jsonb;
  v_mismatch integer := 0;
  v_total integer := 0;
begin
  select s.code into v_subject from public.subjects s
    join public.tracks t on t.id=s.track_id
    join public.programs p on p.id=t.program_id
   where p.code='CPNS' and t.code='SKD' and upper(s.status)='ACTIVE'
   order by s.sort_order limit 1;
  if v_subject is null then raise exception 'Tidak ada subject CPNS/SKD aktif'; end if;

  v_cases := jsonb_build_array(
    jsonb_build_object('name','valid_single','type','single_choice','options', jsonb_build_array(
      jsonb_build_object('key','A','content','Benar','is_correct',true,'score',1),
      jsonb_build_object('key','B','content','Salah','is_correct',false,'score',0))),
    jsonb_build_object('name','duplicate_keys','type','single_choice','options', jsonb_build_array(
      jsonb_build_object('key','A','content','Satu','is_correct',true,'score',1),
      jsonb_build_object('key','A','content','Dua','is_correct',false,'score',0))),
    jsonb_build_object('name','empty_content','type','single_choice','options', jsonb_build_array(
      jsonb_build_object('key','A','content',' ','is_correct',true,'score',1),
      jsonb_build_object('key','B','content','Salah','is_correct',false,'score',0))),
    jsonb_build_object('name','negative_score','type','single_choice','options', jsonb_build_array(
      jsonb_build_object('key','A','content','Benar','is_correct',true,'score',-1),
      jsonb_build_object('key','B','content','Salah','is_correct',false,'score',0))),
    jsonb_build_object('name','three_decimal_score','type','single_choice','options', jsonb_build_array(
      jsonb_build_object('key','A','content','Benar','is_correct',true,'score',0.123),
      jsonb_build_object('key','B','content','Salah','is_correct',false,'score',0))),
    jsonb_build_object('name','http_image','type','single_choice','options', jsonb_build_array(
      jsonb_build_object('key','A','content','Benar','is_correct',true,'score',1,'image_url','http://example.org/a.png'),
      jsonb_build_object('key','B','content','Salah','is_correct',false,'score',0))),
    jsonb_build_object('name','two_correct_single','type','single_choice','options', jsonb_build_array(
      jsonb_build_object('key','A','content','Benar','is_correct',true,'score',1),
      jsonb_build_object('key','B','content','Juga benar','is_correct',true,'score',1))),
    jsonb_build_object('name','multiple_valid','type','multiple_choice','options', jsonb_build_array(
      jsonb_build_object('key','A','content','Satu','is_correct',true,'score',1),
      jsonb_build_object('key','B','content','Dua','is_correct',true,'score',1),
      jsonb_build_object('key','C','content','Tiga','is_correct',false,'score',0))),
    jsonb_build_object('name','multiple_all_correct','type','multiple_choice','options', jsonb_build_array(
      jsonb_build_object('key','A','content','Satu','is_correct',true,'score',1),
      jsonb_build_object('key','B','content','Dua','is_correct',true,'score',1),
      jsonb_build_object('key','C','content','Tiga','is_correct',true,'score',1))),
    jsonb_build_object('name','category_valid','type','category','options', jsonb_build_array(
      jsonb_build_object('key','A','content','A1','is_correct',true,'score',1,'response_group','G1'),
      jsonb_build_object('key','B','content','A2','is_correct',false,'score',0,'response_group','G1'),
      jsonb_build_object('key','C','content','B1','is_correct',false,'score',0,'response_group','G2'),
      jsonb_build_object('key','D','content','B2','is_correct',true,'score',1,'response_group','G2'))),
    jsonb_build_object('name','category_without_group','type','category','options', jsonb_build_array(
      jsonb_build_object('key','A','content','A1','is_correct',true,'score',1),
      jsonb_build_object('key','B','content','A2','is_correct',false,'score',0))),
    jsonb_build_object('name','bad_key_format','type','single_choice','options', jsonb_build_array(
      jsonb_build_object('key','A B','content','Benar','is_correct',true,'score',1),
      jsonb_build_object('key','B','content','Salah','is_correct',false,'score',0)))
  );

  for v_case in select value from jsonb_array_elements(v_cases) loop
    v_options := v_case->'options';
    v_type := v_case->>'type';
    v_total := v_total + 1;

    -- Dua jalur memakai bentuk payload berbeda: Question Bank memakai camelCase
    -- (`isCorrect`, `responseGroup`, `imageUrl`), Review Queue memakai snake_case
    -- (`is_correct`, `response_group`, `image_url`). Paritas diuji pada aturan,
    -- bukan pada penamaan field.
    select coalesce(jsonb_agg(jsonb_build_object(
      'key', o->>'key',
      'content', o->>'content',
      'isCorrect', o->'is_correct',
      'score', o->'score',
      'responseGroup', o->'response_group',
      'responseGroupOrder', o->'response_group_order',
      'imageUrl', o->'image_url'
    )), '[]'::jsonb) into v_qb_options
    from jsonb_array_elements(v_options) o;

    begin
      perform public.mutate_question_bank(jsonb_build_object(
        'operation','save','id',null,'program','CPNS','track','SKD','subject',v_subject,
        'questionType',v_type,'stem','Parity check','difficulty','medium','explanation','',
        'sourceReference','','cognitiveLevel','','estimatedSeconds',null,'stimulusId',null,
        'knowledgeNodeId',null,'changeReason','parity','expectedVersion',0,'expectedUpdatedAt','',
        'options',v_qb_options));
      v_qb_ok := true;
    exception when others then v_qb_ok := false; end;

    begin
      perform public.save_question_draft(null,'CPNS','SKD',v_subject,v_type,'Parity check','medium',
        null,null,null,null,null,null,v_options,'parity',null,null);
      v_rv_ok := true;
    exception when others then v_rv_ok := false; end;

    if v_qb_ok <> v_rv_ok then v_mismatch := v_mismatch + 1; end if;
    v_out := v_out || jsonb_build_object(v_case->>'name', jsonb_build_object(
      'question_bank', v_qb_ok, 'review_queue', v_rv_ok, 'agree', v_qb_ok = v_rv_ok));
  end loop;

  return jsonb_build_object('total', v_total, 'mismatch', v_mismatch, 'cases', v_out);
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

select jsonb_pretty(public.__test_question_option_parity());
rollback;

drop function if exists public.__test_question_option_parity();
