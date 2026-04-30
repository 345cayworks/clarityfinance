-- Enforce canonical user roles aligned with live UserRole enum.
-- Canonical: user, premium_user, advisor, admin, superadmin.
-- `premium` was considered as a legacy alias but is not valid in the live enum.

ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE users
  ADD CONSTRAINT users_role_check
  CHECK (role IN ('user', 'premium_user', 'advisor', 'admin', 'superadmin'));
