// The range three LED characters can show. The one place with the cap: the digits and the accessibility labels both use it.
export const clampLed = (n: number) => Math.max(-99, Math.min(999, Math.trunc(n)));

// What an LED box shows: three characters, a negative number as a minus and two digits (-03).
export function led(n: number): string {
  const v = clampLed(n);
  return v < 0 ? `-${String(-v).padStart(2, '0')}` : String(v).padStart(3, '0');
}
