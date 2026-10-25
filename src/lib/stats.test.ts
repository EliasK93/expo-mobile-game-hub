import { winPercent } from './stats';

describe('winPercent', () => {
  it('is 0 when nothing is played', () => {
    expect(winPercent(0, 0)).toBe(0);
  });

  it('is the share of games won, from 0 to 100', () => {
    expect(winPercent(4, 0)).toBe(0);
    expect(winPercent(4, 1)).toBe(25);
    expect(winPercent(4, 4)).toBe(100);
  });

  it('rounds to a whole number, halves up', () => {
    expect(winPercent(3, 1)).toBe(33);
    expect(winPercent(3, 2)).toBe(67);
    expect(winPercent(8, 1)).toBe(13); // 12.5
  });
});
