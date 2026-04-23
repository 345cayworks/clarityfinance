import { CountryOrMarket, CreditProfile, CurrencyCode, EmploymentType, HousingStatus, TargetGoal } from "@/types";

export const COUNTRY_OR_MARKETS: readonly CountryOrMarket[] = ["United States", "Cayman Islands", "Jamaica", "Dominican Republic", "Other"];
export const CURRENCY_CODES: readonly CurrencyCode[] = ["USD", "KYD", "JMD", "DOP", "Other"];
export const EMPLOYMENT_TYPES: readonly EmploymentType[] = ["full_time", "part_time", "self_employed", "contract", "unemployed", "retired"];
export const CREDIT_PROFILES: readonly CreditProfile[] = ["not_provided", "300-579", "580-669", "670-739", "740-799", "800-850"];
export const HOUSING_STATUSES: readonly HousingStatus[] = ["renting", "homeowner", "living_with_family", "other"];
export const TARGET_GOALS: readonly TargetGoal[] = ["buy_home", "refinance_home", "reduce_debt", "grow_savings", "improve_cash_flow"];

function isOneOf<T extends string>(value: unknown, allowed: readonly T[]): value is T {
  return typeof value === "string" && allowed.includes(value as T);
}

export function isCountryOrMarket(value: unknown): value is CountryOrMarket {
  return isOneOf(value, COUNTRY_OR_MARKETS);
}

export function isCurrencyCode(value: unknown): value is CurrencyCode {
  return isOneOf(value, CURRENCY_CODES);
}

export function isEmploymentType(value: unknown): value is EmploymentType {
  return isOneOf(value, EMPLOYMENT_TYPES);
}

export function isCreditProfile(value: unknown): value is CreditProfile {
  return isOneOf(value, CREDIT_PROFILES);
}

export function isHousingStatus(value: unknown): value is HousingStatus {
  return isOneOf(value, HOUSING_STATUSES);
}

export function isTargetGoal(value: unknown): value is TargetGoal {
  return isOneOf(value, TARGET_GOALS);
}

export function getValidatedOrDefault<T extends string>(value: unknown, guard: (input: unknown) => input is T, fallback: T): T {
  return guard(value) ? value : fallback;
}
