/** Format a whole-dong VND amount, e.g. 199000 → "199.000₫". */
export function formatVnd(amount: number): string {
  return `${Math.round(amount).toLocaleString("vi-VN")}₫`;
}

/** Format a plan price for display: 0 → "Miễn phí", else "<n>₫/tháng". */
export function formatPlanPrice(amount: number): string {
  return amount === 0 ? "Miễn phí" : `${formatVnd(amount)}/tháng`;
}
