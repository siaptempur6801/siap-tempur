-- Sequence ownership must be applied only after canonical tables exist.
-- Frozen from staging lpgrivowdcepcxradavu.
-- DO NOT apply to production before explicit final GO.

ALTER SEQUENCE public.attempt_events_id_seq OWNED BY public.attempt_events.id;
ALTER SEQUENCE public.audit_logs_id_seq OWNED BY public.audit_logs.id;
