# Clarity Finance

**Tagline:** Know where you stand. Know what’s next.

Clarity Finance is a Next.js + Supabase financial planning app with onboarding, live dashboard metrics, calculators, scenario simulation, and action plans.

## Required environment variables
Create `.env.local` from `.env.example` and set:

- `NEXT_PUBLIC_SUPABASE_URL` (base project URL, e.g. `https://YOUR_PROJECT.supabase.co`)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (public anon key)

## Supabase setup steps
1. Create a Supabase project.
2. In Supabase SQL Editor, run migrations in order:
   - `supabase/migrations/001_init.sql`
   - `supabase/migrations/002_profiles_unique_and_user_mirror.sql`
3. Confirm Auth email/password provider is enabled.
4. Confirm `financial_profiles` has a unique constraint on `user_id`.

## Local run steps
```bash
npm install
cp .env.example .env.local
npm run dev
```

## Build + deploy
```bash
npm run build
```

### Netlify
- Connect the repository to Netlify.
- Add env vars:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Build command: `npm run build`
- Publish directory: `.next`
- Keep `@netlify/plugin-nextjs` enabled (`netlify.toml`).

## Notes
- Client/browser code only uses `NEXT_PUBLIC_*` variables.
- Auth protection is handled with Supabase server session checks in protected app layout, not brittle cookie-name checks.
