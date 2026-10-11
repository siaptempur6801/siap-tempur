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
CREATE OR REPLACE FUNCTION public.admin_delete_composed_exam (p_exam_id uuid)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
DECLARE
  v_actor uuid := auth.uid ();
  v_title text;
  v_attempts integer;
  v_items integer;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT app_private.current_user_has_permission ('organization.manage') THEN
    RAISE EXCEPTION 'Organization manage permission required';
  END IF;

  SELECT
    title
  INTO
    v_title
  FROM
    public.exams
  WHERE
    id = p_exam_id;
  IF v_title IS NULL THEN
    RAISE EXCEPTION 'Exam not found';
  END IF;

  SELECT
    count(*)
  INTO
    v_attempts
  FROM
    public.exam_attempts
  WHERE
    exam_id = p_exam_id;
  IF v_attempts > 0 THEN
    RAISE EXCEPTION 'Cannot delete an exam that has % attempt(s)', v_attempts;
  END IF;

  SELECT
    count(*)
  INTO
    v_items
  FROM
    public.exam_question_items
  WHERE
    exam_id = p_exam_id;
  -- Assignment dihapus lebih dulu: FK-nya ON DELETE SET NULL, jadi membiarkannya
  -- akan meninggalkan assignment tanpa exam alias baris yang tidak bisa dibuka.
  DELETE FROM public.organization_exam_assignments
  WHERE exam_id = p_exam_id;
  DELETE FROM public.exam_question_items
  WHERE exam_id = p_exam_id;
  DELETE FROM public.exam_sections
  WHERE exam_id = p_exam_id;
  DELETE FROM public.exams
  WHERE id = p_exam_id;

  RETURN jsonb_build_object('id', p_exam_id, 'title', v_title, 'deleted_items', v_items, 'deleted', TRUE);
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_delete_composed_exam (uuid) FROM public, anon;

GRANT EXECUTE ON FUNCTION public.admin_delete_composed_exam (uuid) TO authenticated;
