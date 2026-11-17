CREATE OR REPLACE FUNCTION public.complete_tryout_event_session (p_user_id uuid, p_session_id uuid)
  RETURNS TABLE (
    success boolean,
    event_id uuid,
    message text)
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $$
DECLARE
  v_event_id uuid;
BEGIN
  IF coalesce(auth.role (), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF p_user_id IS NULL OR p_session_id IS NULL THEN
    RAISE EXCEPTION 'Invalid event completion request';
  END IF;

  SELECT
    tes.event_id
  INTO
    v_event_id
  FROM
    public.tryout_event_sessions tes
  WHERE
    tes.session_id = p_session_id
    AND tes.user_id = p_user_id
  FOR UPDATE;

  IF v_event_id IS NULL THEN
    RETURN QUERY
    SELECT
      FALSE,
      NULL::uuid,
      'Event session not found';
    RETURN;
  END IF;

  UPDATE
    public.tryout_event_sessions tes
  SET
    status = 'completed',
    finished_at = now()
  WHERE
    tes.session_id = p_session_id
    AND tes.user_id = p_user_id;

  UPDATE
    public.tryout_event_participants tep
  SET
    status = 'completed'
  WHERE
    tep.event_id = v_event_id
    AND tep.user_id = p_user_id;

  RETURN QUERY
  SELECT
    TRUE,
    v_event_id,
    'Event session completed';
END;
$$;

REVOKE EXECUTE ON FUNCTION public.complete_tryout_event_session (uuid, uuid) FROM public;

REVOKE EXECUTE ON FUNCTION public.complete_tryout_event_session (uuid, uuid) FROM anon;

REVOKE EXECUTE ON FUNCTION public.complete_tryout_event_session (uuid, uuid) FROM authenticated;

GRANT EXECUTE ON FUNCTION public.complete_tryout_event_session (uuid, uuid) TO service_role;
