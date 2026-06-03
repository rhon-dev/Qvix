import { describe, expect, it } from 'vitest';
import { QUESTION_BANK, pickQuestions, shuffle, type Rng } from '../src/questions';

/** Deterministic PRNG (mulberry32) so shuffles are reproducible in tests. */
function seeded(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('shuffle', () => {
  it('preserves length and elements', () => {
    const input = [1, 2, 3, 4, 5];
    const out = shuffle(input, seeded(42));
    expect(out).toHaveLength(input.length);
    expect([...out].sort((a, b) => a - b)).toEqual(input);
  });

  it('does not mutate the input', () => {
    const input = [1, 2, 3, 4, 5];
    const copy = [...input];
    shuffle(input, seeded(7));
    expect(input).toEqual(copy);
  });

  it('is deterministic for a given seed', () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8];
    expect(shuffle(input, seeded(123))).toEqual(shuffle(input, seeded(123)));
  });
});

describe('pickQuestions', () => {
  it('returns the requested number of questions', () => {
    expect(pickQuestions(5, seeded(1))).toHaveLength(5);
  });

  it('clamps the count to the bank size', () => {
    expect(pickQuestions(9999, seeded(1))).toHaveLength(QUESTION_BANK.length);
  });

  it('always returns at least one question', () => {
    expect(pickQuestions(0, seeded(1)).length).toBeGreaterThanOrEqual(1);
  });

  it('keeps the correct answer among the shuffled options', () => {
    for (const q of pickQuestions(QUESTION_BANK.length, seeded(99))) {
      expect(q.options).toContain(q.correctAnswer);
      expect(new Set(q.options).size).toBe(q.options.length);
    }
  });

  it('every bank entry has a valid correct answer', () => {
    for (const q of QUESTION_BANK) {
      expect(q.options).toContain(q.correctAnswer);
      expect(q.options.length).toBe(4);
    }
  });
});
