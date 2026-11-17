-- =============================================================================
-- Pemakaian entitlement dihitung per attempt (audit fase 1, A-09 + A-16)
--
-- MASALAH
--   A-09  `entitlements.usage_limit` dicek aplikasi, tetapi `usage_count` tidak
--         pernah dinaikkan, sehingga entitlement berbatas pemakaian tidak terbatas.
--   A-16  Attempt yang ditanggung entitlement tetap dipotong token saat dikumpulkan,
--         karena penyelesaian memanggil `debit_exam_token_once` tanpa tahu attempt
--         itu sudah ditanggung.
--
-- PERBAIKAN (keputusan pemilik 2026-11-17)
--   `public.consume_entitlement_for_attempt(user, attempt, feature)` secara atomik:
--     - idempoten: attempt yang sudah bertanda `metadata.entitlementId` → TRUE;
--     - memilih entitlement aktif yang masih dalam jendela waktu dan kuota
--       (yang paling cepat kedaluwarsa lebih dulu), mengunci barisnya,
--       menaikkan `usage_count`, dan menandai attempt dengan `entitlementId`;
--     - FALSE bila tidak ada entitlement yang bisa dipakai.
--   Aplikasi melewati pemotongan token untuk attempt bertanda (start, resume,
--   dan penyelesaian). Hanya untuk service_role.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.consume_entitlement_for_attempt (p_user_id uuid, p_attempt_id uuid, p_feature_id uuid)
  RETURNS boolean
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = ''
  AS $$
DECLARE
  v_metadata jsonb;
  v_entitlement_id uuid;
BEGIN
  SELECT
    metadata
  INTO
    v_metadata
  FROM
    public.exam_attempts
  WHERE
    id = p_attempt_id
    AND user_id = p_user_id
    AND lower(status) IN ('in_progress', 'created')
  FOR UPDATE;
  IF NOT found THEN
    RAISE EXCEPTION 'ATTEMPT_NOT_FOUND';
  END IF;
  IF coalesce(v_metadata ->> 'entitlementId', '') <> '' THEN
    RETURN TRUE;
  END IF;
  SELECT
    en.id
  INTO
    v_entitlement_id
  FROM
    public.entitlements en
  WHERE
    en.user_id = p_user_id
    AND en.feature_id = p_feature_id
    AND lower(en.status) = 'active'
    AND en.starts_at <= now()
    AND (en.expires_at IS NULL
      OR en.expires_at > now())
    AND (en.usage_limit IS NULL
      OR en.usage_count < en.usage_limit)
  ORDER BY
    en.expires_at ASC nulls LAST,
    en.created_at ASC
  LIMIT 1
  FOR UPDATE;
  IF v_entitlement_id IS NULL THEN
    RETURN FALSE;
  END IF;
  UPDATE
    public.entitlements
  SET
    usage_count = usage_count + 1
  WHERE
    id = v_entitlement_id;
  UPDATE
    public.exam_attempts
  SET
    metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('entitlementId', v_entitlement_id),
    updated_at = now()
  WHERE
    id = p_attempt_id;
  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_entitlement_for_attempt (uuid, uuid, uuid) FROM public, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.consume_entitlement_for_attempt (uuid, uuid, uuid) TO service_role;
