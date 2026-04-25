# Clarity Finance

Clarity Finance is a Next.js personal finance planner focused on profile-driven dashboards, calculators, scenarios, action plans, and guided recommendations.

## Stack
- Next.js + TypeScript + Tailwind CSS
- Netlify Serverless Functions
- Neon Postgres (`@neondatabase/serverless`)
- Netlify Identity (`netlify-identity-widget`)
- Recharts

## Environment Variables
Configure these in Netlify and your local `.env`:

- `DATABASE_URL` - Neon Postgres connection string (required).
- `RESEND_API_KEY` - optional for future non-auth emails.

## Netlify Identity setup (manual)
1. Open your Netlify site dashboard.
2. Go to **Identity** and click **Enable Identity**.
3. Under **Registration preferences**, enable user registration.
4. Under **Emails**, enable password recovery and configure email templates.
5. Configure email confirmation behavior based on your release policy.
6. Ensure your site URL is correct so redirect links from Identity emails resolve properly.

## Database setup (Neon)
1. Create a Neon project/database.
2. Open the Neon SQL Editor.
3. Run `sql/schema.sql` to create all finance tables.
4. If migrating from legacy custom auth, run `sql/migrate-to-netlify-identity.sql`.
5. Verify tables are present (`users`, `profiles`, `income_sources`, `expense_profiles`, `debts`, `housing_profiles`, `savings_profiles`, `goals`, `scenarios`, `action_plans`, `reports`).

## Local development
```bash
npm install
npm run dev
```

## Build
```bash
npm run build
```

## Auth and API architecture
- Netlify Identity is the only auth system.
- Frontend gets JWT via `netlifyIdentity.currentUser().jwt()`.
- Protected Netlify Functions require `Authorization: Bearer <token>`.
- Neon stores only application data (users metadata + financial data), not password hashes.
