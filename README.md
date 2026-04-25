# Clarity Finance (Ground-Up Rebuild)

Clarity Finance is a production-minded fintech web app that helps users understand their finances and choose practical next steps.

**Tagline:** _Know where you stand. Know what's next._

## Stack
- Next.js App Router + TypeScript + Tailwind CSS
- Neon Postgres + Prisma ORM
- NextAuth (Credentials) authentication
- Server Actions for secure data operations
- Recharts for dashboard charts

### Why Prisma (vs Drizzle)
Prisma was chosen for this rebuild because the schema is broad and relational (11 user-scoped models), and Prisma provides a clean migration workflow, typed client ergonomics, and low-friction integration with Next.js server actions.

## Quick Start
1. Install dependencies:
   ```bash
   npm install
   ```
2. Configure environment variables (see `.env.example` section below).
3. Generate Prisma client:
   ```bash
   npm run prisma:generate
   ```
4. Run migrations:
   ```bash
   npm run prisma:migrate:deploy
   ```
5. Start dev server:
   ```bash
   npm run dev
   ```

## Environment Variables
Set these in `.env.local` (local) and Netlify site settings (prod):

- `DATABASE_URL` - Neon Postgres connection string
- `AUTH_SECRET` - random long secret used by NextAuth JWT/session signing
- `AUTH_TRUST_HOST` - set to `true` for Netlify and trusted hosts
- `AUTH_URL` or `NEXTAUTH_URL` - canonical auth base URL (for production callbacks)

## Database and Migrations
- Prisma schema: `prisma/schema.prisma`
- Rebuild migration: `prisma/migrations/202604250001_ground_up_rebuild/migration.sql`

Run in CI/CD or before deployment:
```bash
npm run prisma:generate
npm run prisma:migrate:deploy
```

## Route Map
### Public
- `/`
- `/features`
- `/pricing`
- `/about`
- `/login`
- `/signup`

### Authenticated App
- `/app`
- `/app/onboarding`
- `/app/profile`
- `/app/dashboard`
- `/app/tools/mortgage`
- `/app/tools/refinance`
- `/app/tools/rent-room`
- `/app/tools/debt-plan`
- `/app/scenarios`
- `/app/action-plan`
- `/app/reports`
- `/app/settings`

### Future-ready stubs
- `/app/advisor`
- `/app/admin`

## Security Notes
- Middleware is Edge-safe and does not import Prisma.
- Prisma access only occurs in server runtime code (auth, server actions, data services).
- All user-owned records are scoped by `userId` and queried per authenticated user.

## Netlify Deploy
1. Add env vars in Netlify UI (`DATABASE_URL`, `AUTH_SECRET`, `AUTH_TRUST_HOST`, `AUTH_URL`/`NEXTAUTH_URL`).
2. Build command:
   ```bash
   npm run prisma:generate && npm run prisma:migrate:deploy && npm run build
   ```
3. Publish directory: `.next`
4. Ensure `@netlify/plugin-nextjs` is enabled (already configured in `netlify.toml`).

## Current Limitations
- Pricing/billing and advisor/admin workflows are intentionally minimal.
- Report export is currently a placeholder and stores report JSON only.
- Tools are production scaffolded and can be further extended with advanced assumptions and localization.
