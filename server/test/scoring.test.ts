import { describe, expect, it } from 'vitest';
import {
  BASE_POINTS,
  MAX_STREAK_BONUS,
  TIME_LIMIT_MS,
  TIME_PENALTY_MAX,
  streakBonus,
  timeScore,
} from '../src/scoring';

describe('timeScore', () => {
  it('awards full points for an instant answer', () => {
    expect(timeScore(0)).toBe(BASE_POINTS);
  });

  it('applies the maximum penalty at the time limit', () => {
    expect(timeScore(TIME_LIMIT_MS)).toBe(BASE_POINTS - TIME_PENALTY_MAX);
  });

  it('clamps answers slower than the limit', () => {
    expect(timeScore(TIME_LIMIT_MS * 5)).toBe(BASE_POINTS - TIME_PENALTY_MAX);
  });

  it('clamps negative times to full points', () => {
    expect(timeScore(-1000)).toBe(BASE_POINTS);
  });

  it('scales linearly at the midpoint', () => {
    expect(timeScore(TIME_LIMIT_MS / 2)).toBe(BASE_POINTS - TIME_PENALTY_MAX / 2);
  });
});

describe('streakBonus', () => {
  it('gives no bonus for the first correct answer', () => {
    expect(streakBonus(0)).toBe(0);
    expect(streakBonus(1)).toBe(0);
  });

  it('grows with consecutive correct answers', () => {
    expect(streakBonus(2)).toBe(100);
    expect(streakBonus(3)).toBe(200);
  });

  it('caps at the maximum bonus', () => {
    expect(streakBonus(100)).toBe(MAX_STREAK_BONUS);
  });
});
