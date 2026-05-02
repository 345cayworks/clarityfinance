UPDATE users
SET role = 'superadmin',
    approval_status = 'approved',
    account_status = 'active',
    approved_at = COALESCE(approved_at, NOW()),
    activated_at = COALESCE(activated_at, NOW()),
    deactivated_at = NULL,
    rejection_reason = NULL,
    updated_at = NOW()
WHERE LOWER(email) = LOWER('info@cayworks.com');
