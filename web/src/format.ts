const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export const formatMoney = (value: number | null): string => (value === null ? "n/a" : currency.format(value));

export const formatIndex = (value: number | null): string => (value === null ? "n/a" : value.toFixed(2));

export const formatPercent = (value: number): string => `${value.toFixed(1)}%`;

export type Health = "good" | "watch" | "bad" | "none";

/** SPI and CPI are healthy at 1.00 or above. */
export function indexHealth(value: number | null): Health {
  if (value === null) return "none";
  if (value >= 1) return "good";
  if (value >= 0.9) return "watch";
  return "bad";
}

export const HEALTH_LABEL: Record<Health, string> = {
  good: "On track",
  watch: "Watch",
  bad: "Off track",
  none: "No data",
};
