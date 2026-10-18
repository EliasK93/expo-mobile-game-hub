import { add, div, equals, format, frac, fracs, isWhole, mul, sub } from './fraction';

// Zero must be 0/1 and a real 0 in the numerator, never -0 (Object.is tells them apart).
const expectZero = (f: { n: number; d: number } | null) => {
  expect(f).not.toBeNull();
  expect(Object.is(f?.n, 0)).toBe(true);
  expect(f?.d).toBe(1);
};

describe('frac', () => {
  it('keeps a whole number as n/1', () => {
    expect(frac(24)).toEqual({ n: 24, d: 1 });
    expect(frac(-5)).toEqual({ n: -5, d: 1 });
  });

  it('reduces to the lowest terms', () => {
    expect(frac(6, 4)).toEqual({ n: 3, d: 2 });
    expect(frac(8, 3)).toEqual({ n: 8, d: 3 });
    expect(frac(12, 4)).toEqual({ n: 3, d: 1 });
    expect(frac(100, 10)).toEqual({ n: 10, d: 1 });
  });

  it('keeps the sign in the numerator and the denominator positive', () => {
    expect(frac(4, -6)).toEqual({ n: -2, d: 3 });
    expect(frac(-4, 6)).toEqual({ n: -2, d: 3 });
    expect(frac(-4, -6)).toEqual({ n: 2, d: 3 });
  });

  it('writes zero as 0/1 however it is given, never as -0', () => {
    for (const f of [frac(0), frac(0, 5), frac(0, -5), frac(-0), frac(-0, 7)]) expectZero(f);
  });

  it('throws for a zero denominator', () => {
    expect(() => frac(1, 0)).toThrow();
  });
});

describe('fracs', () => {
  it('makes a whole-number fraction of each number, not reading the index as a denominator', () => {
    expect(fracs([3, 8, 13])).toEqual([frac(3), frac(8), frac(13)]);
  });
});

describe('add, sub, mul', () => {
  it('add', () => {
    expect(add(frac(1, 2), frac(1, 3))).toEqual(frac(5, 6));
    expect(add(frac(1, 3), frac(2, 3))).toEqual(frac(1));
    expectZero(add(frac(-1, 2), frac(1, 2)));
  });

  it('sub is first minus second', () => {
    expect(sub(frac(8), frac(3))).toEqual(frac(5));
    expect(sub(frac(3), frac(8))).toEqual(frac(-5));
    expect(sub(frac(3), frac(8, 3))).toEqual(frac(1, 3));
    expectZero(sub(frac(1, 3), frac(1, 3)));
  });

  it('mul', () => {
    expect(mul(frac(2, 3), frac(3, 4))).toEqual(frac(1, 2));
    expect(mul(frac(-2, 3), frac(3, 4))).toEqual(frac(-1, 2));
    expect(mul(frac(-2), frac(-3))).toEqual(frac(6));
  });

  it('mul by zero is a plain 0, also with a negative factor', () => {
    expectZero(mul(frac(0), frac(-3)));
    expectZero(mul(frac(-3), frac(0)));
  });
});

describe('div', () => {
  it('is first divided by second', () => {
    expect(div(frac(8), frac(3))).toEqual(frac(8, 3));
    expect(div(frac(3), frac(8))).toEqual(frac(3, 8));
    expect(div(frac(8), frac(1, 3))).toEqual(frac(24));
  });

  it('moves the sign of a negative divisor to the numerator', () => {
    expect(div(frac(1, 3), frac(-2, 3))).toEqual(frac(-1, 2));
    expect(div(frac(-1, 3), frac(-2, 3))).toEqual(frac(1, 2));
    expect(div(frac(8), frac(-1, 3))).toEqual(frac(-24));
  });

  it('returns null for a division by 0', () => {
    expect(div(frac(5), frac(0))).toBeNull();
    expect(div(frac(0), frac(0))).toBeNull();
    expect(div(frac(8, 3), frac(0))).toBeNull();
  });

  it('0 divided by something is a plain 0', () => {
    expectZero(div(frac(0), frac(-5)));
  });
});

describe('equals and isWhole', () => {
  it('equals compares the values: reduced forms are the same object shape', () => {
    expect(equals(frac(2, 4), frac(1, 2))).toBe(true);
    expect(equals(frac(24), frac(48, 2))).toBe(true);
    expect(equals(frac(1, 2), frac(1, 3))).toBe(false);
    expect(equals(frac(1, 2), frac(-1, 2))).toBe(false);
  });

  it('isWhole is true for whole numbers (negative and zero too), false for a fraction', () => {
    expect(isWhole(frac(24))).toBe(true);
    expect(isWhole(frac(6, 3))).toBe(true);
    expect(isWhole(frac(-4))).toBe(true);
    expect(isWhole(frac(0))).toBe(true);
    expect(isWhole(frac(8, 3))).toBe(false);
    expect(isWhole(frac(-11, 3))).toBe(false);
  });
});

describe('format', () => {
  it('writes a whole number plainly', () => {
    expect(format(frac(24))).toBe('24');
    expect(format(frac(0))).toBe('0');
    expect(format(frac(169))).toBe('169');
  });

  it('writes a fraction as n/d', () => {
    expect(format(frac(8, 3))).toBe('8/3');
    expect(format(frac(1, 3))).toBe('1/3');
  });

  it('writes a negative with the minus sign U+2212, not a hyphen', () => {
    expect(format(frac(-4))).toBe('−4');
    expect(format(frac(-11, 3))).toBe('−11/3');
    expect(format(frac(-4))).not.toContain('-');
  });

  it('does not write -0', () => {
    expect(format(frac(-0))).toBe('0');
    expect(format(mul(frac(0), frac(-3)))).toBe('0');
  });
});
