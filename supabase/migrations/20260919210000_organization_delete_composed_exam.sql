-- =============================================================================
-- Hapus exam hasil komposisi template.
--
-- LATAR
--   Exam yang dibentuk dari template TIDAK terikat pada instansi — ia baris
--   `exams` biasa, dan hanya assignment yang menghubungkan ke batch. Akibatnya
--   menghapus instansi TIDAK ikut menghapus exam-nya, sehingga setiap kali E2E
--   dijalankan akan tertinggal satu exam 110 soal beserta 3 section dan 110 item.
--   Itu ketahuan langsung: satu run gate meninggalkan satu exam yatim.
--
--   Kebutuhannya juga nyata di luar test: admin bisa salah memilih template, dan
--   tanpa jalan keluar exam yang salah akan mengendap di daftar selamanya.
--
-- PENJAGA
--   Exam yang SUDAH punya attempt tidak boleh dihapus. Attempt adalah riwayat
--   pengerjaan peserta — dasar penilaian, ranking (§7.6), dan export (§7.7).
--   Untuk kasus itu exam harus diarsipkan, bukan dihapus.
-- =============================================================================

create or replace function public.admin_delete_composed_exam(p_exam_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
    v_actor    uuid := auth.uid();
    v_title    text;
    v_attempts integer;
    v_items    integer;
begin
    if v_actor is null then
        raise exception 'Authentication required';
    end if;

    if not app_private.current_user_has_permission('organization.manage') then
        raise exception 'Organization manage permission required';
    end if;

    select title into v_title from public.exams where id = p_exam_id;
    if v_title is null then
        raise exception 'Exam not found';
    end if;

    select count(*) into v_attempts from public.exam_attempts where exam_id = p_exam_id;
    if v_attempts > 0 then
        raise exception 'Cannot delete an exam that has % attempt(s)', v_attempts;
    end if;

    select count(*) into v_items from public.exam_question_items where exam_id = p_exam_id;

    -- Assignment dihapus lebih dulu: FK-nya ON DELETE SET NULL, jadi membiarkannya
    -- akan meninggalkan assignment tanpa exam alias baris yang tidak bisa dibuka.
    delete from public.organization_exam_assignments where exam_id = p_exam_id;
    delete from public.exam_question_items where exam_id = p_exam_id;
    delete from public.exam_sections where exam_id = p_exam_id;
    delete from public.exams where id = p_exam_id;

    return jsonb_build_object('id', p_exam_id, 'title', v_title, 'deleted_items', v_items, 'deleted', true);
end;
$function$;

revoke all on function public.admin_delete_composed_exam(uuid) from public, anon;
grant execute on function public.admin_delete_composed_exam(uuid) to authenticated;
