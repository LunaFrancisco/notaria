import { describe, it, expect } from 'vitest';
import { mapConfidenceToLevel } from '../confidence';

describe('mapConfidenceToLevel', () => {
  it('maps 0 to low', () => {
    expect(mapConfidenceToLevel(0)).toBe('low');
  });

  it('maps 0.59 to low', () => {
    expect(mapConfidenceToLevel(0.59)).toBe('low');
  });

  it('maps 0.6 to medium', () => {
    expect(mapConfidenceToLevel(0.6)).toBe('medium');
  });

  it('maps 0.84 to medium', () => {
    expect(mapConfidenceToLevel(0.84)).toBe('medium');
  });

  it('maps 0.85 to high', () => {
    expect(mapConfidenceToLevel(0.85)).toBe('high');
  });

  it('maps 1.0 to high', () => {
    expect(mapConfidenceToLevel(1.0)).toBe('high');
  });
});
