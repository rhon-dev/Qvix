import { describe, expect, it } from 'vitest';
import { sanitizeName } from '../src/ws';

describe('sanitizeName', () => {
  it('trims surrounding whitespace', () => {
    expect(sanitizeName('  Ada  ')).toBe('Ada');
  });

  it('collapses internal whitespace', () => {
    expect(sanitizeName('Grace   Hopper')).toBe('Grace Hopper');
  });

  it('strips control characters', () => {
    expect(sanitizeName('A\u0000B\u001fC\u007f')).toBe('ABC');
  });

  it('caps length at 24 characters', () => {
    expect(sanitizeName('x'.repeat(100))).toHaveLength(24);
  });

  it('returns empty string for non-string input', () => {
    expect(sanitizeName(undefined)).toBe('');
    expect(sanitizeName(42)).toBe('');
    expect(sanitizeName(null)).toBe('');
  });

  it('keeps unicode letters and emoji', () => {
    expect(sanitizeName('José 🎮')).toBe('José 🎮');
  });
});
