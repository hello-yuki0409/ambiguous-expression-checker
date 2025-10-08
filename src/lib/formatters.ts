export function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, { hour12: false });
}

export function formatScore(score: number | null | undefined) {
  if (score === null || score === undefined) return "-";
  return score.toFixed(2);
}

export function formatPercent(
  value: number | null | undefined,
  fractionDigits = 0
) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "―";
  }
  const rounded = value.toFixed(fractionDigits);
  const numeric = Number(rounded);
  const sign = numeric > 0 ? "+" : "";
  return `${sign}${rounded}%`;
}
