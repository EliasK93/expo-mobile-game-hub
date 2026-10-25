import { capitalize } from './text';

describe('capitalize', () => {
  it('upper-cases the first letter only', () => {
    expect(capitalize('beginner')).toBe('Beginner');
    expect(capitalize('Hard')).toBe('Hard');
    expect(capitalize('a')).toBe('A');
  });
});
