import { formatScore } from './format';

describe('formatScore', () => {
  it('puts a comma before every group of three digits', () => {
    expect(formatScore(12345)).toBe('12,345');
    expect(formatScore(1000000)).toBe('1,000,000');
  });

  it('leaves numbers below 1000 alone', () => {
    expect(formatScore(999)).toBe('999');
    expect(formatScore(0)).toBe('0');
  });
});
