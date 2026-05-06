type NoticeContext = "general" | "loan" | "investment" | "report" | "advisor";

const notices: Record<NoticeContext, { title: string; body: string }> = {
  general: {
    title: "Planning Boundary",
    body: "Clarity Finance does not approve loans, provide investment advice, or make credit decisions. It organizes user-provided financial information, calculates educational planning ratios, and helps users understand readiness before speaking with a licensed advisor, lender, or financial institution."
  },
  loan: {
    title: "Not a Loan Approval or Credit Decision",
    body: "Clarity Finance organizes user-provided information and estimates readiness indicators for planning. Final approval is subject to lender review, verification, and underwriting."
  },
  investment: {
    title: "Education and Planning Only",
    body: "These results are educational planning estimates, not investment advice or a recommendation to buy, sell, or hold any security."
  },
  report: {
    title: "Report Boundary",
    body: "Reports are based on user-entered information and planning assumptions. They are not verified by a lender unless separately reviewed, and they are not loan approvals or investment advice."
  },
  advisor: {
    title: "Advisor Review Boundary",
    body: "Advisor requests share selected information for review. They do not create a loan approval, credit decision, or investment recommendation."
  }
};

export function DecisionBoundaryNotice({ context = "general" }: { context?: NoticeContext }) {
  const notice = notices[context];
  return (
    <section className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
      <h2 className="font-semibold">{notice.title}</h2>
      <p className="mt-1">{notice.body}</p>
    </section>
  );
}
