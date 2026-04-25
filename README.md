# Clarity Finance

Clarity Finance is a Next.js personal finance planner focused on profile-driven dashboards, calculators, scenarios, action plans, and guided recommendations.

## Stack
- Next.js + TypeScript + Tailwind CSS
- Netlify Serverless Functions
- Neon Postgres (`@neondatabase/serverless`)
- Recharts
- Resend (password reset email delivery)

## Environment Variables
Configure these in Netlify and your local `.env`:

- `DATABASE_URL` - Neon Postgres connection string.
- `AUTH_SECRET` - secret used to sign JWT session cookies.
- `APP_URL` - app base URL for reset links (for example `https://your-site.netlify.app`).
- `RESEND_API_KEY` - Resend API key (required in production for password reset emails).
- `EMAIL_FROM` - from address/domain configured in Resend.

## Database setup (Neon)
1. Create a Neon project/database.
2. Open the Neon SQL Editor.
3. Run `sql/schema.sql` manually to create all tables and indexes.
4. Verify tables are present (`users`, `profiles`, `income_sources`, `expense_profiles`, `debts`, `housing_profiles`, `savings_profiles`, `goals`, `password_reset_tokens`, `scenarios`, `action_plans`, `reports`).

## Local development
```bash
npm install
npm run dev
```

## Netlify deployment
`netlify.toml` uses:
```toml
[build]
  command = "npm run build"
  publish = ".next"
```

No Prisma runtime or migrate command is required, so the Neon P3009 migration blocker is removed from deployment.

## Auth + profile endpoints
Implemented Netlify functions:
- `/.netlify/functions/auth-signup`
- `/.netlify/functions/auth-login`
- `/.netlify/functions/auth-logout`
- `/.netlify/functions/me`
- `/.netlify/functions/password-reset-request`
- `/.netlify/functions/password-reset-confirm`
- `/.netlify/functions/profile-get`
- `/.netlify/functions/profile-save`
- `/.netlify/functions/scenario-save`
- `/.netlify/functions/action-plan-generate`
- `/.netlify/functions/report-create`

## Security notes
- Passwords are hashed via PBKDF2 (`crypto.pbkdf2Sync`).
- Session cookie is `httpOnly`, `sameSite=lax`, and `secure` in production.
- Password reset tokens are hashed with SHA-256 before storage.
- Reset requests always return generic success messaging.
