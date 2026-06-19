-- Phase 3 Security Hardening: Audit Logging and Quota Deductions

-- 1. Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    action text NOT NULL,
    actor_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
    target_type text NOT NULL,
    target_id text,
    details jsonb,
    ip_address text,
    created_at timestamptz DEFAULT now()
);

-- Protect audit_logs (insert only by service_role, no updates or deletes)
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit logs" ON audit_logs FOR SELECT USING (
  (select role from profiles where id = auth.uid()) IN ('admin', 'superadmin')
);

CREATE POLICY "No updates on audit logs" ON audit_logs FOR UPDATE USING (false);
CREATE POLICY "No deletes on audit logs" ON audit_logs FOR DELETE USING (false);

-- 2. Add advisory lock to start_tryout_session to prevent race conditions during quota deduction
-- We will replace the start_tryout_session function to add the lock.
-- Since the schema might change, we just modify the beginning of the function if possible.
-- Wait, modifying a complex 300+ line RPC via migration without full definition is risky.
-- Instead of redefining the entire `start_tryout_session`, we can create a trigger on `test_sessions` insert?
-- But the quota deduction happens explicitly in the function.
-- An alternative to advisory locks is just a row-level lock on `profiles` (SELECT ... FOR UPDATE).
-- The function `start_tryout_session` likely already does `UPDATE profiles SET skd_tokens = skd_tokens - 1 WHERE id = ...` which is implicitly atomic for the single column update!
-- If it just does an UPDATE, Postgres applies a row lock automatically! The race condition (D1) only exists if the function does `SELECT skd_tokens` THEN `UPDATE profiles SET skd_tokens = local_var - 1`.
-- Let's check `start_tryout_session` definition safely.
