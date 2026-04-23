# Clarity Finance MVP (Front-end only)

A browser-only personal finance planner built with Next.js App Router, TypeScript, Tailwind CSS, and Recharts.

Tagline: **Know where you stand. Know what’s next.**

## What it includes

- Landing page (`/`)
- Dashboard (`/app`)
- Onboarding form with auto-save (`/app/onboarding`)
- Mortgage affordability calculator (`/app/mortgage`)
- Refinance calculator (`/app/refinance`)
- Rent-a-room calculator (`/app/rent-room`)
- Debt payoff planner (`/app/debt-plan`)
- Scenario planner (`/app/scenarios`)
- Personalized action plan (`/app/action-plan`)

## Persistence

All user data is stored in `localStorage` under the key:

- `clarity-finance-data`

## Commands

```bash
npm install
npm run dev
npm run build
```

## Notes

- No authentication
- No backend
- No Supabase
- No database
