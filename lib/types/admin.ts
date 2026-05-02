import type { UserRole } from "@/lib/types/roles";

export type AdminUserRow = {
  id: string;
  name: string | null;
  email: string;
  role: UserRole | null;
  approval_status: string | null;
  account_status: string | null;
  last_active_at: string | null;
  last_login_at: string | null;
  deactivated_at: string | null;
  created_at: string;
};

export type AdvisorOption = { id: string; name: string | null; email: string; role: UserRole };

export type AdminAdvisorRequestRow = {
  id: string;
  name: string;
  email: string;
  phone: string;
  topic: string;
  urgency: string;
  status: string;
  message?: string;
  created_at: string;
  assigned_advisor_id?: string | null;
  assigned_advisor_email?: string | null;
  assigned_at?: string | null;
  assigned_by?: string | null;
  assigned_advisor_name?: string | null;
};
