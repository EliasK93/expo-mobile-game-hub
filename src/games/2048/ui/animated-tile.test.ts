import { numberSize } from './animated-tile';

describe('numberSize', () => {
  it('fits a five-digit number into a 7×7 tile at 320 and 360 px width (tile 38 and 44)', () => {
    for (const tile of [38, 44]) {
      expect(5 * 0.6 * numberSize(tile, 16384)).toBeLessThanOrEqual(tile - 4);
    }
  });

  it('is half a tile for short numbers and never below 1 on the smallest tile', () => {
    expect(numberSize(40, 2)).toBe(20);
    expect(numberSize(8, 16384)).toBeGreaterThanOrEqual(1);
  });
});
