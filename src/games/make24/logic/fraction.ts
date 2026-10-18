// An exact number: n/d, always reduced, d > 0, and zero is 0/1. Floating point would miss 24 in 8 ÷ (3 − 8 ÷ 3).
export type Fraction = { n: number; d: number };

// The minus sign is U+2212, not a hyphen.
export const MINUS = '−';

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));

export function frac(n: number, d = 1): Fraction {
  if (d === 0) throw new RangeError('a fraction needs a denominator that is not 0');
  const g = gcd(Math.abs(n), Math.abs(d)); // gcd(0, d) = |d|, so zero comes out as 0/1
  const sign = d < 0 ? -1 : 1;
  return { n: (sign * n) / g + 0, d: Math.abs(d) / g }; // + 0 turns a -0 into 0
}

// The same numbers as whole-number fractions. (numbers.map(frac) would read the index as a denominator.)
export const fracs = (numbers: readonly number[]): Fraction[] => numbers.map((n) => frac(n));

export const add = (a: Fraction, b: Fraction) => frac(a.n * b.d + b.n * a.d, a.d * b.d);
export const sub = (a: Fraction, b: Fraction) => frac(a.n * b.d - b.n * a.d, a.d * b.d);
export const mul = (a: Fraction, b: Fraction) => frac(a.n * b.n, a.d * b.d);
// null for a division by 0.
export const div = (a: Fraction, b: Fraction): Fraction | null => (b.n === 0 ? null : frac(a.n * b.d, a.d * b.n));

// Reduced fractions are equal exactly when both parts are.
export const equals = (a: Fraction, b: Fraction) => a.n === b.n && a.d === b.d;
export const isWhole = (a: Fraction) => a.d === 1;

// 24, 8/3, −4, −11/3
export const format = ({ n, d }: Fraction) => `${n < 0 ? MINUS : ''}${Math.abs(n)}${d === 1 ? '' : `/${d}`}`;
