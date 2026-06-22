/** Pure token-budget helpers (plan 09) — no Prisma/Next imports, unit-testable. */

/** A budget of 0 (or less) means unlimited. */
export function isWithinTokenBudget(used: number, quota: number): boolean {
  return quota <= 0 || used < quota;
}
