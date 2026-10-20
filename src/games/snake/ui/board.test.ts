import { COLS, ROWS } from '../logic/board';
import { cellSize, MIN_CELL } from './board';
import { reservedHeight } from './snake-screen';

describe('fit without scrolling', () => {
  // [window width, window height]; the Stack header takes 56 to 64, the bottom inset 0 (gesture bar) to 48 (buttons).
  it.each([
    [360, 640],
    [320, 568],
  ])('at %i×%i the board fits what the rows leave and the cell is not at its lower bound', (w, h) => {
    for (const header of [56, 64]) {
      for (const bottom of [0, 48]) {
        const available = h - header - reservedHeight(bottom);
        const cell = cellSize(w, available);

        expect(cell).toBeGreaterThan(MIN_CELL);
        expect(ROWS * cell).toBeLessThanOrEqual(available);
        expect(COLS * cell).toBeLessThanOrEqual(w);
      }
    }
  });
});
