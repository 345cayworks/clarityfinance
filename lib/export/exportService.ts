import { FinanceData } from "@/types";

export interface ExportPayload {
  filename: string;
  mimeType: string;
  content: string;
}

export function buildProfileSummaryExport(_data: FinanceData): ExportPayload {
  return {
    filename: "clarity-profile-summary.txt",
    mimeType: "text/plain",
    content: "Profile summary export placeholder (Phase 3)."
  };
}

export function buildActionPlanExport(_data: FinanceData): ExportPayload {
  return {
    filename: "clarity-action-plan.txt",
    mimeType: "text/plain",
    content: "Action plan export placeholder (Phase 3)."
  };
}

export function buildScenarioComparisonExport(_data: FinanceData): ExportPayload {
  return {
    filename: "clarity-scenarios.txt",
    mimeType: "text/plain",
    content: "Scenario comparison export placeholder (Phase 3)."
  };
}
