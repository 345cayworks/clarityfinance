-- Run manually to bootstrap your first admin account.
UPDATE users
SET role = 'admin', approval_status = 'approved', approved_at = now()
WHERE email = 'YOUR_ADMIN_EMAIL_HERE';
