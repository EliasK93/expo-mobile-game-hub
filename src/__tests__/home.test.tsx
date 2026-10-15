import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderRouter, screen } from 'expo-router/testing-library';

const settle = async () => {
  for (let i = 0; i < 5; i++) await act(async () => {});
};
const stats = (data: unknown) => AsyncStorage.setItem('sudoku:stats', JSON.stringify({ version: 1, data }));

// Storage is the AsyncStorage mock from jest.setup.js, cleared before each test.
describe('Home summary', () => {
  it('shows one line per level that has wins, in level order, then Classic', async () => {
    await stats({
      classic: { solved: 3, timedCount: 2, totalMs: 780_000, bestMs: 252_000 },
      5: { solved: 1, timedCount: 1, totalMs: 600_000, bestMs: 600_000 },
      2: { solved: 5, timedCount: 4, totalMs: 968_000, bestMs: 190_000 },
      3: { solved: 0, timedCount: 0, totalMs: 0, bestMs: null },
    });
    renderRouter('./src/app');
    await settle();

    const lines = screen.getAllByText(/: \d/).map((n) => n.props.children);
    expect(lines).toEqual([
      'Easy: 5 · Best 3:10 · Avg 4:02',
      'Expert: 1 · Best 10:00 · Avg 10:00',
      'Classic: 3 · Best 4:12 · Avg 6:30',
    ]);
    expect(screen.queryByText('No puzzles solved yet')).toBeNull();
  });

  it('shows only the count when every win of a level used a hint', async () => {
    await stats({ 1: { solved: 2, timedCount: 0, totalMs: 0, bestMs: null } });
    renderRouter('./src/app');
    await settle();

    expect(screen.getByText('Very easy: 2')).toBeTruthy();
  });

  it('says so when nothing is solved yet', async () => {
    renderRouter('./src/app');
    await settle();

    expect(screen.getByText('No puzzles solved yet')).toBeTruthy();
  });
});
