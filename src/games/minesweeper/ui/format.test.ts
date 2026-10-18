import { led } from './format';

describe('led', () => {
  it('writes three digits with leading zeros', () => {
    expect(led(0)).toBe('000');
    expect(led(7)).toBe('007');
    expect(led(42)).toBe('042');
    expect(led(999)).toBe('999');
  });

  it('stops at 999', () => {
    expect(led(1000)).toBe('999');
    expect(led(123456)).toBe('999');
  });

  it('writes a negative number as a minus and two digits', () => {
    expect(led(-1)).toBe('-01');
    expect(led(-3)).toBe('-03');
    expect(led(-27)).toBe('-27');
    expect(led(-99)).toBe('-99');
  });

  it('stops at -99', () => {
    expect(led(-100)).toBe('-99');
    expect(led(-5000)).toBe('-99');
  });
});
