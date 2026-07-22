export function formatCurrency(value) {
  const amount = Number(value) || 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatShortDate(value) {
  if (!value) return "—";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function currentMonthLabel() {
  return new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export function currentMonthValue() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

/** Shift a YYYY-MM value by delta months (negative = past). */
export function shiftMonthValue(monthValue, deltaMonths = 0) {
  const match = String(monthValue || "").match(/^(\d{4})-(\d{2})$/);
  const base = match
    ? new Date(Number(match[1]), Number(match[2]) - 1, 1)
    : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  base.setMonth(base.getMonth() + Number(deltaMonths) || 0);
  return `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, "0")}`;
}

export function formatMonthLabel(value) {
  if (!value) return "";
  const date = new Date(`${value}-01T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}
