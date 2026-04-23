# Clarity Finance

A stable Next.js personal finance app with account-based persistence.

Tagline: **Know where you stand. Know what’s next.**

## Stack

- Next.js (App Router)
- TypeScript + Tailwind
- **Auth.js (NextAuth v5 beta) with Credentials provider**
- Prisma ORM
- Neon Postgres
- Netlify-compatible deployment

## Why Prisma (vs Drizzle)

Prisma is the cleaner fit for this phase because Clarity Finance already has tightly related finance sections and needs straightforward upserts plus transactional writes. Prisma keeps:

- schema definition centralized,
- migration flow predictable for Neon,
- repository/service code concise,
- future advisor/admin role expansion simple.

## Routes

- Landing (`/`)
- Login (`/login`)
- Signup (`/signup`)
- Dashboard (`/app`)
- Onboarding (`/app/onboarding`)
- Profile (`/app/profile`)
- Mortgage (`/app/mortgage`)
- Refinance (`/app/refinance`)
- Rent a Room (`/app/rent-room`)
- Debt Plan (`/app/debt-plan`)
- Scenarios (`/app/scenarios`)
- Action Plan (`/app/action-plan`)

`/app/*` routes are protected by middleware and require an authenticated session.

## Database schema (Neon)

Prisma schema + SQL migration create:

- `users` (with `role` enum: `user | advisor | admin`)
- `profiles`
- `incomes`
- `expenses`
- `housing`
- `debts`
- `goals`
- `scenarios`
- `plans`

All tables include primary key IDs and timestamps. User-owned tables include `user_id` foreign keys.

## Environment variables

Required:

- `DATABASE_URL` – Neon Postgres connection string (Prisma datasource)
- `AUTH_SECRET` – long random secret for Auth.js JWT/session encryption
- `AUTH_TRUST_HOST=true` – recommended for Netlify and proxy environments

Recommended per environment:

- `AUTH_URL` – full app URL (for example `https://clarityfinance.netlify.app`)

## Local setup

```bash
npm install
npm run prisma:generate
npm run prisma:migrate:deploy
npm run dev
```

## Neon setup steps

1. Create Neon project + Postgres database.
2. Copy pooled connection string into `DATABASE_URL`.
3. Run migrations:
   - `npm run prisma:migrate:deploy`
4. Generate Prisma client:
   - `npm run prisma:generate`

## Auth.js setup steps

1. Set `AUTH_SECRET` (32+ random bytes, base64/hex string).
2. Set `AUTH_TRUST_HOST=true`.
3. Set `AUTH_URL` in hosted environments.
4. Use `/signup` to create account and `/login` for sign-in.

## Netlify deployment notes

1. Add env vars in Netlify site settings:
   - `DATABASE_URL`
   - `AUTH_SECRET`
   - `AUTH_TRUST_HOST=true`
   - `AUTH_URL` (production URL)
2. Build command:
   - `npm run prisma:generate && npm run build`
3. Ensure migrations run in CI/CD or pre-deploy job:
   - `npm run prisma:migrate:deploy`

## LocalStorage migration/import behavior

- Legacy key remains `clarity-finance-data`.
- Signed-in users are prompted to **Import local data into Neon** when legacy data is detected.
- Import maps local profile/income/expense/housing/debt/goal values into Neon-backed tables.
- Legacy data is not silently discarded.
- Guest mode still uses localStorage for draft/offline state.

## Export prep

A placeholder export service exists in `lib/export/exportService.ts` for:

- profile summary export
- action plan export
- scenario comparison export

This is intentionally scaffolded for Phase 3 report generation.
