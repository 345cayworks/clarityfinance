# Clarity Finance

A stable Next.js personal finance app with Neon-backed persistence and Auth.js credentials authentication.

Tagline: **Know where you stand. Know what’s next.**

## Stack

- Next.js (App Router)
- TypeScript + Tailwind
- **Auth.js (NextAuth v5 beta) with Credentials provider**
- Prisma ORM
- Neon Postgres
- Auth.js / NextAuth credentials
- Netlify-compatible deployment

## Required Netlify environment variables

These are required for signup/signin to work in production:

- `DATABASE_URL`  
  Neon Postgres connection string used by Prisma (`datasource db.url`).
- `AUTH_SECRET`  
  High-entropy secret used by Auth.js to sign/encrypt tokens.
- `AUTH_TRUST_HOST=true`  
  Required behind Netlify proxy so Auth.js accepts forwarded host headers.

Recommended:

- `AUTH_URL`  
  Full public site URL, e.g. `https://your-site.netlify.app`.

## Auth.js notes

- `auth.ts` uses `AUTH_SECRET` and enables `trustHost` when `AUTH_TRUST_HOST=true` (or on Netlify runtime).
- Credentials auth is used for signup/signin.
- Auth route handler is `app/api/auth/[...nextauth]/route.ts` and pinned to Node runtime.

## Local setup

```bash
npm install
npm run prisma:generate
npm run prisma:migrate:deploy
npm run dev
```

## Netlify deploy steps

1. Set `DATABASE_URL`, `AUTH_SECRET`, `AUTH_TRUST_HOST=true`, and `AUTH_URL` in Netlify env vars.
2. Trigger a clean deploy (clear cache + deploy site).
3. Ensure Prisma client generation happens in build pipeline.
4. Ensure latest migrations are deployed to Neon.

## Troubleshooting “There is a problem with the server configuration”

Most common causes:

- Missing `AUTH_SECRET`
- Missing `AUTH_TRUST_HOST=true` on Netlify
- Invalid/missing `DATABASE_URL`
- Prisma schema not migrated (missing auth columns)

If this appears after signup/login, verify the env vars above and redeploy.
