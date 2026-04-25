-- Ground-up Clarity Finance schema for Neon Postgres
CREATE TYPE "UserRole" AS ENUM ('user', 'advisor', 'admin');

CREATE TABLE "users" (
  "id" TEXT PRIMARY KEY,
  "email" TEXT NOT NULL UNIQUE,
  "name" TEXT,
  "password_hash" TEXT NOT NULL,
  "role" "UserRole" NOT NULL DEFAULT 'user',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "profiles" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL UNIQUE,
  "country_or_market" TEXT,
  "preferred_currency" TEXT,
  "age_range" TEXT,
  "employment_type" TEXT,
  "household_status" TEXT,
  "dependents" INTEGER,
  "credit_score_known" BOOLEAN,
  "credit_score_or_profile" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "income_sources" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "monthly_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "frequency" TEXT NOT NULL DEFAULT 'monthly',
  "stability" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "expense_profiles" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL UNIQUE,
  "housing" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "utilities" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "transport" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "groceries" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "insurance" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "childcare" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "discretionary" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "other" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "debts" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "interest_rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "monthly_payment" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "housing_profiles" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL UNIQUE,
  "housing_status" TEXT,
  "rent_amount" DOUBLE PRECISION,
  "mortgage_balance" DOUBLE PRECISION,
  "mortgage_rate" DOUBLE PRECISION,
  "mortgage_payment" DOUBLE PRECISION,
  "estimated_home_value" DOUBLE PRECISION,
  "spare_room_available" BOOLEAN,
  "estimated_room_rental_income" DOUBLE PRECISION,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "savings_profiles" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL UNIQUE,
  "cash_savings" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "emergency_fund" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "investments" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "retirement_savings" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "down_payment_savings" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "goals" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL UNIQUE,
  "target_goal" TEXT,
  "target_home_price" DOUBLE PRECISION,
  "target_savings_goal" DOUBLE PRECISION,
  "target_debt_reduction" DOUBLE PRECISION,
  "target_monthly_cash_flow" DOUBLE PRECISION,
  "goal_timeframe" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "scenarios" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "adjustments_json" JSONB NOT NULL,
  "result_json" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "action_plans" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "thirty_day_json" JSONB NOT NULL,
  "ninety_day_json" JSONB NOT NULL,
  "twelve_month_json" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "reports" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "report_json" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "profiles_user_id_idx" ON "profiles"("user_id");
CREATE INDEX "income_sources_user_id_idx" ON "income_sources"("user_id");
CREATE INDEX "expense_profiles_user_id_idx" ON "expense_profiles"("user_id");
CREATE INDEX "debts_user_id_idx" ON "debts"("user_id");
CREATE INDEX "housing_profiles_user_id_idx" ON "housing_profiles"("user_id");
CREATE INDEX "savings_profiles_user_id_idx" ON "savings_profiles"("user_id");
CREATE INDEX "goals_user_id_idx" ON "goals"("user_id");
CREATE INDEX "scenarios_user_id_idx" ON "scenarios"("user_id");
CREATE INDEX "action_plans_user_id_idx" ON "action_plans"("user_id");
CREATE INDEX "reports_user_id_idx" ON "reports"("user_id");

ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "income_sources" ADD CONSTRAINT "income_sources_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "expense_profiles" ADD CONSTRAINT "expense_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "debts" ADD CONSTRAINT "debts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "housing_profiles" ADD CONSTRAINT "housing_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "savings_profiles" ADD CONSTRAINT "savings_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "goals" ADD CONSTRAINT "goals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "scenarios" ADD CONSTRAINT "scenarios_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "action_plans" ADD CONSTRAINT "action_plans_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "reports" ADD CONSTRAINT "reports_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
