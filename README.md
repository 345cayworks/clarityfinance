# Clarity Finance

**Tagline:** Know where you stand. Know what’s next.

Clarity Finance is a production-oriented fintech web application built with Next.js App Router, Supabase, Tailwind CSS, and Recharts.

## Features
- Supabase Auth (email/password signup and login)
- Onboarding flow with financial profile + debts persisted to Supabase
- Dashboard metrics:
  - Clarity Score
  - Monthly Cash Flow
  - Debt Pressure Index
  - Home Readiness Score
- Calculators:
  - Mortgage affordability
  - Refinance comparison
  - Rent-a-room impact
  - Debt payoff timeline
- Scenario engine for what-if projections
- Action plan (30-day, 90-day, 12-month)
- Responsive sidebar-based layout post-login

## Tech Stack
- Next.js 14 (App Router)
- TypeScript
- Supabase (Auth + Postgres)
- Tailwind CSS
- Recharts

## Local Development
1. Install dependencies:
   ```bash
   npm install
   ```
2. Configure env:
   ```bash
   cp .env.example .env.local
   ```
3. Run dev server:
   ```bash
   npm run dev
   ```

## Database Setup
- Apply `supabase/migrations/001_init.sql` in Supabase SQL editor.
- Ensure auth users are mirrored into `public.users` (trigger or app workflow) before inserting profile records.

## Deployment (Netlify)
- This repo includes `netlify.toml` with the Next.js plugin.
- Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in Netlify environment variables.
- Deploy from your Git provider.

## Structure
- `app/` routes and layouts
- `components/` reusable UI components
- `hooks/` reusable client hooks
- `lib/` calculation logic and Supabase client
- `supabase/migrations/` SQL schema + RLS
