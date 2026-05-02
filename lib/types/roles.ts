export const USER_ROLES = ["user", "premium_user", "advisor", "admin", "superadmin"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const isAdminRole = (role: string | null | undefined): role is "admin" | "superadmin" =>
  role === "admin" || role === "superadmin";

export const isAdvisorRole = (role: string | null | undefined): role is "advisor" => role === "advisor";

export const isPremiumRole = (role: string | null | undefined): role is "premium_user" => role === "premium_user";
