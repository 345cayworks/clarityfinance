-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "external_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_external_id_key" ON "users"("external_id");

CREATE TABLE "profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "country_or_market" TEXT NOT NULL,
    "preferred_currency" TEXT NOT NULL,
    "age_range" TEXT NOT NULL DEFAULT 'unspecified',
    "employment_type" TEXT NOT NULL,
    "household_status" TEXT NOT NULL DEFAULT 'single',
    "dependents" INTEGER NOT NULL DEFAULT 0,
    "credit_score_known" BOOLEAN NOT NULL DEFAULT false,
    "credit_score_or_profile" TEXT NOT NULL DEFAULT 'not_provided',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "profiles_user_id_key" ON "profiles"("user_id");

CREATE TABLE "incomes" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "monthly_income" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "other_income" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "income_frequency" TEXT NOT NULL DEFAULT 'monthly',
    "income_stability" TEXT NOT NULL DEFAULT 'stable',
    "rental_income" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "side_income" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "incomes_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "incomes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "incomes_user_id_key" ON "incomes"("user_id");

CREATE TABLE "expenses" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "monthly_expenses" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "monthly_housing_cost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "utilities" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "transport" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "groceries" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "insurance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "childcare" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discretionary_spending" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "expenses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "expenses_user_id_key" ON "expenses"("user_id");

CREATE TABLE "housing" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "housing_status" TEXT NOT NULL DEFAULT 'renting',
    "rent_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "mortgage_balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "mortgage_rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "mortgage_payment" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "estimated_home_value" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "spare_room_available" BOOLEAN NOT NULL DEFAULT false,
    "estimated_room_rental_income" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "housing_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "housing_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "housing_user_id_key" ON "housing"("user_id");

CREATE TABLE "debts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'other',
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "interest_rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "monthly_payment" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "debts_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "debts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "goals" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "target_goal" TEXT NOT NULL DEFAULT 'buy_home',
    "target_home_price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "target_savings_goal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "target_debt_reduction" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "target_monthly_cash_flow" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "goal_timeframe" TEXT NOT NULL DEFAULT '12_months',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "goals_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "goals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "goals_user_id_key" ON "goals"("user_id");
