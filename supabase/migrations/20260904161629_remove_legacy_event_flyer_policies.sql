-- Schema V2 uses permission-based, owner-folder policies for event flyer writes.
-- Remove the legacy role-column policies to avoid duplicate permissive checks.
DROP POLICY IF EXISTS event_flyers_admin_insert ON storage.objects;

DROP POLICY IF EXISTS event_flyers_admin_update ON storage.objects;

DROP POLICY IF EXISTS event_flyers_admin_delete ON storage.objects;
