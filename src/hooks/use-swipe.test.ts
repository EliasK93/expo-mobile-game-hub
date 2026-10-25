import { swipeDir } from './use-swipe';

describe('swipeDir', () => {
  it('takes the longer axis', () => {
    expect(swipeDir(-30, 10)).toBe('left');
    expect(swipeDir(30, -10)).toBe('right');
    expect(swipeDir(5, -40)).toBe('up');
    expect(swipeDir(-5, 40)).toBe('down');
  });

  it('is no swipe for a short drag', () => {
    expect(swipeDir(7, -3)).toBeNull();
    expect(swipeDir(0, 0)).toBeNull();
    expect(swipeDir(8, 0)).toBe('right');
  });
});
