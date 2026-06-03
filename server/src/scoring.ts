/** Scoring tunables, kept pure so they can be unit-tested in isolation. */
export const TIME_LIMIT_SECONDS = 15;
export const TIME_LIMIT_MS = TIME_LIMIT_SECONDS * 1000;
export const BASE_POINTS = 1000;
export const TIME_PENALTY_MAX = 500;
export const STREAK_BONUS_STEP = 100;
export const MAX_STREAK_BONUS = 500;

/**
 * Points for a correct answer, faster = more. A correct answer at t=0 earns
 * BASE_POINTS; at the time limit it earns BASE_POINTS - TIME_PENALTY_MAX.
 */
export function timeScore(timeMs: number): number {
  const clamped = Math.max(0, Math.min(timeMs, TIME_LIMIT_MS));
  const penalty = (clamped / TIME_LIMIT_MS) * TIME_PENALTY_MAX;
  return Math.round(BASE_POINTS - penalty);
}

/**
 * Bonus for consecutive correct answers. `streak` is the run length including
 * the current answer (1 = first correct, no bonus). Capped at MAX_STREAK_BONUS.
 */
export function streakBonus(streak: number): number {
  if (streak <= 1) return 0;
  return Math.min((streak - 1) * STREAK_BONUS_STEP, MAX_STREAK_BONUS);
}
