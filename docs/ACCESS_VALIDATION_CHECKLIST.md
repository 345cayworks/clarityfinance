# Access Validation Checklist

## Unauthenticated Visitor

- Cannot access `/app/dashboard`.
- Cannot access `/app/tools`.
- Cannot access `/app/admin`.
- Cannot access `/app/advisor/dashboard`.

## Pending User

- Can access onboarding, profile, and pending approval routes only.
- Cannot access dashboard, tools, reports, admin, or advisor dashboard.

## Standard User

- Can access dashboard, profile, basic tools, and basic reports.
- Sees premium cards on `/app/tools`.
- Cannot use Investment Analyzer.
- Cannot use Dividend Reinvestment Calculator.
- Receives `403` from premium server functions.
- Cannot access admin dashboard.
- Cannot access advisor dashboard.

## Premium User

- Can access premium tools.
- Cannot access admin dashboard.
- Cannot access advisor dashboard unless also represented by an advisor-capable role in a future model.

## Advisor

- Can access advisor dashboard.
- Can access assigned requests.
- Cannot access admin accounts.
- Can use premium planning tools where `requirePremiumOrStaff` applies.

## Admin and Superadmin

- Can access admin pages.
- Can assign and reassign advisors.
- Can view advisor workflows as permitted.
- Can use premium tools.
