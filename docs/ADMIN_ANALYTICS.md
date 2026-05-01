# Admin Analytics

## Metrics and formulas
- All Users: `users.length`
- Standard Users: `role === "user"`
- Premium Users: `role === "premium_user"`
- Advisors: `role === "advisor"`
- Admins: `role === "admin" || role === "superadmin"`
- Pending Users: `approval_status === "pending"`
- Active Users: `account_status === "active"`
- Deactivated Users: `account_status === "deactivated"`
- Recently Active: `last_active_at` within 24h
- Recently Inactive: missing `last_active_at` or older than 7d
- Advisor statuses: aggregate counts from `advisorRequests`

## Funnel stages
1. Total Users
2. Standard Users
3. Premium Users
4. Loan Readiness Started *(not available yet in admin payload)*
5. Loan Readiness Report Generated / Loan Ready *(not available yet in admin payload)*
6. Advisor Review Requested
7. Advisor Assigned
8. Review Closed

## Data sources
- `admin-users-list` payload (`users`, `advisorRequests`)
- existing advisor assignment/update functions for operational actions

## Not available yet
- Cross-user loan-readiness aggregate payload in admin endpoints.
- Historical premium-upgrade timestamp history.

## Future ideas
- Add secured admin aggregate endpoint for loan readiness start/report counts.
- Add time-series persistence for cohort conversion and assignment SLA trend charts.
- Add reminder workflow integrations (email/SMS) with audit logging.
