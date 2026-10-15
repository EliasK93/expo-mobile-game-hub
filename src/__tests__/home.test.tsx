import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderRouter, screen } from 'expo-router/testing-library';

const settle = async () => {
  for (let i = 0; i < 5; i++) await act(async () => {});
};

// Storage is the AsyncStorage mock from jest.setup.js, cleared before each test.
describe('Home summary', () => {
  it('shows solved count, best and average time under Sudoku', async () => {
    await AsyncStorage.setItem(
      'sudoku:stats',
      JSON.stringify({ version: 1, data: { classic: { solved: 3, timedCount: 2, totalMs: 780_000, bestMs: 252_000 } } }),
    );
    renderRouter('./src/app');
    await settle();

    expect(screen.getByText('Solved 3 · Best 4:12 · Avg 6:30')).toBeTruthy();
  });

  it('shows only the count when every win used a hint', async () => {
    await AsyncStorage.setItem(
      'sudoku:stats',
      JSON.stringify({ version: 1, data: { classic: { solved: 2, timedCount: 0, totalMs: 0, bestMs: null } } }),
    );
    renderRouter('./src/app');
    await settle();

    expect(screen.getByText('Solved 2')).toBeTruthy();
  });

  it('says so when nothing is solved yet', async () => {
    renderRouter('./src/app');
    await settle();

    expect(screen.getByText('No puzzles solved yet')).toBeTruthy();
  });
});
