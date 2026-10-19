import { cardSize, textSize } from './cards';
import { reservedHeight } from './make24-screen';

describe('textSize', () => {
  it('fits 1 to 8 characters (−157/156 is the longest value) into small, middle and big cards', () => {
    for (const size of [48, 100, 200]) {
      for (let length = 1; length <= 8; length++) {
        expect(length * 0.6 * textSize(size, 'x'.repeat(length))).toBeLessThanOrEqual(size - 8);
      }
    }
  });

  it('is half a card for short values: 24 on a big card is not tiny', () => {
    expect(textSize(200, '24')).toBe(100);
    expect(textSize(168, '24')).toBe(84);
  });
});

describe('fit without scrolling', () => {
  // [window width, window height]; the Stack header takes 56 to 64, the bottom inset 0 (gesture bar) to 48 (buttons).
  it.each([
    [360, 640],
    [320, 568],
  ])('at %i×%i the 2 × 2 cards fit what the rows leave, and the card is not at its lower bound', (w, h) => {
    for (const header of [56, 64]) {
      for (const bottom of [0, 48]) {
        const available = h - header - reservedHeight(bottom);
        const size = cardSize(w, available);

        expect(size).toBeGreaterThan(48);
        expect(2 * size + 8).toBeLessThanOrEqual(available);
      }
    }
  });
});
