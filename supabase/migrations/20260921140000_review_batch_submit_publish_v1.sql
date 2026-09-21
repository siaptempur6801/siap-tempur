-- Review Queue P2 — aksi massal tanpa N+1.
--
-- MASALAH
--   `prepareReviewBatchAction` memanggil `submit_question_for_review` SATU PER
--   SOAL dan `publishReviewBatchAction` memanggil `publish_question` satu per
--   soal. Untuk batch 500 soal itu 500 round-trip HTTP berurutan dari server
--   action — cukup untuk melewati batas durasi fungsi sebelum pekerjaan selesai.
--
-- SOLUSI
--   Dua fungsi batch tipis yang memanggil fungsi workflow yang SAMA di dalam
--   satu transaksi database, sehingga aturan (auth.uid, permission, author !=
--   reviewer, penjaga status) tidak digandakan. Semantik lama dipertahankan:
--   kegagalan pertama membatalkan seluruh panggilan (bukan skip diam-diam).
begin;

create function app_private.submit_questions_for_review(p_question_ids uuid[])
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_count integer := 0;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_question_ids is null or array_length(p_question_ids, 1) is null then
    return jsonb_build_object('submitted', 0);
  end if;
  if array_length(p_question_ids, 1) > 1000 then raise exception 'BATCH_TOO_LARGE'; end if;

  foreach v_id in array p_question_ids loop
    perform app_private.submit_question_for_review(v_id);
    v_count := v_count + 1;
  end loop;

  return jsonb_build_object('submitted', v_count);
end $$;

create function app_private.publish_questions(p_question_ids uuid[])
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_count integer := 0;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_question_ids is null or array_length(p_question_ids, 1) is null then
    return jsonb_build_object('published', 0);
  end if;
  if array_length(p_question_ids, 1) > 1000 then raise exception 'BATCH_TOO_LARGE'; end if;

  foreach v_id in array p_question_ids loop
    perform app_private.publish_question(v_id);
    v_count := v_count + 1;
  end loop;

  return jsonb_build_object('published', v_count);
end $$;

create function public.submit_questions_for_review(p_question_ids uuid[])
returns jsonb language sql set search_path = '' as $$
  select app_private.submit_questions_for_review(p_question_ids);
$$;

create function public.publish_questions(p_question_ids uuid[])
returns jsonb language sql set search_path = '' as $$
  select app_private.publish_questions(p_question_ids);
$$;

revoke all on function public.submit_questions_for_review(uuid[]), public.publish_questions(uuid[]) from public, anon;
grant execute on function public.submit_questions_for_review(uuid[]), public.publish_questions(uuid[]) to authenticated;
grant execute on function app_private.submit_questions_for_review(uuid[]), app_private.publish_questions(uuid[]) to authenticated;

notify pgrst,'reload schema';
commit;
