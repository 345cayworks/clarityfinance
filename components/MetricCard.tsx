interface MetricCardProps {
  title: string;
  value: string;
  tone?: "blue" | "teal";
}

export function MetricCard({ title, value, tone = "blue" }: MetricCardProps) {
  return (
    <article className="card">
      <p className="text-sm text-slate-500">{title}</p>
      <p className={`mt-2 text-3xl font-bold ${tone === "blue" ? "text-brandBlue" : "text-brandTeal"}`}>{value}</p>
    </article>
  );
}
