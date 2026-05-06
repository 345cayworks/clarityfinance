import RetirementPlanner from "@/components/retirement-planner";
import { DecisionBoundaryNotice } from "@/components/compliance/DecisionBoundaryNotice";

export default function RetirementPlannerPage() {
  return (
    <div className="space-y-4">
      <DecisionBoundaryNotice context="investment" />
      <RetirementPlanner />
    </div>
  );
}
