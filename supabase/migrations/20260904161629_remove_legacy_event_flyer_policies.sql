-- Schema V2 uses permission-based, owner-folder policies for event flyer writes.
-- Remove the legacy role-column policies to avoid duplicate permissive checks.

drop policy if exists event_flyers_admin_insert on storage.objects;
drop policy if exists event_flyers_admin_update on storage.objects;
drop policy if exists event_flyers_admin_delete on storage.objects;
