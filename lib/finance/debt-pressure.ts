export type PressureBand = "Healthy" | "Watch" | "Stressed" | "Critical";

const bandForRatio = (value: number | null, watch: number, stressed: number, critical: number): PressureBand => {
  if (value === null) return "Critical";
  if (value <= watch) return "Healthy";
  if (value <= stressed) return "Watch";
  if (value <= critical) return "Stressed";
  return "Critical";
};

export function interpretDebtPressure(input: {
  debtToIncome: number | null;
  housingRatio: number | null;
  totalObligationsRatio: number | null;
  monthlySurplus: number;
  monthlyIncome: number;
}) {
  const debtToIncomeBand = bandForRatio(input.debtToIncome, 0.25, 0.35, 0.45);
  const housingRatioBand = bandForRatio(input.housingRatio, 0.3, 0.4, 0.5);
  const totalObligationsBand = bandForRatio(input.totalObligationsRatio, 0.6, 0.75, 0.9);

  const surplusRatio = input.monthlyIncome > 0 ? input.monthlySurplus / input.monthlyIncome : -1;
  const monthlySurplusBand: PressureBand =
    input.monthlySurplus < 0 ? (surplusRatio <= -0.2 ? "Critical" : "Stressed") : surplusRatio >= 0.2 ? "Healthy" : "Watch";

  const severity = [debtToIncomeBand, housingRatioBand, totalObligationsBand, monthlySurplusBand].map((band) =>
    ({ Healthy: 0, Watch: 1, Stressed: 2, Critical: 3 })[band]
  );
  const max = Math.max(...severity);
  const overallDebtPressureBand: PressureBand = ["Healthy", "Watch", "Stressed", "Critical"][max] as PressureBand;

  return {
    debtToIncomeBand,
    housingRatioBand,
    totalObligationsBand,
    monthlySurplusBand,
    overallDebtPressureBand,
    notes: [
      "Debt-to-Income uses debt payments only.",
      "Housing Ratio uses rent/mortgage only.",
      "Total Monthly Pressure uses living expenses + housing + debt payments."
    ]
  };
}
