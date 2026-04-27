import { toCurrency, toNumber } from "@/lib/finance/calculations";

export const formatMoney = (value: unknown, currency = "USD") => {
  const amount = toNumber(value);
  if (currency === "USD") return toCurrency(amount);

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

export const formatPercent = (value: unknown) => `${toNumber(value).toFixed(2).replace(/\.?0+$/, "")}%`;

export const formatNumber = (value: unknown) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(toNumber(value));
