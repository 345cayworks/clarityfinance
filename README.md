# Clarity Finance

A stable Next.js personal finance app with Neon-backed persistence.

Tagline: **Know where you stand. Know what’s next.**

## Stack

- Next.js (App Router)
- TypeScript + Tailwind
- Prisma ORM
- Neon Postgres
- Netlify-compatible deployment

## Why Prisma (vs Drizzle)

Prisma is used here because this app benefits from a clean, explicit relational model across multiple profile sections (`profiles`, `incomes`, `expenses`, `housing`, `debts`, `goals`) and simple `upsert`-driven save flows. Prisma keeps the repository/service layer concise and maintainable for this migration.

## Routes

- Landing (`/`)
- Dashboard (`/app`)
- Onboarding (`/app/onboarding`)
- Profile (`/app/profile`)
- Mortgage (`/app/mortgage`)
- Refinance (`/app/refinance`)
- Rent a Room (`/app/rent-room`)
- Debt Plan (`/app/debt-plan`)
- Scenarios (`/app/scenarios`)
- Action Plan (`/app/action-plan`)

## Database schema

Prisma schema + SQL migration create these Neon tables:

- `users`
- `profiles`
- `incomes`
- `expenses`
- `housing`
- `debts`
- `goals`

All include `id`, `user_id` (where applicable), `created_at`, `updated_at`.

## Environment variables

Required:

- `DATABASE_URL` → Neon pooled Postgres connection string (Prisma datasource)

Optional platform vars:

- `NODE_ENV=production` in deploy contexts

## Commands

```bash
npm install
npm run prisma:generate
npm run prisma:migrate:deploy
npm run dev
npm run build
```

## Netlify + Neon setup

1. Create a Neon project/database.
2. Copy the pooled connection string into Netlify env var `DATABASE_URL`.
3. Ensure Netlify runs:
   - Build command: `npm run prisma:generate && npm run build`
4. Run migrations before/at deploy:
   - `npm run prisma:migrate:deploy`

## LocalStorage migration behavior

- Legacy local data key is still read: `clarity-finance-data`.
- App now loads/saves from Neon as the source of truth.
- If legacy local data exists, users see **Import local data into Neon** in onboarding/profile.
- Data is never silently discarded.
