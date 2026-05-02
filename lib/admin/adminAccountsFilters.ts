import type { UserRole } from "@/lib/types/roles";

export type RoleFilter = "all" | UserRole;
export type AdvisorRequestFilter = "all" | "unassigned" | "assigned" | "reviewing" | "contacted" | "closed";
export type UserActivityFilter = "all" | "pending" | "recently_active" | "recently_inactive";
